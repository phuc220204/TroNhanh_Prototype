---
name: tronhanh-schema
description: Viết migration SQL, RLS policy, và RPC cho Trọ Nhanh đúng luật bảo mật. Dùng khi task cần thêm/sửa bảng, cột, policy, index, hoặc Postgres function. Trigger khi thấy "migration", "RLS", "policy", "RPC", "schema", "bảng mới", "security definer", "Supabase SQL".
---

# Viết SQL cho Trọ Nhanh

## Đọc trước
`docs/cp4/02_SCHEMA_DECISIONS.md` · `docs/cp4/03_RPC_CONTRACTS.md` · `/CLAUDE.md` §3, §6

## Quy tắc cứng

1. **KHÔNG sửa `supabase/migrations/20260702_init.sql`.** Luôn tạo file mới `YYYYMMDDHHMMSS_<slug>.sql`.
2. **Idempotent bắt buộc:** `if not exists` / `drop ... if exists` / `create or replace`. `db push` chạy lại phải an toàn.
3. **Sau mỗi migration: `pnpm db:types`.** Đây là dòng DoD, không phải gợi ý.
4. Bảng mới: `id uuid primary key default gen_random_uuid()`, `created_at`, `updated_at` (+ trigger `update_updated_at_column`), bảng nghiệp vụ thêm `deleted_at`.
5. Bật `row level security` cho **mọi** bảng mới.

## ⚠️ Luật #1 — KHÔNG inline `exists()` vào bảng caller đọc không được

`exists (...)` lồng trong policy **cũng chịu RLS của bảng bên trong** ⇒ âm thầm trả `false`. Không lỗi, không warning, chỉ có **list rỗng bí ẩn**.

```sql
-- ❌ SAI: renter không SELECT được occupancies → luôn false
create policy "..." on public.reviews for insert with check (
  exists (select 1 from public.occupancies o where o.user_id = auth.uid() ...)
);

-- ✅ ĐÚNG: bọc security definer
create policy "..." on public.reviews for insert with check (
  public.can_review_contract(auth.uid(), contract_id)
);
```

**Helper đã có — DÙNG, đừng viết lại:**
`has_role(uuid,text)` · `is_moderator()` · `can_review_contract(uuid,uuid)` · `is_linked_occupant(uuid)` · `is_property_public(uuid)` · `owns_property(uuid)` · `owns_room(uuid)`

Helper mới phải theo khuôn:
```sql
create or replace function public.<name>(<args>)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (...);
$$;
revoke execute on function public.<name>(<args>) from public, anon;
grant  execute on function public.<name>(<args>) to authenticated;
```

**Ngoại lệ duy nhất được inline:** cả hai phía đều đọc được row đó bằng RLS của chính họ (ví dụ `messages` nhìn `conversations`).

## ⚠️ Luật #2 — Không public SELECT lên bảng có cột nhạy cảm

RLS là **row-level, không phải column-level**.

```sql
-- ❌ TUYỆT ĐỐI KHÔNG: phơi bank_account_number cho anon
create policy "public" on public.properties for select using (is_public_profile_enabled);

-- ✅ ĐÚNG: view allow-list cột
create view public.property_public_profiles with (security_invoker = false) as
  select id, name, district, public_slug, avg_rating, review_count from public.properties
  where is_public_profile_enabled = true and deleted_at is null;
```

`security_invoker = false` là thứ khiến allow-list cột trở thành biên bảo mật. Đừng "sửa" thành `true`.

## Luật #3 — Khuôn RPC

```sql
create or replace function public.<fn>(<args>)
returns <t> language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  -- ASSERT OWNERSHIP TRƯỚC KHI GHI
  ...
end $$;
revoke execute on function public.<fn>(<args>) from public, anon;
grant  execute on function public.<fn>(<args>) to authenticated;
```

- `security definer` **bypass RLS** ⇒ assert ownership trong body **CHÍNH LÀ** biên bảo mật.
- `set search_path = public` **bắt buộc** (chống search-path hijacking).
- **Derive server-side, không nhận từ client:** `seller_id`, `owner_id`, `poster_id`, `property_id` của review, `previous_reading`, `unit_price`, `invoice.total_amount`, `status` của tin đăng.
- Raise error code làm **message** (`raise exception 'REVIEW_NOT_ELIGIBLE'`) rồi **thêm code đó vào `src/shared/services/supabase-error.ts`**.
- Dùng `select ... for update` khi đọc-rồi-ghi cùng row.
- Bọc `unique_violation` thành domain error có nghĩa.

## Enum — không tự nới CHECK

| Bảng | Giá trị hợp lệ |
|---|---|
| `rooms.status` | `Available` `Deposited` `Rented` `Hidden` — **KHÔNG có `Repairing`** |
| `rental_listings.status` | `Draft` `PendingApproval` `Active` `Rejected` `Hidden` `Expired` `Rented` — **KHÔNG có `Inactive`** |
| `invoices.status` | `Unpaid` `PartiallyPaid` `Paid` `Overdue` |
| `contracts.status` | `Draft` `Active` `Expired` `Terminated` |
| `occupancies.link_status` | `Pending` `Confirmed` `Rejected` — **không bao giờ auto `Confirmed`** (BR-029) |

Cần giá trị mới → hỏi người dùng, đừng tự thêm.

## Index
Thêm index cho mọi cột xuất hiện trong `where`/`order by` của trang danh sách. Dùng `where deleted_at is null` cho partial index. Search tiếng Việt: `pg_trgm` + `ilike`, **không** `to_tsvector`.

## Hàm demo
Tiền tố **`demo_`** + ràng buộc phạm vi cứng + thêm vào `02_SCHEMA_DECISIONS.md` §13 "Drop trước production".
**Không bao giờ** tạo hàm client-callable nâng quyền (kiểu `claim_admin`).

## Trước khi báo xong
- [ ] File idempotent, chạy lại được
- [ ] Mọi bảng mới có RLS + policy tường minh
- [ ] Không inline `exists` vào bảng ngoài phạm vi caller
- [ ] Mọi RPC có ownership assert + `revoke`/`grant`
- [ ] Error code mới đã thêm vào `supabase-error.ts`
- [ ] Đã `supabase db push` và `pnpm db:types`
- [ ] `pnpm typecheck` vẫn 0 lỗi sau khi type được regenerate
