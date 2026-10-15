/**
 * Thông tin pháp lý dùng chung cho 3 trang chính sách, footer và checkbox đồng ý.
 * Đổi nội dung chính sách ⇒ tăng LEGAL_VERSION để biết người dùng đã đồng ý bản nào.
 */

// TODO(proposal): chủ dự án điền họ tên người vận hành trước khi merge/deploy.
// Trang chính sách hiện nguyên văn chuỗi này — để trống là sai luật NĐ 52/2013.
export const LEGAL_OPERATOR_NAME = "[Họ tên người vận hành]";

export const SUPPORT_EMAIL = "tronhanh2026@gmail.com";

/** Ngày hiệu lực của bộ chính sách hiện hành (ISO). Lưu kèm khi người dùng đồng ý. */
export const LEGAL_VERSION = "2026-10-16";

export const LEGAL_ROUTES = {
  terms: "/dieu-khoan",
  privacy: "/chinh-sach-bao-mat",
  refund: "/chinh-sach-hoan-tien",
} as const;

export type LegalDocKind = keyof typeof LEGAL_ROUTES;
