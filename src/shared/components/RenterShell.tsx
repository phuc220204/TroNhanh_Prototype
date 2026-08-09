import { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { User, Star, Settings, Home, Search, Heart, Building2 } from "lucide-react";
import { C, font } from "../theme";
import { PublicNavbar } from "./PublicNavbar";

/**
 * Khu vực TÀI KHOẢN — mọi thứ thuộc về một người dùng đã đăng nhập.
 *
 * VÌ SAO GỘP "TIN CỦA TÔI" VÀO ĐÂY: trước đây quản lý tin cho thuê nằm ở
 * `/chu-tro/tin-dang`, tức bên trong khu vực "Dashboard chủ trọ". Nhưng đăng
 * tin là việc MIỄN PHÍ mà bất kỳ ai đăng nhập cũng làm được — không phải đặc
 * quyền của chủ trọ. Hệ quả: người chỉ muốn đăng một tin phải đi vào khu vực
 * chủ trọ, nhìn sidebar đầy "Khu trọ & Phòng", "Hóa đơn" bị khóa kèm lời mời
 * mua gói. URL nói một đằng, quyền truy cập một nẻo.
 *
 * Giờ ranh giới rõ: `/tai-khoan/*` là của NGƯỜI DÙNG (miễn phí), `/chu-tro/*`
 * là của CHỦ TRỌ VẬN HÀNH (trả phí, quản lý khu/phòng/hóa đơn).
 *
 * Tên file giữ nguyên `RenterShell` để không phải sửa 6 chỗ import trong một
 * lần đổi đã đủ rộng; nhưng nó KHÔNG còn chỉ dành cho Renter.
 */

export type RenterNavId =
  | "account"
  | "listings"
  | "demands"
  | "saved"
  | "stays"
  | "reviews"
  | "settings";

interface RenterShellProps {
  active?: RenterNavId;
  children: ReactNode;
}

interface NavItem {
  id: RenterNavId;
  label: string;
  path: string;
  icon: typeof User;
}

/** Tin tôi đăng — ai đăng nhập cũng có, không cần gói nào. */
const NAV_POSTS: NavItem[] = [
  { id: "listings", label: "Tin cho thuê của tôi", path: "/tai-khoan/tin-cho-thue", icon: Building2 },
  { id: "demands", label: "Tin nhu cầu của tôi", path: "/tai-khoan/tin-nhu-cau", icon: Search },
  { id: "saved", label: "Tin đã lưu", path: "/yeu-thich", icon: Heart },
];

/** Việc thuê trọ của tôi — chỉ có nội dung khi đã được chủ trọ gắn vào một phòng. */
const NAV_RENTING: NavItem[] = [
  { id: "stays", label: "Phòng của tôi", path: "/tai-khoan/phong-cua-toi", icon: Home },
  { id: "reviews", label: "Đánh giá của tôi", path: "/tai-khoan/danh-gia", icon: Star },
];

const NAV_ACCOUNT: NavItem[] = [
  { id: "account", label: "Tổng quan", path: "/tai-khoan", icon: User },
  { id: "settings", label: "Cài đặt tài khoản", path: "/tai-khoan/cai-dat", icon: Settings },
];

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.07em", margin: "14px 12px 6px" }}>
      {children}
    </p>
  );
}

export function RenterShell({ active = "account", children }: RenterShellProps) {
  const location = useLocation();

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isSelected = active === item.id || location.pathname === item.path;
    return (
      <Link
        key={item.id}
        to={item.path}
        data-testid={`account-nav-${item.id}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 10,
          textDecoration: "none",
          fontFamily: font,
          fontSize: 13.5,
          fontWeight: isSelected ? 700 : 500,
          color: isSelected ? C.primary : C.textPrimary,
          background: isSelected ? C.caramelSoft : "transparent",
        }}
      >
        <Icon size={16} color={isSelected ? C.primary : C.textSecondary} />
        {item.label}
      </Link>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", flexDirection: "column" }}>
      <PublicNavbar />
      <div style={{ flex: 1, maxWidth: 1280, margin: "0 auto", width: "100%", padding: "24px 20px 60px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          <aside style={{ width: 260, flexShrink: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 12px", boxSizing: "border-box" }}>
            <div style={{ padding: "8px 12px 12px", borderBottom: `1px solid ${C.border}` }}>
              <h2 style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Tài khoản của tôi</h2>
              <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "4px 0 0" }}>Tin đăng · Thuê trọ · Hồ sơ</p>
            </div>

            <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <GroupLabel>Tin của tôi</GroupLabel>
              {NAV_POSTS.map(renderItem)}

              <GroupLabel>Thuê trọ</GroupLabel>
              {NAV_RENTING.map(renderItem)}

              <GroupLabel>Hồ sơ</GroupLabel>
              {NAV_ACCOUNT.map(renderItem)}
            </nav>
          </aside>

          <main style={{ flex: 1, minWidth: 320 }}>{children}</main>
        </div>
      </div>
    </div>
  );
}
