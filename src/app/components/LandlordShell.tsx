import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  LayoutGrid, Building2, FileText, Users, Wallet, Settings, LifeBuoy, LogOut,
  Bell, Home, MessageSquare, User, ChevronRight, X, Search,
} from "lucide-react";
import { C, font } from "../theme";
import { useBreakpoint } from "./useBreakpoint";
import { DemoBanner } from "./common/DemoBanner";
import { BrandLogo } from "./brand/BrandLogo";

export type LandlordNavId = "overview" | "rooms" | "listings" | "tenants" | "payments" | "settings";

/* Prototype has no real auth. This just clears any demo flags we might
   have set; it's a harmless no-op otherwise. Kept tiny on purpose. */
function clearDemoAuth() {
  try {
    localStorage.removeItem("tronhanh.demoUser");
    sessionStorage.removeItem("tronhanh.demoUser");
  } catch { /* storage unavailable — ignore */ }
}

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
        <button onClick={() => navigate("/chu-tro")} aria-label="Trọ Nhanh Landlord Hub" style={{ display: "flex", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <BrandLogo variant="full" size="sm" />
        </button>
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
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 13px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 500, color: C.textSecondary, width: "100%" }}><Search size={16} /> Về trang tìm phòng</button>
        <button style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 13px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 500, color: C.textSecondary, width: "100%" }}><LifeBuoy size={16} /> Hỗ trợ</button>
        <button onClick={() => { clearDemoAuth(); navigate("/"); }} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 13px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 600, color: C.repairing, width: "100%" }}><LogOut size={16} /> Đăng xuất</button>
      </div>
    </aside>
  );
}

function MobileHeader({ title }: { title: string }) {
  return (
    <div style={{ background: C.primaryDark, height: 56, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(42,26,12,0.22)", flexShrink: 0, "--tn-brand-logo-color": C.cream } as React.CSSProperties}>
      <BrandLogo variant="full" size="sm" />
      <span style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.cream, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
      <button style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
        <Bell size={17} color={C.cream} />
        <span style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: "50%", background: "#C8861A" }} />
      </button>
    </div>
  );
}

function MobileTabBar({ active }: { active: LandlordNavId }) {
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  const tabs: { Icon: typeof Home; label: string; on: LandlordNavId; onTap: () => void }[] = [
    { Icon: Home, label: "Trang chủ", on: "overview", onTap: () => navigate("/chu-tro") },
    { Icon: Building2, label: "Phòng", on: "rooms", onTap: () => navigate("/chu-tro/quan-ly-phong") },
    { Icon: MessageSquare, label: "Tin nhắn", on: "tenants", onTap: () => {} },
    { Icon: User, label: "Tài khoản", on: "settings", onTap: () => setAccountOpen(true) },
  ];

  return (
    <>
      <nav style={{ background: C.white, borderTop: `1px solid ${C.border}`, height: 60, display: "flex", boxShadow: "0 -2px 12px rgba(92,70,50,0.08)", flexShrink: 0, position: "sticky", bottom: 0, zIndex: 80 }}>
        {tabs.map(({ Icon, label, on, onTap }) => {
          const isActive = on === active || (label === "Tài khoản" && accountOpen);
          return (
            <button key={label} onClick={onTap} style={{ flex: 1, minHeight: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "none", border: "none", cursor: "pointer" }}>
              <Icon size={22} color={isActive ? C.primary : "#9B8C78"} strokeWidth={isActive ? 2.5 : 1.8} />
              <span style={{ fontFamily: font, fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? C.primary : "#9B8C78" }}>{label}</span>
            </button>
          );
        })}
      </nav>

      <AccountSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onNavigate={(to) => { setAccountOpen(false); navigate(to); }}
        onLogout={() => {
          setAccountOpen(false);
          clearDemoAuth();
          setLoggedOut(true);
          // Show the toast briefly, then return to the public home route.
          window.setTimeout(() => navigate("/"), 650);
        }}
      />
      <LogoutToast show={loggedOut} onDone={() => setLoggedOut(false)} />
    </>
  );
}

/* Mobile account bottom sheet — opened from the "Tài khoản" tab.
   Prototype only: items are placeholders except "Dashboard chủ trọ". */
function AccountSheet({ open, onClose, onNavigate, onLogout }: {
  open: boolean; onClose: () => void; onNavigate: (to: string) => void; onLogout: () => void;
}) {
  if (!open) return null;
  const items: { Icon: typeof User; label: string; action: () => void }[] = [
    { Icon: User, label: "Hồ sơ", action: onClose },
    { Icon: MessageSquare, label: "Tin nhắn", action: onClose },
    { Icon: LayoutGrid, label: "Dashboard chủ trọ", action: () => onNavigate("/chu-tro") },
    { Icon: Search, label: "Về trang tìm phòng", action: () => onNavigate("/") },
    { Icon: Settings, label: "Cài đặt", action: onClose },
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(42,26,12,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.white, width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "10px 0 calc(14px + env(safe-area-inset-bottom))", boxShadow: "0 -8px 40px rgba(30,18,10,0.2)", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: C.border, margin: "0 auto 14px" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px 12px" }}>
          <span style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary }}>Tài khoản</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={18} color={C.textSecondary} />
          </button>
        </div>

        {/* User info */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 18px 16px", borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <User size={22} color={C.primary} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Anh Minh</p>
            <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: "2px 0 0" }}>Chủ trọ · Đang dùng Landlord Hub</p>
          </div>
        </div>

        {items.map(({ Icon, label, action }) => (
          <button key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", padding: "13px 18px", minHeight: 48, border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Icon size={18} color={C.textSecondary} strokeWidth={1.9} />
            <span style={{ fontFamily: font, fontSize: 14.5, fontWeight: 500, color: C.textPrimary }}>{label}</span>
          </button>
        ))}

        {/* Logout — subtle warm danger, never harsh red */}
        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 6, paddingTop: 4 }}>
          <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", padding: "13px 18px", minHeight: 48, border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <LogOut size={18} color={C.repairing} strokeWidth={1.9} />
            <span style={{ fontFamily: font, fontSize: 14.5, fontWeight: 600, color: C.repairing }}>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function LogoutToast({ show, onDone }: { show: boolean; onDone: () => void }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [show, onDone]);
  if (!show) return null;
  return (
    <div style={{ position: "fixed", left: "50%", bottom: "calc(80px + env(safe-area-inset-bottom))", transform: "translateX(-50%)", zIndex: 400, background: C.primaryDark, color: C.cream, fontFamily: font, fontSize: 13.5, fontWeight: 600, padding: "11px 20px", borderRadius: 10, boxShadow: "0 8px 28px rgba(30,18,10,0.3)", whiteSpace: "nowrap" }}>
      Đã đăng xuất khỏi bản demo
    </div>
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
