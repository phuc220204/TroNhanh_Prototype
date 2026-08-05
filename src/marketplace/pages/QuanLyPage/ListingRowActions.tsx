import React from "react";
import { Eye, EyeOff, Pencil, ArrowUpCircle, Trash2, Star, TriangleAlert } from "lucide-react";
import { C, font, radius, space } from "../../../shared/theme";
import { LISTING_META } from "../../../shared/utils/statusMaps";
import { toListingStatus } from "../../../shared/types/status";

/**
 * Nhãn trạng thái tin cho phía người bán.
 *
 * Lấy từ LISTING_META (đủ 7 trạng thái BR-001) thay vì tự so chuỗi. Bản cũ chỉ
 * bắt Active/PendingApproval/Expired nên `Draft`, `Rejected`, `Rented` đều rơi
 * vào nhánh mặc định và hiện "Đã ẩn" — người bán bị từ chối không hề biết.
 */
export function getStatusMeta(status: string, boostExpire: string | null) {
  const isVIP = !!(boostExpire && new Date(boostExpire) > new Date());
  const meta = LISTING_META[toListingStatus(status)];
  if (isVIP && meta.label === "Đang hiển thị") {
    return { label: "Hiển thị (VIP)", color: C.repairing, bg: C.cream, vip: true };
  }
  return { ...meta, vip: false };
}

export function StatusChip({ status, boostExpire }: { status: string; boostExpire: string | null }) {
  const m = getStatusMeta(status, boostExpire);
  return (
    <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color: m.color, background: m.bg, borderRadius: 8, padding: "3px 9px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {m.vip && <Star size={10.5} fill={C.repairing} stroke="none" />}
      {m.label}
    </span>
  );
}

/**
 * Lý do từ chối + lối sửa lại. Không có khối này thì tin `Rejected` là ngõ cụt:
 * người bán thấy nhãn đỏ mà không biết sai gì (FR-064).
 */
export function RejectionNotice({ reason, onEdit }: { reason: string | null; onEdit: () => void }) {
  if (!reason) return null;
  return (
    <div
      data-testid="listing-rejection-notice"
      style={{
        display: "flex", alignItems: "flex-start", gap: space[2],
        background: C.cream, border: `1px solid ${C.error}`,
        borderRadius: radius.sm, padding: `${space[2]}px ${space[3]}px`,
        marginTop: space[2],
      }}
    >
      <TriangleAlert size={14} color={C.error} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: font, fontSize: 12.5, color: C.error, margin: 0, lineHeight: 1.5 }}>
          <strong>Lý do từ chối:</strong> {reason}
        </p>
        <button
          type="button"
          onClick={onEdit}
          data-testid="listing-resubmit-btn"
          style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.primary, background: "none", border: "none", padding: "4px 0 0", cursor: "pointer" }}
        >
          Sửa &amp; gửi lại →
        </button>
      </div>
    </div>
  );
}

export function IconAction({ icon, label, onClick, danger, vip, disabled }: { icon: React.ReactNode; label: string; onClick?: () => void; danger?: boolean; vip?: boolean; disabled?: boolean }) {
  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      title={label} 
      aria-label={label}
      style={{ 
        width: 32, height: 32, borderRadius: 8, 
        border: `1px solid ${vip ? C.repairing : C.border}`, 
        background: vip ? "#FEF6EC" : C.white, 
        display: "flex", alignItems: "center", justifyContent: "center", 
        cursor: disabled ? "not-allowed" : "pointer", 
        color: danger ? "#B5503C" : vip ? C.repairing : C.textSecondary,
        transition: "all 0.15s", opacity: disabled ? 0.5 : 1
      }}
      onMouseEnter={e => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-1px)";
        if (vip) e.currentTarget.style.background = "#FDE4CA";
        else e.currentTarget.style.borderColor = C.primary;
      }}
      onMouseLeave={e => {
        if (disabled) return;
        e.currentTarget.style.transform = "none";
        if (vip) e.currentTarget.style.background = "#FEF6EC";
        else e.currentTarget.style.borderColor = C.border;
      }}>
      {icon}
    </button>
  );
}

export interface ListingActionGroupProps {
  id: string;
  status: string;
  isBlocked: boolean;
  isVIP: boolean;
  onView: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onBoost: () => void;
  onDelete: () => void;
}

export function ListingActionGroup({ id, status, isBlocked, isVIP, onView, onEdit, onToggleStatus, onBoost, onDelete }: ListingActionGroupProps) {
  return (
    <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
      <IconAction icon={<Eye size={14} />} label="Xem tin" onClick={onView} disabled={isBlocked} />
      <IconAction icon={<Pencil size={14} />} label="Chỉnh sửa" onClick={onEdit} disabled={isBlocked} />
      <IconAction icon={status === "Active" ? <EyeOff size={14} /> : <Eye size={14} />} label={status === "Active" ? "Ẩn tin" : "Hiện tin"} onClick={onToggleStatus} disabled={isBlocked} />
      <IconAction icon={<ArrowUpCircle size={14} />} label="Đẩy tin VIP" vip onClick={onBoost} disabled={isBlocked || isVIP} />
      <IconAction icon={<Trash2 size={14} />} label="Xóa tin" danger onClick={onDelete} disabled={isBlocked} />
    </div>
  );
}
