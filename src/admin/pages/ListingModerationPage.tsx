import { AdminShell } from "../components/AdminShell";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { CheckSquare } from "lucide-react";
import { C, font, radius, space } from "../../shared/theme";

export function ListingModerationPage() {
  return (
    <AdminShell active="moderation">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, marginBottom: space[5] }}>Kiểm duyệt tin đăng</h1>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: `${space[10]}px ${space[6]}px` }}>
          <EmptyState icon={CheckSquare} title="Hàng chờ duyệt tin" description="Danh sách tin đăng chờ duyệt từ chủ trọ sẽ hiển thị tại đây." />
        </div>
      </div>
    </AdminShell>
  );
}

export default ListingModerationPage;
