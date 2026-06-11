import { useNavigate } from "react-router";
import {
  LayoutGrid, Building2, FileText, Users, Wallet, Settings, LifeBuoy, LogOut,
  Bell, Home, MessageSquare, User, ChevronRight,
} from "lucide-react";
import { C, font } from "../theme";
import { useBreakpoint } from "./useBreakpoint";
import { DemoBanner } from "./common/DemoBanner";

export type LandlordNavId = "overview" | "rooms" | "listings" | "tenants" | "payments" | "settings";

const NAV: { id: LandlordNavId; icon: typeof LayoutGrid; label: string; to?: string }[] = [
  { id: "overview", icon: LayoutGrid, label: "Overview", to: "/chu-tro" },
  { id: "rooms", icon: Building2, label: "Khu trọ & Phòng", to: "/chu-tro/quan-ly-phong" },
  { id: "listings", icon: FileText, label: "Tin đăng", to: "/chu-tro/quan-ly" },
  { id: "tenants", icon: Users, label: "Người thuê" },
  { id: "payments", icon: Wallet, label: "Thanh toán" },
  { id: "settings", icon: Settings, label: "Cài đặt" },
];

/* Breadcrumb used inside the content area of every landlord page */
export function LandlordBreadcrumb({ trail }: { trail: string[] }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
      {trail.map((t, i) => {
        const last = i === trail.length - 1;
        const isRoot = i === 0;
        return (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span onClick={isRoot ? () => navigate("/chu-tro") : undefined}
              style={{ fontFamily: font, fontSize: 13, fontWeight: last ? 700 : 600, color: last ? C.primary : C.textSecondary, cursor: isRoot ? "pointer" : "default" }}>
              {t}
            </span>
            {!last && <ChevronRight size={15} color={C.textSecondary} />}
          </span>
        );
      })}
    </div>
  );
}

function Sidebar({ active }: { active: LandlordNavId }) {
  const navigate = useNavigate();
  return (
    <aside style={{ width: 248, background: C.white, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
      <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: font, fontSize: 21, fontWeight: 800, color: C.primary, letterSpacing: "-0.02em", cursor: "pointer" }} onClick={() => navigate("/chu-tro")}>Trọ Nhanh</span>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "8px 0 1px" }}>Landlord Hub</p>
        <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: 0 }}>Manage your rentals</p>
      </div>
      <nav style={{ flex: 1, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
        {NAV.map(({ id, icon: Icon, label, to }) => {
          const isActive = id === active;
          return (
            <button key={id} onClick={to ? () => navigate(to) : undefined}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 13px", borderRadius: 10, border: "none", background: isActive ? C.caramelSoft : "transparent", cursor: "pointer", fontFamily: font, fontSize: 13.5, fontWeight: isActive ? 700 : 500, color: isActive ? C.primary : C.textSecondary, textAlign: "left", width: "100%" }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.bg; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
              <Icon size={17} /> {label}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "0 12px 14px" }}>
        <div style={{ background: C.caramelSoft, borderRadius: 12, padding: "14px 15px", marginBottom: 10 }}>
          <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px", lineHeight: 1.4 }}>Cần hỗ trợ quản lý tốt hơn?</p>
          <button style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.white, background: C.primary, border: "none", borderRadius: 8, padding: "7px 13px", cursor: "pointer", width: "100%" }}>Liên hệ hỗ trợ</button>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 13px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 500, color: C.textSecondary, width: "100%" }}><LifeBuoy size={16} /> Hỗ trợ</button>
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 13px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 500, color: C.textSecondary, width: "100%" }}><LogOut size={16} /> Logout</button>
      </div>
    </aside>
  );
}

function MobileHeader({ title }: { title: string }) {
  return (
    <div style={{ background: C.primaryDark, height: 56, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(42,26,12,0.22)", flexShrink: 0 }}>
      <span style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.cream, flex: 1 }}>{title}</span>
      <button style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
        <Bell size={17} color={C.cream} />
        <span style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: "50%", background: "#C8861A" }} />
      </button>
    </div>
  );
}

function MobileTabBar({ active }: { active: LandlordNavId }) {
  const navigate = useNavigate();
  const tabs: { Icon: typeof Home; label: string; on: LandlordNavId; to?: string }[] = [
    { Icon: Home, label: "Trang chủ", on: "overview", to: "/chu-tro" },
    { Icon: Building2, label: "Phòng", on: "rooms", to: "/chu-tro/quan-ly-phong" },
    { Icon: MessageSquare, label: "Tin nhắn", on: "tenants" },
    { Icon: User, label: "Tài khoản", on: "settings" },
  ];
  return (
    <nav style={{ background: C.white, borderTop: `1px solid ${C.border}`, height: 60, display: "flex", boxShadow: "0 -2px 12px rgba(92,70,50,0.08)", flexShrink: 0, position: "sticky", bottom: 0, zIndex: 80 }}>
      {tabs.map(({ Icon, label, on, to }) => {
        const isActive = on === active;
        return (
          <button key={label} onClick={to ? () => navigate(to) : undefined} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "none", border: "none", cursor: "pointer" }}>
            <Icon size={22} color={isActive ? C.primary : "#9B8C78"} strokeWidth={isActive ? 2.5 : 1.8} />
            <span style={{ fontFamily: font, fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? C.primary : "#9B8C78" }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Shared Landlord Hub shell.
 * Desktop: left sidebar + scrollable content.
 * Mobile: app header + scrollable content + bottom tab bar.
 * The page provides its own (responsive) content as children.
 */
export function LandlordShell({ active, mobileTitle, children }: { active: LandlordNavId; mobileTitle: string; children: React.ReactNode }) {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <MobileHeader title={mobileTitle} />
        <DemoBanner mobile />
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
        <MobileTabBar active={active} />
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex" }}>
      <Sidebar active={active} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <DemoBanner />
        <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
