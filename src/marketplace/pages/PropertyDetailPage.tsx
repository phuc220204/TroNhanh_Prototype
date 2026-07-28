import { PublicNavbar } from "../../shared/components/PublicNavbar";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { Home } from "lucide-react";
import { C, font } from "../../shared/theme";

export function PropertyDetailPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font }}>
      <PublicNavbar />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.textPrimary, marginBottom: 20 }}>Thông tin khu trọ</h1>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px" }}>
          <EmptyState icon={Home} title="Trang thông tin khu trọ public" description="Chi tiết tổng thể khu trọ và danh sách phòng trống." />
        </div>
      </div>
    </div>
  );
}

export default PropertyDetailPage;
