import React from "react";
import { Outlet, useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { AuthCheckingScreen } from "./RequireAuth";
import { C, font } from "../theme";

export type Role = "Renter" | "Seller" | "Admin" | "Moderator";

/**
 * Guard vai trò cho /quan-tri/*.
 *
 * ⚠️  GUARD NÀY CHỈ LÀ UX. Biên bảo mật thật là `is_moderator()` bên trong
 *     moderate_listing() + các policy SELECT moderator-scoped. Một người tự gõ
 *     /quan-tri/kiem-duyet-tin sẽ thấy queue RỖNG (RLS trả 0 row) và nhận
 *     FORBIDDEN khi bấm bất cứ gì.
 *
 *     KHÔNG BAO GIỜ authorize dựa trên flag client đọc được (kiểu profiles.is_seller).
 *
 * Render màn 403, KHÔNG redirect: redirect làm một Moderator thật tưởng mình
 * bị đăng xuất và đi đăng nhập lại vô ích.
 */
export const RequireRole: React.FC<{ anyOf: Role[] }> = ({ anyOf }) => {
  const { user, roles, isLoading } = useAuth();

  if (isLoading) return <AuthCheckingScreen />;
  if (!user) return <ForbiddenScreen reason="unauthenticated" />;

  const allowed = anyOf.some((r) => roles.includes(r));
  if (!allowed) return <ForbiddenScreen reason="role" needed={anyOf} />;

  return <Outlet />;
};

/** Preset cho router — tránh tạo inline component mỗi lần render. */
export const RequireAdmin: React.FC = () => <RequireRole anyOf={["Admin"]} />;
export const RequireAdminOrModerator: React.FC = () => (
  <RequireRole anyOf={["Admin", "Moderator"]} />
);

const ForbiddenScreen: React.FC<{ reason: "unauthenticated" | "role"; needed?: Role[] }> = ({
  reason,
  needed,
}) => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: C.bg,
        fontFamily: font,
      }}
    >
      <div
        style={{
          maxWidth: 460,
          textAlign: "center",
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: "30px 32px",
        }}
      >
        <p style={{ fontFamily: font, fontSize: 40, fontWeight: 800, color: C.secondary, margin: "0 0 6px" }}>
          403
        </p>
        <h1 style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: "0 0 10px" }}>
          Bạn không có quyền truy cập
        </h1>
        <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: "0 0 22px", lineHeight: 1.65 }}>
          {reason === "unauthenticated"
            ? "Trang này chỉ dành cho người dùng đã đăng nhập."
            : `Trang này yêu cầu vai trò ${needed?.join(" hoặc ")}. Nếu bạn cho rằng đây là nhầm lẫn, liên hệ quản trị viên.`}
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            padding: "10px 20px",
            background: C.primary,
            color: C.white,
            border: "none",
            borderRadius: 10,
            fontFamily: font,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Về trang chủ
        </button>
      </div>
    </div>
  );
};
