import { AdminShell } from "../components/AdminShell";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { Users } from "lucide-react";
import { C, font, radius, space } from "../../shared/theme";

export function UserManagementPage() {
  return (
    <AdminShell active="users">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, marginBottom: space[5] }}>Quản lý người dùng & Phân quyền</h1>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: `${space[10]}px ${space[6]}px` }}>
          <EmptyState icon={Users} title="Quản lý người dùng" description="Cấp/thu hồi vai trò Moderator và xem danh sách người dùng hệ thống." />
        </div>
      </div>
    </AdminShell>
  );
}

export default UserManagementPage;
