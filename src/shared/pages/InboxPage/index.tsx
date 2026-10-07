import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { C, font } from "../../theme";
import { PublicNavbar } from "../../components/PublicNavbar";
import { BottomTabBar } from "../../components/common/BottomTabBar";
import { LandlordShell } from "../../components/LandlordShell";
import { LANDLORD_INBOX_STATE, isLandlordInboxState } from "../../components/landlord/SidebarNav";
import { useBreakpoint } from "../../components/useBreakpoint";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import {
  listMyConversations,
  listMessages,
  sendMessage,
  markConversationRead,
  subscribeToConversation,
  type ConversationSummary,
  type Message,
} from "../../services/messaging-service";
import { toUserMessage } from "../../services/supabase-error";
import { USE_REALTIME_MESSAGING, MESSAGING_POLL_INTERVAL_MS } from "../../query/queryClient";
import { qk } from "../../query/keys";
import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";

/** Router state của hộp thư. `fromInboxList`: mở hội thoại từ danh sách (điện thoại) ⇒ ← quay lại bằng history. */
interface InboxLocationState {
  fromLandlord?: true;
  fromInboxList?: true;
}

export function InboxPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useBreakpoint();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Mở từ khu chủ trọ ⇒ ở lại trong LandlordShell (giữ sidebar, có lối quay lại).
  const isFromLandlord = isLandlordInboxState(location.state);
  const baseState = isFromLandlord ? LANDLORD_INBOX_STATE : undefined;

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  // Lỗi tải danh sách — trước đây bị nuốt và hiện "Chưa có tin nhắn".
  const [listError, setListError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Hội thoại đang mở suy ra từ URL — một nguồn duy nhất, không giữ state song song.
  const activeConversation = conversations.find((c) => c.id === conversationId) ?? null;
  const activeConversationId = activeConversation?.id;

  const refreshUnreadBadge = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: qk.conversations.unreadCount(user?.id) });
  }, [queryClient, user?.id]);

  const fetchConversations = useCallback(async () => {
    try {
      setListError(null);
      setConversations(await listMyConversations());
    } catch (err) {
      setListError(toUserMessage(err));
    } finally {
      setIsListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void fetchConversations();
  }, [user, fetchConversations]);

  // Hội thoại vừa tạo (bấm "Nhắn tin" ở tin đăng) có thể chưa có trong danh sách
  // đã tải ⇒ tải lại đúng một lần cho id đó.
  const refetchedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (isListLoading || !conversationId || activeConversation || refetchedForRef.current === conversationId) return;
    refetchedForRef.current = conversationId;
    void fetchConversations();
  }, [isListLoading, conversationId, activeConversation, fetchConversations]);

  const markActiveRead = useCallback(async (id: string) => {
    await markConversationRead(id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
    refreshUnreadBadge();
  }, [refreshUnreadBadge]);

  // Tải tin + đánh dấu đã đọc khi đổi hội thoại; realtime hoặc polling sau đó.
  useEffect(() => {
    setMessages([]);
    if (!activeConversationId) return;

    // Đổi hội thoại nhanh: kết quả của hội thoại cũ về sau không được ghi đè hội thoại mới.
    let cancelled = false;
    const loadThread = async () => {
      setIsThreadLoading(true);
      try {
        const loaded = await listMessages(activeConversationId);
        if (cancelled) return;
        setMessages(loaded);
        await markActiveRead(activeConversationId);
      } catch (err) {
        if (!cancelled) showToast(`Chưa tải được tin nhắn: ${toUserMessage(err)}`, { variant: "error" });
      } finally {
        if (!cancelled) setIsThreadLoading(false);
      }
    };
    void loadThread();

    let cleanup: () => void;
    if (USE_REALTIME_MESSAGING) {
      cleanup = subscribeToConversation(activeConversationId, (newMessage) => {
        setMessages((prev) => (prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]));
        // Lỗi đánh dấu đã đọc không chặn việc hiện tin; lần mở sau sẽ đánh dấu lại.
        markActiveRead(activeConversationId).catch((): void => undefined);
      });
    } else {
      const interval = setInterval(async () => {
        try {
          const polled = await listMessages(activeConversationId);
          if (!cancelled) setMessages(polled);
        } catch {
          // Lỗi một lần poll: giữ tin đang hiện, lần poll sau thử lại.
        }
      }, MESSAGING_POLL_INTERVAL_MS);
      cleanup = () => clearInterval(interval);
    }

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [activeConversationId]);

  const openConversation = (conversation: ConversationSummary) => {
    if (conversation.id === conversationId) return;
    // Máy tính: THAY entry ⇒ Back thoát hộp thư thay vì đi lùi qua từng hội thoại đã bấm.
    // Điện thoại: danh sách → hội thoại là một bước "đi vào", Back về danh sách là đúng.
    const state: InboxLocationState = { ...baseState, ...(isMobile ? { fromInboxList: true as const } : {}) };
    navigate(`/tin-nhan/${conversation.id}`, { replace: !isMobile, state });
  };

  const backToList = () => {
    const state = location.state as InboxLocationState | null;
    if (state?.fromInboxList) navigate(-1);
    // Vào thẳng hội thoại (từ tin đăng, link) thì không có danh sách phía sau trong history.
    else navigate("/tin-nhan", { replace: true, state: baseState });
  };

  const handleSend = async (content: string): Promise<boolean> => {
    if (!activeConversation) return false;
    try {
      setIsSending(true);
      const newMessage = await sendMessage(activeConversation.id, content);
      setMessages((prev) => (prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]));
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, last_message_preview: content, last_message_at: new Date().toISOString() } : c)),
      );
      return true;
    } catch (err) {
      showToast(`Chưa gửi được tin nhắn: ${toUserMessage(err)}`, { variant: "error" });
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const isThreadView = isMobile && Boolean(conversationId);
  const showList = !isMobile || !conversationId;
  const showThread = !isMobile || Boolean(conversationId);
  // Khung chat cao cố định theo màn hình: chỉ vùng tin nhắn cuộn, ô nhập luôn ở đáy.
  // Trừ navbar/tiêu đề/thanh tab của từng kiểu khung.
  const reservedHeight = isMobile ? (isThreadView ? 84 : 190) : isFromLandlord ? 130 : 190;
  const showTitle = !isThreadView && !(isMobile && isFromLandlord);

  const content = (
    <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: isMobile ? 12 : 24, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      {showTitle && (
        <h1 style={{ fontFamily: font, fontSize: isMobile ? 20 : 26, fontWeight: 800, color: C.textPrimary, margin: "0 0 14px" }}>
          Tin nhắn
        </h1>
      )}

      <div style={{ height: `calc(100dvh - ${reservedHeight}px)`, minHeight: 420, background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", display: "flex" }}>
        {showList && (
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId}
            isLoading={isListLoading}
            error={listError}
            onRetry={() => { setIsListLoading(true); void fetchConversations(); }}
            onSelect={openConversation}
            isFullWidth={isMobile}
          />
        )}
        {showThread && (
          <MessageThread
            conversation={activeConversation}
            messages={messages}
            isLoading={isThreadLoading || (isListLoading && Boolean(conversationId))}
            currentUserId={user?.id}
            onBack={isMobile ? backToList : undefined}
            onSend={handleSend}
            isSending={isSending}
            shouldAutoFocus={!isMobile}
          />
        )}
      </div>
    </div>
  );

  if (isFromLandlord) {
    return <LandlordShell active="messages" mobileTitle="Tin nhắn">{content}</LandlordShell>;
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", flexDirection: "column" }}>
      <PublicNavbar />
      {content}
      {/* Đang đọc một hội thoại trên điện thoại: ẩn thanh tab để ô nhập không bị che. */}
      {isMobile && !isThreadView && <BottomTabBar />}
    </div>
  );
}

export default InboxPage;
