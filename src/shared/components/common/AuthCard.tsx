import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { C, font, radius, shadow } from "../../theme";

/**
 * Khung thẻ giữa màn hình cho các trang tài khoản (quên / đặt lại mật khẩu).
 * Cùng bố cục với trang đăng nhập/đăng ký để người dùng không thấy "lạc trang".
 */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 20, boxSizing: "border-box" }}>
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", color: C.textSecondary, fontSize: 14, fontWeight: 500, marginBottom: 24 }}>
        <ArrowLeft size={16} /> Quay về Trang chủ
      </Link>
      <div style={{ width: "100%", maxWidth: 420, background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: "32px 28px", boxShadow: shadow.sm, boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.textPrimary, margin: "0 0 8px" }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, lineHeight: 1.55 }}>{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Ô thông báo trong AuthCard. `tone` lấy màu ngữ nghĩa từ theme. */
export function AuthNotice({ tone, children, testId }: { tone: "error" | "success" | "info"; children: ReactNode; testId?: string }) {
  const palette = tone === "error"
    ? { bg: C.errorBg, border: C.errorBorder, color: C.error }
    : tone === "success"
      ? { bg: C.successBg, border: C.successBorder, color: C.success }
      : { bg: C.cream, border: C.border, color: C.textPrimary };
  return (
    <div role={tone === "error" ? "alert" : "status"} data-testid={testId} style={{ background: palette.bg, border: `1px solid ${palette.border}`, color: palette.color, borderRadius: radius.md, padding: "12px 16px", fontSize: 13.5, lineHeight: 1.55, marginBottom: 16 }}>
      {children}
    </div>
  );
}
