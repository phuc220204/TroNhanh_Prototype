import { supabase } from "../supabaseClient";
import { logError } from "./supabase-error";

/**
 * Quên mật khẩu (Supabase Auth, luồng PKCE).
 *
 * `redirectTo` là gốc trang + `?reset=1`, KHÔNG phải `/#/dat-lai-mat-khau`:
 * Supabase nối `&code=…` vào query, và query nằm sau `#` thì `detectSessionInUrl`
 * không đọc được (cùng lý do với Google OAuth trong AuthContext).
 * `path-to-hash-redirect.ts` thấy `reset=1` sẽ thêm `#/dat-lai-mat-khau` mà giữ
 * nguyên query cho bước đổi code lấy phiên.
 *
 * PKCE lưu code verifier trong trình duyệt đã gửi yêu cầu ⇒ link phải được mở
 * trên CHÍNH trình duyệt đó.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/?reset=1`,
    });
    if (error) throw error;
  } catch (err) {
    logError("password-reset-service.requestPasswordReset", err);
    throw err;
  }
}

/** Đặt mật khẩu mới cho phiên hiện tại (phiên khôi phục từ link email). */
export async function updatePassword(password: string): Promise<void> {
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  } catch (err) {
    logError("password-reset-service.updatePassword", err);
    throw err;
  }
}
