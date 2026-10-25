/**
 * Thông tin pháp lý dùng chung cho 3 trang chính sách, footer và checkbox đồng ý.
 * Đổi nội dung chính sách ⇒ tăng LEGAL_VERSION để biết người dùng đã đồng ý bản nào.
 */

// Chủ dự án chốt 16/10/2026: ghi tên thương hiệu. Khi có giấy phép / mã số thuế,
// thay bằng tên cá nhân hoặc doanh nghiệp chịu trách nhiệm (NĐ 52/2013).
export const LEGAL_OPERATOR_NAME = "Trọ Nhanh";

export const SUPPORT_EMAIL = "tronhanh2026@gmail.com";

/** Ngày hiệu lực của bộ chính sách hiện hành (ISO). Lưu kèm khi người dùng đồng ý. */
export const LEGAL_VERSION = "2026-10-16";

export const LEGAL_ROUTES = {
  terms: "/dieu-khoan",
  privacy: "/chinh-sach-bao-mat",
  refund: "/chinh-sach-hoan-tien",
} as const;

export type LegalDocKind = keyof typeof LEGAL_ROUTES;
