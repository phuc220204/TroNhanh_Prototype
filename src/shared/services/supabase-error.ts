/**
 * ĐIỂM DUY NHẤT ĐƯỢC PHÉP DÙNG console.* TRONG TOÀN BỘ src/ (PRD AC#5).
 *
 * Mọi RPC raise domain error code làm MESSAGE ('REVIEW_NOT_ELIGIBLE') thay vì
 * văn xuôi, để bảng tra dưới đây map sang tiếng Việt mà không phải string-match
 * văn bản Postgres. Bảng này phải khớp với docs/cp4/03_RPC_CONTRACTS.md §0.
 */

/** Lỗi nghiệp vụ đã được nhận diện — an toàn để hiển thị cho user. */
export class AppError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

/**
 * Domain error code → message tiếng Việt.
 * Khi thêm RPC mới có raise code mới, thêm vào ĐÂY, không map ở component.
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Auth & quyền
  AUTH_REQUIRED: "Bạn cần đăng nhập để thực hiện thao tác này.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  ROLE_NOT_GRANTABLE: "Không thể cấp vai trò này.",

  // Ownership
  ROOM_NOT_OWNED: "Phòng này không thuộc quyền quản lý của bạn.",
  PROPERTY_NOT_OWNED: "Khu trọ này không thuộc quyền quản lý của bạn.",
  LISTING_NOT_FOUND: "Không tìm thấy tin đăng.",
  REVIEW_NOT_FOUND: "Không tìm thấy đánh giá.",

  // Hợp đồng & phòng
  ROOM_HAS_ACTIVE_CONTRACT:
    "Phòng này đã có hợp đồng còn hiệu lực trong khoảng thời gian đó.",
  INVALID_CONTRACT_PERIOD: "Ngày kết thúc hợp đồng phải sau ngày bắt đầu.",
  USER_NOT_FOUND_BY_EMAIL: "Không tìm thấy tài khoản người dùng với email này.",

  // Điện nước & hóa đơn
  READING_LOWER_THAN_PREVIOUS:
    "Chỉ số kỳ này không được nhỏ hơn chỉ số kỳ trước.",
  INVALID_READING_TYPE: "Loại chỉ số không hợp lệ.",
  INVOICE_PERIOD_EXISTS: "Kỳ này đã có hóa đơn.",
  INVALID_INVOICE_ITEM_TYPE: "Loại mục hóa đơn không hợp lệ.",
  INVALID_PAYMENT_METHOD: "Phương thức thanh toán không hợp lệ.",

  // Review
  REVIEW_NOT_ELIGIBLE: "Bạn chưa đủ điều kiện đánh giá khu trọ này.",
  REVIEW_ALREADY_EXISTS: "Bạn đã đánh giá đợt ở này rồi.",
  INVALID_RATING: "Số sao đánh giá phải từ 1 đến 5.",

  // Nhắn tin
  SELF_CONTACT_FORBIDDEN: "Bạn không thể nhắn tin cho tin đăng của chính mình.",
  LISTING_NOT_CONTACTABLE: "Tin đăng này hiện không nhận liên hệ.",
  INVALID_REF_TYPE: "Loại tin không hợp lệ.",

  // Kiểm duyệt
  REASON_REQUIRED: "Vui lòng nhập lý do từ chối.",
  INVALID_MODERATION_ACTION: "Hành động kiểm duyệt không hợp lệ.",

  // Gói dịch vụ
  INVALID_SUBSCRIPTION_STATUS: "Trạng thái gói không hợp lệ.",

  // Demo
  DEMO_NO_AVAILABLE_OCCUPANCY:
    "Chưa có phòng demo nào trống để gắn. Hãy khởi tạo dữ liệu mẫu trước.",
};

/** Mã lỗi Postgres → message tiếng Việt (khi không phải domain error của ta). */
const PG_CODE_MESSAGES: Record<string, string> = {
  "23505": "Dữ liệu đã tồn tại.", // unique_violation (dạng chuẩn hoá của 23505)
  "23514": "Dữ liệu không hợp lệ theo quy định của hệ thống.", // check_violation
  "23503": "Không tìm thấy dữ liệu liên quan.", // foreign_key_violation
  "42501": "Bạn không có quyền thực hiện thao tác này.", // insufficient_privilege
  PGRST116: "Không tìm thấy dữ liệu.",
};

const DEFAULT_MESSAGE =
  "Đã xảy ra lỗi. Vui lòng thử lại sau ít phút.";

function extractText(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    return [o.message, o.details, o.hint, o.error_description]
      .filter((v): v is string => typeof v === "string")
      .join(" | ");
  }
  return "";
}

function extractCode(e: unknown): string | null {
  if (e && typeof e === "object") {
    const c = (e as Record<string, unknown>).code;
    if (typeof c === "string") return c;
  }
  return null;
}

/**
 * Chuyển bất kỳ lỗi nào thành message tiếng Việt an toàn để render.
 * KHÔNG BAO GIỜ lộ stack / SQL / tên cột ra UI (CLAUDE.md §7).
 */
export function toUserMessage(e: unknown): string {
  if (e instanceof AppError) return e.message;

  const text = extractText(e);

  // 1. Domain error code do RPC raise — khớp chính xác token
  for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
    if (text.includes(code)) return message;
  }

  // 2. Mã lỗi Postgres/PostgREST
  const pgCode = extractCode(e);
  const pgMessage = pgCode ? PG_CODE_MESSAGES[pgCode] : undefined;
  if (pgMessage) return pgMessage;

  // 3. Lỗi auth thường gặp của Supabase (chuỗi tiếng Anh)
  if (/invalid login credentials/i.test(text)) return "Email hoặc mật khẩu không đúng.";
  if (/email not confirmed/i.test(text)) return "Email chưa được xác nhận.";
  if (/user already registered/i.test(text)) return "Email này đã được đăng ký.";
  if (/password should be at least/i.test(text)) return "Mật khẩu quá ngắn (tối thiểu 6 ký tự).";
  if (/rate limit|too many requests/i.test(text)) return "Bạn thao tác quá nhanh. Vui lòng thử lại sau.";

  // 4. Mạng
  if (/failed to fetch|networkerror|load failed/i.test(text))
    return "Không kết nối được tới máy chủ. Kiểm tra lại đường truyền.";

  return DEFAULT_MESSAGE;
}

/** `true` nếu lỗi là domain error đã nhận diện (không cần log ồn ào). */
export function isKnownError(e: unknown): boolean {
  if (e instanceof AppError) return true;
  const text = extractText(e);
  return Object.keys(ERROR_MESSAGES).some((c) => text.includes(c));
}

/**
 * Nơi DUY NHẤT được console.* trong src/.
 * Lỗi nghiệp vụ đã nhận diện → không log (đó là luồng bình thường).
 */
export function logError(scope: string, e: unknown): void {
  if (isKnownError(e)) return;
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(`[${scope}]`, e);
  }
}

/**
 * Bọc mọi lời gọi service. Dịch lỗi một lần, ở đúng một chỗ.
 *
 *   return withErrorHandling("listing-queries.searchListings", async () => { ... });
 */
export async function withErrorHandling<T>(
  scope: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    logError(scope, e);
    throw new AppError(extractCode(e) ?? "UNKNOWN", toUserMessage(e));
  }
}
