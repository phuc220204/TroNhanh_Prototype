import { LandlordShell } from "../../shared/components/LandlordShell";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { Star } from "lucide-react";
import { C, font } from "../../shared/theme";

export function LandlordReviewsPage() {
  return (
    <LandlordShell active="overview" mobileTitle="Đánh giá khu trọ">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
        <h1 style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: C.textPrimary, marginBottom: 20 }}>Quản lý & phản hồi đánh giá</h1>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px" }}>
          <EmptyState icon={Star} title="Chưa có đánh giá mới" description="Các đánh giá từ người thuê đã xác thực sẽ xuất hiện tại đây để bạn phản hồi." />
        </div>
      </div>
    </LandlordShell>
  );
}

export default LandlordReviewsPage;
