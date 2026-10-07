import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ExternalLink, MessageSquare, Send } from "lucide-react";
import { C, font, radius } from "../../theme";
import { EmptyState, Skeleton } from "../../components/common";
import type { ConversationSummary, Message } from "../../services/messaging-service";
import { formatClock, formatDayLabel, isSameDay } from "./inbox-format";

interface MessageThreadProps {
  conversation: ConversationSummary | null;
  messages: Message[];
  isLoading: boolean;
  currentUserId: string | undefined;
  /** Chỉ có trên điện thoại — máy tính thấy danh sách bên cạnh nên không cần. */
  onBack?: () => void;
  /** Trả `false` nếu gửi lỗi ⇒ trả lại nội dung vào ô nhập để người dùng không mất chữ. */
  onSend: (content: string) => Promise<boolean>;
  isSending: boolean;
  /** Tự focus ô nhập khi mở hội thoại. Tắt trên điện thoại để bàn phím không bật lên che tin. */
  shouldAutoFocus: boolean;
}

export function MessageThread({ conversation, messages, isLoading, currentUserId, onBack, onSend, isSending, shouldAutoFocus }: MessageThreadProps) {
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationId = conversation?.id;

  // Đổi hội thoại thì bỏ nháp của hội thoại cũ và đưa con trỏ vào ô nhập.
  useEffect(() => {
    setInputText("");
    if (conversationId && shouldAutoFocus) inputRef.current?.focus();
  }, [conversationId, shouldAutoFocus]);

  // Cuộn VÙNG TIN NHẮN xuống cuối. Không dùng `scrollIntoView`: nó cuộn cả các
  // khung cha ⇒ cả trang giật xuống mỗi lần có tin mới.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length, conversationId]);

  if (!conversation) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <EmptyState icon={MessageSquare} title="Chọn một cuộc trò chuyện" description="Chọn một người trong danh sách bên trái để xem và trả lời tin nhắn." />
      </div>
    );
  }

  const canSend = inputText.trim().length > 0 && !isSending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    const content = inputText.trim();
    setInputText("");
    const isSent = await onSend(content);
    if (!isSent) setInputText(content);
    inputRef.current?.focus();
  };

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", background: C.white }}>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Quay lại danh sách tin nhắn" data-testid="inbox-back-btn" style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: radius.sm, cursor: "pointer", flexShrink: 0 }}>
            <ArrowLeft size={22} color={C.textPrimary} />
          </button>
        )}
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.primary, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
          {conversation.partnerName.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {conversation.partnerName}
          </h2>
          <Link to={conversation.refUrl} style={{ fontFamily: font, fontSize: 12.5, color: C.primary, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, maxWidth: "100%" }}>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{conversation.refTitle}</span>
            <ExternalLink size={12} style={{ flexShrink: 0 }} />
          </Link>
        </div>
      </div>

      <div ref={scrollRef} data-testid="message-list" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10, background: C.bg }}>
        {isLoading && messages.length === 0 ? (
          <Skeleton variant="row" count={4} label="Đang tải cuộc trò chuyện" />
        ) : messages.length === 0 ? (
          <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, textAlign: "center", margin: "auto" }}>
            Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!
          </p>
        ) : (
          messages.map((message, index) => {
            const isSelf = message.sender_id === currentUserId;
            const previous = messages[index - 1];
            const isNewDay = !previous || !isSameDay(previous.created_at, message.created_at);
            return (
              <Fragment key={message.id}>
                {isNewDay && (
                  <div style={{ alignSelf: "center", fontFamily: font, fontSize: 12, fontWeight: 600, color: C.textSecondary, background: C.white, border: `1px solid ${C.border}`, borderRadius: 999, padding: "3px 12px", margin: "6px 0" }}>
                    {formatDayLabel(message.created_at)}
                  </div>
                )}
                <div style={{ alignSelf: isSelf ? "flex-end" : "flex-start", maxWidth: "78%", display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start" }}>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: isSelf ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: isSelf ? C.primary : C.white,
                      color: isSelf ? C.white : C.textPrimary,
                      border: isSelf ? "none" : `1px solid ${C.border}`,
                      fontFamily: font,
                      fontSize: 14,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {message.content}
                  </div>
                  <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, marginTop: 3, padding: "0 4px" }}>
                    {formatClock(message.created_at)}
                  </span>
                </div>
              </Fragment>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, background: C.white }}>
        <input
          ref={inputRef}
          type="text"
          data-testid="message-input"
          aria-label="Nội dung tin nhắn"
          placeholder="Nhập tin nhắn..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{ flex: 1, minWidth: 0, height: 44, padding: "0 16px", fontFamily: font, fontSize: 15, border: `1.5px solid ${C.border}`, borderRadius: radius.md, outline: "none", boxSizing: "border-box" }}
        />
        <button
          type="submit"
          disabled={!canSend}
          data-testid="message-send-btn"
          style={{
            height: 44,
            padding: "0 18px",
            background: canSend ? C.primary : C.border,
            color: canSend ? C.white : C.textSecondary,
            border: "none",
            borderRadius: radius.md,
            fontFamily: font,
            fontSize: 14,
            fontWeight: 700,
            cursor: canSend ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <Send size={16} /> Gửi
        </button>
      </form>
    </div>
  );
}
