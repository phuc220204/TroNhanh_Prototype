import { AdminShell } from "../components/AdminShell";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { Shield } from "lucide-react";
import { C, font, radius, space } from "../../shared/theme";

export function AdminDashboardPage() {
  return (
    <AdminShell active="dashboard">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, marginBottom: space[5] }}>Tổng quan hệ thống Quản trị</h1>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: `${space[10]}px ${space[6]}px` }}>
          <EmptyState icon={Shield} title="Bảng điều khiển Quản trị viên" description="Số liệu tổng quan toàn bộ nền tảng Trọ Nhanh sẽ được hiển thị tại đây." />
        </div>
      </div>
    </AdminShell>
  );
}

export default AdminDashboardPage;
