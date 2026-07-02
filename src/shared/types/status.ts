/* ══════════════════════════════════════════
   CANONICAL STATUS TYPES — Trọ Nhanh
   Single source of truth cho status types.
   Enum đúng theo file 02 (Đặc tả Kỹ thuật v2):
   - RoomStatus: BR-002
   - ListingStatus: BR-001
   - InvoiceStatus: BR-004
   - ContractStatus: BR-006
   - SubscriptionStatus: BR-015 (gating)
══════════════════════════════════════════ */

/** BR-002: Available ⇄ Deposited ⇄ Rented; Available ⇄ Hidden */
export type RoomStatus =
  | "available"
  | "deposited"
  | "rented"
  | "hidden";

/** BR-001: Draft → PendingApproval → Active → (Expired/Rented/Hidden/Rejected) */
export type ListingStatus =
  | "draft"
  | "pendingApproval"
  | "active"
  | "rejected"
  | "hidden"
  | "expired"
  | "rented";

/** BR-004: Unpaid → PartiallyPaid → Paid; quá dueDate → Overdue */
export type InvoiceStatus =
  | "unpaid"
  | "partiallyPaid"
  | "paid"
  | "overdue";

/** BR-006: Draft → Active → (Expired / Terminated) */
export type ContractStatus =
  | "draft"
  | "active"
  | "expired"
  | "terminated";

/** BR-015 / PRD §3.2: Gating 4 trạng thái workspace */
export type SubscriptionStatus =
  | "NONE"
  | "TRIAL"
  | "ACTIVE"
  | "READ_ONLY";
