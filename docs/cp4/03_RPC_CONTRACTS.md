# RPC Contracts — 14 hàm

> Đọc `/CLAUDE.md` §6.1 trước. Đọc `02_SCHEMA_DECISIONS.md` §1 (luật security definer) trước.

---

## 0. Khuôn bắt buộc cho mọi hàm

```sql
create or replace function public.<fn>(<args>)
returns <t> language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  -- ... assert ownership ... rồi mới ghi
end $$;

revoke execute on function public.<fn>(<args>) from public, anon;
grant  execute on function public.<fn>(<args>) to authenticated;
```

### 3 luật không được vi phạm

1. > **`security definer` bypass RLS ⇒ assert ownership BÊN TRONG body CHÍNH LÀ biên bảo mật.** Không có assert = không có bảo mật. RLS không cứu bạn ở đây.

2. > **`set search_path = public` là bắt buộc, không phải trang trí** — chống search-path hijacking khi hàm gọi thứ gì không qualified.

3. > **Giá trị nhạy cảm derive server-side, KHÔNG nhận từ client.** Nhận từ client = cho client tự phong quyền.

| Không bao giờ nhận từ client | Derive từ |
|---|---|
| `seller_id`, `owner_id`, `renter_id`, `author_user_id` | `auth.uid()` |
| `poster_id` (conversation) | `rental_listings.seller_id` / `demand_posts.renter_id` |
| `property_id` (review) | `contract → room.property_id` |
| `previous_reading` | kỳ trước gần nhất của room+type |
| `unit_price` | `properties.electricity_unit_price` / `water_unit_price` |
| `invoice.total_amount` | `sum(item.amount)` |
| `rental_listings.status` | `platform_settings.auto_approve_listings` + `p_submit` |

### Error code
Raise domain error làm **message**, không phải mô tả văn xuôi:
```sql
raise exception 'REVIEW_NOT_ELIGIBLE';
```
để `src/shared/services/supabase-error.ts` map sang tiếng Việt bằng bảng tra, không phải string-match văn bản Postgres.

**Bảng error code → message tiếng Việt** (phải khớp với `supabase-error.ts`):

| Code | Message |
|---|---|
| `AUTH_REQUIRED` | Bạn cần đăng nhập để thực hiện thao tác này. |
| `FORBIDDEN` | Bạn không có quyền thực hiện thao tác này. |
| `ROOM_NOT_OWNED` | Phòng này không thuộc quyền quản lý của bạn. |
| `PROPERTY_NOT_OWNED` | Khu trọ này không thuộc quyền quản lý của bạn. |
| `ROOM_HAS_ACTIVE_CONTRACT` | Phòng này đã có hợp đồng còn hiệu lực trong khoảng thời gian đó. |
| `READING_LOWER_THAN_PREVIOUS` | Chỉ số kỳ này không được nhỏ hơn chỉ số kỳ trước. |
| `INVOICE_PERIOD_EXISTS` | Kỳ này đã có hóa đơn. |
| `REVIEW_NOT_ELIGIBLE` | Bạn chưa đủ điều kiện đánh giá khu trọ này. |
| `REVIEW_ALREADY_EXISTS` | Bạn đã đánh giá đợt ở này rồi. |
| `SELF_CONTACT_FORBIDDEN` | Bạn không thể nhắn tin cho tin đăng của chính mình. |
| `LISTING_NOT_CONTACTABLE` | Tin đăng này hiện không nhận liên hệ. |
| `REASON_REQUIRED` | Vui lòng nhập lý do từ chối. |

---

## 1. `create_listing_with_details`

```sql
create_listing_with_details(
  p_listing   jsonb,
  p_amenities text[],
  p_media     jsonb,      -- [{storage_path, sort_order, width, height, size_bytes, mime_type}]
  p_submit    boolean
) returns uuid
```

**Atomic:** insert `rental_listings` + N `listing_amenities` + N `listing_media` + upsert `user_roles('Seller')` + `profiles.is_seller = true` + (khi auto-approve) 1 row `moderation_logs`.

**Assert bên trong:**
- `seller_id := v_uid` — **không bao giờ** lấy từ `p_listing`.
- `p_listing->>'room_id'` không null → `rooms.owner_id = v_uid`, sai thì `raise 'ROOM_NOT_OWNED'`.
- `p_listing->>'property_id'` không null → `properties.owner_id = v_uid`, sai thì `raise 'PROPERTY_NOT_OWNED'`.

**Status là DERIVED, không nhận từ client:**
```
not p_submit                              → 'Draft'
p_submit và auto_approve_listings = true   → 'Active'  + moderation_logs(Approve, moderator_id=null, reason='auto (demo)')
p_submit và auto_approve_listings = false  → 'PendingApproval'
```

**Lưu ý:** ràng buộc "≥3 ảnh" **không** ở đây (chỉ ở form Yup) — nếu không seeder và row cũ vỡ.

**Sửa luôn bug #1:** `profiles` phải update theo `user_id = v_uid`, không phải `id = v_uid`.

---

## 2. `update_listing_with_details`

