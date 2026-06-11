import { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import {
  Plus, Search, ChevronDown, ChevronRight, Home,
  X, Building2, MapPin, Settings, Zap, FileText, Wallet, StickyNote,
  Users, RefreshCw, Pencil, ExternalLink, AlertTriangle, MoreHorizontal, Eye, Bell,
} from "lucide-react";
import { C, font } from "../theme";
import { useBreakpoint } from "../components/useBreakpoint";
import { LandlordShell } from "../components/LandlordShell";
import type { RoomStatus } from "../types/status";
import { ROOM_STATUS_META } from "../utils/statusMaps";
import { INIT_PROPERTIES, type Room, type Property } from "../data/mockProperties";
import { ModalShell } from "../components/common/ModalShell";
import { Field } from "../components/common/FormField";

/* ══════════════════════════════════════════
   TYPES & DATA
══════════════════════════════════════════ */

const FILTER_CHIPS: { label: string; value: RoomStatus | "all" }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Trống", value: "available" },
  { label: "Đang thuê", value: "rented" },
  { label: "Đang sửa", value: "repairing" },
  { label: "Sắp hết hạn", value: "expiring" },
  { label: "Chưa thanh toán", value: "unpaid" },
];

const SORT_OPTIONS = ["Mới cập nhật", "Mã phòng", "Giá thuê", "Trạng thái"];

const VND = (n: string) => n;

type RoomActionModalType = "utility" | "paymentReminder" | "renewContract" | "tenantReminder" | "invoice";
type RoomActionModalState = { type: RoomActionModalType; room: Room } | null;

/* ══════════════════════════════════════════
   SHARED PRIMITIVES (consistent with design system)
══════════════════════════════════════════ */
function StatusChip({ status, small }: { status: RoomStatus; small?: boolean }) {
  const m = ROOM_STATUS_META[status];
  return (
    <span style={{ fontFamily: font, fontSize: small ? 11 : 12, fontWeight: 700, color: C.white, background: m.color, borderRadius: 999, padding: small ? "2px 9px" : "3px 11px", display: "inline-block", whiteSpace: "nowrap" }}>
      {m.label}
    </span>
  );
}

function PayBadge({ paid }: { paid: boolean }) {
  return (
    <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: paid ? "#4A7A34" : "#B5503C" }}>
      {paid ? "Đã thanh toán" : "Chưa thanh toán"}
    </span>
  );
}

function PrimaryBtn({ children, onClick, small }: { children: React.ReactNode; onClick?: () => void; small?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: small ? "8px 16px" : "11px 22px", background: C.primary, color: C.white, border: "none", borderRadius: 10, fontFamily: font, fontSize: small ? 13 : 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 10px rgba(138,106,69,0.25)", transition: "background 0.13s", whiteSpace: "nowrap" }}
      onMouseEnter={e => (e.currentTarget.style.background = C.primaryHover)}
      onMouseLeave={e => (e.currentTarget.style.background = C.primary)}>
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick, small }: { children: React.ReactNode; onClick?: () => void; small?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: small ? "7px 14px" : "10px 18px", background: C.white, color: C.textSecondary, border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: small ? 13 : 14, fontWeight: 600, cursor: "pointer", transition: "all 0.13s", whiteSpace: "nowrap" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}>
      {children}
    </button>
  );
}

function AddPropertyModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="Thêm khu trọ" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn onClick={onClose}>Lưu khu trọ</PrimaryBtn></>}>
      <Field label="Tên khu trọ" placeholder="VD: Khu trọ Phan Văn Trị" />
      <Field label="Địa chỉ" placeholder="Số nhà, tên đường" />
      <Field label="Quận / Huyện" placeholder="VD: Bình Thạnh, TP.HCM" />
      <Field label="Số tầng" placeholder="VD: 3" />
      <Field label="Ghi chú" placeholder="Ghi chú nội bộ về khu trọ" textarea rows={3} />
    </ModalShell>
  );
}

function AddRoomModal({ onClose, properties, currentId }: { onClose: () => void; properties: Property[]; currentId: string }) {
  return (
    <ModalShell title="Thêm phòng" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn onClick={onClose}>Lưu phòng</PrimaryBtn></>}>
      <Field label="Mã phòng" placeholder="VD: P101" />
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Thuộc khu trọ</span>
        <select defaultValue={currentId} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <Field label="Tầng / khu" placeholder="VD: Tầng 1" />
      <Field label="Diện tích" placeholder="VD: 25 m²" />
      <Field label="Giá thuê" placeholder="VD: 3.200.000đ" />
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Trạng thái ban đầu</span>
        <select defaultValue="available" style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}>
          <option value="available">Trống</option>
          <option value="rented">Đang thuê</option>
          <option value="repairing">Đang sửa</option>
        </select>
      </label>
      <Field label="Tiện ích" placeholder="VD: Wifi, Máy lạnh, WC riêng" />
      <Field label="Ghi chú" placeholder="Ghi chú nội bộ" textarea rows={3} />
    </ModalShell>
  );
}

