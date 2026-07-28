import { PublicNavbar } from "../../shared/components/PublicNavbar";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { FileText } from "lucide-react";
import { C, font } from "../../shared/theme";

export function DemandListPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font }}>
      <PublicNavbar />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.textPrimary, marginBottom: 20 }}>Danh sách tin ở ghép / nhu cầu tìm trọ</h1>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px" }}>
          <EmptyState icon={FileText} title="Chưa có tin nhu cầu nào" description="Danh sách tin nhu cầu tìm ở ghép hoặc tìm phòng sẽ được hiển thị tại đây." />
        </div>
      </div>
    </div>
  );
}

export default DemandListPage;
