import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { Profile } from "../types/auth";
import { logError } from "../services/supabase-error";
import type { Role } from "../components/RequireRole";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  /** Vai trò additive (spec §1.8): một user có thể là [Renter, Seller]. */
  roles: Role[];
  hasRole: (role: Role) => boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * `user.id` của lần xử lý auth event trước.
   *
   * Là `useRef` chứ không phải state: nó chỉ dùng để SO SÁNH trong callback của
   * `onAuthStateChange`, không tham gia render. Nếu để state thì mỗi lần gán lại
   * gây thêm một lượt render — đúng thứ đang cần tránh.
   */
  const lastUserIdRef = useRef<string | null>(null);

  /**
   * profiles và user_roles không có FK với nhau nên phải là 2 query.
   * LƯU Ý: profiles khoá theo `user_id`, KHÔNG phải `id`
   * (profiles.id là gen_random_uuid() độc lập — đã từng gây bug T01 #1).
   */
  const fetchIdentity = useCallback(async (userId: string) => {
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);

      if (profileRes.error) logError("AuthContext.fetchProfile", profileRes.error);
      else setProfile(profileRes.data);

      if (rolesRes.error) logError("AuthContext.fetchRoles", rolesRes.error);
      else setRoles(((rolesRes.data ?? []) as { role: Role }[]).map((r) => r.role));
    } catch (err) {
      logError("AuthContext.fetchIdentity", err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchIdentity(user.id);
  }, [user, fetchIdentity]);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) logError("AuthContext.getSession", error);
        if (session?.user) {
          setUser(session.user);
          // Ghi lại id ngay: `onAuthStateChange` sẽ emit INITIAL_SESSION cho cùng
          // người này, và nếu ref còn null thì nó tưởng danh tính vừa đổi rồi bật
          // spinner lần thứ hai một cách vô ích.
          lastUserIdRef.current = session.user.id;
          await fetchIdentity(session.user.id);
        }
      } catch (err) {
        logError("AuthContext.getInitialSession", err);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;

      /**
       * Spinner chỉ được bật khi NGƯỜI DÙNG thật sự đổi — so sánh `user.id`, không
       * so sánh tên event.
       *
       * Vì sao: `supabase-js` emit `SIGNED_IN` mỗi lần nó khôi phục session, kể cả
       * khi bạn vẫn đang đăng nhập bằng đúng tài khoản đó — điển hình là lúc quay
       * lại tab sau khi alt-tab. Lọc theo tên event thì `SIGNED_IN` vẫn bật
       * `isLoading`, `RequireAuth` thay `<Outlet/>` bằng màn "Đang kiểm tra..." và
       * **unmount toàn bộ cây con**. Người đang nhập form đăng tin mở tab khác lấy
       * ảnh, quay lại thì mất sạch dữ liệu đã điền — không có lỗi nào, chỉ là form
       * trắng.
       *
       * Lần trước đã lọc bỏ `TOKEN_REFRESHED` vì lý do tương tự (spinner nháy mỗi
       * giờ). `SIGNED_IN` sót lại vì lúc đó chưa ai alt-tab giữa lúc đang nhập form.
       */
      const previousUserId = lastUserIdRef.current;
      const identityChanged = currentUser?.id !== previousUserId;
      lastUserIdRef.current = currentUser?.id ?? null;

      if (identityChanged) setIsLoading(true);

      setUser(currentUser);

      if (currentUser) {
        // Cùng một người thì profile/roles không đổi — không cần nạp lại, và nạp
        // lại còn tạo một nhịp render vô ích ở mọi component đọc context.
        if (identityChanged) await fetchIdentity(currentUser.id);
      } else {
        setProfile(null);
        setRoles([]);
      }

      if (identityChanged) setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchIdentity]);

  /**
   * Đăng nhập / đăng ký bằng Google.
   *
   * Không phân biệt "đăng nhập" và "đăng ký": Supabase Auth **tự động gộp
   * identity cùng email vào MỘT user** nếu email đó đã được xác minh. Nên người
   * đã có tài khoản mật khẩu với `a@gmail.com` bấm nút này sẽ vào đúng tài khoản
   * cũ — giữ nguyên khu trọ, hợp đồng, hóa đơn — chứ không sinh tài khoản thứ hai.
   * (Supabase cố ý KHÔNG tự gộp khi email chưa xác minh, vì đó là đường
   * pre-account-takeover: kẻ khác đăng ký trước bằng email của bạn rồi chờ bạn
   * đăng nhập Google vào chính tài khoản họ tạo.)
   *
   * ⚠️ `redirectTo` PHẢI là origin trần, không kèm `#/...`.
   * App dùng hash router. Supabase (PKCE) nối `?code=...` vào cuối URL đích:
   *   redirectTo = "origin/"            → "origin/?code=abc"        ✅ đọc được
   *   redirectTo = "origin/#/dang-nhap" → "origin/#/dang-nhap?code=abc"  ❌
   * Ở dạng thứ hai, query nằm SAU dấu `#` nên `window.location.search` rỗng,
   * `detectSessionInUrl` không thấy code, và phiên không bao giờ được tạo —
   * người dùng quay về trang chủ trong trạng thái vẫn chưa đăng nhập, không có
   * lỗi nào hiện ra.
   */
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        // Luôn cho chọn tài khoản thay vì im lặng dùng lại account Google đang
        // đăng nhập trên máy — cần thiết khi một máy test nhiều tài khoản.
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw error;
  }, []);

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logError("AuthContext.signOut", err);
    } finally {
      setUser(null);
      setProfile(null);
      setRoles([]);
      setIsLoading(false);
    }
  };

  const hasRole = useCallback((role: Role) => roles.includes(role), [roles]);

  return (
    <AuthContext.Provider
      value={{ user, profile, roles, hasRole, isLoading, signOut, signInWithGoogle, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
