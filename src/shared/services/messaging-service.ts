import { supabase } from "../supabaseClient";
import { logError } from "./supabase-error";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationSummary {
  id: string;
  ref_type: "RentalListing" | "DemandPost";
  ref_id: string;
  initiator_id: string;
  poster_id: string;
  status: "Active" | "Archived" | "Blocked";
  last_message_at: string;
  last_message_preview: string | null;
  initiator_unread: number;
  poster_unread: number;
  created_at: string;
  updated_at: string;
  // Resolved helper fields for UI rendering
  partnerName: string;
  partnerId: string;
  refTitle: string;
  refUrl: string;
  unreadCount: number;
}

/**
 * Start a conversation for a listing or demand post.
 * RPC derives poster_id server-side to prevent impersonation.
 * @returns conversation_id
 */
export async function startConversation(
  refType: "RentalListing" | "DemandPost",
  refId: string,
  firstMessage?: string
): Promise<string> {
  try {
    // `p_first_message` có DEFAULT null ở SQL nên generated type khai là optional
    // non-nullable — bỏ hẳn key khi không có, đừng truyền null.
    const { data, error } = await supabase.rpc("start_conversation", {
      p_ref_type: refType,
      p_ref_id: refId,
      ...(firstMessage ? { p_first_message: firstMessage } : {}),
    });

    if (error) throw error;
    return data as string;
  } catch (err) {
    logError("messaging-service.startConversation", err);
    throw err;
  }
}

/**
 * List all conversations for the authenticated user.
 *
 * Đi qua RPC `get_my_conversations` (migration 20260729090000) thay vì query
 * thẳng, vì hai lý do:
 *   1. Policy SELECT trên `profiles` chỉ cho đọc profile của CHÍNH MÌNH. Query
 *      thẳng tên đối phương bị RLS lọc mất row mà không báo lỗi — đó là lý do
 *      inbox từng hiện "Người dùng".
 *   2. `rental_listings` / `demand_posts` thuộc marketplace (§2.1); tầng shared
 *      không được chạm. RPC join hộ ở server.
 */
export async function listMyConversations(): Promise<ConversationSummary[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return [];

    const { data, error } = await supabase.rpc("get_my_conversations");

    if (error) throw error;
    if (!data || data.length === 0) return [];

    return (data as any[]).map((conv) => {
      const isInitiator = conv.initiator_id === user.id;

      return {
        ...conv,
        partnerId: conv.partner_id,
        partnerName: conv.partner_name || "Người dùng",
        refTitle:
          conv.ref_title ||
          (conv.ref_type === "RentalListing" ? "Tin đăng cho thuê" : "Tin nhu cầu tìm trọ"),
        refUrl:
          conv.ref_type === "RentalListing" ? `/phong/${conv.ref_id}` : `/tin-nhu-cau/${conv.ref_id}`,
        unreadCount: isInitiator ? conv.initiator_unread : conv.poster_unread,
      };
    });
  } catch (err) {
    logError("messaging-service.listMyConversations", err);
    return [];
  }
}

/**
 * List all messages in a conversation ordered chronologically.
 */
export async function listMessages(conversationId: string): Promise<Message[]> {
  if (!conversationId) return [];
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || []) as Message[];
  } catch (err) {
    logError("messaging-service.listMessages", err);
    return [];
  }
}

/**
 * Send a message in an existing conversation.
 * Database trigger bump_conversation_on_message updates last_message_at & unread counter automatically.
 */
export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw new Error("AUTH_REQUIRED");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as Message;
  } catch (err) {
    logError("messaging-service.sendMessage", err);
    throw err;
  }
}

/**
 * Mark all unread messages in a conversation as read by the current user.
 */
export async function markConversationRead(conversationId: string): Promise<void> {
  if (!conversationId) return;
  try {
    const { error } = await supabase.rpc("mark_conversation_read", {
      p_conversation_id: conversationId,
    });
    if (error) throw error;
  } catch (err) {
    logError("messaging-service.markConversationRead", err);
  }
}

/**
 * Get total unread conversations count for the current user.
 */
export async function getTotalUnreadCount(): Promise<number> {
  try {
    const convs = await listMyConversations();
    return convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  } catch (_) {
    return 0;
  }
}

/**
 * Subscribe to realtime message inserts for a conversation.
 */
export function subscribeToConversation(
  conversationId: string,
  onNewMessage: (msg: Message) => void
): () => void {
  if (!conversationId) return () => {};

  const channel = supabase
    .channel(`conv:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewMessage(payload.new as Message);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
