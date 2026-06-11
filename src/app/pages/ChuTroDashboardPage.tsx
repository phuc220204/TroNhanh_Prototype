import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Building2, FileText, Wallet, LifeBuoy,
  Plus, Zap, ChevronDown, ChevronRight, Eye, Pencil, EyeOff, Trash2,
} from "lucide-react";
import { C, font } from "../theme";
import { useBreakpoint } from "../components/useBreakpoint";
import { LandlordShell } from "../components/LandlordShell";
import type { RoomStatus } from "../types/status";
import { ROOM_STATUS_META, LISTING_META } from "../utils/statusMaps";
import { PROPERTIES, ATTENTION, KPIS, STATUS_DIST, PREVIEW_ROOMS, RECENT_LISTINGS } from "../data/mockLandlord";
import { ModalShell } from "../components/common/ModalShell";
import { Field, SelectField } from "../components/common/FormField";

/* ══════════════════════════════════════════
   SHARED PRIMITIVES
══════════════════════════════════════════ */
function PrimaryBtn({ children, onClick, small }: { children: React.ReactNode; onClick?: () => void; small?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: small ? "8px 16px" : "10px 18px", background: C.primary, color: C.white, border: "none", borderRadius: 10, fontFamily: font, fontSize: small ? 13 : 13.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 10px rgba(138,106,69,0.25)", whiteSpace: "nowrap" }}
      onMouseEnter={e => (e.currentTarget.style.background = C.primaryHover)}
      onMouseLeave={e => (e.currentTarget.style.background = C.primary)}>
      {children}
    </button>
  );
}
function GhostBtn({ children, onClick, small }: { children: React.ReactNode; onClick?: () => void; small?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: small ? "7px 14px" : "9px 16px", background: C.white, color: C.textSecondary, border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: small ? 13 : 13.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}>
      {children}
    </button>
  );
}

function StatusChip({ status }: { status: RoomStatus }) {
  const m = ROOM_STATUS_META[status];
  return <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color: C.white, background: m.color, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>{m.label}</span>;
}
function PayText({ paid }: { paid: boolean | null }) {
  if (paid === null) return <span style={{ color: C.textSecondary }}>—</span>;
  return <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: paid ? "#4A7A34" : "#B5503C" }}>{paid ? "Đã thanh toán" : "Chưa thanh toán"}</span>;
}

/* ══════════════════════════════════════════
   PROPERTY SELECTOR
══════════════════════════════════════════ */
function PropertySelector({ value, onChange, mobile }: { value: string; onChange: (v: string) => void; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", width: mobile ? "100%" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {!mobile && <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textSecondary }}>Đang xem:</span>}
        <button onClick={() => setOpen(o => !o)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: mobile ? "12px 14px" : "9px 14px", minHeight: mobile ? 44 : undefined, background: C.white, border: `1.5px solid ${open ? C.primary : C.border}`, borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary, cursor: "pointer", width: mobile ? "100%" : undefined, minWidth: mobile ? undefined : 200 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Building2 size={15} color={C.primary} />{value}</span>
          <ChevronDown size={16} color={C.textSecondary} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </button>
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, left: mobile ? 0 : undefined, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 10px 30px rgba(42,26,12,0.18)", padding: 6, zIndex: 41, minWidth: 220 }}>
            {PROPERTIES.map(p => (
              <button key={p} onClick={() => { onChange(p); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "10px 12px", background: p === value ? C.caramelSoft : "transparent", border: "none", borderRadius: 8, fontFamily: font, fontSize: 13.5, fontWeight: p === value ? 700 : 500, color: C.textPrimary, cursor: "pointer" }}>
                {p}
                {p === value && <ChevronRight size={14} color={C.primary} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


function UtilityModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="Ghi điện nước" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn onClick={onClose}>Lưu chỉ số</PrimaryBtn></>}>
      <SelectField label="Chọn khu trọ" options={PROPERTIES.slice(1)} />
      <SelectField label="Chọn phòng" options={["P101", "P102", "P201", "P202", "P203"]} />
      <Field label="Chỉ số điện mới" placeholder="VD: 1280 kWh" />
      <Field label="Chỉ số nước mới" placeholder="VD: 42 m³" />
      <Field label="Ghi chú" placeholder="Ghi chú nếu có" textarea />
    </ModalShell>
  );
}
function AddRoomModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="Thêm phòng" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn onClick={onClose}>Lưu phòng</PrimaryBtn></>}>
      <SelectField label="Chọn khu trọ" options={PROPERTIES.slice(1)} />
      <Field label="Mã phòng" placeholder="VD: P101" />
      <Field label="Tầng / khu" placeholder="VD: Tầng 1" />
      <Field label="Diện tích" placeholder="VD: 25 m²" />
      <Field label="Giá thuê" placeholder="VD: 3.200.000đ" />
      <SelectField label="Trạng thái ban đầu" options={["Trống", "Đang thuê", "Đang sửa"]} />
      <Field label="Ghi chú" placeholder="Ghi chú nội bộ" textarea />
    </ModalShell>
  );
}

/* ══════════════════════════════════════════
   REUSABLE SECTIONS
══════════════════════════════════════════ */
function AttentionCard({ a, onAction }: { a: typeof ATTENTION[number]; onAction: () => void }) {
  const Icon = a.icon;
  return (
    <div style={{ background: a.bg, border: `1px solid ${a.border}`, borderRadius: 14, padding: "15px 16px", display: "flex", flexDirection: "column", gap: 9, minWidth: 230, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: a.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} color="#fff" />
        </div>
        <span style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary }}>{a.title}</span>
      </div>
      <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0, lineHeight: 1.45 }}>{a.desc}</p>
      <button onClick={onAction} style={{ alignSelf: "flex-start", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: a.color, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
        {a.action} <ChevronRight size={14} />
      </button>
    </div>
  );
}

