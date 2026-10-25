/**
 * Quy tắc mật khẩu cho tài khoản MỚI và mật khẩu đặt lại: ≥ 8 ký tự, có cả chữ
 * và số. Tài khoản cũ đặt mật khẩu 6 ký tự vẫn đăng nhập bình thường — quy tắc
 * chỉ áp khi đặt mật khẩu.
 *
 * Đây là lớp UX. Muốn chặn cả ở server, chỉnh Auth → Password trên Supabase
 * (minimum length 8 + yêu cầu chữ & số) — xem PR thêm file này.
 */
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULE_HINT = `Tối thiểu ${PASSWORD_MIN_LENGTH} ký tự, gồm cả chữ và số`;

/** Trả về câu lỗi tiếng Việt, hoặc `null` nếu mật khẩu đạt yêu cầu. */
export function getPasswordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`;
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return "Mật khẩu phải có cả chữ và số.";
  return null;
}
