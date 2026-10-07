import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  LayoutGrid, Building2, FileText, Users, Wallet, Settings, LogOut,
  Home, MessageSquare, User, Search, Lock, X, ChevronLeft, Star, UserSearch, Crown
} from "lucide-react";
import { C, font, shadow } from "../../theme";
import { BrandLogo } from "../brand/BrandLogo";
import { useAuth } from "../../contexts/AuthContext";
import { useSubscriptionContext } from "../../contexts/SubscriptionContext";
import { useUnreadMessageCount } from "../../hooks/useUnreadMessageCount";

export type LandlordNavId =
  | "overview" | "rooms" | "listings" | "occupants" | "billing" | "settings"
  | "find-renter" | "reviews"
  /** Hộp thư `/tin-nhan` khi mở từ khu chủ trọ — miễn phí, không thuộc SAAS_NAV_IDS. */
  | "messages"
  /** Trang mua/gia hạn gói — KHÔNG thuộc SAAS_NAV_IDS: người chưa có gói phải vào được để mua. */
  | "plans";

/** Các trang thuộc module SaaS (bị khóa khi chưa có gói). Một chỗ duy nhất — LandlordShell dùng lại. */
export const SAAS_NAV_IDS: readonly LandlordNavId[] = [
  "overview", "rooms", "occupants", "billing", "settings", "find-renter", "reviews",
];

/** Giá trị hợp lệ của `?tab=` trong /chu-tro/quan-ly-phong. */
export const ROOM_PAGE_TABS: readonly LandlordNavId[] = ["rooms", "occupants", "settings"];

/**
 * Router state gửi kèm khi mở `/tin-nhan` từ khu chủ trọ. Hộp thư thấy cờ này
 * thì render trong `LandlordShell` (giữ sidebar) thay vì navbar công khai —
 * trước đây bấm "Tin nhắn" là văng khỏi khu chủ trọ, không có lối quay lại.
 */
export const LANDLORD_INBOX_STATE = { fromLandlord: true } as const;

export function isLandlordInboxState(state: unknown): boolean {
  return typeof state === "object" && state !== null && (state as { fromLandlord?: unknown }).fromLandlord === true;
}

function UnreadDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span data-testid="sidebar-unread-badge" style={{ marginLeft: "auto", background: C.repairing, color: C.white, fontFamily: font, fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "1px 7px" }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}


// Khu vực chủ trọ giờ CHỈ còn phần vận hành. "Quản lý tin đăng" đã chuyển sang
// `/tai-khoan/tin-cho-thue`: đăng tin là việc miễn phí ai cũng làm được, để nó
// ở đây khiến người chỉ muốn đăng một tin phải đi vào khu vực SaaS và nhìn một
// sidebar toàn mục bị khóa kèm lời mời mua gói.
// Nhóm 1 KHÔNG còn là "tính năng miễn phí trong khu chủ trọ" nữa — nó là hai
// LỐI TẮT ra ngoài khu vực này. Cả hai đều nằm ở `/tai-khoan/*` và `/tin-nhan`,
// dùng được không cần gói.
const NAV_FREE: { id: LandlordNavId; icon: typeof LayoutGrid; label: string; to?: string }[] = [
  { id: "listings", icon: FileText, label: "Tin đăng của tôi", to: "/tai-khoan/tin-cho-thue" },
  { id: "messages", icon: MessageSquare, label: "Tin nhắn", to: "/tin-nhan" },
];

// "Tổng quan" chuyển xuống đây: sau khi quản lý tin đăng dọn sang khu tài
// khoản, dashboard chỉ còn số liệu vận hành — nó là SaaS, và bị khóa cùng nhóm.
// Để nó ở nhóm "miễn phí" là nói dối người dùng về thứ họ bấm được.
const NAV_SAAS: { id: LandlordNavId; icon: typeof LayoutGrid; label: string; to?: string }[] = [
  { id: "overview", icon: LayoutGrid, label: "Tổng quan", to: "/chu-tro" },
  { id: "rooms", icon: Building2, label: "Khu trọ & Phòng", to: "/chu-tro/quan-ly-phong?tab=rooms" },
  { id: "occupants", icon: Users, label: "Người ở & Hợp đồng", to: "/chu-tro/quan-ly-phong?tab=occupants" },
  // Một màn hóa đơn duy nhất: /chu-tro/hoa-don (có nhật ký thu tiền, ghi nhận đã thu).
  { id: "billing", icon: Wallet, label: "Hóa đơn & Thanh toán", to: "/chu-tro/hoa-don" },
  { id: "settings", icon: Settings, label: "Cài đặt khu trọ", to: "/chu-tro/quan-ly-phong?tab=settings" },
  { id: "find-renter", icon: UserSearch, label: "Tìm người thuê", to: "/chu-tro/tim-nguoi-thue" },
  { id: "reviews", icon: Star, label: "Đánh giá khu trọ", to: "/chu-tro/danh-gia" },
];