```sql
update_listing_with_details(
  p_listing_id uuid, p_listing jsonb, p_amenities text[], p_media jsonb
) returns text   -- status kết quả
```

**Atomic:** update listing + replace toàn bộ amenities + reconcile media rows (thêm/xóa/đổi `sort_order`).

**Assert:** `select seller_id ... for update` phải bằng `v_uid`, sai thì `raise 'FORBIDDEN'`.

**BR-003:** nếu field quan trọng (`title`, `price`, `address`, `district`, `area`, `property_type`, `description`) thay đổi **và** status hiện tại = `Active` **và** `auto_approve_listings = false` → set `PendingApproval`.

**Trả về status kết quả** để UI nói được "tin của bạn cần duyệt lại" thay vì phải đoán.

---

## 3. `moderate_listing`

```sql
moderate_listing(p_listing_id uuid, p_action text, p_reason text) returns void
```

**Atomic:** update listing (`status`, `approved_at`, `expire_at`, `rejection_reason`, `moderated_by`, `moderated_at`) + insert `moderation_logs`.

**Assert:** `if not public.is_moderator() then raise 'FORBIDDEN'; end if;`

**Quy tắc:**
- `p_action = 'Reject'` với `p_reason` null/blank → `raise 'REASON_REQUIRED'` (FR-064 bắt buộc có lý do).
- `p_action = 'Approve'` → `approved_at = now()`, `expire_at = now() + interval '60 days'` (BR-026), clear `rejection_reason`.

> Đây là lý do moderator **cố ý không có policy UPDATE** trên `rental_listings`: mọi transition bị buộc đi qua đây, nên audit trail không thể bị bỏ sót.

---

## 4. `create_occupancy_with_contract`

```sql
create_occupancy_with_contract(
  p_room_id uuid, p_occupant jsonb, p_contract jsonb
) returns jsonb   -- {occupancy_id, contract_id}
```

**Atomic:** insert `occupancies` + insert `contracts` + `rooms.status = 'Rented'` + (BR-027) `rental_listings.status = 'Rented'` cho tin liên kết.

**Assert:**
```sql
select owner_id from public.rooms where id = p_room_id and deleted_at is null for update;
-- phải = v_uid, sai thì raise 'ROOM_NOT_OWNED'
```

**BR-006 — chặn hợp đồng chồng thời gian:**
```sql
if exists (select 1 from public.contracts
           where room_id = p_room_id and status = 'Active' and deleted_at is null
             and (start_date, end_date) overlaps (p_start, p_end))
then raise exception 'ROOM_HAS_ACTIVE_CONTRACT'; end if;
```

**BR-029 — cổng chống review gian lận:** `occupancies.owner_id := v_uid`; `link_status := 'Pending'` **chỉ khi** có `user_id` của người ở được truyền vào. **Không bao giờ tự động `Confirmed`** — Renter phải tự xác nhận.

Việc ghi vào `rental_listings` là điểm nối server-side hợp lệ (§2.2 CLAUDE.md), không phải cross-import ở frontend.

---

## 5. `create_invoice_with_items`

```sql
create_invoice_with_items(
  p_room_id uuid, p_contract_id uuid, p_period text, p_due_date date, p_items jsonb
) returns uuid
```

**Atomic:** insert `invoices` + N `invoice_items`.

**Assert:** `rooms.owner_id = v_uid`; `contracts.room_id = p_room_id and contracts.owner_id = v_uid`.

- **`total_amount` = `sum(item.amount)` tính server-side — KHÔNG đọc từ client** (CLAUDE.md §7).
- Mỗi `item.type` validate theo enum `Rent | Electricity | Water | Service | Other`.
- `unique_violation` trên `(contract_id, period)` → `raise 'INVOICE_PERIOD_EXISTS'`.

---

## 6. `record_utility_reading`

```sql
record_utility_reading(
  p_room_id uuid, p_type text, p_period text, p_current numeric
) returns uuid
```

**Assert:** `rooms.owner_id = v_uid`.

Đáng là một RPC dù chỉ ghi 1 bảng, vì nó **loại bỏ cả một lớp tin cậy client**:
- `previous_reading` **derive server-side** từ kỳ trước gần nhất của room+type (0 nếu chưa có).
- `unit_price` **đọc từ `properties`**, không nhận từ payload.
- `if p_current < v_previous then raise exception 'READING_LOWER_THAN_PREVIOUS'; end if;`

---

## 7. `record_payment`

```sql
record_payment(
  p_invoice_id uuid, p_amount numeric, p_method text, p_paid_at timestamptz
) returns text   -- status mới của invoice
```

**Atomic:** insert `payments` + recompute `invoices.status`.

**Assert:** `select ... from invoices where id = p_invoice_id for update`, `owner_id` phải = `v_uid`.

- `purpose := 'RentInvoice'` cố định.
- `v_paid := sum(payments.amount)` cho invoice đó. Rồi (BR-004):
  ```
  v_paid >= total_amount              → 'Paid'
  v_paid > 0                          → 'PartiallyPaid'
  ngược lại                            → 'Unpaid'
  chưa Paid và due_date < current_date → 'Overdue'
  ```
- Trả về status mới để UI cập nhật không cần refetch.

