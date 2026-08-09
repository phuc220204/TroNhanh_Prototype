import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Building2, Search, Heart, Mail, Phone as PhoneIcon } from "lucide-react";
import { RenterShell } from "../components/RenterShell";
import { Button } from "../components/common";
import { Field } from "../components/common/FormField";
import { C, font, radius } from "../theme";
import { useAuth } from "../contexts/AuthContext";
import { toUserMessage } from "../services/supabase-error";
import { updateMyProfile } from "../services/profile-service";
import { getMyActivityCounts, type MyActivityCounts } from "../../marketplace/services/my-activity-service";

/**
 * Tổng quan tài khoản + Cài đặt tài khoản.
 *
 * TRƯỚC ĐÂY CẢ HAI LÀ VỎ RỖNG: file cũ chỉ render một `EmptyState` ghi "Chức
 * năng đang được cập nhật" cho ba route (`/tai-khoan`, `/tai-khoan/hop-dong`,
 * `/tai-khoan/cai-dat`). Nghĩa là không có chỗ nào sửa tên hay số điện thoại —
 * đặc biệt tệ với người đăng ký bằng Google, vì Google không cấp số điện thoại
 * nên tin họ đăng hiện SĐT rỗng và họ không có cách nào bổ sung.
 *
 * "Hợp đồng thuê" bị BỎ khỏi menu thay vì viết thêm một trang: nội dung của nó
 * trùng với "Phòng của tôi" (`MyStaysPage` đã hiện hợp đồng của từng đợt ở).
 * Thêm một trang chỉ để lặp lại cùng dữ liệu là tạo hai nguồn chân lý.
 */

function Panel({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px 32px" }}>
      <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>{title}</h1>
      <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 24px" }}>{desc}</p>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24 }}>{children}</div>
    </div>
  );
}

/* ══════════════════════════════════════════
   TỔNG QUAN
══════════════════════════════════════════ */
export function AccountPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [counts, setCounts] = useState<MyActivityCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyActivityCounts().then((c) => { if (!cancelled) setCounts(c); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const cards: { label: string; value: number | null; to: string; Icon: typeof Building2 }[] = [
    { label: "Tin cho thuê", value: counts?.rentalListings ?? null, to: "/tai-khoan/tin-cho-thue", Icon: Building2 },
    { label: "Tin nhu cầu", value: counts?.demandPosts ?? null, to: "/tai-khoan/tin-nhu-cau", Icon: Search },
    { label: "Tin đã lưu", value: counts?.savedListings ?? null, to: "/yeu-thich", Icon: Heart },
  ];

  return (
    <RenterShell active="account">
      <Panel title="Tổng quan" desc="Thông tin tài khoản và các hoạt động của bạn trên Trọ Nhanh.">
        {/* Danh tính — lấy từ AuthContext, không query lại. */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.primary }}>
              {(profile?.full_name || user?.email || "?").trim().charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p data-testid="account-name" style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
              {profile?.full_name || "Chưa đặt tên"}
            </p>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "3px 0 0", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Mail size={13} /> {user?.email}
              <PhoneIcon size={13} style={{ marginLeft: 6 }} />
              {profile?.contact_phone || <span style={{ color: C.error }}>chưa có số điện thoại</span>}
            </p>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Button variant="outline" size="sm" onClick={() => navigate("/tai-khoan/cai-dat")} data-testid="account-edit-btn">
              Sửa hồ sơ
            </Button>
          </div>
        </div>

        {/* Thiếu SĐT thì tin đăng không ai liên hệ được — nhắc ngay, không giấu
            trong trang cài đặt. */}
        {!profile?.contact_phone && (
          <div data-testid="account-missing-phone" style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: radius.sm, padding: "12px 14px", marginBottom: 20 }}>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textPrimary, margin: 0, lineHeight: 1.5 }}>
              Bạn chưa có số điện thoại. Tin đăng của bạn sẽ không hiện số liên hệ, và
              người tìm trọ không gọi được. <strong>Bổ sung ở Cài đặt tài khoản.</strong>
            </p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {cards.map(({ label, value, to, Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(to)}
              data-testid={`account-stat-${to.split("/").pop()}`}
              style={{
                display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start",
                background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: "14px 16px", cursor: "pointer", textAlign: "left",
              }}
            >
              <Icon size={16} color={C.primary} />
              <span style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary }}>
                {value === null ? "—" : value}
              </span>
              <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>{label}</span>
            </button>
          ))}
        </div>
      </Panel>
    </RenterShell>
  );
}

/* ══════════════════════════════════════════
   CÀI ĐẶT
══════════════════════════════════════════ */
export function AccountSettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [saved, setSaved] = useState(false);

  // Đổ giá trị hiện có khi profile về. Không dùng `useState(profile?...)` vì
  // AuthContext nạp profile bất đồng bộ — lần render đầu nó còn null.
  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.contact_phone ?? "");
  }, [profile?.full_name, profile?.contact_phone]);

  const handleSave = async () => {
    setErrorMsg("");
    setSaved(false);

    if (!fullName.trim()) {
      setErrorMsg("Vui lòng nhập họ và tên.");
      return;
    }
    // Cùng luật với form đăng tin (`useListingForm`): 10–11 số, bắt đầu bằng 0.
    if (phone.trim() && !/^0\d{8,9}$/.test(phone.trim())) {
      setErrorMsg("Số điện thoại chưa hợp lệ. Ví dụ: 0901234567.");
      return;
    }

    try {
      setSaving(true);
      await updateMyProfile({ fullName, contactPhone: phone });
      // Nạp lại profile trong context, nếu không thì navbar và mọi chỗ hiển thị
      // tên vẫn giữ giá trị cũ cho tới lần tải trang sau.
      await refreshProfile();
      setSaved(true);
    } catch (err: unknown) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <RenterShell active="settings">
      <Panel title="Cài đặt tài khoản" desc="Cập nhật thông tin hiển thị cho người tìm trọ và chủ trọ liên hệ với bạn.">
        {errorMsg && (
          <div data-testid="account-settings-error" style={{ background: C.white, border: `1px solid ${C.error}`, color: C.error, padding: "10px 14px", borderRadius: radius.sm, fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            {errorMsg}
          </div>
        )}
        {saved && (
          <div data-testid="account-settings-saved" style={{ background: C.white, border: `1px solid ${C.success}`, color: C.success, padding: "10px 14px", borderRadius: radius.sm, fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            Đã lưu thay đổi.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 460 }}>
          <Field label="Họ và tên *" data-testid="account-fullname" value={fullName} onChange={setFullName} placeholder="VD: Nguyễn Văn A" />
          <Field label="Số điện thoại" data-testid="account-phone" value={phone} onChange={setPhone} placeholder="VD: 0901234567" />

          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Email đăng nhập</span>
            <input
              value={user?.email ?? ""}
              readOnly
              disabled
              data-testid="account-email"
              style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", boxSizing: "border-box", background: C.bg }}
            />
            {/* Đổi email đụng cả `auth.users` lẫn identity của Google, và phải
                xác thực lại địa chỉ mới — không gộp vào form này. */}
            <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>
              Email dùng để đăng nhập, hiện chưa đổi được tại đây.
            </span>
          </label>

          <div>
            <Button variant="primary" loading={saving} onClick={handleSave} data-testid="account-save-btn">
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </Panel>
    </RenterShell>
  );
}

export default AccountPage;