export function Sidebar({ active, onSaaSAccess }: { active: LandlordNavId; onSaaSAccess: () => void }) {
  const navigate = useNavigate();
  const { signOut, user, profile } = useAuth();
  const { status: subStatus } = useSubscriptionContext();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Chủ trọ";
  const displaySub = profile?.contact_phone || user?.email || "";
  const unreadCount = useUnreadMessageCount();

  return (
    <aside style={{ width: 248, background: C.white, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
      <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => navigate("/chu-tro")} aria-label="Về tổng quan chủ trọ" style={{ display: "flex", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <BrandLogo variant="full" size="sm" />
        </button>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "8px 0 1px" }}>Khu chủ trọ</p>
        <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: 0 }}>Quản lý phòng trọ chuyên nghiệp</p>
      </div>

      {/* User Profile Card */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: C.bg }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, color: C.primary, fontFamily: font, fontSize: 15 }}>
          {displayName[0].toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={displayName}>{displayName}</p>
          <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={displaySub}>{displaySub}</p>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
        {/* Nhóm 1: lối tắt ra khu vực tài khoản (miễn phí) */}
        <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", margin: "6px 12px 6px" }}>Lối tắt (Miễn phí)</p>
        {NAV_FREE.map(({ id, icon: Icon, label, to }) => {
          const isActive = id === active;
          return (
            <button key={id} onClick={to ? () => navigate(to, id === "messages" ? { state: LANDLORD_INBOX_STATE } : undefined) : undefined}
              data-testid={`sidebar-nav-${id}`}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 13px", borderRadius: 10, border: "none", background: isActive ? C.caramelSoft : "transparent", cursor: "pointer", fontFamily: font, fontSize: 13.5, fontWeight: isActive ? 700 : 500, color: isActive ? C.primary : C.textSecondary, textAlign: "left", width: "100%" }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.bg; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
              <Icon size={17} /> {label}
              {id === "messages" && <UnreadDot count={unreadCount} />}
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
              {isLocked && <Lock size={14} color={C.rented} />}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "0 12px 14px" }}>
        <button onClick={() => navigate("/chu-tro/goi-dich-vu")} data-testid="sidebar-plans-link" style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 13px", borderRadius: 10, border: "none", background: active === "plans" ? C.caramelSoft : "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: active === "plans" ? 700 : 600, color: C.primary, width: "100%" }}><Crown size={16} /> Gói dịch vụ</button>
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 13px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 500, color: C.textSecondary, width: "100%" }}><Search size={16} /> Về trang tìm phòng</button>
        <button onClick={() => { signOut(); navigate("/"); }} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 13px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 600, color: C.repairing, width: "100%" }}><LogOut size={16} /> Đăng xuất</button>
      </div>
    </aside>
  );
}

export function MobileHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div style={{ background: C.primaryDark, height: 56, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, position: "sticky", top: 0, zIndex: 100, boxShadow: shadow.sm, flexShrink: 0, "--tn-brand-logo-color": C.cream } as React.CSSProperties}>
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Quay lại tổng quan" data-testid="landlord-mobile-back" style={{ background: "none", border: "none", padding: 0, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "flex-start", cursor: "pointer", color: C.cream }}>
          <ChevronLeft size={24} />
        </button>
      ) : (
        <BrandLogo variant="full" size="sm" />
      )}
      <span style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.cream, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
    </div>
  );
}

