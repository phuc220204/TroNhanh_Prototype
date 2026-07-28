import { LandlordShell } from "../../shared/components/LandlordShell";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { FileText } from "lucide-react";
import { C, font } from "../../shared/theme";

export function LandlordBillingPage() {
  return (
    <LandlordShell active="overview" mobileTitle="Quản lý hóa đơn">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
        <h1 style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: C.textPrimary, marginBottom: 20 }}>Danh sách hóa đơn thanh toán</h1>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px" }}>
          <EmptyState icon={FileText} title="Quản lý hóa đơn tập trung" description="Xem và quản lý tất cả hóa đơn tiền phòng, điện nước toàn bộ khu trọ." />
        </div>
      </div>
    </LandlordShell>
  );
}

export default LandlordBillingPage;
