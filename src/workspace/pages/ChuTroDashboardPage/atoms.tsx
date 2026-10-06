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
  Building2, ChevronDown, ChevronRight,
} from "lucide-react";
import { C, font, shadow } from "../../../shared/theme";
import { Badge } from "../../../shared/components/common";
import type { RoomStatus } from "../../../shared/types/status";
import { normalizeRoomStatus } from "../../../shared/utils/statusMaps";
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
        boxShadow: isDisabled ? "none" : shadow.sm,
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

/** Trạng thái phòng — nhãn + màu lấy từ statusMaps qua Badge (một bộ từ vựng cho cả app). */
export function StatusChip({ status }: { status: RoomStatus }) {
  return <Badge kind="room" status={status} />;
}

/** Tình trạng thanh toán kỳ gần nhất. null = chưa có hóa đơn. */
export function PayText({ paid }: { paid: boolean | null }) {
  if (paid === null) return <span style={{ color: C.textSecondary }}>—</span>;
  return <Badge kind="invoice" status={paid ? "paid" : "unpaid"} />;
}

/* ══════════════════════════════════════════
   PROPERTY SELECTOR
   ══════════════════════════════════════════ */
export function PropertySelector({ value, onChange, options, mobile }: { value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; mobile?: boolean }) {
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
            minWidth: mobile ? undefined : 200, boxShadow: shadow.sm
          }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Building2 size={15} color={C.primary} />{options.find(option => option.value === value)?.label ?? value}</span>
          <ChevronDown size={16} color={C.textSecondary} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </button>
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: mobile ? 0 : 80, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: shadow.md, padding: 6, zIndex: 41, minWidth: 220 }}>
            {options.map(option => (
              <button key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "10px 12px", background: option.value === value ? C.caramelSoft : "transparent", border: "none", borderRadius: 8, fontFamily: font, fontSize: 13.5, fontWeight: option.value === value ? 700 : 500, color: C.textPrimary, cursor: "pointer" }}>
                {option.label}
                {option.value === value && <ChevronRight size={14} color={C.primary} />}
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
export function SegmentedBar({ rooms, propertyId }: { rooms: any[]; propertyId: string }) {
  // Không có nhánh fallback: DB rỗng thì `rooms` rỗng và biểu đồ hiển thị 0 —
  // đúng sự thật. Trước T09 chỗ này rơi về PREVIEW_ROOMS (dữ liệu giả).
  const activeRooms = propertyId === "all"
    ? rooms
    : rooms.filter(r => r.property_id === propertyId);

  const total = activeRooms.length;

  const countByStatus = (status: RoomStatus) => activeRooms.filter(r => normalizeRoomStatus(r.status) === status).length;
  const data = [
    { label: "Trống", value: countByStatus("available"), color: C.available },
    { label: "Đã cọc", value: countByStatus("deposited"), color: C.secondary },
    { label: "Đang thuê", value: countByStatus("rented"), color: C.rented },
    { label: "Đã ẩn", value: countByStatus("hidden"), color: C.repairing },
  ];

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", marginBottom: 12, background: C.border }}>
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
        transform: hov ? "translateY(-2px)" : "none", boxShadow: hov ? shadow.md : shadow.sm,
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
            <div style={{ height: 6, background: C.border, borderRadius: 99 }}>
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

/**
 * Chân trang dashboard. Trước đây có 3 "link" (Chính sách bảo mật / Điều khoản
 * dịch vụ / Trung tâm hỗ trợ) là <span> trỏ chuột nhưng không đi đâu — app chưa
 * có route nào cho chúng, nên bỏ hẳn thay vì giữ link giả.
 */
export function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: "20px 0", marginTop: 32 }}>
      <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}><b style={{ color: C.primary }}>Trọ Nhanh</b> · © 2026 Trọ Nhanh</span>
    </footer>
  );
}
