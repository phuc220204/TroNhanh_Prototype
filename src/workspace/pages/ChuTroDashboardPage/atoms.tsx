/**
 * Các mảnh UI nhỏ của Dashboard chủ trọ.
 *
 * Tách ra khi T27 chạm vào file này: `ChuTroDashboardPage.tsx` cũ dài 1.085
 * dòng, vượt ngưỡng 600 của CLAUDE.md §8.2 (split-on-touch). Đây là cắt thuần
 * cơ học — không đổi một dòng style hay logic nào của các component bên dưới,
 * trừ `PrimaryBtn` được bổ sung `requiresWrite` cho BR-015 (ghi rõ tại chỗ).
 */
import React, { useState } from "react";
import {
  Building2, ChevronDown, ChevronRight, Eye, Pencil, Trash2, Calendar,
} from "lucide-react";
import { C, font } from "../../../shared/theme";
import type { RoomStatus } from "../../../shared/types/status";
import { useCanWrite, useWriteBlockReason } from "../../../shared/contexts/SubscriptionContext";

/* ══════════════════════════════════════════
   SHARED PRIMITIVES
   ══════════════════════════════════════════ */
export function PrimaryBtn({
  children, onClick, small, disabled, requiresWrite, "data-testid": testId,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  small?: boolean;
  disabled?: boolean;
  /**
   * BR-015 — nút này ghi dữ liệu SaaS ⇒ tự khóa khi gói hết hạn (READ_ONLY)
   * hoặc chưa kích hoạt (NONE). Gác ở đây, không gác ở từng call site.
   */
  requiresWrite?: boolean;
  "data-testid"?: string;
}) {
  const canWrite = useCanWrite();
  const blockReason = useWriteBlockReason();
  const isWriteBlocked = requiresWrite === true && !canWrite;
  const isDisabled = disabled || isWriteBlocked;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      data-testid={testId}
      title={isWriteBlocked ? blockReason ?? undefined : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: small ? "8px 16px" : "10px 18px",
        background: isDisabled ? C.border : C.primary,
        color: isDisabled ? C.textSecondary : C.white,
        border: "none", borderRadius: 10, fontFamily: font,
        fontSize: small ? 13 : 13.5, fontWeight: 700,
        cursor: isDisabled ? "not-allowed" : "pointer",
        boxShadow: isDisabled ? "none" : "0 2px 10px rgba(138,106,69,0.25)",
        whiteSpace: "nowrap", opacity: isDisabled ? 0.6 : 1,
        transition: "background 0.15s"
      }}
      onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.background = C.primaryHover; }}
      onMouseLeave={e => { if (!isDisabled) e.currentTarget.style.background = C.primary; }}>
      {children}
    </button>
  );
}

export function GhostBtn({
  children, onClick, small, disabled, requiresWrite, "data-testid": testId,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  small?: boolean;
  disabled?: boolean;
  requiresWrite?: boolean;
  "data-testid"?: string;
}) {
  const canWrite = useCanWrite();
  const blockReason = useWriteBlockReason();
  const isWriteBlocked = requiresWrite === true && !canWrite;
  const isDisabled = disabled || isWriteBlocked;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      data-testid={testId}
      title={isWriteBlocked ? blockReason ?? undefined : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: small ? "7px 14px" : "9px 16px",
        background: C.white,
        color: isDisabled ? C.border : C.textSecondary,
        border: `1.5px solid ${C.border}`, borderRadius: 10,
        fontFamily: font, fontSize: small ? 13 : 13.5, fontWeight: 600,
        cursor: isDisabled ? "not-allowed" : "pointer", whiteSpace: "nowrap",
        opacity: isDisabled ? 0.6 : 1,
        transition: "all 0.15s"
      }}
      onMouseEnter={e => { if (!isDisabled) { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary; } }}
      onMouseLeave={e => { if (!isDisabled) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; } }}>
      {children}
    </button>
  );
}

export function StatusChip({ status }: { status: RoomStatus }) {
  let label = "Trống";
  let bg = "#EBF2E8";
  let color = "#4F7A4A";

  // Trước đây các nhánh này còn so sánh với "Available"/"Rented"/"Đã cọc" —
  // luôn false vì RoomStatus là lowercase. Chuẩn hoá DB→local đã làm ở
  // mapDbRoom (QuanLyPhongPage), nên ở đây chỉ cần 4 giá trị hợp lệ.
  if (status === "available") {
    label = "Trống";
    bg = "#EBF2E8";
    color = "#4F7A4A";
  } else if (status === "rented") {
    label = "Đang thuê";
    bg = "#F5EFE6";
    color = "#9B8C78";
  } else if (status === "deposited") {
    label = "Đã cọc";
    bg = "#FEF6EC";
    color = "#C99B65";
  } else if (status === "hidden") {
    label = "Đã ẩn";
    bg = "#FCECEC";
    color = "#C07B4A";
  }

  return (
    <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color, background: bg, borderRadius: 8, padding: "3px 9px", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

export function PayText({ paid }: { paid: boolean | null }) {
  if (paid === null) return <span style={{ color: C.textSecondary }}>—</span>;
  return <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: paid ? "#4F7A4A" : "#C07B4A" }}>{paid ? "Đã thanh toán" : "Chưa thanh toán"}</span>;
}

/* ══════════════════════════════════════════
   PROPERTY SELECTOR
   ══════════════════════════════════════════ */
