/* ══════════════════════════════════════════
   STATUS LABEL + COLOR MAPS — Trọ Nhanh
   Label tiếng Việt + màu cho status key chuẩn.
   Enums đúng file 02: BR-001 (Listing), BR-002 (Room),
   BR-004 (Invoice), BR-006 (Contract).
══════════════════════════════════════════ */
import { C } from "../theme";
import type { RoomStatus, ListingStatus, InvoiceStatus, ContractStatus } from "../types/status";

/** BR-002: Available / Deposited / Rented / Hidden */
export const ROOM_STATUS_META: Record<RoomStatus, { label: string; color: string }> = {
  available: { label: "Trống",       color: "#6B8E5A" },
  deposited: { label: "Đã cọc",     color: "#C8861A" },
  rented:    { label: "Đang thuê",   color: C.primary },
  hidden:    { label: "Đã ẩn",      color: "#9B8C78" },
};

/** BR-001: Draft → PendingApproval → Active → … */
export const LISTING_META: Record<ListingStatus, { label: string; color: string; bg: string }> = {
  draft:           { label: "Bản nháp",       color: "#9B8C78", bg: "#EFE9DD" },
  pendingApproval: { label: "Chờ duyệt",      color: "#C8861A", bg: "#FBF1DD" },
  active:          { label: "Đang hiển thị",   color: "#4A7A34", bg: "#EDF2E7" },
  rejected:        { label: "Bị từ chối",      color: "#B5503C", bg: "#FBEDE9" },
  hidden:          { label: "Đã ẩn",           color: "#9B8C78", bg: "#EFE9DD" },
  expired:         { label: "Hết hạn",         color: "#B5503C", bg: "#FBEDE9" },
  rented:          { label: "Đã cho thuê",     color: C.primary, bg: "#F5EFE6" },
};

/** BR-004: Invoice status */
export const INVOICE_STATUS_META: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  unpaid:        { label: "Chưa thanh toán", color: "#B5503C", bg: "#FBEDE9" },
  partiallyPaid: { label: "Thu một phần",    color: "#C8861A", bg: "#FBF1DD" },
  paid:          { label: "Đã thanh toán",   color: "#4A7A34", bg: "#EDF2E7" },
  overdue:       { label: "Quá hạn",         color: "#B5503C", bg: "#FBEDE9" },
};

/** BR-006: Contract status */
export const CONTRACT_STATUS_META: Record<ContractStatus, { label: string; color: string }> = {
  draft:      { label: "Bản nháp",     color: "#9B8C78" },
  active:     { label: "Đang hiệu lực", color: "#4A7A34" },
  expired:    { label: "Hết hạn",       color: "#B5503C" },
  terminated: { label: "Đã chấm dứt",  color: "#B5503C" },
};

