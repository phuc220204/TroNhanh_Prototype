import React from "react";
import { Eye, EyeOff, Pencil, ArrowUpCircle, Trash2, Star } from "lucide-react";
import { C, font } from "../../../shared/theme";

export function getStatusMeta(status: string, boostExpire: string | null) {
  const isVIP = boostExpire && new Date(boostExpire) > new Date();
  if (status === "Active" || status === "active") {
    return isVIP 
      ? { label: "Hiển thị (VIP)", color: "#E05C5C", bg: "#FCECEC", vip: true } 
      : { label: "Đang hiển thị", color: "#4A7A34", bg: "#E8F5E1", vip: false };
  }
  if (status === "PendingApproval" || status === "pendingApproval") {
    return { label: "Chờ duyệt", color: "#C99B65", bg: "#FEF6EC", vip: false };
  }
  if (status === "Expired" || status === "expired") {
    return { label: "Hết hạn", color: "#A28B78", bg: "#F5EFE6", vip: false };
  }
  return { label: "Đã ẩn", color: C.textSecondary, bg: C.caramelSoft, vip: false };
}

export function StatusChip({ status, boostExpire }: { status: string; boostExpire: string | null }) {
  const m = getStatusMeta(status, boostExpire);
  return (
    <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color: m.color, background: m.bg, borderRadius: 8, padding: "3px 9px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {m.vip && <Star size={10.5} fill="#E05C5C" stroke="none" />}
      {m.label}
    </span>
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