function UtilityMeterModal({ room, onClose }: { room: Room; onClose: () => void }) {
  return (
    <ModalShell title={`Ghi điện nước - ${room.code}`} onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn onClick={onClose}>Lưu chỉ số</PrimaryBtn></>}>
      <Field label="Phòng" placeholder={room.code} />
      <Field label="Chỉ số điện mới" placeholder="VD: 1280 kWh" />
      <Field label="Chỉ số nước mới" placeholder="VD: 42 m³" />
      <Field label="Ghi chú" placeholder="Ghi chú nếu có" textarea rows={3} />
    </ModalShell>
  );
}

function RoomActionPlaceholderModal({ state, onClose }: { state: Exclude<RoomActionModalState, null>; onClose: () => void }) {
  const copy: Record<RoomActionModalType, { title: string; body: string; cta: string }> = {
    utility: { title: "Ghi điện nước", body: "", cta: "Lưu chỉ số" },
    paymentReminder: { title: "Nhắc thanh toán", body: `Gửi nhắc thanh toán cho phòng ${state.room.code}.`, cta: "Gửi nhắc" },
    renewContract: { title: "Gia hạn hợp đồng", body: `Mở luồng gia hạn hợp đồng cho phòng ${state.room.code}.`, cta: "Tiếp tục" },
    tenantReminder: { title: "Nhắc người thuê", body: `Gửi nhắc người thuê phòng ${state.room.code} về hợp đồng sắp hết hạn.`, cta: "Gửi nhắc" },
    invoice: { title: "Xem hóa đơn", body: `Xem hóa đơn tháng này của phòng ${state.room.code}.`, cta: "Đóng" },
  };
  const c = copy[state.type];
  return (
    <ModalShell title={`${c.title} - ${state.room.code}`} onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn onClick={onClose}>{c.cta}</PrimaryBtn></>}>
      <p style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, lineHeight: 1.6, margin: 0 }}>{c.body}</p>
    </ModalShell>
  );
}

/* ══════════════════════════════════════════
   ROOM DETAIL — shared content
══════════════════════════════════════════ */
function DetailSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {icon}
        <span style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0", gap: 12 }}>
      <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>{k}</span>
      <span style={{ fontFamily: font, fontSize: 13, fontWeight: strong ? 800 : 600, color: C.textPrimary, textAlign: "right" }}>{v}</span>
    </div>
  );
}

