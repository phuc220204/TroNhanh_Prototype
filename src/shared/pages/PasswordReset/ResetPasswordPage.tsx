import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { AuthCard, AuthNotice, Button } from "../../components/common";
import { C } from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import { toUserMessage } from "../../services/supabase-error";
import { updatePassword } from "../../services/password-reset-service";
import { getPasswordProblem, PASSWORD_RULE_HINT } from "../../utils/password";
import { inputStyle, labelStyle } from "./styles";

/**
 * /dat-lai-mat-khau — đích của link trong email "Quên mật khẩu".
 * supabase-js đã đổi `code` trên URL lấy phiên trước khi trang render
 * (AuthContext chờ `getSession`), nên ở đây chỉ cần: có phiên ⇒ cho đặt mật khẩu.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = getPasswordProblem(password);
    if (problem) {
      setErrorMessage(problem);
      return;
    }
    if (password !== confirm) {
      setErrorMessage("Hai mật khẩu chưa khớp nhau.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await updatePassword(password);
      setIsDone(true);
    } catch (err) {
      setErrorMessage(toUserMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AuthCard title="Đặt lại mật khẩu">
        <AuthNotice tone="info">Đang xác minh link…</AuthNotice>
      </AuthCard>
    );
  }

  if (isDone) {
    return (
      <AuthCard title="Đã đổi mật khẩu">
        <AuthNotice tone="success" testId="reset-password-done">Mật khẩu mới đã được lưu. Lần sau hãy đăng nhập bằng mật khẩu này.</AuthNotice>
        <Button onClick={() => navigate("/", { replace: true })} style={{ width: "100%" }}>Về trang chủ</Button>
      </AuthCard>
    );
  }

  if (!user) {
    return (
      <AuthCard title="Link không còn hiệu lực">
        <AuthNotice tone="error" testId="reset-password-invalid">
          Link đặt lại mật khẩu đã hết hạn, đã được dùng, hoặc được mở trên trình duyệt khác với trình duyệt đã gửi yêu cầu.
        </AuthNotice>
        <Button onClick={() => navigate("/quen-mat-khau", { replace: true })} style={{ width: "100%" }}>Gửi link mới</Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Đặt mật khẩu mới" subtitle={`Tài khoản: ${user.email || user.phone || ""}`}>
      {errorMessage && <AuthNotice tone="error" testId="reset-password-error">{errorMessage}</AuthNotice>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="reset-password" style={labelStyle}>Mật khẩu mới</label>
          <input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="reset-password-input" style={inputStyle} />
          <span style={{ fontSize: 12, color: C.textSecondary }}>{PASSWORD_RULE_HINT}.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="reset-password-confirm" style={labelStyle}>Nhập lại mật khẩu mới</label>
          <input id="reset-password-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} data-testid="reset-password-confirm" style={inputStyle} />
        </div>
        <Button type="submit" loading={isSubmitting} disabled={!password || !confirm} data-testid="reset-password-submit" style={{ width: "100%" }}>
          Lưu mật khẩu mới
        </Button>
      </form>
      <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: 13 }}>
        <Link to="/" style={{ color: C.textSecondary, textDecoration: "none" }}>Để sau</Link>
      </p>
    </AuthCard>
  );
}
