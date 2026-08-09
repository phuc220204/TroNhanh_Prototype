import { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { Shield, CheckSquare, MessageSquare, Users, Settings, LogOut } from "lucide-react";
import { C, font, radius, space } from "../../shared/theme";
import { useAuth } from "../../shared/contexts/AuthContext";

export type AdminNavId = "dashboard" | "moderation" | "reviews" | "users" | "settings";

interface AdminShellProps {
  active?: AdminNavId;
  children: ReactNode;
}

const ADMIN_NAV_ITEMS: { id: AdminNavId; label: string; path: string; icon: any }[] = [
  { id: "dashboard", label: "Tổng quan quản trị", path: "/quan-tri", icon: Shield },
  { id: "moderation", label: "Kiểm duyệt tin đăng", path: "/quan-tri/kiem-duyet-tin", icon: CheckSquare },
  { id: "reviews", label: "Quản lý đánh giá", path: "/quan-tri/danh-gia", icon: MessageSquare },
  { id: "users", label: "Quản lý người dùng", path: "/quan-tri/nguoi-dung", icon: Users },
  { id: "settings", label: "Cài đặt hệ thống", path: "/quan-tri/cai-dat", icon: Settings },
];

export function AdminShell({ active = "dashboard", children }: AdminShellProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex" }}>
      {/* Sidebar */}
      <aside style={{ width: 260, background: C.textPrimary, color: C.cream, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: `${space[5]}px ${space[6]}px`, borderBottom: `1px solid ${C.textSecondary}`, display: "flex", alignItems: "center", gap: space[2] }}>
          <div style={{ width: 36, height: 36, borderRadius: radius.sm, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={20} color={C.white} />
          </div>
          <div>
            <h1 style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.white, margin: 0, letterSpacing: "-0.01em" }}>Trọ Nhanh</h1>
            <span style={{ fontFamily: font, fontSize: 11, color: C.sand, fontWeight: 600 }}>Admin Portal</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isSelected = active === item.id || location.pathname === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 16px",
                  borderRadius: radius.sm,
                  fontFamily: font,
                  fontSize: 13.5,
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? C.white : C.sand,
                  background: isSelected ? C.primary : "transparent",
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                <Icon size={18} color={isSelected ? C.white : C.sand} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: `${space[4]}px ${space[5]}px`, borderTop: `1px solid ${C.textSecondary}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email || "Admin User"}
            </div>
            <span style={{ fontFamily: font, fontSize: 10.5, color: C.sand }}>Quản trị viên</span>
          </div>
          <button
            onClick={() => signOut()}
            title="Đăng xuất"
            style={{ background: "none", border: "none", cursor: "pointer", padding: space[1] + 2, color: C.sand }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{ height: 60, background: C.white, borderBottom: `1px solid ${C.border}`, padding: `0 ${space[8]}px`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Hệ thống Quản trị & Kiểm duyệt</h2>
          <Link to="/" style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.primary, textDecoration: "none" }}>
            ← Về Marketplace
          </Link>
        </header>

        <main style={{ flex: 1, padding: 28, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
