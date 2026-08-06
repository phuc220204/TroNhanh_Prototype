import { useState } from "react";
import { C, font, radius } from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import { logError, toUserMessage } from "../../services/supabase-error";

/**
 * Logo Google chính thức.
 *
 * ⚠️ Bốn mã màu dưới đây là **màu thương hiệu của Google**, không phải token của
 * design system — Google yêu cầu dùng đúng màu logo, nên §8.1 (cấm hex literal
 * mới) không áp dụng ở đây. Đừng đổi chúng sang `C.primary` cho "nhất quán":
 * logo sai màu là vi phạm brand guideline của Google.
 */
function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export interface GoogleSignInButtonProps {
  /** Chữ trên nút. Mặc định phù hợp cho cả đăng nhập lẫn đăng ký. */
  label?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
  "data-testid"?: string;
}

/**
 * Nút "Tiếp tục với Google".
 *
 * Cố ý dùng MỘT nút cho cả đăng nhập và đăng ký. Với OAuth, hai việc đó là một
 * lời gọi: Supabase tự tạo user nếu email chưa có, và tự gộp vào user cũ nếu
 * email đã tồn tại và đã xác minh. Đặt hai nút riêng "Đăng nhập với Google" /
 * "Đăng ký với Google" chỉ tạo cảm giác chúng khác nhau, rồi người dùng thắc mắc
 * vì sao bấm "Đăng ký" mà lại vào được tài khoản cũ.
 */
export function GoogleSignInButton({
  label = "Tiếp tục với Google",
  disabled,
  onError,
  "data-testid": testId = "google-signin-btn",
}: GoogleSignInButtonProps) {
  const { signInWithGoogle } = useAuth();
  const [pending, setPending] = useState(false);
  const [hover, setHover] = useState(false);

  const isDisabled = disabled || pending;

  const handleClick = async () => {
    if (isDisabled) return;
    try {
      setPending(true);
      await signInWithGoogle();
      // Không tắt `pending` ở đây: trình duyệt đang chuyển sang trang Google.
      // Tắt sẽ làm nút nhấp nháy trở lại trạng thái bình thường trước khi rời trang.
    } catch (err) {
      logError("GoogleSignInButton.signInWithGoogle", err);
      setPending(false);
      onError?.(toUserMessage(err));
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      data-testid={testId}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "12px 18px",
        background: hover && !isDisabled ? C.cream : C.white,
        color: C.textPrimary,
        border: `1.5px solid ${C.border}`,
        borderRadius: radius.sm,
        fontFamily: font,
        fontSize: 14,
        fontWeight: 700,
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.6 : 1,
        transition: "background 0.12s",
      }}
    >
      <GoogleLogo />
      {pending ? "Đang chuyển tới Google..." : label}
    </button>
  );
}

/** Vạch phân cách "hoặc" giữa form mật khẩu và nút Google. */
export function AuthDivider({ text = "hoặc" }: { text?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
      <span style={{ flex: 1, height: 1, background: C.border }} />
      <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, fontWeight: 600 }}>{text}</span>
      <span style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}
