import { AdminShell } from "../components/AdminShell";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { MessageSquare } from "lucide-react";
import { C, font, radius, space } from "../../shared/theme";

export function ReviewModerationPage() {
  return (
    <AdminShell active="reviews">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, marginBottom: space[5] }}>Quản lý & Kiểm duyệt đánh giá</h1>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: `${space[10]}px ${space[6]}px` }}>
          <EmptyState icon={MessageSquare} title="Quản lý đánh giá" description="Kiểm duyệt và ẩn các đánh giá vi phạm quy chuẩn cộng đồng." />
        </div>
      </div>
    </AdminShell>
  );
}

export default ReviewModerationPage;
