import React from "react";
import { Navigate, Outlet } from "react-router";
import { useAuth } from "../contexts/AuthContext";

/**
 * Route protection component for workspace / SaaS pages.
 * Redirects unauthenticated users to the Login page.
 */
export const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyinit: "center",
          justifyContent: "center",
          background: "#F5EFE4",
          fontFamily: "'Be Vietnam Pro', Inter, sans-serif",
          color: "#3E2E1E",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontWeight: 600, fontSize: 16 }}>Đang kiểm tra thông tin...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/dang-nhap" replace />;
  }

  return <Outlet />;
};