export function PropertySelector({ value, onChange, options, mobile }: { value: string; onChange: (v: string) => void; options: string[]; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", width: mobile ? "100%" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {!mobile && <span style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textSecondary }}>Đang xem:</span>}
        <button onClick={() => setOpen(o => !o)}
          data-testid="dashboard-property-selector"
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            padding: mobile ? "12px 14px" : "9px 14px", minHeight: mobile ? 44 : undefined,
            background: C.white, border: `1.5px solid ${open ? C.primary : C.border}`,
            borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 700,
            color: C.textPrimary, cursor: "pointer", width: mobile ? "100%" : undefined,
            minWidth: mobile ? undefined : 200, boxShadow: "0 2px 6px rgba(42,26,12,0.01)"
          }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Building2 size={15} color={C.primary} />{value}</span>
          <ChevronDown size={16} color={C.textSecondary} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </button>
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: mobile ? 0 : 80, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 10px 30px rgba(42,26,12,0.1)", padding: 6, zIndex: 41, minWidth: 220 }}>
            {options.map(p => (
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

/* ══════════════════════════════════════════
   REUSABLE SECTIONS
   ══════════════════════════════════════════ */
export function SegmentedBar({ rooms, property }: { rooms: any[]; property: string }) {
  // Không có nhánh fallback: DB rỗng thì `rooms` rỗng và biểu đồ hiển thị 0 —
  // đúng sự thật. Trước T09 chỗ này rơi về PREVIEW_ROOMS (dữ liệu giả).
  const activeRooms = property === "Tất cả khu trọ"
    ? rooms
    : rooms.filter(r => r.properties?.name === property);

  const total = activeRooms.length;

  const data = [
    { label: "Trống", value: activeRooms.filter(r => r.status === "Available" || r.status === "available").length, color: "#4F7A4A" },
    { label: "Đã cọc", value: activeRooms.filter(r => r.status === "Deposited" || r.status === "deposited" || r.status === "Đã cọc" || r.status === "đã cọc").length, color: C.secondary },
    { label: "Đang thuê", value: activeRooms.filter(r => r.status === "Rented" || r.status === "rented").length, color: "#9B8C78" },
    { label: "Đã ẩn", value: activeRooms.filter(r => r.status === "Hidden" || r.status === "hidden").length, color: "#C07B4A" },
  ];

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", marginBottom: 12, background: "#EADCCB" }}>
        {data.map(s => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={s.label}
              style={{ width: `${pct}%`, background: s.color }}
              title={`${s.label}: ${s.value}`}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
        {data.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>{s.label} <b style={{ color: C.textPrimary }}>{s.value}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoomTaskBtn({ task, onClick }: { task: string; onClick: () => void }) {
  return (
    <button onClick={onClick} data-testid="dashboard-room-task-btn" style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.primary, background: C.caramelSoft, border: "none", borderRadius: 8, padding: "5px 11px", cursor: "pointer", whiteSpace: "nowrap" }}>{task}</button>
  );
}

export function UtilityCard({
  title, desc, progress, cta, onClick, color, bgImage
}: {
  title: string; desc: string; progress?: { pct: number; label: string }; cta: string; onClick: () => void; color: string; bgImage?: string
}) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: C.white, border: `1px solid ${hov ? color : C.border}`, borderRadius: 16, padding: "20px 22px",
        display: "flex", flexDirection: "column", gap: 10, transition: "all 0.15s",
        transform: hov ? "translateY(-2px)" : "none", boxShadow: hov ? "0 6px 20px rgba(42,26,12,0.06)" : "0 2px 10px rgba(42,26,12,0.02)",
        position: "relative", overflow: "hidden", minHeight: 140
      }}>

      <div style={{ zIndex: 2, marginRight: 60 }}>
        <h3 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>{title}</h3>
        <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "0 0 12px", lineHeight: 1.45 }}>{desc}</p>

        {progress && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: font, fontSize: 11.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
              <span>{progress.label}</span>
            </div>
            <div style={{ height: 6, background: "#EADCCB", borderRadius: 99 }}>
              <div style={{ width: `${progress.pct}%`, height: "100%", background: color, borderRadius: 99 }} />
            </div>
          </div>
        )}

        <button onClick={onClick} style={{
          fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.white, background: color,
          border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer",
          boxShadow: `0 2px 8px ${color}33`, whiteSpace: "nowrap"
        }}>
          {cta}
        </button>
      </div>

      {bgImage && (
        <img src={bgImage} alt="" style={{ position: "absolute", bottom: -8, right: -8, width: 85, height: 85, objectFit: "contain", opacity: 0.85, zIndex: 1, pointerEvents: "none" }} />
      )}
    </div>
  );
}

export function ListingRow({ l, onClick }: { l: any; onClick: () => void }) {
  return (
    <div onClick={onClick} data-testid="dashboard-listing-row" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer", justifyContent: "space-between", transition: "border-color 0.15s" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{l.title}</span>
          <span style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: "#4F7A4A", background: "#EBF2E8", borderRadius: 6, padding: "2px 8px" }}>Đang hiển thị</span>
        </div>
        <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>{l.sub}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: font, fontSize: 12, color: C.textSecondary }}>
          <Eye size={14} /> {l.views || Math.floor(Math.random() * 80) + 50}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: font, fontSize: 12, color: C.textSecondary }}>
          <Calendar size={14} /> 27/07/2026
        </span>
        <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
          <IconBtn><Eye size={14} /></IconBtn>
          <IconBtn><Pencil size={14} /></IconBtn>
          <IconBtn><Trash2 size={14} /></IconBtn>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return <button style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textSecondary }}>{children}</button>;
}

export function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: "20px 0", marginTop: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
      <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}><b style={{ color: C.primary }}>Trọ Nhanh</b> · © 2026 Trọ Nhanh</span>
      <div style={{ display: "flex", gap: 18 }}>
        {["Chính sách bảo mật", "Điều khoản dịch vụ", "Trung tâm hỗ trợ"].map(t => (
          <span key={t} style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, cursor: "pointer" }}>{t}</span>
        ))}
      </div>
    </footer>
  );
}
