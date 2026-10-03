import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useBreakpoint } from "./useBreakpoint";
import {
  Search, Heart, User, ChevronDown,
  Key, UserSearch, FileText, Building2, Shield, LogOut,
  X, Menu, MessageSquare
} from "lucide-react";
import { C, font } from "../theme";
import { BrandLogo } from "./brand/BrandLogo";
import { useAuth } from "../contexts/AuthContext";
import { getTotalUnreadCount } from "../services/messaging-service";

/* ══════════════════════════════════════════
   ĐĂNG TIN DROPDOWN
══════════════════════════════════════════ */
function DangTinDropdown({ onRenter, onLandlord, onClose }: {
  onRenter: () => void; onLandlord: () => void; onClose: () => void;
}) {
  return (
    <div id="posting-menu" style={{
      position: "absolute", top: "calc(100% + 10px)", right: 0,
      background: C.white, border: `1px solid ${C.border}`,
      borderRadius: 16, boxShadow: "0 12px 40px rgba(92,70,50,0.16)",
      padding: 8, width: 290, zIndex: 200,
    }}>
      <p style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: C.textSecondary, margin: "6px 10px 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Chọn loại tin đăng
      </p>
      {[
        {
          Icon: Key,
          title: "Đăng tin cho thuê",
          desc: "Dành cho chủ trọ muốn đăng phòng cho thuê.",
          action: onLandlord,
        },
        {
          Icon: UserSearch,
          title: "Đăng tin tìm phòng",
          desc: "Dành cho người thuê muốn đăng nhu cầu tìm phòng.",
          action: onRenter,
        },
      ].map(({ Icon, title, desc, action }) => (
        <button key={title} type="button" onClick={() => { action(); onClose(); }}
          style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%", padding: "12px 12px", border: "none", background: "transparent", borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}
          onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={17} color={C.primary} strokeWidth={1.8} />
          </div>
          <div>
            <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 2px" }}>{title}</p>
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.45 }}>{desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   ACCOUNT DROPDOWN
══════════════════════════════════════════ */
function AccountDropdown({ onLandlord, onSignOut, onClose }: { onLandlord: () => void; onSignOut: () => void; onClose: () => void }) {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isStaff = hasRole("Admin") || hasRole("Moderator");

  /**
   * Ba mục đầu trước đây là `action: () => {}` — bấm vào KHÔNG có gì xảy ra, dù
   * `/tai-khoan` và `/tin-nhan` đã tồn tại từ T12/T25. "Tin đã lưu" thì không có
   * route nào cả nên đã bỏ hẳn (nguyên tắc đã chốt: nút không làm được việc thì
   * xóa, không dán nhãn phiên bản).
   *
   * Và thiếu hẳn đường vào `/quan-tri`: Admin đăng nhập không có cách nào tới màn
   * kiểm duyệt ngoài việc tự gõ URL — mà với hash router thì gõ
   * `localhost:5173/quan-tri` còn ra trang chủ, phải là `localhost:5173/#/quan-tri`.
   */
  const sections = [
    {
      label: "Tài khoản",
      items: [
        { label: "Hồ sơ", testId: "account-menu-profile", Icon: User, action: () => navigate("/tai-khoan") },
        { label: "Tin đăng của tôi", testId: "account-menu-listings", Icon: FileText, action: () => navigate("/tai-khoan/tin-cho-thue") },
        { label: "Tin nhắn", testId: "account-menu-messages", Icon: MessageSquare, action: () => navigate("/tin-nhan") },
        { label: "Tin đã lưu", testId: "account-menu-saved", Icon: Heart, action: () => navigate("/yeu-thich") },
      ],
    },
    {
      label: "Quản lý",
      items: [
        { label: "Dashboard chủ trọ", testId: "account-menu-landlord", Icon: Building2, action: onLandlord },
        ...(isStaff ? [{ label: "Quản trị hệ thống", testId: "account-menu-admin", Icon: Shield, action: () => navigate("/quan-tri") }] : []),
      ],
    },
  ];
  return (
    <div id="account-menu" aria-label="Tài khoản" style={{
      position: "absolute", top: "calc(100% + 10px)", right: 0,
      background: C.white, border: `1px solid ${C.border}`,
      borderRadius: 16, boxShadow: "0 16px 44px rgba(50,34,22,0.18)",
      padding: "8px 0", width: 252, zIndex: 200,
    }}>
      {sections.map((section, sectionIndex) => (
        <div key={section.label} style={{ padding: sectionIndex === 0 ? "0 8px 6px" : "6px 8px" }}>
          <p style={{ fontFamily: font, fontSize: 10.5, fontWeight: 800, color: C.textSecondary, margin: "4px 10px 5px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {section.label}
          </p>
          {section.items.map(({ label, testId, Icon, action }) => (
            <button key={label} type="button" onClick={() => { action(); onClose(); }}
              data-testid={testId}
              style={{
                display: "flex", alignItems: "center", gap: 11, width: "100%", minHeight: 42,
                padding: "8px 10px", border: "none", borderRadius: 10,
                background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: font,
                fontSize: 14, color: C.textPrimary, fontWeight: 550, transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Icon size={17} color={C.textSecondary} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      ))}
      <button type="button" onClick={() => { onSignOut(); onClose(); }}
        data-testid="account-menu-signout"
        style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", minHeight: 46, padding: "9px 18px", marginTop: 3, border: "none", borderTop: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: font, fontSize: 14, color: C.error, fontWeight: 600 }}
        onMouseEnter={e => (e.currentTarget.style.background = "#FDF5F2")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
        <LogOut size={17} strokeWidth={1.8} />
        <span>Đăng xuất</span>
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════
   DESKTOP PUBLIC NAVBAR
══════════════════════════════════════════ */
export function PublicNavbarDesktop({
  onSearch, searchQuery = "", onSearchChange,
}: {
  onSearch?: () => void;
  searchQuery?: string;
  onSearchChange?: (v: string) => void;
}) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [dangTinOpen, setDangTinOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery || "");
  const [unreadCount, setUnreadCount] = useState(0);
  const dangTinRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const dangTinTriggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    getTotalUnreadCount().then(setUnreadCount);
  }, [user]);

  useEffect(() => {
    setLocalQuery(searchQuery || "");
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dangTinRef.current && !dangTinRef.current.contains(e.target as Node)) setDangTinOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (accountOpen) {
        setAccountOpen(false);
        accountTriggerRef.current?.focus();
      }
      if (dangTinOpen) {
        setDangTinOpen(false);
        dangTinTriggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [accountOpen, dangTinOpen]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const goSearch = () => {
    navigate(`/tim-phong?loc=${encodeURIComponent(localQuery)}`);
  };

  return (
    <nav style={{
      background: C.white,
      borderBottom: `1px solid ${scrolled ? C.border : "transparent"}`,
      height: 68,
      display: "flex", alignItems: "center",
      padding: "0 28px", gap: 16,
      position: "sticky", top: 0, zIndex: 100,
      boxShadow: scrolled ? "0 2px 16px rgba(92,70,50,0.09)" : "0 1px 4px rgba(92,70,50,0.05)",
      transition: "box-shadow 0.2s, border-color 0.2s",
    }}>
      {/* LEFT — Brand */}
      <button onClick={() => navigate("/")} aria-label="Trọ Nhanh - Trang chủ" style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: "4px 0", flexShrink: 0 }}>
        <BrandLogo variant="full" size="md" />
      </button>

      {/* CENTER — Search bar */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 20px" }}>
        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: C.white, border: `1.5px solid ${C.border}`,
            borderRadius: 999, padding: "8px 14px 8px 18px",
            cursor: "text", width: "100%", maxWidth: 450,
            transition: "border-color 0.15s, box-shadow 0.15s",
            boxShadow: "0 1px 4px rgba(92,70,50,0.04)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = C.secondary;
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(92,70,50,0.08)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(92,70,50,0.04)";
          }}
        >
          <Search size={15} color={C.textSecondary} style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            aria-label="Tìm phòng theo khu vực, phường hoặc tên trường"
            value={localQuery}
            onChange={e => {
              setLocalQuery(e.target.value);
              onSearchChange?.(e.target.value);
            }}
            onKeyDown={e => e.key === "Enter" && goSearch()}
            placeholder="Tìm khu vực, phường, tên trường..."
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontFamily: font, fontSize: 13.5, color: C.textPrimary,
              cursor: "text",
            }}
          />
          <div style={{ width: 1, height: 16, background: C.border, flexShrink: 0 }} />
          <button
            type="button"
            aria-label="Tìm phòng"
            onClick={e => { e.stopPropagation(); goSearch(); }}
            style={{
              background: C.primary, borderRadius: 999, padding: "5px 16px",
              fontFamily: font, fontSize: 12, fontWeight: 700, color: "#fff",
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              transition: "background 0.12s", border: "none", minHeight: 36,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.primaryHover)}
            onMouseLeave={e => (e.currentTarget.style.background = C.primary)}
          >
            Tìm
          </button>
        </div>
      </div>

      {/* RIGHT — Nav actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {/* Tìm phòng */}
        <NavLink label="Tìm phòng" onClick={goSearch} />

        <NavLink label="Tin nhu cầu" onClick={() => navigate("/tin-nhu-cau")} />

        {/* Yêu thích — nút này từng KHÔNG có `onClick` (bấm chỉ đổi màu nền) vì
            tính năng lưu tin chưa được làm. Giờ đã có bảng `saved_listings` +
            trang `/yeu-thich`, nên nó dẫn tới đúng chỗ. */}
        <button onClick={() => navigate("/yeu-thich")}
          data-testid="nav-saved-listings"
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "8px 12px", borderRadius: 8 }}
          onMouseEnter={e => (e.currentTarget.style.background = C.cream)}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
          <Heart size={15} color={C.textSecondary} strokeWidth={1.8} />
          <span style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, whiteSpace: "nowrap" }}>Yêu thích</span>
        </button>

        {user && (
          <button
            onClick={() => navigate("/tin-nhan")}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "8px 12px", borderRadius: 8, position: "relative" }}
            onMouseEnter={e => (e.currentTarget.style.background = C.cream)}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <MessageSquare size={15} color={C.textSecondary} strokeWidth={1.8} />
            <span style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, whiteSpace: "nowrap" }}>Tin nhắn</span>
            {unreadCount > 0 && (
              <span data-testid="unread-badge" style={{ background: C.repairing, color: "white", fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "1px 6px", marginLeft: 2 }}>
                {unreadCount}
              </span>
            )}
          </button>
        )}

        <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px" }} />

        {/* Đăng tin dropdown */}
        <div ref={dangTinRef} style={{ position: "relative" }}>
          <button
            ref={dangTinTriggerRef}
            type="button"
            aria-haspopup="true"
            aria-controls="posting-menu"
            aria-expanded={dangTinOpen}
            onClick={() => { setDangTinOpen(v => !v); setAccountOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: C.primary,
              border: "none", borderRadius: 10,
              padding: "8px 16px", cursor: "pointer", transition: "background 0.12s",
              boxShadow: "0 2px 8px rgba(138,106,69,0.2)"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.primaryHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.primary; }}>
            <span style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.white, whiteSpace: "nowrap" }}>Đăng tin</span>
            <ChevronDown size={14} color={C.white} style={{ transition: "transform 0.15s", transform: dangTinOpen ? "rotate(180deg)" : "none" }} />
          </button>
          {dangTinOpen && (
            <DangTinDropdown
              onRenter={() => navigate("/dang-tin-nhu-cau")}
              onLandlord={() => navigate("/dang-tin-cho-thue")}
              onClose={() => setDangTinOpen(false)}
            />
          )}
        </div>

        {/* Đăng nhập / Account */}
        <div ref={accountRef} style={{ position: "relative" }}>
          {user ? (
          <button
            ref={accountTriggerRef}
              type="button"
              aria-haspopup="true"
              aria-controls="account-menu"
              aria-expanded={accountOpen}
              data-testid="account-menu-trigger"
              onClick={() => { setAccountOpen(v => !v); setDangTinOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: C.white,
                border: `1px solid ${C.border}`, borderRadius: 10,
                padding: "8px 14px", cursor: "pointer", transition: "all 0.12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.cream; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.white; }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={13} color={C.primary} />
              </div>
              <span style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary, whiteSpace: "nowrap" }}>
                {profile?.full_name || user.email?.split("@")[0] || "Tài khoản"}
              </span>
              <ChevronDown size={14} color={C.textSecondary} style={{ transition: "transform 0.15s", transform: accountOpen ? "rotate(180deg)" : "none" }} />
            </button>
          ) : (
            <button
              data-testid="navbar-login-btn"
              onClick={() => navigate("/dang-nhap")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: C.primary,
                border: "none", borderRadius: 10,
                padding: "8px 16px", cursor: "pointer", transition: "background 0.12s",
                boxShadow: "0 2px 8px rgba(138,106,69,0.28)",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = C.primaryHover)}
              onMouseLeave={e => (e.currentTarget.style.background = C.primary)}>
              <User size={15} color="#fff" />
              <span style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap" }}>Đăng nhập</span>
            </button>
          )}
          {accountOpen && (
            <AccountDropdown
              onLandlord={() => navigate("/chu-tro")}
              onSignOut={signOut}
              onClose={() => setAccountOpen(false)}
            />
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ label, onClick }: { label: string; onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      style={{
        display: "flex", alignItems: "center", border: "none",
        cursor: "pointer", padding: "8px 12px", borderRadius: 8,
        background: hov ? C.bg : "none",
        transition: "background 0.12s",
      } as React.CSSProperties}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <span style={{ fontFamily: font, fontSize: 14, color: hov ? C.primaryDark : C.textSecondary, fontWeight: hov ? 600 : 400, transition: "color 0.12s", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}

/* ══════════════════════════════════════════
   MOBILE PUBLIC HEADER
══════════════════════════════════════════ */
export function PublicNavbarMobile({ onSearch }: { onSearch?: () => void }) {
  const navigate = useNavigate();
  const { user, signOut, hasRole } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isStaff = hasRole("Admin") || hasRole("Moderator");
  const hasLandlordAccess = hasRole("Seller") || isStaff;

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  /**
   * "Yêu thích", "Đăng tin tìm phòng" và "Tin nhắn" trước đây chỉ gọi
   * `setMenuOpen(false)` — bấm vào thì menu đóng lại và không đi đâu cả. Cả ba
   * giờ đều có route thật.
   */
  const go = (path: string) => () => { navigate(path); setMenuOpen(false); };

  const menuSections = [
    {
      label: "Khám phá",
      items: [
        { label: "Tìm phòng", action: go("/tim-phong") },
        { label: "Tin nhu cầu", action: go("/tin-nhu-cau") },
      ],
    },
    {
      label: "Đăng tin",
      items: [
        { label: "Đăng tin cho thuê", action: go("/dang-tin-cho-thue"), emphasized: true },
        { label: "Đăng tin tìm phòng", action: go("/dang-tin-nhu-cau") },
      ],
    },
    ...(user
      ? [{
          label: "Tài khoản",
          items: [
            { label: "Hồ sơ", action: go("/tai-khoan") },
            { label: "Tin đăng của tôi", action: go("/tai-khoan/tin-cho-thue") },
            { label: "Tin nhắn", action: go("/tin-nhan") },
            { label: "Tin đã lưu", action: go("/yeu-thich") },
            ...(hasLandlordAccess ? [{ label: "Dashboard chủ trọ", action: go("/chu-tro"), emphasized: true }] : []),
            ...(isStaff ? [{ label: "Quản trị hệ thống", action: go("/quan-tri"), emphasized: true }] : []),
          ],
        }]
      : [{ label: "Tài khoản", items: [{ label: "Đăng nhập", action: go("/dang-nhap"), emphasized: true }] }]),
  ];

  return (
    <>
      <header style={{
        background: C.white, height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", borderBottom: `1px solid ${C.border}`,
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 6px rgba(92,70,50,0.07)",
      }}>
        {/* Logo */}
        <button onClick={() => navigate("/")} aria-label="Trọ Nhanh - Trang chủ" style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, minWidth: 0 }}>
          <BrandLogo variant="full" size="sm" />
        </button>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <button
            type="button"
            aria-label="Mở tìm kiếm"
            onClick={onSearch ?? (() => navigate("/tim-phong"))}
            style={{ width: 44, height: 44, background: "none", border: "none", cursor: "pointer", padding: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Search size={21} color={C.textPrimary} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation-menu"
            data-testid="mobile-menu-trigger"
            onClick={() => setMenuOpen(v => !v)}
            style={{ width: 44, height: 44, background: "none", border: "none", cursor: "pointer", padding: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Menu size={21} color={C.textPrimary} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <>
          <button type="button" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,10,4,0.4)", zIndex: 198, backdropFilter: "blur(2px)", border: "none" }} />
          <div id="mobile-navigation-menu" data-testid="mobile-navigation-menu" style={{
            position: "fixed", top: 56, left: 0, right: 0, zIndex: 199,
            background: C.white, borderBottom: `1px solid ${C.border}`,
            boxShadow: "0 8px 32px rgba(92,70,50,0.16)", padding: "8px 0 16px",
            maxHeight: "calc(100dvh - 56px)", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px 12px" }}>
              <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.07em" }}>Menu</span>
              <button type="button" aria-label="Đóng menu" data-testid="mobile-menu-close" onClick={() => setMenuOpen(false)} style={{ width: 44, height: 44, background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={18} color={C.textSecondary} />
              </button>
            </div>
            {menuSections.map(section => (
              <section key={section.label} aria-label={section.label} style={{ padding: "0 12px 8px" }}>
                <h2 style={{ fontFamily: font, fontSize: 10.5, fontWeight: 800, color: C.textSecondary, margin: "8px 8px 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {section.label}
                </h2>
                {section.items.map(({ label, action, emphasized }) => (
                  <button key={label} type="button" onClick={action}
                    style={{
                      display: "flex", alignItems: "center", width: "100%", minHeight: 44,
                      padding: "10px 10px", border: "none", borderRadius: 10,
                      background: "transparent", textAlign: "left", fontFamily: font,
                      fontSize: 14, fontWeight: emphasized ? 700 : 500,
                      color: emphasized ? C.primary : C.textPrimary, cursor: "pointer",
                    }}>
                    {label}
                  </button>
                ))}
              </section>
            ))}
            {user && (
              <button type="button" onClick={() => { void signOut(); setMenuOpen(false); }}
                data-testid="mobile-account-menu-signout"
                style={{ display: "flex", alignItems: "center", width: "100%", minHeight: 48, padding: "10px 20px", border: "none", borderTop: `1px solid ${C.border}`, background: "transparent", textAlign: "left", fontFamily: font, fontSize: 14, fontWeight: 700, color: C.error, cursor: "pointer" }}>
                Đăng xuất
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}

export function PublicNavbar(props: { onSearch?: () => void; searchQuery?: string; onSearchChange?: (v: string) => void }) {
  const { width } = useBreakpoint();
  // Thanh desktop cần nhiều không gian cho search + các action. Ở laptop hẹp
  // (1024–1179px), ép nó vào một hàng làm nội dung rộng hơn viewport dù breakpoint
  // “desktop” chung đã bắt đầu từ 1024px.
  return width < 1180
    ? <PublicNavbarMobile onSearch={props.onSearch} />
    : <PublicNavbarDesktop {...props} />;
}

