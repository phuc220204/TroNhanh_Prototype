/* ══════════════════════════════════════════
   STATUS LABEL + COLOR MAPS — Trọ Nhanh
   Label tiếng Việt + màu cho status key chuẩn.
   Enums đúng file 02: BR-001 (Listing), BR-002 (Room),
   BR-004 (Invoice), BR-006 (Contract).
══════════════════════════════════════════ */
import { C } from "../theme.ts";
import type { RoomStatus, ListingStatus, InvoiceStatus, ContractStatus } from "../types/status";

/** BR-002: Available / Deposited / Rented / Hidden */
// `bg` nhạt + chữ màu đậm: chữ trắng trên nền `color` không đủ tương phản (WCAG AA)
// với "Đã cọc"/"Đã ẩn" ở cỡ 11px.
export const ROOM_STATUS_META: Record<RoomStatus, { label: string; color: string; bg: string }> = {
  available: { label: "Trống",       color: "#4A7A34", bg: "#EDF2E7" },
  deposited: { label: "Đã cọc",     color: "#9A6410", bg: "#FBF1DD" },
  rented:    { label: "Đang thuê",   color: C.primary, bg: "#F5EFE6" },
  hidden:    { label: "Đã ẩn",      color: "#6E604F", bg: "#EFE9DD" },
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
export const CONTRACT_STATUS_META: Record<ContractStatus, { label: string; color: string; bg: string }> = {
  draft:      { label: "Bản nháp",     color: "#6E604F", bg: "#EFE9DD" },
  active:     { label: "Đang hiệu lực", color: "#4A7A34", bg: "#EDF2E7" },
  expired:    { label: "Hết hạn",       color: "#B5503C", bg: "#FBEDE9" },
  terminated: { label: "Đã chấm dứt",  color: "#B5503C", bg: "#FBEDE9" },
};

/** BR-029: liên kết tài khoản người ở. Pending → (Confirmed | Rejected); chưa gắn = null. */
export type LinkStatus = "none" | "pending" | "confirmed" | "rejected";
export const LINK_STATUS_META: Record<LinkStatus, { label: string; color: string; bg: string }> = {
  none:      { label: "Chưa gắn tài khoản", color: "#6E604F", bg: "#EFE9DD" },
  pending:   { label: "Chờ người ở xác nhận", color: "#9A6410", bg: "#FBF1DD" },
  confirmed: { label: "Đã liên kết",        color: "#4A7A34", bg: "#EDF2E7" },
  rejected:  { label: "Bị từ chối",         color: "#B5503C", bg: "#FBEDE9" },
};

/* ── Chuẩn hóa giá trị DB (PascalCase) → khóa META — một chỗ, không map tay ── */

const ROOM_BY_DB: Record<string, RoomStatus> = { Available: "available", Deposited: "deposited", Rented: "rented", Hidden: "hidden" };
const INVOICE_BY_DB: Record<string, InvoiceStatus> = { Unpaid: "unpaid", PartiallyPaid: "partiallyPaid", Paid: "paid", Overdue: "overdue" };
const CONTRACT_BY_DB: Record<string, ContractStatus> = { Draft: "draft", Active: "active", Expired: "expired", Terminated: "terminated" };
const LINK_BY_DB: Record<string, LinkStatus> = { Pending: "pending", Confirmed: "confirmed", Rejected: "rejected" };

/** Nhận cả dạng DB ("Rented") lẫn khóa đã chuẩn ("rented"). Giá trị lạ → null (không đoán bừa thành "Trống"). */
function normalize<T extends string>(table: Record<string, T>, value: string | null | undefined): T | null {
  if (!value) return null;
  if (value in table) return table[value]!;
  return (Object.values(table) as string[]).includes(value) ? (value as T) : null;
}

export const normalizeRoomStatus = (value: string | null | undefined) => normalize(ROOM_BY_DB, value);
export const normalizeInvoiceStatus = (value: string | null | undefined) => normalize(INVOICE_BY_DB, value);
export const normalizeContractStatus = (value: string | null | undefined) => normalize(CONTRACT_BY_DB, value);
export const normalizeLinkStatus = (value: string | null | undefined): LinkStatus => normalize(LINK_BY_DB, value) ?? "none";

