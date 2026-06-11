/* ══════════════════════════════════════════
   CANONICAL STATUS TYPES — Trọ Nhanh
   Single source of truth cho status key của
   landlord domain. Label/màu nằm ở utils/statusMaps.ts.
══════════════════════════════════════════ */

export type RoomStatus =
  | "available"
  | "rented"
  | "repairing"
  | "expiring"
  | "unpaid";

export type ListingStatus =
  | "published"
  | "pending"
  | "hidden"
  | "expired"
  | "rejected";

/* Khai báo sẵn cho Round sau — hiện tại payment vẫn dùng boolean. */
export type PaymentStatus = "paid" | "unpaid" | "partial";
