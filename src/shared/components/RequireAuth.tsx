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

  /**
   * Chỉ che bằng spinner khi CHƯA biết người dùng là ai.
   *
   * `if (isLoading)` không kèm `!user` là một cái bẫy: bất cứ lúc nào `isLoading`
   * bật lên giữa phiên, `<Outlet/>` bị thay bằng màn chờ và **cả cây route con bị
   * unmount** — mọi state chưa lưu của trang đang mở biến mất. Cụ thể đã xảy ra:
   * đang nhập form đăng tin, mở tab khác lấy ảnh, quay lại thì form trắng trơn.
   *
   * Đã có `user` thì cứ render tiếp; việc làm mới token hay session không phải lý
   * do để dựng lại giao diện. `AuthContext` cũng đã được sửa để không bật
   * `isLoading` khi danh tính không đổi — hai lớp này bổ trợ nhau, giữ cả hai.
   */
  if (isLoading && !user) return <AuthCheckingScreen />;

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
