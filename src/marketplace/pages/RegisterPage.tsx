import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { supabase } from "../../shared/supabaseClient";
import { C, font } from "../../shared/theme";
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft } from "lucide-react";

export function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !contactPhone) {
      setErrorMessage("Vui lòng điền đầy đủ tất cả các trường.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Mật khẩu phải chứa ít nhất 6 ký tự.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            contact_phone: contactPhone,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || "Đã xảy ra lỗi đăng ký.");
        return;
      }

      // Check if registration requires email confirmation
      if (data.user && data.session === null) {
        setSuccessMessage("Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác thực tài khoản.");
        // Clear form
        setFullName("");
        setEmail("");
        setContactPhone("");
        setPassword("");
      } else if (data.session) {
        setSuccessMessage("Đăng ký thành công!");
        setTimeout(() => {
          navigate("/");
        }, 1500);
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
            Đăng Ký Tài Khoản
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, margin: 0 }}>
            Tạo tài khoản tìm trọ & quản lý phòng trọ của bạn
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

        {successMessage && (
          <div
            style={{
              background: "#F2F9EE",
              border: "1px solid #C9E8BB",
              borderRadius: 10,
              padding: "12px 16px",
              color: "#6B8E5A",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 20,
              lineHeight: 1.4,
            }}
          >
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Full Name field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
              Họ và Tên
            </label>
            <div style={{ position: "relative" }}>
              <User
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
                type="text"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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

          {/* Phone number field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
              Số điện thoại liên hệ
            </label>
            <div style={{ position: "relative" }}>
              <Phone
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
                type="tel"
                placeholder="09xx xxx xxx"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
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
              Mật khẩu (tối thiểu 6 ký tự)
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
            {isLoading ? "Đang xử lý..." : "Đăng Ký Tài Khoản"}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: C.textSecondary }}>
          Đã có tài khoản?{" "}
          <Link
            to="/dang-nhap"
            style={{
              color: C.primary,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
