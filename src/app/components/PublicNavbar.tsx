import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useBreakpoint } from "./useBreakpoint";
import {
  Search, Heart, User, ChevronDown,
  Key, UserSearch,
  LayoutGrid, LayoutDashboard, Building2, FileText, BookOpen, HelpCircle, X,
  Bell, Menu,
} from "lucide-react";
import { C, font } from "../theme";
import { BrandLogo } from "./brand/BrandLogo";

/* ══════════════════════════════════════════
   ĐĂNG TIN DROPDOWN
══════════════════════════════════════════ */
function DangTinDropdown({ onRenter, onLandlord, onClose }: {
  onRenter: () => void; onLandlord: () => void; onClose: () => void;
}) {
  return (
    <div style={{
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
          Icon: UserSearch,
          title: "Đăng tin tìm phòng",
          desc: "Dành cho người thuê muốn đăng nhu cầu tìm phòng.",
          action: onRenter,
        },
        {
          Icon: Key,
          title: "Đăng tin cho thuê",
          desc: "Dành cho chủ trọ muốn đăng phòng cho thuê.",
          action: onLandlord,
        },
      ].map(({ Icon, title, desc, action }) => (
        <button key={title} onClick={() => { action(); onClose(); }}
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
function AccountDropdown({ onLandlord, onClose }: { onLandlord: () => void; onClose: () => void }) {
  const items = [
    { label: "Hồ sơ",             action: () => {} },
    { label: "Tin nhắn",           action: () => {} },
    { label: "Tin đã lưu",         action: () => {} },
    { label: "Dashboard chủ trọ", action: onLandlord },
    { label: "Đăng xuất",         action: () => {} },
  ];
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 10px)", right: 0,
      background: C.white, border: `1px solid ${C.border}`,
      borderRadius: 14, boxShadow: "0 12px 40px rgba(92,70,50,0.16)",
      padding: "6px 0", width: 200, zIndex: 200,
    }}>
      {items.map(({ label, action }, i) => (
        <button key={label} onClick={() => { action(); onClose(); }}
          style={{
            display: "block", width: "100%", padding: "11px 16px",
            border: "none", borderTop: i === items.length - 1 ? `1px solid ${C.border}` : "none",
            background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: font,
            fontSize: 14, color: i === items.length - 1 ? "#C0392B" : C.textPrimary,
            fontWeight: i === 3 ? 600 : 400, transition: "background 0.1s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          {label}
        </button>
      ))}
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
  const [dangTinOpen, setDangTinOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dangTinRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dangTinRef.current && !dangTinRef.current.contains(e.target as Node)) setDangTinOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const goSearch = () => { onSearch ? onSearch() : navigate("/search"); };

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
          onClick={goSearch}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: C.bg, border: `1.5px solid ${C.border}`,
            borderRadius: 999, padding: "10px 18px",
            cursor: "text", width: "100%", maxWidth: 500,
            transition: "border-color 0.15s, box-shadow 0.15s",
            boxShadow: "0 1px 4px rgba(92,70,50,0.06)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = C.sand;
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(92,70,50,0.1)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(92,70,50,0.06)";
          }}
        >
          <Search size={16} color={C.secondary} style={{ flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={e => onSearchChange?.(e.target.value)}
            onKeyDown={e => e.key === "Enter" && goSearch()}
            placeholder="Tìm khu vực, quận, tên trường..."
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontFamily: font, fontSize: 14, color: C.textPrimary,
              cursor: "text",
            }}
          />
          <div style={{ width: 1, height: 16, background: C.border, flexShrink: 0 }} />
          <div
            onClick={e => { e.stopPropagation(); goSearch(); }}
            style={{
              background: C.primary, borderRadius: 999, padding: "4px 14px",
              fontFamily: font, fontSize: 12, fontWeight: 700, color: "#fff",
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              transition: "background 0.12s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.primaryHover)}
            onMouseLeave={e => (e.currentTarget.style.background = C.primary)}
          >
            Tìm
          </div>
        </div>
      </div>

      {/* RIGHT — Nav actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        {/* Tìm phòng */}
        <NavLink label="Tìm phòng" onClick={goSearch} />

        {/* Yêu thích */}
        <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "8px 12px", borderRadius: 8 }}
          onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
          <Heart size={15} color={C.textSecondary} strokeWidth={1.8} />
          <span style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, whiteSpace: "nowrap" }}>Yêu thích</span>
        </button>

        <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px" }} />

        {/* Đăng tin dropdown */}
        <div ref={dangTinRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setDangTinOpen(v => !v); setAccountOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: dangTinOpen ? C.caramelSoft : "transparent",
              border: `1.5px solid ${C.primary}`, borderRadius: 10,
              padding: "7px 14px", cursor: "pointer", transition: "background 0.12s",
            }}
            onMouseEnter={e => { if (!dangTinOpen) e.currentTarget.style.background = C.caramelSoft; }}
            onMouseLeave={e => { if (!dangTinOpen) e.currentTarget.style.background = "transparent"; }}>
            <span style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.primary, whiteSpace: "nowrap" }}>Đăng tin</span>
            <ChevronDown size={14} color={C.primary} style={{ transition: "transform 0.15s", transform: dangTinOpen ? "rotate(180deg)" : "none" }} />
          </button>
          {dangTinOpen && (
            <DangTinDropdown
              onRenter={() => {}}
              onLandlord={() => navigate("/dang-tin")}
              onClose={() => setDangTinOpen(false)}
            />
          )}
        </div>

        {/* Đăng nhập / Account */}
        <div ref={accountRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setAccountOpen(v => !v); setDangTinOpen(false); }}
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
            <span style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap" }}>Đăng nhập</span>
          </button>
          {accountOpen && (
            <AccountDropdown
              onLandlord={() => navigate("/chu-tro")}
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
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { label: "Tìm phòng", action: () => { navigate("/search"); setMenuOpen(false); } },
    { label: "Yêu thích", action: () => setMenuOpen(false) },
    { label: "Đăng tin tìm phòng", action: () => setMenuOpen(false), sub: true },
    { label: "Đăng tin cho thuê", action: () => { navigate("/dang-tin"); setMenuOpen(false); }, sub: true },
    { label: "Tin nhắn", action: () => setMenuOpen(false) },
    { label: "Tài khoản", action: () => setMenuOpen(false) },
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
          <button onClick={onSearch} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}>
            <Search size={21} color={C.textPrimary} strokeWidth={1.8} />
          </button>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 8, position: "relative" }}>
            <Bell size={21} color={C.textPrimary} strokeWidth={1.8} />
            <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: 999, background: C.repairing, border: `2px solid ${C.white}` }} />
          </button>
          <button onClick={() => setMenuOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}>
            <Menu size={21} color={C.textPrimary} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,10,4,0.4)", zIndex: 198, backdropFilter: "blur(2px)" }} />
          <div style={{
            position: "fixed", top: 56, left: 0, right: 0, zIndex: 199,
            background: C.white, borderBottom: `1px solid ${C.border}`,
            boxShadow: "0 8px 32px rgba(92,70,50,0.16)", padding: "8px 0 16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px 12px" }}>
              <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.07em" }}>Menu</span>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={18} color={C.textSecondary} />
              </button>
            </div>
            {menuItems.map(({ label, action, sub }) => (
              <button key={label} onClick={action}
                style={{
                  display: "block", padding: sub ? "11px 28px" : "12px 16px",
                  border: "none", background: "transparent", textAlign: "left",
                  fontFamily: font, fontSize: sub ? 13 : 15,
                  fontWeight: sub ? 400 : 600,
                  color: sub ? C.textSecondary : C.textPrimary, cursor: "pointer",
                  borderLeft: sub ? `2px solid ${C.border}` : "none",
                  marginLeft: sub ? 16 : 0,
                  width: sub ? "calc(100% - 16px)" : "100%",
                }}>
                {sub && <span style={{ marginRight: 6, color: C.secondary }}>↳</span>}{label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ══════════════════════════════════════════
   FLOATING DEMO FAB
══════════════════════════════════════════ */
export function DemoFAB() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { isMobile } = useBreakpoint();

  /* On mobile the public pages render a sticky BottomTabBar (height 60).
     Float the FAB ~72px above the viewport bottom so it never overlaps the
     "Tài khoản" tab; on desktop there is no tab bar, keep the original spot. */
  const fabSize = isMobile ? 52 : 50;

  const shortcuts = [
    { Icon: LayoutDashboard, label: "Dashboard chủ trọ",        action: () => navigate("/chu-tro") },
    { Icon: Building2,       label: "Quản lý khu trọ & phòng",  action: () => navigate("/chu-tro/quan-ly-phong") },
    { Icon: FileText,        label: "Quản lý tin đăng",          action: () => navigate("/chu-tro/quan-ly") },
    { Icon: BookOpen,        label: "Design System",              action: () => navigate("/styleguide") },
    { Icon: HelpCircle,      label: "Trợ giúp",                  action: () => {} },
  ];

  return (
    <div style={{
      position: "fixed",
      right: isMobile ? 18 : 24,
      bottom: isMobile ? "calc(72px + env(safe-area-inset-bottom))" : 24,
      zIndex: 300, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10,
    }}>
      {/* Popup */}
      {open && (
        <div style={{
          background: C.white, border: `1px solid ${C.border}`,
          borderRadius: 18, boxShadow: "0 12px 48px rgba(92,70,50,0.18)",
          padding: "16px 0 10px", width: 240,
          animation: "fadeUp 0.16s ease-out",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 12px", borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
            <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>Lối tắt demo</p>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
              <X size={14} color={C.textSecondary} />
            </button>
          </div>
          {shortcuts.map(({ Icon, label, action }) => (
            <button key={label} onClick={() => { action(); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: "10px 16px", border: "none", background: "transparent",
                cursor: "pointer", textAlign: "left", transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={15} color={C.primary} strokeWidth={1.8} />
              </div>
              <span style={{ fontFamily: font, fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: fabSize, height: fabSize, borderRadius: "50%",
          background: open ? C.primaryDark : C.primary,
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(92,70,50,0.35)",
          transition: "background 0.15s, transform 0.15s",
          transform: open ? "rotate(45deg)" : "none",
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = open ? "rotate(45deg) scale(1.07)" : "scale(1.07)")}
        onMouseLeave={e => (e.currentTarget.style.transform = open ? "rotate(45deg)" : "none")}
      >
        <LayoutGrid size={20} color="#fff" strokeWidth={1.8} />
      </button>
    </div>
  );
}
