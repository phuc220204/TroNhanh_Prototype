import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      // CHỈ bật spinner ở các event thật sự đổi danh tính.
      // Trước đây setIsLoading(true) chạy ở MỌI event kể cả TOKEN_REFRESHED
      // → spinner của ProtectedRoute nháy mỗi giờ khi token tự gia hạn.
      const identityChanged =
        event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT";
      if (identityChanged) setIsLoading(true);

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchIdentity(currentUser.id);
      } else {
        setProfile(null);
        setRoles([]);
      }

      if (identityChanged) setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchIdentity]);

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
      value={{ user, profile, roles, hasRole, isLoading, signOut, refreshProfile }}
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
