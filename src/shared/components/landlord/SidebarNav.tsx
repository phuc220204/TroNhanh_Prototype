import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  LayoutGrid, Building2, FileText, Users, Wallet, Settings, LogOut,
  Bell, Home, MessageSquare, User, Search, Lock, X
} from "lucide-react";
import { C, font } from "../../theme";
import { BrandLogo } from "../brand/BrandLogo";
import { useAuth } from "../../contexts/AuthContext";
import { useSubscriptionContext } from "../../contexts/SubscriptionContext";
import type { SubscriptionStatus } from "../../types/status";

export type LandlordNavId = "overview" | "rooms" | "listings" | "occupants" | "payments" | "settings";

function clearDemoAuth() {
  try {
    localStorage.removeItem("tronhanh.demoUser");
    sessionStorage.removeItem("tronhanh.demoUser");
  } catch { /* storage unavailable — ignore */ }
}

const NAV_FREE: { id: LandlordNavId | "messages"; icon: typeof LayoutGrid; label: string; to?: string }[] = [
  { id: "overview", icon: LayoutGrid, label: "Tổng quan", to: "/chu-tro" },
  { id: "listings", icon: FileText, label: "Quản lý tin đăng", to: "/chu-tro/tin-dang" },
  { id: "messages", icon: MessageSquare, label: "Tin nhắn in-app", to: "/tin-nhan" },
];

const NAV_SAAS: { id: LandlordNavId; icon: typeof LayoutGrid; label: string; to?: string }[] = [
  { id: "rooms", icon: Building2, label: "Khu trọ & Phòng", to: "/chu-tro/quan-ly-phong?tab=rooms" },
  { id: "occupants", icon: Users, label: "Người ở & Hợp đồng", to: "/chu-tro/quan-ly-phong?tab=occupants" },
  { id: "payments", icon: Wallet, label: "Hóa đơn & Thanh toán", to: "/chu-tro/quan-ly-phong?tab=payments" },
  { id: "settings", icon: Settings, label: "Cài đặt khu trọ", to: "/chu-tro/quan-ly-phong?tab=settings" },
];

export function Sidebar({ active, onSaaSAccess }: { active: LandlordNavId; onSaaSAccess: () => void }) {
  const navigate = useNavigate();
  const { signOut, user, profile } = useAuth();
  const { status: subStatus, setDemoStatus } = useSubscriptionContext();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Chủ trọ";
  const displaySub = profile?.contact_phone || user?.email || "";

  return (
    <aside style={{ width: 248, background: C.white, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
      <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => navigate("/chu-tro")} aria-label="Trọ Nhanh Landlord Hub" style={{ display: "flex", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <BrandLogo variant="full" size="sm" />
        </button>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "8px 0 1px" }}>Landlord Hub</p>
        <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: 0 }}>Quản lý phòng trọ chuyên nghiệp</p>
      </div>

      {/* User Profile Card */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(240,231,214,0.15)" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, color: C.primary, fontFamily: font, fontSize: 15 }}>
          {displayName[0].toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={displayName}>{displayName}</p>
          <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={displaySub}>{displaySub}</p>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
        {/* Nhóm 1: Miễn phí */}
        <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", margin: "6px 12px 6px" }}>Tin đăng (Miễn phí)</p>
        {NAV_FREE.map(({ id, icon: Icon, label, to }) => {
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

        {/* Nhóm 2: SaaS */}
        <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", margin: "16px 12px 6px" }}>Quản lý vận hành (SaaS)</p>
        {NAV_SAAS.map(({ id, icon: Icon, label, to }) => {
          const isActive = id === active;
          const isLocked = subStatus === "NONE";
          return (
            <button key={id} 
              onClick={() => {
                if (isLocked) {
                  onSaaSAccess();
                } else if (to) {
                  navigate(to);
                }
              }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", borderRadius: 10, border: "none", background: isActive ? C.caramelSoft : "transparent", cursor: "pointer", fontFamily: font, fontSize: 13.5, fontWeight: isActive ? 700 : 500, color: isActive ? C.primary : C.textSecondary, textAlign: "left", width: "100%" }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.bg; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <Icon size={17} /> {label}
              </span>
              {isLocked && <Lock size={14} color="#9B8C78" />}
            </button>
          );
        })}
      </nav>

      {/* Plan Switcher Widget */}
      <div style={{ padding: "10px 12px 14px", borderTop: `1px solid ${C.border}` }}>
        <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, margin: "0 0 6px" }}>Giả lập gói (Reviewer)</p>
        <select 
          value={subStatus}
          onChange={e => setDemoStatus(e.target.value as SubscriptionStatus)}
          style={{ 
            fontFamily: font, fontSize: 12.5, fontWeight: 700, 
            color: subStatus === "ACTIVE" ? "#4A7A34" : subStatus === "TRIAL" ? C.primary : subStatus === "READ_ONLY" ? C.repairing : C.textSecondary,
            background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", width: "100%", outline: "none", cursor: "pointer"
          }}>
          <option value="NONE" style={{ color: C.textSecondary }}>Chưa đăng ký (NONE)</option>
          <option value="TRIAL" style={{ color: C.primary }}>Dùng thử (TRIAL)</option>
          <option value="ACTIVE" style={{ color: "#4A7A34" }}>Kích hoạt (ACTIVE)</option>
          <option value="READ_ONLY" style={{ color: C.repairing }}>Chỉ đọc (READ_ONLY)</option>
        </select>
      </div>

      <div style={{ padding: "0 12px 14px" }}>
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 13px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 500, color: C.textSecondary, width: "100%" }}><Search size={16} /> Về trang tìm phòng</button>
        <button onClick={() => { signOut(); clearDemoAuth(); navigate("/"); }} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 13px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 600, color: C.repairing, width: "100%" }}><LogOut size={16} /> Đăng xuất</button>
      </div>
    </aside>
  );
}

export function MobileHeader({ title }: { title: string }) {
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

export function MobileTabBar({ active, onSaaSAccess }: { active: LandlordNavId; onSaaSAccess: () => void }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { status: subStatus } = useSubscriptionContext();
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  const tabs: { Icon: typeof Home; label: string; on: LandlordNavId; onTap: () => void }[] = [
    { Icon: Home, label: "Trang chủ", on: "overview", onTap: () => navigate("/chu-tro") },
    { 
      Icon: Building2, label: "Phòng", on: "rooms", 
      onTap: () => {
        if (subStatus === "NONE") onSaaSAccess();
        else navigate("/chu-tro/quan-ly-phong");
      } 
    },
    { 
      Icon: MessageSquare, label: "Tin nhắn", on: "occupants", 
      onTap: () => {
        if (subStatus === "NONE") onSaaSAccess();
      } 
    },
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
          signOut();
          clearDemoAuth();
          setLoggedOut(true);
          window.setTimeout(() => navigate("/"), 650);
        }}
      />
      <LogoutToast show={loggedOut} onDone={() => setLoggedOut(false)} />
    </>
  );
}

function AccountSheet({ open, onClose, onNavigate, onLogout }: {
  open: boolean; onClose: () => void; onNavigate: (to: string) => void; onLogout: () => void;
}) {
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Chủ trọ";
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

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 18px 16px", borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <User size={22} color={C.primary} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{displayName}</p>
            <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: "2px 0 0" }}>Đang dùng Landlord Hub</p>
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
      Đã đăng xuất khỏi bản quản lý
    </div>
  );
}
