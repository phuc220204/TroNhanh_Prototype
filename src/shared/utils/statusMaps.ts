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


/* ── Đơn thanh toán payOS (saas_orders / boost_orders / demand_boost_orders) ── */

/** Status đơn payOS — đúng giá trị check constraint của 3 bảng đơn. */
export type OrderStatus = "PENDING" | "LINKED" | "PAID" | "PAID_PENDING_APPROVAL" | "NEEDS_REVIEW" | "CANCELLED" | "EXPIRED";
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  PENDING:               { label: "Chờ thanh toán",         color: C.warning,       bg: C.warningBg },
  LINKED:                { label: "Đã tạo link thanh toán", color: C.warning,       bg: C.warningBg },
  PAID:                  { label: "Đã thanh toán",          color: C.success,       bg: C.successBg },
  PAID_PENDING_APPROVAL: { label: "Đã thanh toán · chờ duyệt tin", color: C.primary, bg: C.cream },
  NEEDS_REVIEW:          { label: "Cần đối soát",           color: C.error,         bg: C.errorBg },
  CANCELLED:             { label: "Đã hủy",                 color: C.textSecondary, bg: C.cream },
  EXPIRED:               { label: "Hết hạn",                color: C.textSecondary, bg: C.cream },
};
export const isOrderStatus = (value: string | null | undefined): value is OrderStatus =>
  !!value && value in ORDER_STATUS_META;

/** Loại doanh thu nền tảng — khớp cột `kind` của RPC admin_revenue_*. */
export type RevenueKind = "Saas" | "ListingBoost" | "DemandBoost";
export const REVENUE_KIND_META: Record<RevenueKind, { label: string; color: string }> = {
  Saas:         { label: "Gói quản lý SaaS",  color: C.primary },
  ListingBoost: { label: "Đẩy tin cho thuê",  color: C.secondary },
  DemandBoost:  { label: "Đẩy tin nhu cầu",   color: C.available },
};
export const REVENUE_KINDS: RevenueKind[] = ["Saas", "ListingBoost", "DemandBoost"];
export const isRevenueKind = (value: string | null | undefined): value is RevenueKind =>
  !!value && value in REVENUE_KIND_META;
