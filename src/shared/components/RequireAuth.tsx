import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { C, font } from "../theme";

/**
 * Guard đăng nhập. Thay thế ProtectedRoute.
 *
 * Khác ProtectedRoute cũ: bảo toàn `?redirect=` (spec §1.9) để sau khi đăng nhập
 * user quay lại đúng trang họ định vào, thay vì bị đổ về /chu-tro.
 */
export const RequireAuth: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthCheckingScreen />;

  if (!user) {
    const target = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/dang-nhap?redirect=${target}`} replace />;
  }

  return <Outlet />;
};

export const AuthCheckingScreen: React.FC = () => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: C.cream,
      fontFamily: font,
      color: C.textPrimary,
    }}
  >
    <p style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>Đang kiểm tra thông tin...</p>
  </div>
);