function RoomDetailContent({ room, onCreateListing }: { room: Room; onCreateListing: () => void }) {
  return (
    <div>
      {/* 1) Room info */}
      <DetailSection icon={<Home size={16} color={C.primary} />} title="Thông tin phòng">
        <Row k="Mã phòng" v={room.code} />
        <Row k="Tầng / khu" v={room.floor} />
        <Row k="Diện tích" v={room.area} />
        <Row k="Giá thuê" v={VND(room.price)} strong />
        <Row k="Tiện ích" v={room.amenities.join(", ") || "—"} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
          <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>Trạng thái</span>
          <StatusChip status={room.status} small />
        </div>
      </DetailSection>

      {/* 2) Tenant */}
      <DetailSection icon={<Users size={16} color={C.primary} />} title="Người thuê hiện tại">
        {room.tenant ? (
          <>
            <Row k="Họ tên" v={room.tenant.name} />
            <Row k="Số điện thoại" v={room.tenant.phone} />
            <Row k="Ngày bắt đầu thuê" v={room.tenant.startDate} />
            <Row k="Số người ở" v={`${room.tenant.occupants} người`} />
          </>
        ) : <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Chưa có người thuê.</p>}
      </DetailSection>

      {/* 3) Contract */}
      <DetailSection icon={<FileText size={16} color={C.primary} />} title="Hợp đồng">
        {room.contract ? (
          <>
            <Row k="Ngày bắt đầu" v={room.contract.start} />
            <Row k="Ngày kết thúc" v={room.contract.end} />
            <Row k="Tiền cọc" v={VND(room.contract.deposit)} />
            <Row k="Trạng thái hợp đồng" v={room.contract.status} />
          </>
        ) : <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Phòng chưa có hợp đồng.</p>}
      </DetailSection>

      {/* 4) Bill */}
      <DetailSection icon={<Wallet size={16} color={C.primary} />} title="Thanh toán tháng này">
        {room.bill ? (
          <>
            <Row k="Tiền phòng" v={VND(room.bill.rent)} />
            <Row k="Tiền điện" v={VND(room.bill.electric)} />
            <Row k="Tiền nước" v={VND(room.bill.water)} />
            <Row k="Dịch vụ" v={VND(room.bill.service)} />
            <div style={{ borderTop: `1px dashed ${C.border}`, marginTop: 6, paddingTop: 6 }}>
              <Row k="Tổng cần thu" v={VND(room.bill.total)} strong />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
              <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>Trạng thái</span>
              <PayBadge paid={room.bill.paid} />
            </div>
          </>
        ) : <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Chưa phát sinh hóa đơn.</p>}
      </DetailSection>

      {/* 5) Notes & maintenance */}
      <DetailSection icon={<StickyNote size={16} color={C.primary} />} title="Ghi chú & bảo trì">
        <p style={{ fontFamily: font, fontSize: 13, color: C.textPrimary, margin: 0, lineHeight: 1.6 }}>{room.note || "Không có ghi chú."}</p>
        {room.status === "repairing" && (
          <div style={{ marginTop: 10, background: "#FDF0E4", border: `1px solid #EAD2BC`, borderRadius: 10, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertTriangle size={15} color="#C07B4A" style={{ marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontFamily: font, fontSize: 12.5, color: "#8A5A30", lineHeight: 1.5 }}>Phòng đang trong quá trình sửa chữa.</span>
          </div>
        )}
      </DetailSection>
    </div>
  );
}

function DetailActions({ room, onCreateListing, onUpdate }: { room: Room; onCreateListing: () => void; onUpdate: (patch: Partial<Room>) => void }) {
  const [panel, setPanel] = useState<null | "status" | "meter">(null);
  const [eIdx, setEIdx] = useState("");
  const [wIdx, setWIdx] = useState("");

  const statusBtn = (s: RoomStatus) => {
    const m = ROOM_STATUS_META[s];
    const active = room.status === s;
    return (
      <button key={s} onClick={() => { onUpdate({ status: s }); setPanel(null); }}
        style={{ fontFamily: font, fontSize: 12.5, fontWeight: active ? 800 : 600, color: active ? C.white : m.color, background: active ? m.color : C.white, border: `1.5px solid ${m.color}`, borderRadius: 999, padding: "6px 13px", cursor: "pointer", whiteSpace: "nowrap" }}>
        {m.label}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {panel === "status" && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textSecondary, margin: "0 0 10px" }}>Chọn trạng thái mới</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(Object.keys(ROOM_STATUS_META) as RoomStatus[]).map(statusBtn)}
          </div>
        </div>
      )}
      {panel === "meter" && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textSecondary, margin: "0 0 10px" }}>Ghi chỉ số điện nước tháng này</p>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>Chỉ số điện (kWh)</span>
              <input value={eIdx} onChange={e => setEIdx(e.target.value)} placeholder="VD: 1280" style={{ fontFamily: font, fontSize: 13, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 9, padding: "8px 11px", width: "100%", boxSizing: "border-box", outline: "none" }} />
            </label>
            <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>Chỉ số nước (m³)</span>
              <input value={wIdx} onChange={e => setWIdx(e.target.value)} placeholder="VD: 42" style={{ fontFamily: font, fontSize: 13, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 9, padding: "8px 11px", width: "100%", boxSizing: "border-box", outline: "none" }} />
            </label>
          </div>
          <PrimaryBtn small onClick={() => { setPanel(null); setEIdx(""); setWIdx(""); }}>Lưu chỉ số</PrimaryBtn>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <PrimaryBtn small onClick={() => {}}><Pencil size={14} /> Cập nhật phòng</PrimaryBtn>
        {room.status !== "available" && (
          <GhostBtn small onClick={() => setPanel(p => p === "meter" ? null : "meter")}><Zap size={14} /> Ghi điện nước</GhostBtn>
        )}
        <GhostBtn small onClick={() => setPanel(p => p === "status" ? null : "status")}><RefreshCw size={14} /> Đổi trạng thái</GhostBtn>
        {room.status === "available" && (
          <button onClick={onCreateListing}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", background: "#EBF1E5", color: "#4A7A34", border: `1.5px solid #C7D9B8`, borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            <ExternalLink size={14} /> Tạo tin đăng
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   ATTENTION CARDS
══════════════════════════════════════════ */
function AttentionCards({ expiring, unpaid }: { expiring: number; unpaid: number }) {
  if (expiring === 0 && unpaid === 0) return null;
  const card = (color: string, bg: string, border: string, text: string) => (
    <div style={{ flex: 1, minWidth: 220, background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "13px 16px", display: "flex", alignItems: "center", gap: 11 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <AlertTriangle size={17} color="#fff" />
      </div>
      <span style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: C.textPrimary }}>{text}</span>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
      {expiring > 0 && card("#C8861A", "#FBF1DD", "#EAD8B4", `${expiring} phòng sắp hết hạn hợp đồng`)}
      {unpaid > 0 && card("#C07B4A", "#FDF0E4", "#EAD2BC", `${unpaid} phòng chưa thanh toán tháng này`)}
    </div>
  );
}

/* ══════════════════════════════════════════
   KPI CARDS
══════════════════════════════════════════ */
function KpiCards({ rooms, scroll }: { rooms: Room[]; scroll?: boolean }) {
  const total = rooms.length;
  const empty = rooms.filter(r => r.status === "available").length;
  const rented = rooms.filter(r => r.status === "rented" || r.status === "expiring" || r.status === "unpaid").length;
  const repair = rooms.filter(r => r.status === "repairing").length;
  const items = [
    { label: "Tổng số phòng", value: total, accent: C.primary },
    { label: "Phòng trống", value: empty, accent: "#6B8E5A" },
    { label: "Đang thuê", value: rented, accent: C.secondary },
    { label: "Đang sửa", value: repair, accent: "#C07B4A" },
  ];
  return (
    <div style={{ display: scroll ? "flex" : "grid", gridTemplateColumns: scroll ? undefined : "repeat(4, 1fr)", gap: 12, marginBottom: 16, overflowX: scroll ? "auto" : undefined, paddingBottom: scroll ? 4 : 0 }}>
      {items.map(it => (
        <div key={it.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", minWidth: scroll ? 130 : undefined, flexShrink: scroll ? 0 : undefined }}>
          <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{it.label}</p>
          <span style={{ fontFamily: font, fontSize: 30, fontWeight: 900, color: it.accent, lineHeight: 1, letterSpacing: "-0.03em" }}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   CONTROLS (search + chips + sort)
══════════════════════════════════════════ */
function RoomControls({ search, onSearch, filter, onFilter, sort, onSort, mobile }: {
  search: string; onSearch: (v: string) => void;
  filter: RoomStatus | "all"; onFilter: (v: RoomStatus | "all") => void;
  sort: string; onSort: (v: string) => void; mobile?: boolean;
}) {
  const [sortOpen, setSortOpen] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: mobile ? "nowrap" : "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: mobile ? undefined : 240 }}>
          <Search size={16} color={C.textSecondary} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Tìm theo mã phòng, người thuê, tầng..."
            style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px 10px 38px", width: "100%", boxSizing: "border-box", background: C.white, outline: "none" }} />
        </div>
        {!mobile && (
          <div style={{ position: "relative" }}>
            <button onClick={() => setSortOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, cursor: "pointer", whiteSpace: "nowrap" }}>
              {sort} <ChevronDown size={15} color={C.textSecondary} />
            </button>
            {sortOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(42,26,12,0.16)", padding: 6, zIndex: 40, minWidth: 180 }}>
                {SORT_OPTIONS.map(o => (
                  <button key={o} onClick={() => { onSort(o); setSortOpen(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: o === sort ? C.caramelSoft : "transparent", border: "none", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: o === sort ? 700 : 500, color: C.textPrimary, cursor: "pointer" }}>
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {FILTER_CHIPS.map(c => {
          const active = filter === c.value;
          return (
            <button key={c.value} onClick={() => onFilter(c.value)}
              style={{ fontFamily: font, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? C.white : C.textSecondary, background: active ? C.primary : C.white, border: `1.5px solid ${active ? C.primary : C.border}`, borderRadius: 999, padding: mobile ? "9px 15px" : "7px 15px", minHeight: mobile ? 40 : undefined, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.12s" }}>
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   ROOM TABLE (desktop) — operational, NOT a listing table
══════════════════════════════════════════ */
/* Menu ⋯ cho cột Thao tác — render qua portal nên không bị cắt bởi bảng */
function RoomActionMenu({ room, openActionMenuRoomId, setOpenActionMenuRoomId, onOpen, onCreateListing, onActionModal, mobile }: {
  room: Room;
  openActionMenuRoomId: string | null;
  setOpenActionMenuRoomId: (id: string | null) => void;
  onOpen: (r: Room) => void;
  onCreateListing: (r: Room) => void;
  onActionModal: (type: RoomActionModalType, room: Room) => void;
  mobile?: boolean;
}) {
  const open = openActionMenuRoomId === room.id;
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  const update = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
  };
  useLayoutEffect(() => { if (open) update(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const reposition = () => update();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenActionMenuRoomId(null); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpenActionMenuRoomId(null);
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, setOpenActionMenuRoomId]);

  const itemsByStatus: Record<RoomStatus, { icon: React.ReactNode; label: string; onClick: () => void }[]> = {
    available: [
      { icon: <Eye size={15} />, label: "Xem chi tiết", onClick: () => onOpen(room) },
      { icon: <Pencil size={15} />, label: "Cập nhật phòng", onClick: () => onOpen(room) },
      { icon: <ExternalLink size={15} />, label: "Tạo tin đăng", onClick: () => onCreateListing(room) },
    ],
    rented: [
      { icon: <Eye size={15} />, label: "Xem chi tiết", onClick: () => onOpen(room) },
      { icon: <Zap size={15} />, label: "Ghi điện nước", onClick: () => onActionModal("utility", room) },
      { icon: <FileText size={15} />, label: "Xem hợp đồng", onClick: () => onOpen(room) },
      { icon: <Pencil size={15} />, label: "Cập nhật phòng", onClick: () => onOpen(room) },
    ],
    repairing: [
      { icon: <Eye size={15} />, label: "Xem chi tiết", onClick: () => onOpen(room) },
      { icon: <RefreshCw size={15} />, label: "Cập nhật trạng thái", onClick: () => onOpen(room) },
      { icon: <Pencil size={15} />, label: "Cập nhật phòng", onClick: () => onOpen(room) },
    ],
    unpaid: [
      { icon: <Eye size={15} />, label: "Xem chi tiết", onClick: () => onOpen(room) },
      { icon: <Bell size={15} />, label: "Nhắc thanh toán", onClick: () => onActionModal("paymentReminder", room) },
      { icon: <Zap size={15} />, label: "Ghi điện nước", onClick: () => onActionModal("utility", room) },
      { icon: <Wallet size={15} />, label: "Xem hóa đơn", onClick: () => onActionModal("invoice", room) },
    ],
    expiring: [
      { icon: <Eye size={15} />, label: "Xem chi tiết", onClick: () => onOpen(room) },
      { icon: <RefreshCw size={15} />, label: "Gia hạn hợp đồng", onClick: () => onActionModal("renewContract", room) },
      { icon: <Bell size={15} />, label: "Nhắc người thuê", onClick: () => onActionModal("tenantReminder", room) },
      { icon: <FileText size={15} />, label: "Xem hợp đồng", onClick: () => onOpen(room) },
    ],
  };
  const items = itemsByStatus[room.status];

  return (
    <>
      <button ref={btnRef} type="button" aria-label={`Mở thao tác phòng ${room.code}`} onClick={e => { e.stopPropagation(); setOpenActionMenuRoomId(open ? null : room.id); }}
        style={{ width: mobile ? 40 : 32, height: mobile ? 40 : 32, borderRadius: 8, border: `1px solid ${C.border}`, background: open ? C.caramelSoft : C.white, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textSecondary }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = C.bg; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = C.white; }}>
        <MoreHorizontal size={17} />
      </button>
      {open && pos && createPortal(
        <div ref={menuRef} onClick={e => e.stopPropagation()}
          style={{ position: "fixed", top: pos.top, right: pos.right, minWidth: 190, background: C.white, border: "1px solid #DDD0BC", borderRadius: 12, boxShadow: "0 8px 24px rgba(92,70,50,0.12)", padding: 8, zIndex: 1000 }}>
          {items.map((it, i) => (
            <button key={i} type="button" onClick={() => { it.onClick(); setOpenActionMenuRoomId(null); }}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 38, padding: "0 12px", border: "none", borderRadius: 8, background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 500, color: "#3E2E1E", textAlign: "left", whiteSpace: "nowrap" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F0E7D6")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span style={{ color: C.primary, display: "flex", flexShrink: 0 }}>{it.icon}</span>{it.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

function RoomTable({ rooms, openActionMenuRoomId, setOpenActionMenuRoomId, onOpen, onCreateListing, onActionModal }: {
  rooms: Room[];
  openActionMenuRoomId: string | null;
  setOpenActionMenuRoomId: (id: string | null) => void;
  onOpen: (r: Room) => void;
  onCreateListing: (r: Room) => void;
  onActionModal: (type: RoomActionModalType, room: Room) => void;
}) {
  const cols = [
    { label: "Mã phòng", w: "13%" },
    { label: "Trạng thái", w: "14%" },
    { label: "Người thuê", w: "19%" },
    { label: "Giá thuê", w: "14%" },
    { label: "Hợp đồng", w: "14%" },
    { label: "Thanh toán", w: "16%" },
    { label: "Thao tác", w: "10%" },
  ];
  const cell = { fontFamily: font, fontSize: 13, color: C.textPrimary, padding: "12px 9px", verticalAlign: "middle" as const, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const };
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
      <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
        <colgroup>{cols.map((c, i) => <col key={i} style={{ width: c.w }} />)}</colgroup>
        <thead>
          <tr style={{ background: C.caramelSoft }}>
            {cols.map((c, i) => (
              <th key={i} style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: i === cols.length - 1 ? "center" : "left", padding: "12px 9px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map((r, i) => (
              <tr key={r.id} onClick={() => onOpen(r)}
                style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer", background: i % 2 ? "rgba(240,231,214,0.35)" : C.white }}
                onMouseEnter={e => (e.currentTarget.style.background = C.caramelSoft)}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 ? "rgba(240,231,214,0.35)" : C.white)}>
                <td style={cell}>
                  <div style={{ fontWeight: 800 }}>{r.code}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: C.textSecondary, marginTop: 2 }}>{r.floor}</div>
                </td>
                <td style={cell}><StatusChip status={r.status} small /></td>
                <td style={cell} title={r.tenant?.name}>{r.tenant ? r.tenant.name : <span style={{ color: C.textSecondary }}>—</span>}</td>
                <td style={{ ...cell, fontWeight: 700 }}>{VND(r.price)}</td>
                <td style={{ ...cell, color: C.textSecondary }} title={r.contract?.status}>{r.contract ? r.contract.status : "—"}</td>
                <td style={cell}>{r.bill ? <PayBadge paid={r.bill.paid} /> : <span style={{ color: C.textSecondary }}>—</span>}</td>
                <td style={{ ...cell, overflow: "visible", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                  <RoomActionMenu room={r} openActionMenuRoomId={openActionMenuRoomId} setOpenActionMenuRoomId={setOpenActionMenuRoomId} onOpen={onOpen} onCreateListing={onCreateListing} onActionModal={onActionModal} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════
   MOBILE ROOM CARD
══════════════════════════════════════════ */
function MobileRoomCard({ room, openActionMenuRoomId, setOpenActionMenuRoomId, onOpen, onCreateListing, onActionModal }: {
  room: Room;
  openActionMenuRoomId: string | null;
  setOpenActionMenuRoomId: (id: string | null) => void;
  onOpen: (r: Room) => void;
  onCreateListing: (r: Room) => void;
  onActionModal: (type: RoomActionModalType, room: Room) => void;
}) {
  return (
    <div onClick={() => onOpen(room)} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary }}>{room.code}</div>
          <div style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, marginTop: 2 }}>{room.floor}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
          <StatusChip status={room.status} small />
          <RoomActionMenu room={room} openActionMenuRoomId={openActionMenuRoomId} setOpenActionMenuRoomId={setOpenActionMenuRoomId} onOpen={onOpen} onCreateListing={onCreateListing} onActionModal={onActionModal} mobile />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <RowMini k="Người thuê" v={room.tenant ? room.tenant.name : "Chưa có người thuê"} />
        <RowMini k="Giá thuê" v={VND(room.price)} strong />
        <RowMini k="Hợp đồng" v={room.contract ? room.contract.status : "—"} />
        <RowMini k="Thanh toán" v={room.bill ? (room.bill.paid ? "Đã thanh toán" : "Chưa thanh toán") : "—"} color={room.bill ? (room.bill.paid ? "#4A7A34" : "#B5503C") : undefined} />
      </div>
    </div>
  );
}
function RowMini({ k, v, strong, color }: { k: string; v: string; strong?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>{k}</span>
      <span style={{ fontFamily: font, fontSize: 13, fontWeight: strong ? 800 : 600, color: color || C.textPrimary, textAlign: "right" }}>{v}</span>
    </div>
  );
}

/* ══════════════════════════════════════════
   EMPTY STATES
══════════════════════════════════════════ */
function EmptyBlock({ icon, title, sub, btn, onClick }: { icon: React.ReactNode; title: string; sub: string; btn: string; onClick: () => void }) {
  return (
    <div style={{ background: C.white, border: `1px dashed ${C.border}`, borderRadius: 16, padding: "56px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>{icon}</div>
      <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0 }}>{title}</h3>
      <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: "0 0 14px", maxWidth: 320 }}>{sub}</p>
      <PrimaryBtn onClick={onClick}><Plus size={16} /> {btn}</PrimaryBtn>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export function QuanLyPhongPage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [properties, setProperties] = useState<Property[]>(INIT_PROPERTIES);
  const [selectedId, setSelectedId] = useState<string>(INIT_PROPERTIES[0].id);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RoomStatus | "all">("all");
  const [sort, setSort] = useState(SORT_OPTIONS[0]);
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const [modal, setModal] = useState<null | "property" | "room">(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [openActionMenuRoomId, setOpenActionMenuRoomId] = useState<string | null>(null);
  const [roomActionModal, setRoomActionModal] = useState<RoomActionModalState>(null);

  const selected = properties.find(p => p.id === selectedId) || null;

  const updateRoom = (roomId: string, patch: Partial<Room>) => {
    setProperties(prev => prev.map(p =>
      p.id !== selectedId ? p : { ...p, rooms: p.rooms.map(r => r.id === roomId ? { ...r, ...patch } : r) }
    ));
    setDetailRoom(prev => prev && prev.id === roomId ? { ...prev, ...patch } : prev);
  };

  const filteredRooms = useMemo(() => {
    if (!selected) return [];
    let rs = selected.rooms;
    const q = search.trim().toLowerCase();
    if (q) rs = rs.filter(r =>
      r.code.toLowerCase().includes(q) ||
      r.floor.toLowerCase().includes(q) ||
      (r.tenant?.name.toLowerCase().includes(q) ?? false));
    if (filter !== "all") rs = rs.filter(r => r.status === filter);
    const arr = [...rs];
    if (sort === "Mã phòng") arr.sort((a, b) => a.code.localeCompare(b.code));
    else if (sort === "Giá thuê") arr.sort((a, b) => parseInt(b.price.replace(/\D/g, "")) - parseInt(a.price.replace(/\D/g, "")));
    else if (sort === "Trạng thái") arr.sort((a, b) => a.status.localeCompare(b.status));
    return arr;
  }, [selected, search, filter, sort]);

  const handleCreateListing = (room: Room) => navigate("/dang-tin", {
    state: {
      prefill: {
        title: `Phòng ${room.code} - ${selected?.name ?? ""}`.trim(),
        address: selected?.address ?? "",
        area: room.area.replace(/\D/g, ""),
        price: room.price.replace(/\D/g, ""),
        roomType: "Phòng trọ",
      }
    }
  });

  const counts = (p: Property) => ({
    total: p.rooms.length,
    empty: p.rooms.filter(r => r.status === "available").length,
  });

  const propStats = selected ? {
    expiring: selected.rooms.filter(r => r.status === "expiring").length,
    unpaid: selected.rooms.filter(r => r.status === "unpaid").length,
  } : { expiring: 0, unpaid: 0 };

  /* ───────────────────── PROPERTY LIST (desktop left panel) ──────── */
  const PropertyCard = ({ p }: { p: Property }) => {
    const c = counts(p);
    const active = p.id === selectedId;
    return (
      <button onClick={() => { setSelectedId(p.id); setFilter("all"); setSearch(""); }}
        style={{ textAlign: "left", width: "100%", position: "relative", background: active ? C.white : "transparent", border: `1px solid ${active ? C.border : "transparent"}`, borderRadius: 12, padding: "14px 16px 14px 18px", cursor: "pointer", boxShadow: active ? "0 2px 10px rgba(92,70,50,0.08)" : "none", transition: "all 0.13s" }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.55)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
        {active && <div style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 4, borderRadius: 4, background: C.primary }} />}
        <p style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>{p.name}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 9 }}>
          <MapPin size={12} color={C.textSecondary} style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>{p.district}</span>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 600, color: C.textSecondary }}>{c.total} phòng</span>
          <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: "#6B8E5A" }}>{c.empty} trống</span>
        </div>
      </button>
    );
  };

  /* ───────────────────── DRAWER / BOTTOM SHEET ──────── */
  const RoomDetail = () => {
    if (!detailRoom) return null;
    return (
      <div onClick={() => setDetailRoom(null)} style={{ position: "fixed", inset: 0, background: "rgba(42,26,12,0.5)", zIndex: 300, display: "flex", justifyContent: isMobile ? "center" : "flex-end", alignItems: isMobile ? "flex-end" : "stretch" }}>
        <div onClick={e => e.stopPropagation()}
          style={{ background: C.bg, width: isMobile ? "100%" : 440, maxHeight: isMobile ? "92vh" : "100%", height: isMobile ? undefined : "100%", borderTopLeftRadius: isMobile ? 20 : 0, borderTopRightRadius: isMobile ? 20 : 0, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(42,26,12,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: C.white, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div>
              <h3 style={{ fontFamily: font, fontSize: 19, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Chi tiết phòng {detailRoom.code}</h3>
              <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>{selected?.name}</span>
            </div>
            <button onClick={() => setDetailRoom(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}><X size={22} color={C.textSecondary} /></button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 22px 22px" }}>
            <RoomDetailContent room={detailRoom} onCreateListing={() => handleCreateListing(detailRoom)} />
          </div>
          <div style={{ padding: "16px 22px", background: C.white, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <DetailActions room={detailRoom} onUpdate={patch => updateRoom(detailRoom.id, patch)} onCreateListing={() => { setDetailRoom(null); handleCreateListing(detailRoom); }} />
          </div>
        </div>
      </div>
    );
  };

  const Modals = () => (
    <>
      {modal === "property" && <AddPropertyModal onClose={() => setModal(null)} />}
      {modal === "room" && <AddRoomModal onClose={() => setModal(null)} properties={properties} currentId={selectedId} />}
      {roomActionModal?.type === "utility" && <UtilityMeterModal room={roomActionModal.room} onClose={() => setRoomActionModal(null)} />}
      {roomActionModal && roomActionModal.type !== "utility" && <RoomActionPlaceholderModal state={roomActionModal} onClose={() => setRoomActionModal(null)} />}
    </>
  );

  /* ════════════════════════ MOBILE ════════════════════════ */
  if (isMobile) {
    return (
      <LandlordShell active="rooms" mobileTitle="Khu trọ & Phòng">
        {properties.length === 0 ? (
          <div style={{ padding: 20 }}>
            <EmptyBlock icon={<Building2 size={26} color={C.primary} />} title="Bạn chưa có khu trọ nào" sub="Tạo khu trọ đầu tiên để quản lý danh sách phòng." btn="Thêm khu trọ" onClick={() => setModal("property")} />
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 100px" }}>
            {/* Property selector */}
            <button onClick={() => setSwitcherOpen(true)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 16, cursor: "pointer", boxSizing: "border-box" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Building2 size={18} color={C.primary} />
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: C.textSecondary, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Khu trọ</p>
                  <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{selected?.name}</span>
                </div>
              </div>
              <ChevronDown size={18} color={C.textSecondary} />
            </button>

            {selected && selected.rooms.length === 0 ? (
              <EmptyBlock icon={<Home size={26} color={C.primary} />} title="Khu trọ này chưa có phòng" sub="Thêm phòng đầu tiên để bắt đầu quản lý." btn="Thêm phòng" onClick={() => setModal("room")} />
            ) : (
              <>
                <AttentionCards expiring={propStats.expiring} unpaid={propStats.unpaid} />
                <KpiCards rooms={selected!.rooms} scroll />
                <p style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: "8px 0 14px" }}>Danh sách phòng</p>
                <RoomControls search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} sort={sort} onSort={setSort} mobile />
                {filteredRooms.length === 0
                  ? <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, textAlign: "center", padding: "32px 0" }}>Không tìm thấy phòng phù hợp.</p>
                  : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {filteredRooms.map(r => <MobileRoomCard key={r.id} room={r} openActionMenuRoomId={openActionMenuRoomId} setOpenActionMenuRoomId={setOpenActionMenuRoomId} onOpen={setDetailRoom} onCreateListing={handleCreateListing} onActionModal={(type, room) => setRoomActionModal({ type, room })} />)}
                    </div>
                  )}
              </>
            )}
          </div>
        )}

        {/* FAB */}
        <button onClick={() => setModal("room")}
          style={{ position: "fixed", right: 18, bottom: "calc(76px + env(safe-area-inset-bottom))", width: 54, height: 54, borderRadius: "50%", background: C.primary, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 16px rgba(138,106,69,0.36)", zIndex: 90 }}>
          <Plus size={24} color="white" />
        </button>

        {/* Property switcher bottom sheet */}
        {switcherOpen && (
          <div onClick={() => setSwitcherOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(42,26,12,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: C.bg, width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "10px 16px 24px", maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: C.border, margin: "0 auto 16px" }} />
              <p style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: "0 0 12px" }}>Khu trọ của tôi</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                {properties.map(p => {
                  const c = counts(p);
                  const active = p.id === selectedId;
                  return (
                    <button key={p.id} onClick={() => { setSelectedId(p.id); setFilter("all"); setSearch(""); setSwitcherOpen(false); }}
                      style={{ textAlign: "left", background: active ? C.white : "transparent", border: `1.5px solid ${active ? C.primary : C.border}`, borderRadius: 12, padding: "13px 15px", cursor: "pointer" }}>
                      <p style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: "0 0 3px" }}>{p.name}</p>
                      <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>{p.district} · {c.total} phòng · {c.empty} trống</span>
                    </button>
                  );
                })}
              </div>
              <GhostBtn onClick={() => { setSwitcherOpen(false); setModal("property"); }}><Plus size={15} /> Thêm khu trọ</GhostBtn>
            </div>
          </div>
        )}

        <RoomDetail />
        <Modals />
      </LandlordShell>
    );
  }

  /* ════════════════════════ DESKTOP ════════════════════════ */
  return (
    <LandlordShell active="rooms" mobileTitle="Khu trọ & Phòng">
      {properties.length === 0 ? (
        <div style={{ maxWidth: 600, margin: "60px auto", width: "100%", padding: "0 32px" }}>
          <EmptyBlock icon={<Building2 size={28} color={C.primary} />} title="Bạn chưa có khu trọ nào" sub="Tạo khu trọ đầu tiên để quản lý danh sách phòng." btn="Thêm khu trọ" onClick={() => setModal("property")} />
        </div>
      ) : (
        <div style={{ flex: 1, maxWidth: 1320, margin: "0 auto", width: "100%", padding: "28px 32px 80px", display: "flex", gap: 28, alignItems: "flex-start" }}>
          {/* LEFT PANEL */}
          <aside style={{ width: 300, flexShrink: 0, position: "sticky", top: 16 }}>
            <p style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: "0 0 14px" }}>Khu trọ của tôi</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {properties.map(p => <PropertyCard key={p.id} p={p} />)}
            </div>
            <button onClick={() => setModal("property")}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", background: "transparent", border: `1.5px dashed ${C.border}`, borderRadius: 12, fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.primary, cursor: "pointer", transition: "all 0.13s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = "rgba(255,255,255,0.5)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "transparent"; }}>
              <Plus size={16} /> Thêm khu trọ
            </button>
          </aside>

          {/* MAIN CONTENT */}
          <main style={{ flex: 1, minWidth: 0 }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
              <span onClick={() => navigate("/chu-tro")} style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>Dashboard chủ trọ</span>
              <ChevronRight size={15} color={C.textSecondary} />
              <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textSecondary }}>Quản lý khu trọ &amp; phòng</span>
              <ChevronRight size={15} color={C.textSecondary} />
              <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary }}>{selected!.name}</span>
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
              <div>
                <h1 style={{ fontFamily: font, fontSize: 26, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px", letterSpacing: "-0.02em" }}>{selected!.name}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={14} color={C.textSecondary} />
                  <span style={{ fontFamily: font, fontSize: 14, color: C.textSecondary }}>{selected!.address}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                <GhostBtn onClick={() => {}}><Settings size={15} /> Cài đặt khu trọ</GhostBtn>
                <PrimaryBtn onClick={() => setModal("room")}><Plus size={16} /> Thêm phòng</PrimaryBtn>
              </div>
            </div>

            {selected!.rooms.length === 0 ? (
              <EmptyBlock icon={<Home size={28} color={C.primary} />} title="Khu trọ này chưa có phòng" sub="Thêm phòng đầu tiên để bắt đầu quản lý." btn="Thêm phòng" onClick={() => setModal("room")} />
            ) : (
              <>
                <KpiCards rooms={selected!.rooms} />
                <AttentionCards expiring={propStats.expiring} unpaid={propStats.unpaid} />
                <p style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: "0 0 16px" }}>Danh sách phòng</p>
                <RoomControls search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} sort={sort} onSort={setSort} />
                {filteredRooms.length === 0
                  ? <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "48px", textAlign: "center", fontFamily: font, fontSize: 14, color: C.textSecondary }}>Không tìm thấy phòng phù hợp với bộ lọc.</div>
                  : <RoomTable rooms={filteredRooms} openActionMenuRoomId={openActionMenuRoomId} setOpenActionMenuRoomId={setOpenActionMenuRoomId} onOpen={setDetailRoom} onCreateListing={handleCreateListing} onActionModal={(type, room) => setRoomActionModal({ type, room })} />}
              </>
            )}
          </main>
        </div>
      )}

      <RoomDetail />
      <Modals />
    </LandlordShell>
  );
}

export default QuanLyPhongPage;
