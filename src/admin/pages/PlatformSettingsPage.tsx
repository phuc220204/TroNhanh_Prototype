import { AdminShell } from "../components/AdminShell";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { Settings } from "lucide-react";
import { C, font, radius, space } from "../../shared/theme";

export function PlatformSettingsPage() {
  return (
    <AdminShell active="settings">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, marginBottom: space[5] }}>Cài đặt cấu hình hệ thống</h1>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: `${space[10]}px ${space[6]}px` }}>
          <EmptyState icon={Settings} title="Cài đặt nền tảng" description="Cấu hình chế độ tự động duyệt tin đăng và các tham số toàn hệ thống." />
        </div>
      </div>
    </AdminShell>
  );
}

export default PlatformSettingsPage;
