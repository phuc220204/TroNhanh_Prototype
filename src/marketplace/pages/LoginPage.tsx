import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { supabase } from "../../shared/supabaseClient";
import { C, font } from "../../shared/theme";
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from "lucide-react";
import { GoogleSignInButton, AuthDivider } from "../../shared/components/common";

/**
 * Chỉ chấp nhận đường dẫn nội bộ cho `?redirect=`.
 * Loại "https://…" và "//host" — nếu không, một link đăng nhập giả mạo có thể
 * đẩy user sang site khác ngay sau khi họ vừa nhập mật khẩu.
 */
function toSafeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  return decoded;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = toSafeRedirect(searchParams.get("redirect"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === "Invalid login credentials") {
          setErrorMessage("Email hoặc mật khẩu không chính xác.");
        } else {
          setErrorMessage(error.message || "Đã xảy ra lỗi đăng nhập.");
        }
        return;
      }

      if (data.session) {
        // Redirect to target URL or default homepage
        navigate(redirectUrl ?? "/");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể kết nối đến máy chủ.");
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
          {/* Email field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
              Địa chỉ Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail
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
                type="email"
                placeholder="ten@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
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

        <GoogleSignInButton disabled={isLoading} onError={setErrorMessage} />

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: C.textSecondary }}>
          Chưa có tài khoản?{" "}
          <Link
            to="/dang-ky"
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
