/* ══════════════════════════════════════════
   STATUS LABEL + COLOR MAPS — Trọ Nhanh
   Label tiếng Việt + màu cho status key chuẩn.
   Giữ nguyên label/màu đang hiển thị ở các page.
══════════════════════════════════════════ */
import { C } from "../theme";
import type { RoomStatus, ListingStatus } from "../types/status";

export const ROOM_STATUS_META: Record<RoomStatus, { label: string; color: string }> = {
  available: { label: "Trống",           color: "#6B8E5A" },
  rented:    { label: "Đang thuê",       color: C.primary },
  repairing: { label: "Đang sửa",        color: "#C07B4A" },
  expiring:  { label: "Sắp hết hạn",     color: "#C8861A" },
  unpaid:    { label: "Chưa thanh toán", color: "#B5503C" },
};

export const LISTING_META: Record<ListingStatus, { label: string; color: string; bg: string }> = {
  published: { label: "Đang hiển thị", color: "#4A7A34", bg: "#EDF2E7" },
  pending:   { label: "Chờ duyệt",     color: "#C8861A", bg: "#FBF1DD" },
  hidden:    { label: "Đã ẩn",         color: "#9B8C78", bg: "#EFE9DD" },
  expired:   { label: "Hết hạn",       color: "#B5503C", bg: "#FBEDE9" },
  rejected:  { label: "Bị từ chối",    color: "#B5503C", bg: "#FBEDE9" },
};
