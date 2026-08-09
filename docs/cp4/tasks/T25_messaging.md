# T25 — Nhắn tin in-app (extra 2)

**Phụ thuộc:** T15 (migration `0700` — đã xong), T12
**Chặn:** T23 (matching cần CTA nhắn tin)
**Skill:** `tronhanh-service` + `tronhanh-ui`

## Vì sao
Nút "Nhắn tin" có ở **cả** chi tiết tin (`RoomDetailPage.tsx:746` — hiện trả lời canned auto-reply, label `[Nhắn tin — V1]`) **và** card demand post. Không có tính năng thật thì luồng 2/3/4c đều **đi vào đường cùng**.

## Việc

### 1. `src/shared/services/messaging-service.ts`
```ts
startConversation(refType: "RentalListing"|"DemandPost", refId: string, firstMessage?: string): Promise<string>
  // → rpc("start_conversation", { p_ref_type, p_ref_id, p_first_message })
listMyConversations(): Promise<ConversationSummary[]>
listMessages(conversationId: string): Promise<Message[]>
sendMessage(conversationId: string, content: string): Promise<Message>
markConversationRead(conversationId: string): Promise<void>   // → rpc("mark_conversation_read")
subscribeToConversation(id: string, cb: (m: Message) => void): () => void
```

⚠️ **Không truyền `poster_id`** — RPC derive từ `rental_listings.seller_id` / `demand_posts.renter_id`. Nhận từ client sẽ cho phép bất kỳ ai mở thread **"từ" người khác**.

### 2. Realtime + fallback
```ts
const ch = supabase.channel(`conv:${id}`)
  .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${id}` },
      (p) => cb(p.new as Message))
  .subscribe();
return () => { supabase.removeChannel(ch); };
```
Sau cờ `USE_REALTIME_MESSAGING` (`shared/query/queryClient.ts`). Khi tắt → dùng `refetchInterval: MESSAGING_POLL_INTERVAL_MS` (15s) trên query messages.

**Phải test đường fallback ít nhất một lần** — mạng hội trường có thể chặn websocket (`07_RISKS.md` #7).

Realtime event → `invalidateQueries(qk.conversations.messages(id))` + `qk.conversations.list(userId)`.

### 3. `src/shared/pages/InboxPage.tsx`
Route `/tin-nhan` và `/tin-nhan/:conversationId`. **Một inbox duy nhất** — Seller và Renter là *cùng một account* (role additive); hai inbox sẽ xé một thread thành 2 URL.

Layout: desktop 2 cột (list | thread), mobile 1 cột (list → thread, back về list).
- List: avatar/initials, tên đối phương, `last_message_preview`, thời gian tương đối, **badge unread** (`initiator_unread`/`poster_unread` tuỳ mình là phía nào)
- Thread: bubble trái/phải, tiêu đề hiện **tin đang nói về** (link tới `/phong/:id` hoặc `/tin-nhu-cau/:id`), input + Enter để gửi
- Mở thread → gọi `markConversationRead`

### 4. Wire CTA
| Nơi | Việc |
|---|---|
| `RoomDetailPage.tsx:746` | **Xóa canned auto-reply + label `[Nhắn tin — V1]`**. Nút "Nhắn tin" → `startConversation("RentalListing", id)` → navigate `/tin-nhan/:convId`. Chưa đăng nhập → `/dang-nhap?redirect=...` |
| `DemandPostCard` | Nút "Nhắn tin" → `startConversation("DemandPost", post.id)` |
| `DemandPostDetailPage` | Cùng vậy |
| `PublicNavbar` + `LandlordShell` | Badge tổng unread (`qk.conversations.unreadCount`) |

### 5. Business rules
- **BR-030:** không tự nhắn tin cho tin của mình → RPC raise `SELF_CONTACT_FORBIDDEN`. **UI nên ẩn/disable nút** khi `seller_id === user.id`, đừng để user bấm rồi mới báo lỗi.
- **BR-019:** 1 conversation / (initiator, ref) → mở lại tin cũ **dùng lại thread**, không tạo thread mới.
- Tin không `Active` → `LISTING_NOT_CONTACTABLE`.

## Cách test
1. Login `renter.a` (tab 1) và `seller.a` (tab 2, cửa sổ ẩn danh)
2. Tab 1 → `/phong/:id` của `seller.a` → "Nhắn tin" → gửi "Phòng còn trống không ạ?"
3. **Tab 2 thấy tin nhắn LIVE, không cần reload** + badge unread trên navbar
4. Tab 2 trả lời → tab 1 thấy live
5. Mở thread → badge unread về 0
6. Tab 1 quay lại **cùng tin đó** → "Nhắn tin" → **vào lại thread cũ**, không tạo thread mới (BR-019)
7. Login `seller.a` → mở tin của **chính mình** → nút "Nhắn tin" **ẩn/disabled** (BR-030)
8. **Test cô lập:** login `admin` → `/tin-nhan` → **không thấy** thread của A và B
9. **Test fallback:** đặt `USE_REALTIME_MESSAGING = false` → tin nhắn vẫn tới trong ~15s

## DoD
- [ ] A gửi → B thấy live không reload
- [ ] Badge unread đúng, về 0 khi mở thread
- [ ] Mở lại cùng tin → dùng lại thread (BR-019)
- [ ] Không nhắn tin được cho tin của mình (BR-030), nút bị ẩn từ trước
- [ ] Người thứ 3 không đọc được gì
- [ ] Đường fallback 15s hoạt động
- [ ] Canned auto-reply + `[Nhắn tin — V1]` đã bị xóa
- [ ] `data-testid`: `conversation-item`, `message-input`, `message-send-btn`, `unread-badge`
- [ ] typecheck + strict = 0