---

## 8. `post_review`

```sql
post_review(p_contract_id uuid, p_rating int, p_content text) returns uuid
```

**Atomic:** insert `reviews` (trigger tự recompute `properties.avg_rating` / `review_count`).

**Assert:**
- **`property_id` DERIVE** từ `contract → room.property_id`, **không nhận từ client**.
- `if not public.can_review_contract(v_uid, p_contract_id) then raise 'REVIEW_NOT_ELIGIBLE'; end if;` — hàm này encode BR-022 + BR-029 + BR-030.
- `unique_violation` trên `contract_id` → `raise 'REVIEW_ALREADY_EXISTS'` (BR-023).

---

## 9. `reply_to_review`

```sql
reply_to_review(p_review_id uuid, p_reply text) returns void
```

**Assert:** join `reviews → properties`, `properties.owner_id` phải = `v_uid`, sai thì `raise 'FORBIDDEN'`.

Set `seller_reply`, `seller_replied_at = now()`.

---

## 10. `start_conversation`

```sql
start_conversation(p_ref_type text, p_ref_id uuid, p_first_message text) returns uuid
```

**Atomic:** upsert `conversations` + (tuỳ chọn) insert message đầu.

**Assert:**
- **`poster_id` resolve server-side** từ `rental_listings.seller_id` / `demand_posts.renter_id`. Nhận từ client sẽ cho phép bất kỳ ai mở thread **"từ" người khác**.
- `if v_poster = v_uid then raise 'SELF_CONTACT_FORBIDDEN'; end if;` (BR-030).
- Với listing: `if status <> 'Active' then raise 'LISTING_NOT_CONTACTABLE'; end if;` (BR-019).

**Idempotent "mở lại hội thoại cũ"** (BR-019):
```sql
insert into public.conversations (...) values (...)
on conflict (initiator_id, ref_type, ref_id) do update
  set status = case when conversations.status = 'Archived' then 'Active' else conversations.status end
returning id;
```

---

## 11. `grant_role` / `revoke_role`

```sql
grant_role(p_user_id uuid, p_role text) returns void
revoke_role(p_user_id uuid, p_role text) returns void
```

**Atomic:** insert/delete `user_roles` + insert `moderation_logs` (`target_type='User'`).

**Assert:** `if not public.has_role(v_uid, 'Admin') then raise 'FORBIDDEN'; end if;`

> **`p_role in ('Seller','Moderator')` CHỈ thế.** `Admin` là **bootstrap-only** — tạo bằng SQL snippet thủ công (`06_QA_CHECKLIST.md`). Không bao giờ cho phép grant `Admin` qua RPC, và **không bao giờ** tạo hàm client-callable kiểu `claim_admin` — đó là backdoor sẽ sống sót vào production.

---

## 12. `set_platform_setting`

```sql
set_platform_setting(p_key text, p_value jsonb) returns void
```

**Assert:** Admin only (`has_role(v_uid,'Admin')`).

Nguồn cho toggle "Chế độ kiểm duyệt: Tự động / Thủ công" ở `/quan-tri/cai-dat`.

---

## 13. `set_subscription_status`

```sql
set_subscription_status(p_status text) returns void
```

**Atomic:** upsert `user_subscriptions` cho `seller_id = v_uid`.

**Assert:** `seller_id := v_uid`; `p_status in ('NONE','TRIAL','ACTIVE','READ_ONLY')`.

Thay lệnh ghi trực tiếp từ client trong `LandlordShell` hiện tại — giữ cho toggle demo không thể chạm row của người khác.

---

## 14. `demo_link_me_to_seeded_occupancy` ⚠️ DEMO ONLY

```sql
demo_link_me_to_seeded_occupancy(p_property_id uuid) returns uuid
```

**Atomic:** set `occupancies.user_id = v_uid, link_status = 'Confirmed'` trên **một** occupancy chưa ai nhận + **backdate** `contracts.created_at`/`start_date` về `now() - 60 days` + insert 1 row `payments`.

**Đây là thứ khiến review verified-only demo được** (`07_RISKS.md` #2).

**Không có ownership assert được — đó chính là mục đích.** Nên phải chặn cứng bằng 3 ràng buộc:
1. Chỉ tác động lên `occupancies` có `user_id is null`.
2. Chỉ trong property mà **chủ có email kết thúc `@tronhanh.demo`**.
3. **Tên phải mang tiền tố `demo_`** và có mặt trong `02_SCHEMA_DECISIONS.md` §13 "Drop trước production".

> ❌ **KHÔNG giải bài toán demo bằng cách nới `can_review_contract`.** Cổng 30 ngày *là* toàn bộ giá trị chống gian lận của tính năng, và giám khảo rất có thể hỏi đúng chỗ đó.

---

## Bảng tra nhanh — RPC nào ở migration nào

| Migration | RPC | Phụ thuộc |
|---|---|---|
| `0900` | 1, 2, 5, 6, 7, 13 | `0400` |
| `0900b` | 3, 4, 8, 9, 10, 11, 12 | `0500`–`0800` |
| `1000` | 14 (`demo_*`) | `0900b` |
