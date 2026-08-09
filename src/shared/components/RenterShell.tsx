import { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { User, Star, FileText, Settings, Home } from "lucide-react";
import { C, font } from "../theme";
import { PublicNavbar } from "./PublicNavbar";

export type RenterNavId = "account" | "stays" | "reviews" | "contracts" | "settings";

interface RenterShellProps {
  active?: RenterNavId;
  children: ReactNode;
}

const RENTER_NAV_ITEMS: { id: RenterNavId; label: string; path: string; icon: any }[] = [
  { id: "account", label: "Tổng quan tài khoản", path: "/tai-khoan", icon: User },
  { id: "stays", label: "Phòng của tôi", path: "/tai-khoan/phong-cua-toi", icon: Home },
  { id: "reviews", label: "Đánh giá của tôi", path: "/tai-khoan/danh-gia", icon: Star },
  { id: "contracts", label: "Hợp đồng thuê", path: "/tai-khoan/hop-dong", icon: FileText },
  { id: "settings", label: "Cài đặt tài khoản", path: "/tai-khoan/cai-dat", icon: Settings },
];

export function RenterShell({ active = "account", children }: RenterShellProps) {
  const location = useLocation();

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", flexDirection: "column" }}>
      <PublicNavbar />
      <div style={{ flex: 1, maxWidth: 1280, margin: "0 auto", width: "100%", padding: "24px 20px 60px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Renter Sidebar Navigation */}
          <aside style={{ width: 260, flexShrink: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 12px", boxSizing: "border-box" }}>
            <div style={{ padding: "8px 12px 16px", borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
              <h2 style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Quản lý cá nhân</h2>
              <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "4px 0 0" }}>Tài khoản & Hợp đồng</p>
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {RENTER_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isSelected = active === item.id || location.pathname === item.path;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderRadius: 10,
                      fontFamily: font,
                      fontSize: 13.5,
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? C.primary : C.textPrimary,
                      background: isSelected ? C.caramelSoft : "transparent",
                      textDecoration: "none",
                      transition: "all 0.15s",
                    }}
                  >
                    <Icon size={16} color={isSelected ? C.primary : C.textSecondary} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content Area */}
          <main style={{ flex: 1, minWidth: 300 }}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
