import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { supabase } from "../../shared/supabaseClient";
import { C, font } from "../../shared/theme";
import { Eye, EyeOff, Mail, Phone, Lock, ArrowLeft } from "lucide-react";
import { GoogleSignInButton, AuthDivider } from "../../shared/components/common";
import { clearPostAuthRedirect, toSafeRedirect, withAuthRedirect } from "../../shared/utils/auth-redirect";
import { isEmailIdentifier, normalizeVietnamPhone } from "../../shared/utils/phone";
import { logError, toUserMessage } from "../../shared/services/supabase-error";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = toSafeRedirect(searchParams.get("redirect"));
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage("Vui lòng nhập số điện thoại hoặc email cùng mật khẩu.");
      return;
    }

    const loginByEmail = isEmailIdentifier(identifier.trim());
    const phone = loginByEmail ? null : normalizeVietnamPhone(identifier);
    if (!loginByEmail && !phone) {
      setErrorMessage("Số điện thoại chưa đúng định dạng. Hãy nhập số di động Việt Nam.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword(
        loginByEmail ? { email: identifier.trim(), password } : { phone: phone!, password },
      );

      if (error) {
        logError("LoginPage.handleSubmit", error);
        setErrorMessage(toUserMessage(error));
        return;
      }

      if (data.session) {
        clearPostAuthRedirect();
        // Redirect to target URL or default homepage
        navigate(redirectUrl ?? "/");
      }
    } catch (err) {
      logError("LoginPage.handleSubmit", err);
      setErrorMessage(toUserMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: font,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      {/* Back button */}
      <Link
        to="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          textDecoration: "none",
          color: C.textSecondary,
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 24,
          alignSelf: "center",
          transition: "color 0.2s",
        }}
      >
        <ArrowLeft size={16} /> Quay về Trang chủ
      </Link>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: "32px 28px",
          boxShadow: "0 4px 20px rgba(92, 70, 50, 0.06)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: C.textPrimary,
              margin: "0 0 8px",
            }}
          >
            Đăng Nhập
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, margin: 0 }}>
            Chào mừng bạn quay trở lại với Trọ Nhanh
          </p>
        </div>

        {errorMessage && (
          <div
            data-testid="login-error"
            role="alert"
            aria-live="assertive"
            style={{
              background: "#FDF2F0",
              border: "1px solid #F5C2B9",
              borderRadius: 10,
              padding: "12px 16px",
              color: "#B5503C",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 20,
              lineHeight: 1.4,
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Email cho tài khoản cũ, SĐT cho tài khoản đăng ký mới */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="login-identifier" style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
              Số điện thoại hoặc email
            </label>
            <div style={{ position: "relative" }}>
              {identifier.includes("@") ? <Mail
                size={18}
                color={C.textSecondary}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              /> : <Phone size={18} color={C.textSecondary} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />}
              <input
                type="text"
                id="login-identifier"
                name="identifier"
                data-testid="login-identifier"
                autoComplete="username"
                required
                placeholder="0912 345 678 hoặc ten@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                style={{
                  width: "100%",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "10px 14px 10px 42px",
                  fontSize: 14,
                  fontFamily: font,
                  color: C.textPrimary,
                  background: C.white,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="login-password" style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
              Mật khẩu
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={18}
                color={C.textSecondary}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type={showPassword ? "text" : "password"}
                id="login-password"
                name="password"
                data-testid="login-password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "10px 42px 10px 42px",
                  fontSize: 14,
                  fontFamily: font,
                  color: C.textPrimary,
                  background: C.white,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
              />
              <button
                type="button"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? (
                  <EyeOff size={18} color={C.textSecondary} />
                ) : (
                  <Eye size={18} color={C.textSecondary} />
                )}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            data-testid="login-submit"
            disabled={isLoading}
            style={{
              background: isLoading ? "#D8C9B2" : C.primary,
              color: C.white,
              border: "none",
              borderRadius: 10,
              padding: "12px",
              fontFamily: font,
              fontSize: 15,
              fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 6,
            }}
          >
            {isLoading ? "Đang xử lý..." : "Đăng Nhập"}
          </button>
        </form>

        <AuthDivider />

        <GoogleSignInButton disabled={isLoading} onError={setErrorMessage} redirect={redirectUrl} />

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: C.textSecondary }}>
          Chưa có tài khoản?{" "}
          <Link
            to={withAuthRedirect("/dang-ky", redirectUrl)}
            style={{
              color: C.primary,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
