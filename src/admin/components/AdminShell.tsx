import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import {
  Shield,
  CheckSquare,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { C, font, radius, space } from "../../shared/theme";
import { useAuth } from "../../shared/contexts/AuthContext";
import { useBreakpoint } from "../../shared/components/useBreakpoint";

export type AdminNavId = "dashboard" | "moderation" | "reviews" | "users" | "settings";

interface AdminShellProps {
  active?: AdminNavId;
  children: ReactNode;
}

const ADMIN_NAV_ITEMS: { id: AdminNavId; label: string; path: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Tổng quan", path: "/quan-tri", icon: Shield },
  { id: "moderation", label: "Kiểm duyệt tin đăng", path: "/quan-tri/kiem-duyet-tin", icon: CheckSquare },
  { id: "reviews", label: "Quản lý đánh giá", path: "/quan-tri/danh-gia", icon: MessageSquare },
  { id: "users", label: "Quản lý người dùng", path: "/quan-tri/nguoi-dung", icon: Users },
  { id: "settings", label: "Cài đặt hệ thống", path: "/quan-tri/cai-dat", icon: Settings },
];

function AdminBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: space[3], minWidth: 0 }}>
      <div
        aria-hidden="true"
        style={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: radius.md,
          background: C.primary,
          color: C.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Shield size={19} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: font, fontSize: 15, lineHeight: 1.25, fontWeight: 800, color: C.white }}>
          Trọ Nhanh
        </div>
        {!compact && (
          <div style={{ fontFamily: font, fontSize: 11, color: C.sand, marginTop: 3 }}>
            Admin Portal
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminShell({ active = "dashboard", children }: AdminShellProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();

  const navLink = (item: (typeof ADMIN_NAV_ITEMS)[number], compact = false) => {
    const Icon = item.icon;
    const isSelected = active === item.id || location.pathname === item.path;
    return (
      <Link
        key={item.id}
        to={item.path}
        aria-current={isSelected ? "page" : undefined}
        aria-label={compact ? item.label : undefined}
        title={compact ? item.label : undefined}
        data-testid={`admin-nav-${item.id}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: compact ? "center" : "flex-start",
          gap: space[3],
          padding: compact ? `${space[3]}px` : `${space[3]}px ${space[4]}px`,
          minHeight: 44,
          boxSizing: "border-box",
          borderRadius: radius.md,
          fontFamily: font,
          fontSize: 13,
          fontWeight: isSelected ? 700 : 500,
          color: isSelected ? C.white : C.sand,
          background: isSelected ? C.primary : "transparent",
          textDecoration: "none",
          whiteSpace: "nowrap",
          transition: "background 0.15s ease, color 0.15s ease",
        }}
      >
        <Icon size={18} aria-hidden="true" />
        {!compact && item.label}
      </Link>
    );
  };

  const signOutButton = (
    <button
      type="button"
      onClick={() => void signOut()}
      aria-label="Đăng xuất"
      title="Đăng xuất"
      data-testid="admin-signout"
      style={{
        minWidth: 40,
        minHeight: 40,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: space[2],
        padding: `${space[2]}px ${space[3]}px`,
        border: `1px solid ${isMobile ? C.border : "rgba(247, 239, 226, 0.2)"}`,
        borderRadius: radius.md,
        background: isMobile ? C.white : "transparent",
        color: isMobile ? C.textPrimary : C.sand,
        fontFamily: font,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      <LogOut size={16} aria-hidden="true" />
      {!isMobile && "Đăng xuất"}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex" }}>
      {!isMobile && (
        <aside
          data-testid="admin-sidebar"
          style={{
            width: isTablet ? 232 : 264,
            flexShrink: 0,
            boxSizing: "border-box",
            minHeight: "100vh",
            position: "sticky",
            top: 0,
            alignSelf: "flex-start",
            background: C.textPrimary,
            color: C.cream,
            display: "flex",
            flexDirection: "column",
            padding: `${space[5]}px ${space[3]}px ${space[4]}px`,
          }}
        >
          <div style={{ padding: `0 ${space[3]}px ${space[5]}px`, borderBottom: `1px solid ${C.textSecondary}` }}>
            <AdminBrand />
          </div>

          <div style={{ padding: `${space[5]}px ${space[3]}px ${space[2]}px`, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: C.secondary }}>
            Không gian quản trị
          </div>
          <nav aria-label="Điều hướng quản trị" style={{ display: "flex", flexDirection: "column", gap: space[1], padding: `0 ${space[1]}px`, flex: 1 }}>
            {ADMIN_NAV_ITEMS.map((item) => navLink(item))}
          </nav>

          <div style={{ borderTop: `1px solid ${C.textSecondary}`, marginTop: space[5], padding: `${space[4]}px ${space[2]}px 0`, display: "flex", alignItems: "center", gap: space[3] }}>
            <div aria-hidden="true" style={{ width: 38, height: 38, flexShrink: 0, borderRadius: radius.pill, background: C.secondary, color: C.textPrimary, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 800 }}>
              {(user?.email?.[0] || "A").toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, color: C.white, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.email || "Admin User"}
              </div>
              <div style={{ fontSize: 10.5, color: C.sand, marginTop: 3 }}>Quản trị viên</div>
            </div>
            {signOutButton}
          </div>
        </aside>
      )}

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {isMobile ? (
          <>
            <header style={{ minHeight: 64, boxSizing: "border-box", background: C.textPrimary, padding: `${space[3]}px ${space[4]}px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3] }}>
              <AdminBrand compact />
              <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                <span title={user?.email || "Admin User"} style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.cream, fontSize: 11.5, fontWeight: 600 }}>
                  {user?.email || "Admin User"}
                </span>
                {signOutButton}
              </div>
            </header>
            <nav aria-label="Điều hướng quản trị" data-testid="admin-mobile-nav" style={{ display: "flex", gap: space[2], overflowX: "auto", background: C.textPrimary, padding: `0 ${space[3]}px ${space[3]}px`, scrollbarWidth: "thin" }}>
              {ADMIN_NAV_ITEMS.map((item) => navLink(item))}
            </nav>
          </>
        ) : (
          <header style={{ minHeight: 68, boxSizing: "border-box", background: C.white, borderBottom: `1px solid ${C.border}`, padding: `0 ${isTablet ? space[5] : space[8]}px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[4] }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: C.textSecondary, letterSpacing: "0.08em", textTransform: "uppercase" }}>Trọ Nhanh · Admin</div>
              <div style={{ fontSize: 14, lineHeight: 1.4, fontWeight: 700, color: C.textPrimary, marginTop: 3 }}>Điều hành nền tảng</div>
            </div>
            <Link
              to="/"
              data-testid="admin-marketplace-link"
              style={{ display: "inline-flex", alignItems: "center", gap: space[2], fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.primary, textDecoration: "none", whiteSpace: "nowrap" }}
            >
              Về Marketplace <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </header>
        )}

        <main data-testid="admin-main" style={{ flex: 1, minWidth: 0, padding: isMobile ? space[4] : isTablet ? space[5] : space[8], overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
