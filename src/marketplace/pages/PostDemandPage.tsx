import { PublicNavbar } from "../../shared/components/PublicNavbar";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { Plus } from "lucide-react";
import { C, font } from "../../shared/theme";

export function PostDemandPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font }}>
      <PublicNavbar />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.textPrimary, marginBottom: 20 }}>Đăng tin nhu cầu tìm trọ / ở ghép</h1>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px" }}>
          <EmptyState icon={Plus} title="Đăng tin nhu cầu" description="Form đăng tin tìm ở ghép sẽ được hoàn thiện ở Phase 2." />
        </div>
      </div>
    </div>
  );
}

export default PostDemandPage;
