import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { PublicNavbar } from "../components/PublicNavbar";
import { EmptyState } from "../components/common/EmptyState";
import { MessageSquare, Send, ArrowLeft, ExternalLink, CheckCircle, Clock } from "lucide-react";
import { C, font } from "../theme";
import { useBreakpoint } from "../components/useBreakpoint";
import { useAuth } from "../contexts/AuthContext";
import {
  listMyConversations,
  listMessages,
  sendMessage,
  markConversationRead,
  subscribeToConversation,
  type ConversationSummary,
  type Message,
} from "../services/messaging-service";
import { USE_REALTIME_MESSAGING, MESSAGING_POLL_INTERVAL_MS } from "../query/queryClient";

export function InboxPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of thread
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      const list = await listMyConversations();
      setConversations(list);
      if (conversationId) {
        const found = list.find((c) => c.id === conversationId);
        if (found) setActiveConv(found);
      }
    } catch (_) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user, conversationId]);

  // Load messages & mark read when active conversation changes
  useEffect(() => {
    if (!activeConv) {
      setMessages([]);
      return;
    }

    const loadThread = async () => {
      try {
        const msgs = await listMessages(activeConv.id);
        setMessages(msgs);
        await markConversationRead(activeConv.id);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConv.id ? { ...c, unreadCount: 0 } : c))
        );
        setTimeout(scrollToBottom, 100);
      } catch (_) {
        // Error handling
      }
    };

    loadThread();

    // Subscribe to Realtime or setup Polling
    let cleanup: (() => void) | undefined;
    if (USE_REALTIME_MESSAGING) {
      cleanup = subscribeToConversation(activeConv.id, (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        markConversationRead(activeConv.id);
        setTimeout(scrollToBottom, 100);
      });
    } else {
      const interval = setInterval(async () => {
        const msgs = await listMessages(activeConv.id);
        setMessages(msgs);
      }, MESSAGING_POLL_INTERVAL_MS);
      cleanup = () => clearInterval(interval);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [activeConv?.id]);

  const handleSelectConv = (conv: ConversationSummary) => {
    setActiveConv(conv);
    navigate(`/tin-nhan/${conv.id}`);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !inputText.trim() || sending) return;

    const content = inputText.trim();
    setInputText("");

    try {
      setSending(true);
      const newMsg = await sendMessage(activeConv.id, content);
      setMessages((prev) => [...prev, newMsg]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, last_message_preview: content, last_message_at: new Date().toISOString() }
            : c
        )
      );
      setTimeout(scrollToBottom, 100);
    } catch (_) {
      setInputText(content);
    } finally {
      setSending(false);
    }
  };

  const showList = !isMobile || !conversationId;
  const showThread = !isMobile || Boolean(conversationId);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", flexDirection: "column" }}>
      <PublicNavbar />

      <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: isMobile ? 12 : "24px 20px 48px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <h1 style={{ fontFamily: font, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.textPrimary, margin: "0 0 16px" }}>
          Hộp thư tin nhắn
        </h1>

        <div style={{ flex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", display: "flex", minHeight: isMobile ? "calc(100vh - 180px)" : 620, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          {/* Left Column: Conversations List */}
          {showList && (
            <div style={{ width: isMobile ? "100%" : 360, borderRight: isMobile ? "none" : `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.caramelSoft }}>
                <span style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary }}>
                  Tất cả cuộc hội thoại ({conversations.length})
                </span>
              </div>

              <div style={{ flex: 1, overflowY: "auto" }}>
                {loading ? (
                  <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, textAlign: "center", padding: 24 }}>Đang tải tin nhắn...</p>
                ) : conversations.length === 0 ? (
                  <div style={{ padding: "40px 16px" }}>
                    <EmptyState
                      icon={MessageSquare}
                      title="Chưa có tin nhắn"
                      description="Mọi trao đổi với chủ trọ hoặc người tìm trọ sẽ hiển thị tại đây."
                    />
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const isSelected = activeConv?.id === conv.id;
                    return (
                      <div
                        key={conv.id}
                        data-testid="conversation-item"
                        onClick={() => handleSelectConv(conv)}
                        style={{
                          padding: "14px 18px",
                          borderBottom: `1px solid ${C.border}`,
                          background: isSelected ? C.caramelSoft : C.white,
                          cursor: "pointer",
                          transition: "background 0.15s",
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        {/* Avatar Initials */}
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.primary, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                          {conv.partnerName.charAt(0).toUpperCase()}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                            <span style={{ fontFamily: font, fontSize: 14, fontWeight: 750, color: C.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {conv.partnerName}
                            </span>
                            {conv.unreadCount > 0 && (
                              <span
                                data-testid="unread-badge"
                                style={{
                                  background: C.repairing,
                                  color: "white",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  borderRadius: 999,
                                  padding: "2px 7px",
                                }}
                              >
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>

                          <p style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: C.primary, margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {conv.refTitle}
                          </p>

                          <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {conv.last_message_preview || "Bắt đầu cuộc trò chuyện..."}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Right Column: Active Conversation Thread */}
          {showThread && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.white }}>
              {activeConv ? (
                <>
                  {/* Thread Header */}
                  <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.white }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {isMobile && (
                        <button type="button" onClick={() => navigate("/tin-nhan")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                          <ArrowLeft size={20} color={C.textPrimary} />
                        </button>
                      )}
                      <div>
                        <h3 style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: "0 0 2px" }}>
                          {activeConv.partnerName}
                        </h3>
                        <Link to={activeConv.refUrl} style={{ fontFamily: font, fontSize: 12, color: C.primary, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {activeConv.refTitle} <ExternalLink size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Messages Bubble Area */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12, background: C.bg }}>
                    {messages.length === 0 ? (
                      <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, textAlign: "center", margin: "auto" }}>
                        Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!
                      </p>
                    ) : (
                      messages.map((msg) => {
                        const isSelf = msg.sender_id === user?.id;
                        return (
                          <div
                            key={msg.id}
                            style={{
                              alignSelf: isSelf ? "flex-end" : "flex-start",
                              maxWidth: "75%",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: isSelf ? "flex-end" : "flex-start",
                            }}
                          >
                            <div
                              style={{
                                padding: "10px 16px",
                                borderRadius: isSelf ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                                background: isSelf ? C.primary : C.white,
                                color: isSelf ? "white" : C.textPrimary,
                                border: isSelf ? "none" : `1px solid ${C.border}`,
                                fontFamily: font,
                                fontSize: 13.5,
                                lineHeight: 1.5,
                                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                              }}
                            >
                              {msg.content}
                            </div>
                            <span style={{ fontFamily: font, fontSize: 10.5, color: C.textSecondary, marginTop: 4, padding: "0 4px" }}>
                              {new Date(msg.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input Box */}
                  <form onSubmit={handleSend} style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, background: C.white }}>
                    <input
                      type="text"
                      data-testid="message-input"
                      placeholder="Nhập tin nhắn..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      style={{ flex: 1, padding: "11px 16px", fontFamily: font, fontSize: 14, border: `1.5px solid ${C.border}`, borderRadius: 12, outline: "none" }}
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || sending}
                      data-testid="message-send-btn"
                      style={{
                        padding: "11px 20px",
                        background: !inputText.trim() || sending ? C.border : C.primary,
                        color: !inputText.trim() || sending ? C.textSecondary : "white",
                        border: "none",
                        borderRadius: 12,
                        fontFamily: font,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: !inputText.trim() || sending ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Send size={16} /> Gửi
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ margin: "auto", padding: 32, textAlign: "center" }}>
                  <EmptyState
                    icon={MessageSquare}
                    title="Chọn một cuộc trò chuyện"
                    description="Nhấp vào danh sách bên trái để bắt đầu trao đổi tin nhắn."
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InboxPage;
