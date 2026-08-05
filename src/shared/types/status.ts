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

/**
 * DB lưu PascalCase (`PendingApproval`), UI dùng camelCase key của LISTING_META.
 * Trước đây mỗi chỗ tự so chuỗi tay và bỏ sót `Draft`/`Rejected`/`Rented`,
 * khiến tin bị từ chối hiện nhãn "Đã ẩn" và người bán không biết vì sao.
 */
const LISTING_STATUS_BY_DB: Record<string, ListingStatus> = {
  Draft: "draft",
  PendingApproval: "pendingApproval",
  Active: "active",
  Rejected: "rejected",
  Hidden: "hidden",
  Expired: "expired",
  Rented: "rented",
};

export function toListingStatus(value: string | null | undefined): ListingStatus {
  const raw = value ?? "";
  if (raw in LISTING_STATUS_BY_DB) return LISTING_STATUS_BY_DB[raw]!;
  // Chấp nhận luôn dạng camelCase để chỗ nào đã chuẩn hoá trước vẫn chạy.
  const camel = Object.values(LISTING_STATUS_BY_DB).find((s) => s === raw);
  return camel ?? "hidden";
}

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

const SUBSCRIPTION_STATUSES: readonly string[] = ["NONE", "TRIAL", "ACTIVE", "READ_ONLY"];

/**
 * Thu hẹp giá trị đọc từ DB về SubscriptionStatus.
 *
 * Vì sao cần: cột `user_subscriptions.status` là `text` + CHECK constraint, và
 * Supabase chỉ sinh literal union cho ENUM thật của Postgres — CHECK thì ra
 * `string`. Nên mọi giá trị đọc lên phải đi qua hàm này thay vì ép kiểu bừa.
 */
export function toSubscriptionStatus(value: string | null | undefined): SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.includes(value ?? "")
    ? (value as SubscriptionStatus)
    : "NONE";
}

/** "Tầng 1" / "1" / "  2 " → 1 | 2. Cột rooms.floor là integer. */
export function parseFloorNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 1;
  const digits = String(value ?? "").replace(/\D/g, "");
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
