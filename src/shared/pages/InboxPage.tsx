import { PublicNavbar } from "../components/PublicNavbar";
import { EmptyState } from "../components/common/EmptyState";
import { MessageSquare } from "lucide-react";
import { C, font } from "../theme";

export function InboxPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", flexDirection: "column" }}>
      <PublicNavbar />
      <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "32px 20px 60px", boxSizing: "border-box" }}>
        <h1 style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: C.textPrimary, marginBottom: 20 }}>
          Hộp thư tin nhắn
        </h1>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px" }}>
          <EmptyState
            icon={MessageSquare}
            title="Chưa có cuộc trò chuyện nào"
            description="Bạn chưa trao đổi tin nhắn với chủ trọ hoặc người tìm trọ nào. Mọi cuộc hội thoại sẽ xuất hiện tại đây."
          />
        </div>
      </div>
    </div>
  );
}

export default InboxPage;