function SegmentedBar() {
  const total = STATUS_DIST.reduce((s, x) => s + x.value, 0);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", height: 12, borderRadius: 999, overflow: "hidden", marginBottom: 12 }}>
        {STATUS_DIST.map(s => <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label}: ${s.value}`} />)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
        {STATUS_DIST.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} />
            <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>{s.label} <b style={{ color: C.textPrimary }}>{s.value}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomTaskBtn({ task, onClick }: { task: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.primary, background: C.caramelSoft, border: "none", borderRadius: 8, padding: "5px 11px", cursor: "pointer", whiteSpace: "nowrap" }}>{task}</button>
  );
}

function ModuleCard({ title, desc, stat, cta, onClick, accent }: { title: string; desc: string; stat?: string; cta: string; onClick: () => void; accent: string }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.white, border: `1px solid ${hov ? accent : C.border}`, borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8, transition: "border-color 0.13s" }}>
      <span style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary }}>{title}</span>
      <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>{desc}</p>
      {stat && <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: accent }}>{stat}</span>}
      <button onClick={onClick} style={{ alignSelf: "flex-start", marginTop: 2, fontFamily: font, fontSize: 13, fontWeight: 700, color: C.white, background: accent, border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}>{cta}</button>
    </div>
  );
}

function ListingRow({ l, onClick }: { l: typeof RECENT_LISTINGS[number]; onClick: () => void }) {
  const m = LISTING_META[l.status];
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 3, flexWrap: "wrap" }}>
          <span style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.title}</span>
          <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: m.color, background: m.bg, borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap" }}>{m.label}</span>
        </div>
        <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0 }}>{l.sub}</p>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <IconBtn><Eye size={15} /></IconBtn>
        <IconBtn><Pencil size={15} /></IconBtn>
        <IconBtn>{l.canDelete ? <Trash2 size={15} /> : <EyeOff size={15} />}</IconBtn>
      </div>
    </div>
  );
}
function IconBtn({ children }: { children: React.ReactNode }) {
  return <button style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textSecondary }}>{children}</button>;
}

function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: "20px 0", marginTop: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
      <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}><b style={{ color: C.primary }}>Trọ Nhanh</b> · © 2024 Trọ Nhanh</span>
      <div style={{ display: "flex", gap: 18 }}>
        {["Privacy Policy", "Terms of Service", "Help Center"].map(t => (
          <span key={t} style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, cursor: "pointer" }}>{t}</span>
        ))}
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export function ChuTroDashboardPage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [property, setProperty] = useState(PROPERTIES[0]);
  const [modal, setModal] = useState<null | "utility" | "room">(null);

  const toRooms = () => navigate("/chu-tro/quan-ly-phong");
  const toListings = () => navigate("/chu-tro/quan-ly");
  const toPost = () => navigate("/dang-tin");

  const handleAttention = (action: string) => {
    if (action === "Tạo tin đăng") toPost();
    else toRooms();
  };

  const Modals = (
    <>
      {modal === "utility" && <UtilityModal onClose={() => setModal(null)} />}
      {modal === "room" && <AddRoomModal onClose={() => setModal(null)} />}
    </>
  );

  /* ═══════════ MOBILE ═══════════ */
  if (isMobile) {
    const quickBtns: { icon: typeof Building2; label: string; onClick: () => void }[] = [
      { icon: Building2, label: "Khu trọ & Phòng", onClick: toRooms },
      { icon: FileText, label: "Tin đăng", onClick: toListings },
      { icon: Wallet, label: "Thanh toán", onClick: toRooms },
      { icon: Zap, label: "Ghi điện nước", onClick: () => setModal("utility") },
      { icon: FileText, label: "Hóa đơn", onClick: toRooms },
      { icon: LifeBuoy, label: "Hỗ trợ", onClick: () => {} },
    ];
    return (
      <LandlordShell active="overview" mobileTitle="Dashboard">
        <div style={{ padding: "16px 16px 100px" }}>
          <p style={{ fontFamily: font, fontSize: 19, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>Xin chào, Nguyễn Minh Trí</p>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 14px" }}>Hôm nay bạn có 3 việc cần xử lý.</p>

          <div style={{ marginBottom: 18 }}><PropertySelector value={property} onChange={setProperty} mobile /></div>

          <p style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: "0 0 10px" }}>Cần xử lý hôm nay</p>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, marginBottom: 20 }}>
            {ATTENTION.map(a => <div key={a.title} style={{ minWidth: 250, flexShrink: 0 }}><AttentionCard a={a} onAction={() => handleAttention(a.action)} /></div>)}
          </div>

          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, marginBottom: 22 }}>
            {KPIS.map(k => (
              <div key={k.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 16px", minWidth: 120, flexShrink: 0 }}>
                <p style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: C.textSecondary, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</p>
                <span style={{ fontFamily: font, fontSize: 26, fontWeight: 900, color: k.accent, lineHeight: 1 }}>{k.value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>Tình trạng phòng</span>
            <button onClick={toRooms} style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer" }}>Xem tất cả</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
            {PREVIEW_ROOMS.map(r => (
              <div key={r.code} onClick={toRooms} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{r.code} <span style={{ fontWeight: 500, fontSize: 12.5, color: C.textSecondary }}>· {r.property}</span></span>
                  <StatusChip status={r.status} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: font, fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: C.textSecondary }}>Người thuê</span>
                  <span style={{ color: C.textPrimary, fontWeight: 600 }}>{r.tenant ?? "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: font, fontSize: 13 }}>
                  <span style={{ color: C.textSecondary }}>Thanh toán</span>
                  <PayText paid={r.paid} />
                </div>
                {r.task && <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}><RoomTaskBtn task={r.task} onClick={() => r.task === "Tạo tin đăng" ? toPost() : toRooms()} /></div>}
              </div>
            ))}
          </div>

          <p style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: "0 0 12px" }}>Quản lý nhanh</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 22 }}>
            {quickBtns.map(b => {
              const Icon = b.icon;
              return (
                <button key={b.label} onClick={b.onClick} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, cursor: "pointer" }}>
                  <Icon size={20} color={C.primary} />
                  <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: 600, color: C.textPrimary, textAlign: "center", lineHeight: 1.25 }}>{b.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>Tin đăng gần đây</span>
            <button onClick={toListings} style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer" }}>Tất cả</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {RECENT_LISTINGS.map(l => <ListingRow key={l.title} l={l} onClick={toListings} />)}
          </div>
        </div>

        <button onClick={() => setModal("room")} style={{ position: "fixed", right: 18, bottom: "calc(76px + env(safe-area-inset-bottom))", width: 54, height: 54, borderRadius: "50%", background: C.primary, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 16px rgba(138,106,69,0.36)", zIndex: 90 }}>
          <Plus size={24} color="white" />
        </button>
        {Modals}
      </LandlordShell>
    );
  }

  /* ═══════════ DESKTOP ═══════════ */
  return (
    <LandlordShell active="overview" mobileTitle="Dashboard">
      <div style={{ display: "flex", gap: 24, padding: "28px 32px 0", maxWidth: 1500, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
          {/* MAIN COLUMN */}
          <main style={{ flex: 1, minWidth: 0 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontFamily: font, fontSize: 25, fontWeight: 800, color: C.textPrimary, margin: "0 0 5px", letterSpacing: "-0.02em" }}>Chào Anh Minh, hôm nay bạn có 3 việc cần xử lý.</h1>
                <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: 0 }}>Mọi thứ trong tầm kiểm soát. Chúc bạn một ngày làm việc hiệu quả!</p>
              </div>
              <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                <PrimaryBtn onClick={() => setModal("room")}><Plus size={15} /> Thêm phòng</PrimaryBtn>
                <GhostBtn onClick={toPost}><Plus size={15} /> Đăng tin</GhostBtn>
                <GhostBtn onClick={() => setModal("utility")}><Zap size={15} /> Ghi điện nước</GhostBtn>
              </div>
            </div>

            <div style={{ marginBottom: 22 }}><PropertySelector value={property} onChange={setProperty} /></div>

            {/* Attention cards */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
              {ATTENTION.map(a => <AttentionCard key={a.title} a={a} onAction={() => handleAttention(a.action)} />)}
            </div>

            {/* KPI */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 28 }}>
              {KPIS.map(k => (
                <div key={k.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 14px" }}>
                  <p style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: C.textSecondary, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.03em" }}>{k.label}</p>
                  <span style={{ fontFamily: font, fontSize: 25, fontWeight: 900, color: k.accent, lineHeight: 1, letterSpacing: "-0.02em" }}>{k.value}</span>
                </div>
              ))}
            </div>

            {/* Room operations */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Tình trạng phòng</h2>
                <button onClick={toRooms} style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>Xem tất cả phòng <ChevronRight size={15} /></button>
              </div>
              <SegmentedBar />
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                  <thead>
                    <tr style={{ background: C.caramelSoft }}>
                      {["Phòng", "Khu trọ", "Trạng thái", "Người thuê", "Thanh toán", "Việc cần làm"].map(h => (
                        <th key={h} style={{ fontFamily: font, fontSize: 11.5, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "left", padding: "11px 13px", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PREVIEW_ROOMS.map((r, i) => (
                      <tr key={r.code} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? "rgba(240,231,214,0.3)" : C.white }}>
                        <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 800, color: C.textPrimary, padding: "12px 13px" }}>{r.code}</td>
                        <td style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, padding: "12px 13px" }}>{r.property}</td>
                        <td style={{ padding: "12px 13px" }}><StatusChip status={r.status} /></td>
                        <td style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, padding: "12px 13px" }}>{r.tenant ?? <span style={{ color: C.textSecondary }}>—</span>}</td>
                        <td style={{ padding: "12px 13px" }}><PayText paid={r.paid} /></td>
                        <td style={{ padding: "12px 13px" }}>{r.task ? <RoomTaskBtn task={r.task} onClick={() => r.task === "Tạo tin đăng" ? toPost() : toRooms()} /> : <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "12px 0 0", fontStyle: "italic" }}>Đây chỉ là bản xem nhanh. Quản lý đầy đủ trong “Quản lý khu trọ & phòng”.</p>
            </div>

            {/* Recent listings */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Tin đăng gần đây</h2>
              <button onClick={toListings} style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>Tất cả tin đăng <ChevronRight size={15} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RECENT_LISTINGS.map(l => <ListingRow key={l.title} l={l} onClick={toListings} />)}
            </div>

            <Footer />
          </main>

          {/* RIGHT COLUMN */}
          <aside style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14, paddingTop: 2 }}>
            <span style={{ fontFamily: font, fontSize: 13, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Công cụ quản lý</span>
            <ModuleCard title="Khu trọ & Phòng" desc="Quản lý số phòng, danh sách khu trọ và trạng thái từng phòng." stat="22 phòng hoạt động" cta="Quản lý" onClick={toRooms} accent={C.primary} />
            <ModuleCard title="Quản lý tin đăng" desc="Theo dõi các tin cho thuê đang hiển thị cho người thuê." stat="5 tin đang chạy" cta="Chi tiết" onClick={toListings} accent={C.secondary} />
            <ModuleCard title="Thanh toán & Điện nước" desc="Theo dõi hóa đơn tháng này và các khoản chưa thu." stat="85% đã thu tiền" cta="Thu tiền" onClick={toRooms} accent="#C8861A" />
            <ModuleCard title="Hỗ trợ" desc="Liên hệ đội ngũ Trọ Nhanh khi cần trợ giúp." cta="Gửi ngay" onClick={() => {}} accent="#6B8E5A" />
          </aside>
        </div>
      {Modals}
    </LandlordShell>
  );
}

export default ChuTroDashboardPage;
