import { useState } from "react";
import { Link } from "react-router";
import { AuthCard, AuthNotice, Button } from "../../components/common";
import { C } from "../../theme";
import { toUserMessage } from "../../services/supabase-error";
import { requestPasswordReset } from "../../services/password-reset-service";
import { inputStyle, labelStyle } from "./styles";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// TODO(proposal): dùng SUPPORT_EMAIL trong shared/constants/legal.ts sau khi PR #18 merge.
const SUPPORT_EMAIL = "tronhanh2026@gmail.com";

/** /quen-mat-khau — gửi link đặt lại mật khẩu qua email. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setErrorMessage("Địa chỉ email chưa đúng định dạng.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await requestPasswordReset(trimmed);
      setSentTo(trimmed);
    } catch (err) {
      setErrorMessage(toUserMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <AuthCard title="Kiểm tra email của bạn">
        {/* Cùng một câu cho email có hay không có tài khoản — không lộ ai đã đăng ký. */}
        <AuthNotice tone="success" testId="forgot-password-sent">
          Nếu <strong>{sentTo}</strong> đã đăng ký Trọ Nhanh, chúng tôi vừa gửi link đặt lại mật khẩu tới địa chỉ này.
        </AuthNotice>
        <ul style={{ margin: "0 0 20px", paddingLeft: 20, fontSize: 13.5, color: C.textSecondary, lineHeight: 1.7 }}>
          <li>Mở link <strong>trên chính trình duyệt này</strong>; mở ở máy khác link sẽ không dùng được.</li>
          <li>Không thấy thư? Kiểm tra mục Spam / Quảng cáo, hoặc gửi lại sau vài phút.</li>
        </ul>
        <Button variant="outline" onClick={() => setSentTo(null)} style={{ width: "100%" }}>Gửi lại</Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Quên mật khẩu" subtitle="Nhập email bạn đã dùng để đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.">
      {errorMessage && <AuthNotice tone="error" testId="forgot-password-error">{errorMessage}</AuthNotice>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="forgot-email" style={labelStyle}>Email</label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ten@example.com"
            data-testid="forgot-password-email"
            style={inputStyle}
          />
        </div>
        <Button type="submit" loading={isSubmitting} disabled={!email.trim()} data-testid="forgot-password-submit" style={{ width: "100%" }}>
          Gửi link đặt lại mật khẩu
        </Button>
      </form>
      <p style={{ margin: "18px 0 0", fontSize: 12.5, color: C.textSecondary, lineHeight: 1.6 }}>
        Tài khoản chỉ đăng ký bằng số điện thoại (không có email)? Gửi yêu cầu kèm số điện thoại tới{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.primary, fontWeight: 600 }}>{SUPPORT_EMAIL}</a>.
      </p>
      <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: 13, color: C.textSecondary }}>
        Nhớ ra rồi? <Link to="/dang-nhap" style={{ color: C.primary, fontWeight: 600, textDecoration: "none" }}>Đăng nhập</Link>
      </p>
    </AuthCard>
  );
}
