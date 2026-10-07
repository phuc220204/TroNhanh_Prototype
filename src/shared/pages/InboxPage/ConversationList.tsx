import { MessageSquare } from "lucide-react";
import { C, font } from "../../theme";
import { Button, EmptyState, Skeleton } from "../../components/common";
import type { ConversationSummary } from "../../services/messaging-service";
import { formatConversationTime } from "./inbox-format";

interface ConversationListProps {
  conversations: ConversationSummary[];
  activeId: string | undefined;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (conversation: ConversationSummary) => void;
  isFullWidth: boolean;
}

export function ConversationList({ conversations, activeId, isLoading, error, onRetry, onSelect, isFullWidth }: ConversationListProps) {
  return (
    <div style={{ width: isFullWidth ? "100%" : 360, flexShrink: 0, borderRight: isFullWidth ? "none" : `1px solid ${C.border}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: C.caramelSoft }}>
        <span style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary }}>
          Cuộc trò chuyện ({conversations.length})
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {isLoading ? (
          <Skeleton variant="row" count={5} label="Đang tải tin nhắn" style={{ padding: 16 }} />
        ) : error ? (
          <div role="alert" style={{ padding: "40px 16px" }}>
            <EmptyState
              title="Chưa tải được tin nhắn"
              description={error}
              action={<Button variant="outline" size="sm" onClick={onRetry}>Thử lại</Button>}
            />
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: "40px 16px" }}>
            <EmptyState
              icon={MessageSquare}
              title="Chưa có tin nhắn"
              description="Mọi trao đổi với chủ trọ hoặc người tìm trọ sẽ hiển thị tại đây."
            />
          </div>
        ) : (
          conversations.map((conversation) => {
            const isSelected = activeId === conversation.id;
            const hasUnread = conversation.unreadCount > 0;
            return (
              <button
                key={conversation.id}
                type="button"
                data-testid="conversation-item"
                aria-current={isSelected ? "true" : undefined}
                onClick={() => onSelect(conversation)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 18px",
                  border: "none",
                  borderBottom: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${isSelected ? C.primary : "transparent"}`,
                  background: isSelected ? C.caramelSoft : C.white,
                  cursor: "pointer",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  fontFamily: font,
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.primary, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                  {conversation.partnerName.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 14.5, fontWeight: hasUnread ? 800 : 700, color: C.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {conversation.partnerName}
                    </span>
                    <span style={{ fontSize: 12, color: hasUnread ? C.primary : C.textSecondary, fontWeight: hasUnread ? 700 : 400, flexShrink: 0 }}>
                      {formatConversationTime(conversation.last_message_at)}
                    </span>
                  </div>

                  <p style={{ fontSize: 12.5, fontWeight: 600, color: C.primary, margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {conversation.refTitle}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ flex: 1, fontSize: 13, color: hasUnread ? C.textPrimary : C.textSecondary, fontWeight: hasUnread ? 600 : 400, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {conversation.last_message_preview || "Bắt đầu cuộc trò chuyện..."}
                    </p>
                    {hasUnread && (
                      <span data-testid="unread-badge" style={{ background: C.repairing, color: C.white, fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "2px 7px", flexShrink: 0 }}>
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