export function MobileTabBar({ active, onSaaSAccess }: { active: LandlordNavId; onSaaSAccess: () => void }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { status: subStatus } = useSubscriptionContext();
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  const openSaaS = (to: string) => () => {
    if (subStatus === "NONE") onSaaSAccess();
    else navigate(to);
  };
  // `on`: các trang làm tab sáng. "Tin nhắn"/"Tài khoản" là lối ra ngoài, không
  // ứng với trang nào ở đây (trước đây gán nhầm occupants/settings nên sáng sai).
  const tabs: { Icon: typeof Home; label: string; on: LandlordNavId[]; onTap: () => void }[] = [
    { Icon: Home, label: "Tổng quan", on: ["overview"], onTap: () => navigate("/chu-tro") },
    { Icon: Building2, label: "Phòng", on: ["rooms", "occupants", "settings"], onTap: openSaaS("/chu-tro/quan-ly-phong") },
    { Icon: Wallet, label: "Hóa đơn", on: ["billing"], onTap: openSaaS("/chu-tro/hoa-don") },
    { Icon: MessageSquare, label: "Tin nhắn", on: ["messages"], onTap: () => navigate("/tin-nhan", { state: LANDLORD_INBOX_STATE }) },
    { Icon: User, label: "Tài khoản", on: [], onTap: () => setAccountOpen(true) },
  ];

  return (
    <>
      <nav style={{ background: C.white, borderTop: `1px solid ${C.border}`, height: 60, display: "flex", boxShadow: shadow.sm, flexShrink: 0, position: "sticky", bottom: 0, zIndex: 80 }}>
        {tabs.map(({ Icon, label, on, onTap }) => {
          const isActive = on.includes(active) || (label === "Tài khoản" && accountOpen);
          return (
            <button key={label} onClick={onTap} style={{ flex: 1, minHeight: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "none", border: "none", cursor: "pointer" }}>
              <Icon size={22} color={isActive ? C.primary : C.rented} strokeWidth={isActive ? 2.5 : 1.8} />
              <span style={{ fontFamily: font, fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? C.primary : C.rented }}>{label}</span>
            </button>
          );
        })}
      </nav>

      <AccountSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onNavigate={(to, state) => { setAccountOpen(false); navigate(to, state ? { state } : undefined); }}
        onLogout={() => {
          setAccountOpen(false);
          signOut();
          setLoggedOut(true);
          window.setTimeout(() => navigate("/"), 650);
        }}
      />
      <LogoutToast show={loggedOut} onDone={() => setLoggedOut(false)} />
    </>
  );
}

function AccountSheet({ open, onClose, onNavigate, onLogout }: {
  open: boolean; onClose: () => void; onNavigate: (to: string, state?: unknown) => void; onLogout: () => void;
}) {
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Chủ trọ";
  if (!open) return null;
  // Ba mục "Hồ sơ" / "Tin nhắn" / "Cài đặt" trước đây gán `action: onClose` —
  // bấm chỉ đóng sheet chứ không đi đâu. Cả ba đều đã có trang thật.
  const items: { Icon: typeof User; label: string; action: () => void }[] = [
    { Icon: User, label: "Hồ sơ", action: () => onNavigate("/tai-khoan") },
    { Icon: Crown, label: "Gói dịch vụ", action: () => onNavigate("/chu-tro/goi-dich-vu") },
    { Icon: FileText, label: "Tin đăng của tôi", action: () => onNavigate("/tai-khoan/tin-cho-thue") },
    { Icon: MessageSquare, label: "Tin nhắn", action: () => onNavigate("/tin-nhan", LANDLORD_INBOX_STATE) },
    { Icon: LayoutGrid, label: "Tổng quan chủ trọ", action: () => onNavigate("/chu-tro") },
    { Icon: Search, label: "Về trang tìm phòng", action: () => onNavigate("/") },
    { Icon: Settings, label: "Cài đặt", action: () => onNavigate("/tai-khoan/cai-dat") },
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: C.overlay, zIndex: 300, display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.white, width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "10px 0 calc(14px + env(safe-area-inset-bottom))", boxShadow: shadow.lg, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: C.border, margin: "0 auto 14px" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px 12px" }}>
          <span style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary }}>Tài khoản</span>
          <button type="button" aria-label="Đóng bảng tài khoản" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} color={C.textSecondary} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 18px 16px", borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <User size={22} color={C.primary} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{displayName}</p>
            <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: "2px 0 0" }}>Khu chủ trọ</p>
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
    <div style={{ position: "fixed", left: "50%", bottom: "calc(80px + env(safe-area-inset-bottom))", transform: "translateX(-50%)", zIndex: 400, background: C.primaryDark, color: C.cream, fontFamily: font, fontSize: 13.5, fontWeight: 600, padding: "11px 20px", borderRadius: 10, boxShadow: shadow.lg, whiteSpace: "nowrap" }}>
      Đã đăng xuất khỏi bản quản lý
    </div>
  );
}
