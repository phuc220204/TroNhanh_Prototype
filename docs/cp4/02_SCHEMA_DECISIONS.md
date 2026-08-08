# Schema & RLS — Quyết định CP4

> 9 migration mới. **KHÔNG sửa `supabase/migrations/20260702_init.sql`.**
> Đặt tên `YYYYMMDDHHMMSS_<slug>.sql` (CLI cần 14 chữ số; file init cũ được chấp nhận là sớm nhất).
> Mọi file **idempotent** (`if not exists` / `drop ... if exists`) để `db push` lại an toàn.

---

## 0. Trước tiên: init Supabase CLI

`supabase/` hiện **không có `config.toml`** — CLI chưa từng được init, `20260702_init.sql` được paste tay vào SQL editor. CP4 thêm 9 migration; paste tay đúng thứ tự vào DB có data thật là **rủi ro lớn nhất của cả checkpoint**.

```bash
npx supabase init
npx supabase link --project-ref <ref lấy từ VITE_SUPABASE_URL>
npx supabase db push
```

Việc này cũng mở khoá `supabase gen types typescript` — xem `04_FRONTEND_ARCH.md` §1.

**Sau MỌI migration: chạy lại `npm run db:types`.** Type lệch khỏi DB là failure mode hay tái diễn nhất trong setup này. Đây là dòng DoD bắt buộc.

---

## 1. ⚠️ Luật RLS xuyên suốt — đọc trước khi viết policy đầu tiên

Policy hiện có đều dạng `owner_id = auth.uid()`. Nhiều policy mới cần kiểm một row mà **caller không SELECT được** (ví dụ: "renter này có gắn với occupancy của hợp đồng này không?" — `occupancies` là owner-only).

> **`exists (...)` lồng trong policy CŨNG chịu RLS của bảng bên trong ⇒ âm thầm trả `false`.** Không lỗi, không warning — chỉ có list rỗng bí ẩn.

**Luật:** predicate nào phải đọc row ngoài phạm vi RLS của caller thì **BẮT BUỘC** bọc trong hàm `security definer stable`. **Không bao giờ inline `exists`.**

Tác dụng phụ có lợi: cũng phá được vòng lặp RLS — policy trên `user_roles` gọi `has_role()` không recurse, chính vì definer function bypass RLS.

**Ngoại lệ duy nhất:** khi cả hai phía đều đọc được row đó bằng RLS của chính họ (policy trên `messages` nhìn `conversations` — cả 2 participant đều SELECT được conversation row).

### Bộ helper (migration `0400`)
Tất cả: `language sql stable security definer set search_path = public` + `revoke execute from public, anon` + `grant execute to authenticated`.

| Helper | Trả về |
|---|---|
| `has_role(p_user uuid, p_role text)` | user có role đó |
| `is_moderator()` | caller là `Admin` hoặc `Moderator` |
| `can_review_contract(p_user uuid, p_contract uuid)` | đủ điều kiện review (BR-022 + BR-030) |
| `is_linked_occupant(p_occupancy uuid)` | caller là người ở đã Confirmed của occupancy |
| `is_property_public(p_property uuid)` | khu đã bật `is_public_profile_enabled` |
| `owns_property(p_property uuid)` | caller là chủ khu |
| `owns_room(p_room uuid)` | caller là chủ phòng |

---

## 2. ⚠️ Nguy cơ rò rỉ dữ liệu — `properties`

> **TUYỆT ĐỐI không thêm policy public/anon SELECT lên `properties`.**

RLS là **row-level, không phải column-level**. Một policy public phơi `bank_account_number`, `bank_account_name`, và toàn bộ đơn giá ngay lúc ai đó "bật trang khu trọ công khai". Đây là cách dễ nhất để biến CP4 thành rò rỉ dữ liệu thật.

BR-024 chỉ được implement bằng **view allow-list cột**:

```sql
create or replace view public.property_public_profiles with (security_invoker = false) as
  select id, name, district, public_slug, avg_rating, review_count
  from public.properties
  where is_public_profile_enabled = true and deleted_at is null;
grant select on public.property_public_profiles to anon, authenticated;
```

`security_invoker = false` (default của PG) = view chạy dưới quyền owner, RLS của base table **không** áp dụng — đó chính là thứ khiến **allow-list cột trở thành biên bảo mật**. Ghi rõ ra để sau này không ai "sửa" thành `true` hoặc thêm cột.

**Nguyên tắc chung:** cần public đọc một phần bảng có cột nhạy cảm → dùng view allow-list cột, **không** dùng policy.

---

## 3. `0100_status_lifecycle.sql`

### 3.1 Hai bug enum — KHÔNG nới CHECK, sửa client

| Giá trị bất hợp pháp | Quyết định | Lý do |
|---|---|---|
| `Inactive` (`rental_listings`) | **Không thêm. Client ghi `'Hidden'`.** | Không tồn tại trong BR-001, trong `src/shared/types/status.ts`, hay trong `LISTING_META`. Đây là **typo, không phải state**. |
| `Repairing` (`rooms`) | **Không thêm. Bỏ "Đang sửa" khỏi UI, dùng `'Hidden'`.** | BR-002 đúng 4 giá trị, `RoomStatus` đúng 4 member. Thêm giá trị thứ 5 nghĩa là phải sửa `types/status.ts` + `ROOM_STATUS_META` + dashboard + CHECK — cho một state **không có nghiệp vụ nào đằng sau**. Đổi nhãn card dashboard thành **"Phòng đang ẩn / bảo trì"** đọc từ `status='Hidden'`. |

*Đường thoát nếu "bảo trì" thật sự cần là khái niệm được demo:* thêm `rooms.maintenance_note text` nullable — phòng `Hidden` có note thì render "Đang sửa". Có được affordance UI mà không làm hỏng enum. **Khuyến nghị: CP4 ship không có nó.**

### 3.2 Mở rộng vòng đời tin đăng theo BR-001

```sql
alter table public.rental_listings drop constraint if exists rental_listings_status_check;
alter table public.rental_listings add constraint rental_listings_status_check
  check (status in ('Draft','PendingApproval','Active','Rejected','Hidden','Expired','Rented'));

alter table public.rental_listings
  add column if not exists rejection_reason text,
  add column if not exists approved_at   timestamptz,
  add column if not exists expire_at     timestamptz,
  add column if not exists moderated_by  uuid references auth.users(id),
  add column if not exists moderated_at  timestamptz,
  add column if not exists property_id   uuid references public.properties(id) on delete set null,
  add column if not exists view_count    integer not null default 0;
```

`demand_posts.status` xử lý tương tự → `('Draft','PendingApproval','Active','Rejected','Hidden','Expired')` + `rejection_reason`, `expire_at`.

**Về `rental_listings.property_id`:** đây là cột của bảng marketplace trỏ vào bảng workspace. Nó **hợp lệ** vì crossing xảy ra **server-side** (trong RPC), không phải ở frontend — luật ranh giới shell không bị ảnh hưởng. Cần cho badge rating (luồng 4a) và cho BR-027. **Validate ownership của `property_id` bên trong RPC create/update, không bằng constraint.**

### 3.3 `occupancies` — cổng chống review gian lận

```sql
alter table public.occupancies
  add column if not exists link_status text
      check (link_status in ('Pending','Confirmed','Rejected')),   -- nullable khi user_id is null
  add column if not exists end_date date;                          -- BR-029
```

`link_status` **không bao giờ được set `'Confirmed'` tự động** khi chủ trọ gắn tài khoản Renter. Renter phải tự xác nhận. Đây là toàn bộ giá trị chống gian lận của review verified-only.

---

## 4. `0200_indexes.sql`

```sql
create extension if not exists pg_trgm;

-- marketplace list pages (thứ tự BR-005 là cái quan trọng nhất)
create index if not exists idx_listings_browse on public.rental_listings
  (status, boost_expire_at desc nulls last, created_at desc) where deleted_at is null;
create index if not exists idx_listings_filter on public.rental_listings
  (status, district, price) where deleted_at is null;
create index if not exists idx_listings_seller     on public.rental_listings (seller_id, status);
create index if not exists idx_listings_property   on public.rental_listings (property_id);
create index if not exists idx_listings_room       on public.rental_listings (room_id);
create index if not exists idx_listings_title_trgm on public.rental_listings using gin (title gin_trgm_ops);
create index if not exists idx_listings_addr_trgm  on public.rental_listings using gin (address gin_trgm_ops);
create index if not exists idx_amenities_listing   on public.listing_amenities (listing_id);
create index if not exists idx_amenities_amenity   on public.listing_amenities (amenity);

-- workspace
create index if not exists idx_rooms_property on public.rooms (property_id, status) where deleted_at is null;
create index if not exists idx_rooms_owner    on public.rooms (owner_id, status)    where deleted_at is null;
create index if not exists idx_occ_room       on public.occupancies (room_id)       where deleted_at is null;
create index if not exists idx_occ_user       on public.occupancies (user_id)       where user_id is not null;
create index if not exists idx_contracts_room on public.contracts (room_id, status) where deleted_at is null;
create unique index if not exists uq_invoice_contract_period
  on public.invoices (contract_id, period) where deleted_at is null and contract_id is not null;
create unique index if not exists uq_reading_room_type_period
  on public.utility_readings (room_id, type, period) where deleted_at is null;
create index if not exists idx_payments_invoice on public.payments (invoice_id);

-- demand posts
create index if not exists idx_demand_browse    on public.demand_posts (status, kind, created_at desc) where deleted_at is null;
create index if not exists idx_demand_districts on public.demand_posts using gin (desired_districts);
```

**Chọn trigram thay vì tsvector.** Dấu tiếng Việt + ô search hình dạng substring làm `to_tsvector` thành lựa chọn tệ hơn và bắt phải cấu hình `unaccent`. `pg_trgm` + `ilike '%kw%'` là một extension và index được dùng thật.

⚠️ **`uq_invoice_contract_period` sẽ fail nếu seeder đã tạo cặp `(contract_id, period)` trùng** → `db push` bị chặn. Migration phải có `DO` block de-dupe **trước** khi tạo index.

---

## 5. `0300_listing_metadata.sql` — rút `---METADATA---` khỏi `description`

**Vấn đề:** `src/marketplace/utils/listingMetadata.ts` JSON-serialize chi phí / giờ giấc / địa điểm gần / lat-lng rồi **append vào cột `description`** sau marker `\n\n---METADATA---\n` (có đường fallback legacy `---CURFEW_INFO---`), đọc ra thì parse lại.

**Hệ quả:** chi phí và giờ giấc không filter được; và blob JSON đang nằm **trong đúng cột vừa được trigram-index** ở `0200`. Riêng điều đó đã là lý do phải làm việc này **trước** khi bật search.

**Quyết định: migrate, và promote phần query được thành cột thật.**

```sql
alter table public.rental_listings
  add column if not exists electricity_price numeric,
  add column if not exists water_price       numeric,
  add column if not exists water_unit        text check (water_unit in ('person','cubic')),
  add column if not exists service_price     numeric,
  add column if not exists deposit           numeric,
  add column if not exists access_policy     text check (access_policy in ('Free','Restricted')),
  add column if not exists access_open_time  time,
  add column if not exists access_close_time time,
  add column if not exists latitude          numeric,
  add column if not exists longitude         numeric,
  add column if not exists metadata          jsonb not null default '{}'::jsonb;
```

`metadata` **chỉ giữ `nearby`** — array `{key, label, places:[{name, dist}]}`, thật sự phi cấu trúc, không bao giờ filter.

**Mapping từ `listingMetadata.ts`:**

| Nguồn (JSON) | Đích (cột) | Ghi chú |
|---|---|---|
| `costs.electric/water/service/deposit` | 4 cột numeric | giá trị là string định dạng VND → strip ký tự không phải số |
| `costs.waterUnit` | `water_unit` | |
| `curfew.type === 'free'` | `access_policy = 'Free'` | |
| `curfew.type === 'curfew'` | `access_policy = 'Restricted'` + parse `curfew.time` → open/close | |
| `coords.lat/lng` | `latitude`/`longitude` | |
| `nearby` | `metadata->'nearby'` | giữ nguyên |

**Backfill** — một `DO` block, xử lý **cả hai marker**:

```sql
do $$
declare r record; j jsonb;
        marker text := E'\n\n---METADATA---\n';
        legacy text := E'\n\n---CURFEW_INFO---\n';
begin
  for r in select id, description from public.rental_listings where description like '%---METADATA---%' loop
    j := nullif(split_part(r.description, marker, 2), '')::jsonb;
    update public.rental_listings set
      description       = split_part(r.description, marker, 1),
      electricity_price = nullif(regexp_replace(coalesce(j->'costs'->>'electric',''), '\D', '', 'g'), '')::numeric,
      water_price       = nullif(regexp_replace(coalesce(j->'costs'->>'water',''),    '\D', '', 'g'), '')::numeric,
      water_unit        = coalesce(j->'costs'->>'waterUnit','person'),
      service_price     = nullif(regexp_replace(coalesce(j->'costs'->>'service',''),  '\D', '', 'g'), '')::numeric,
      deposit           = nullif(regexp_replace(coalesce(j->'costs'->>'deposit',''),  '\D', '', 'g'), '')::numeric,
      access_policy     = case when j->'curfew'->>'type' = 'curfew' then 'Restricted' else 'Free' end,
      latitude          = (j->'coords'->>'lat')::numeric,
      longitude         = (j->'coords'->>'lng')::numeric,
      metadata          = jsonb_build_object('nearby', coalesce(j->'nearby', '[]'::jsonb))
    where id = r.id;
  end loop;
  -- vòng thứ 2 cho marker legacy ---CURFEW_INFO---, cùng shape
end $$;
```

**Đường di chuyển ở client:**
- **Write path:** ngừng gọi `appendMetadataToDescription` **ngay**.
- **Read path:** giữ `parseMetadataFromDescription` làm fallback **một release** (nó đã trả default hợp lý khi không có marker, nên vô hại sau backfill).
- Xóa cả hai ở task chore sau. `formatVND`/`cleanVND` **giữ lại** — không liên quan và đang được dùng chỗ khác.

---

## 6. `0400_roles_moderation.sql`

### 6.1 Role: bảng `user_roles` riêng, KHÔNG dùng `profiles.role`

Hai lý do quyết định:
1. Spec §1.8 làm role **additive n-n** — một user là `[Renter, Seller]`. Một cột không diễn tả được.
2. **`profiles` đã có policy `for update using (auth.uid() = user_id)`** → một cột `role` ở đó cho phép **bất kỳ ai tự nâng mình thành Admin bằng 1 PATCH.** Đây là lỗ privilege-escalation, không phải chuyện style.

```sql
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role    text not null check (role in ('Renter','Seller','Admin','Moderator')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;
create policy "See own roles"  on public.user_roles for select using (auth.uid() = user_id);
create policy "Admin sees all" on public.user_roles for select using (public.is_moderator());
-- CỐ Ý KHÔNG có policy insert/update/delete: chỉ ghi qua security-definer RPC
create index if not exists idx_user_roles_user on public.user_roles (user_id);
```

`handle_new_user()` được `create or replace` để thêm:
```sql
insert into public.user_roles (user_id, role) values (new.id, 'Renter') on conflict do nothing;
```

### 6.2 `platform_settings`

```sql
create table if not exists public.platform_settings (
  key text primary key, value jsonb not null,
  updated_at timestamptz default now() not null
);
insert into public.platform_settings (key, value) values
  ('auto_approve_listings', 'true'::jsonb),
  ('boost_config', '{"days":[7,15,30],"price":[20000,35000,60000]}'::jsonb)
on conflict (key) do nothing;
alter table public.platform_settings enable row level security;
create policy "Anyone reads settings" on public.platform_settings
  for select to anon, authenticated using (true);
-- ghi qua RPC set_platform_setting (admin only)
```

`auto_approve_listings` mặc định **`true`** — xem `07_RISKS.md` #1.

### 6.3 `moderation_logs`

```sql
create table if not exists public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  target_type  text not null check (target_type in ('RentalListing','DemandPost','Review','Conversation','Message','User')),
  target_id    uuid not null,
  moderator_id uuid references auth.users(id) on delete set null,   -- null = tự động (demo)
  action       text not null check (action in ('Approve','Reject','Hide','Restore','Lock','Unlock')),
  reason       text,
  created_at timestamptz default now() not null
);
alter table public.moderation_logs enable row level security;
create policy "Moderators read logs" on public.moderation_logs for select using (public.is_moderator());
create index if not exists idx_modlogs_target on public.moderation_logs (target_type, target_id, created_at desc);
```

Moderator đọc queue:
```sql
create policy "Moderator views all listings" on public.rental_listings for select using (public.is_moderator());
create policy "Moderator views all demand"   on public.demand_posts   for select using (public.is_moderator());
```

> **Cố ý KHÔNG có policy UPDATE cho moderator.** Mọi thay đổi trạng thái phải qua `moderate_listing()`, nên **mọi transition bị buộc phải ghi một audit row** — không thể bỏ sót.

---

## 7. `0500_reviews.sql`

### 7.1 `properties` bổ sung (BR-024)
```sql
alter table public.properties
  add column if not exists is_public_profile_enabled boolean not null default false,
  add column if not exists public_slug  text unique,
  add column if not exists avg_rating   numeric,
  add column if not exists review_count integer not null default 0;
```
Kèm view `property_public_profiles` ở §2. **Nhắc lại: không public SELECT lên `properties`.**

### 7.2 `reviews`
```sql
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  property_id       uuid references public.properties(id) on delete cascade not null,
  author_user_id    uuid references auth.users(id) on delete cascade not null,
  contract_id       uuid references public.contracts(id) on delete set null unique,  -- BR-023
  rating            integer not null check (rating between 1 and 5),
  content           text check (char_length(content) <= 1000),
  status            text not null default 'Visible' check (status in ('Visible','Hidden','Reported')),
  report_count      integer not null default 0,
  seller_reply      text check (char_length(seller_reply) <= 1000),
  seller_replied_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);
create index if not exists idx_reviews_property on public.reviews (property_id, status, created_at desc);
create index if not exists idx_reviews_author   on public.reviews (author_user_id);
```

**Phản hồi của Seller: cột trên `reviews`, KHÔNG phải bảng `review_replies`.** Cardinality đúng 0..1; spec §6 mô hình hoá nó là field (`sellerReply`); không cần sắp xếp/phân trang; một bảng riêng thêm cả một bề mặt RLS cho một chuỗi text.

### 7.3 Verified-only — không thể là CHECK (cross-table)

Hai lớp. Definer function là **bắt buộc**: renter không SELECT được `contracts`/`rooms`/`occupancies`, nên `exists` inline sẽ **luôn false** (§1).

```sql
create or replace function public.can_review_contract(p_user uuid, p_contract uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.contracts c
    join public.rooms r       on r.id = c.room_id
    join public.occupancies o on o.id = c.occupancy_id
    where c.id = p_contract
      and o.user_id = p_user                    -- đã gắn tài khoản …
      and o.link_status = 'Confirmed'           -- … và đã xác nhận (BR-029)
      and r.owner_id <> p_user                  -- BR-030: không tự review khu mình
      and ( c.created_at <= now() - interval '30 days'        -- BR-022
            or exists (select 1 from public.payments p
                       join public.invoices i on i.id = p.invoice_id
                       where i.contract_id = c.id) )
  );
$$;

create policy "Verified renter inserts review" on public.reviews for insert to authenticated
  with check (author_user_id = auth.uid() and public.can_review_contract(auth.uid(), contract_id));
create policy "Author edits own review 7d" on public.reviews for update to authenticated
  using (author_user_id = auth.uid() and created_at > now() - interval '7 days');   -- BR-023
create policy "Public reads visible reviews" on public.reviews for select
  using (status = 'Visible' and deleted_at is null and public.is_property_public(property_id));  -- BR-024
create policy "Owner reads reviews of own property" on public.reviews for select
  using (public.owns_property(property_id));
create policy "Moderator reads all reviews" on public.reviews for select using (public.is_moderator());
```

App ghi qua `post_review()`; policy `with check` gọi cùng predicate là **defence in depth** — anon key bị lộ vẫn không forge được review.

### 7.4 Renter đọc hợp đồng / hóa đơn của mình (cho "Phòng của tôi")
```sql
create policy "Linked renter reads own contracts" on public.contracts for select
  using (public.is_linked_occupant(occupancy_id));
create policy "Linked renter reads own invoices"  on public.invoices  for select
  using (exists (select 1 from public.contracts c where c.id = invoices.contract_id
                 and public.is_linked_occupant(c.occupancy_id)));
```

### 7.5 Trigger duy trì `avg_rating` / `review_count`
`after insert or update or delete on reviews` → hàm **`security definer`** recompute `avg(rating)` / `count(*)` trên `status='Visible' and deleted_at is null` cho `property_id` đó.

**Definer là bắt buộc** ở đây: người ghi là một renter, hoàn toàn không có quyền UPDATE trên `properties`.

---

## 8. `0600_demand_posts.sql`

**Giữ một bảng `demand_posts` với cột `kind`**, không tách thành `RoomWantedPost` + `RoommateWantedPost` như spec 02. Bảng đã ship kèm RLS và code client; tách là churn không đổi lấy chức năng gì. → Ghi vào §12 (deviation).

Thêm đúng những cột mà UI **đang giả vờ có**:

```sql
alter table public.demand_posts
  add column if not exists title              text,
  add column if not exists description        text,
  add column if not exists property_type      text,
  add column if not exists min_area           numeric,
  add column if not exists desired_amenities  text[] not null default '{}',
  add column if not exists move_in_date       date,
  add column if not exists occupant_count     integer,
  add column if not exists contact_name       text,
  add column if not exists contact_phone      text,
  -- chỉ dùng cho RoommateWanted
  add column if not exists current_address    text,
  add column if not exists district           text,
  add column if not exists share_price        numeric,
  add column if not exists needed_count       integer,
  add column if not exists gender_requirement text check (gender_requirement in ('Any','Male','Female')),
  add column if not exists requirements       text[] not null default '{}';

alter table public.demand_posts add constraint demand_roommate_shape
  check (kind <> 'RoommateWanted' or needed_count is not null) not valid;  -- not valid: row cũ được miễn
```

**Backfill `title`** bằng **đúng chuỗi mà mapper hiện đang synthesize**, để row seed cũ vẫn render:
```sql
update public.demand_posts set title = 'Tìm phòng tại ' || array_to_string(desired_districts, ', ')
  where title is null and kind = 'RoomWanted';
update public.demand_posts set title = 'Tìm bạn ở ghép tại ' || array_to_string(desired_districts, ', ')
  where title is null and kind = 'RoommateWanted';
alter table public.demand_posts alter column title set not null;
```

Đây là thứ biến card giả thành card thật: **mọi giá trị hardcode trong `DemandPostCard`** (`initials`, `name`, `title`, `roomType`, `moveIn`, `amenities`, `needed`, `requirements`) giờ đều có cột — và `name`/`initials` lấy từ join `profiles` theo `renter_id`.

---

## 9. `0700_messaging.sql`

```sql
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  ref_type text not null check (ref_type in ('RentalListing','DemandPost')),
  ref_id   uuid not null,
  initiator_id uuid references auth.users(id) on delete cascade not null,
  poster_id    uuid references auth.users(id) on delete cascade not null,
  status text not null default 'Active' check (status in ('Active','Archived','Blocked')),
  last_message_at timestamptz default now() not null,
  last_message_preview text,
  initiator_unread integer not null default 0,
  poster_unread    integer not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint no_self_contact check (initiator_id <> poster_id),   -- BR-030
  unique (initiator_id, ref_type, ref_id)                         -- BR-019
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  content text not null check (char_length(content) between 1 and 2000),
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists idx_messages_conv on public.messages (conversation_id, created_at);
create index if not exists idx_conv_poster    on public.conversations (poster_id, last_message_at desc);
create index if not exists idx_conv_initiator on public.conversations (initiator_id, last_message_at desc);
```

RLS — **đây là chỗ duy nhất `exists` lồng là ổn**, vì cả 2 participant đều SELECT được conversation row:

```sql
create policy "Participants read conv"   on public.conversations for select using (auth.uid() in (initiator_id, poster_id));
create policy "Participants update conv" on public.conversations for update using (auth.uid() in (initiator_id, poster_id));
-- INSERT chỉ qua start_conversation() RPC (poster_id phải derive server-side)

create policy "Participants read msgs" on public.messages for select using (exists (
  select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.initiator_id, c.poster_id)));
create policy "Participants send msgs" on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (
    select 1 from public.conversations c where c.id = conversation_id
      and auth.uid() in (c.initiator_id, c.poster_id) and c.status = 'Active'));
```

`after insert on messages` trigger bump `last_message_at`, `last_message_preview`, và **đúng phía** unread counter.

```sql
alter publication supabase_realtime add table public.messages;
```
**Dùng Realtime, không polling** — một dòng SQL + một `.channel()` subscribe, so với một timer phải teardown ở 3 chỗ. Giữ `refetchInterval` 15s trên query danh sách conversation làm fallback cho mạng yếu (`USE_REALTIME_MESSAGING`).

---

## 10. `0800_listing_media.sql` + Storage

**Bảng `listing_media` scoped theo listing, KHÔNG polymorphic `Media(owner_type, owner_id)` như spec 02.** Ownership polymorphic không RLS được mà không cần `CASE` qua 6 bảng owner (và cần một definer helper cho mỗi nhánh); scoped theo listing thì policy 3 dòng. → §12 (deviation).

`demand_post_media` để sau, **không làm trong CP4**.

```sql
create table if not exists public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id   uuid references public.rental_listings(id) on delete cascade not null,
  storage_path text not null,           -- '{seller_id}/{listing_id}/{uuid}.webp'
  sort_order   integer not null default 0,
  width integer, height integer, size_bytes integer, mime_type text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (listing_id, sort_order)
);
create index if not exists idx_media_listing on public.listing_media (listing_id, sort_order);
alter table public.listing_media enable row level security;
create policy "Public reads media of visible listings" on public.listing_media for select using (
  exists (select 1 from public.rental_listings l
          where l.id = listing_id and l.status in ('Active','Rented') and l.deleted_at is null));
create policy "Seller manages own media" on public.listing_media for all using (
  exists (select 1 from public.rental_listings l where l.id = listing_id and l.seller_id = auth.uid()));
```

> **Lưu `storage_path`, KHÔNG BAO GIỜ lưu URL.** Derive bằng `supabase.storage.from('listing-images').getPublicUrl(path)` lúc render, để đổi bucket/CDN không thành một cuộc migration dữ liệu.

### Bucket
`listing-images`, **public read** — ảnh marketplace vốn công khai; bucket private nghĩa là signed URL trên mọi card và một vấn đề hết hạn 60s ngay giữa buổi demo.

Path `{seller_id}/{listing_id}/{uuid}.webp` — **`seller_id` PHẢI là segment đầu**, vì đó là thứ duy nhất khiến storage policy viết được:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images','listing-images', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "Public read listing images" on storage.objects for select
  using (bucket_id = 'listing-images');
create policy "Owner uploads to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owner updates own folder" on storage.objects for update to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owner deletes own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
```

Resize ở client trước khi upload (canvas → `toBlob('image/webp', 0.82)`, cạnh dài max 1600px) trong `media-service.ts`. Không cần edge function.

Ràng buộc **"≥3 ảnh" chỉ đặt ở form** (Yup đã có sẵn ở `DangTinPage.tsx:522`), **không** đặt trong RPC — nếu không seeder và row cũ sẽ vỡ.

---

## 11. `0900_rpcs.sql` / `0900b` / `1000_demo_seed_helpers.sql`

Xem `03_RPC_CONTRACTS.md`. Chia 2 file vì `0900` (RPC 1,2,5,6,7,13) chỉ cần `0400`, còn `0900b` (RPC 3,4,8,9,10,11,12) cần `0500`–`0800`.

`1000` chứa `demo_link_me_to_seeded_occupancy()` — xem §13.

---

## 12. Hai deviation so với spec 02 (cố ý, để người chấm không tính là lỗi)

| Deviation | Spec 02 nói | CP4 làm | Lý do |
|---|---|---|---|
| Demand post | 2 bảng `RoomWantedPost` + `RoommateWantedPost` | 1 bảng `demand_posts` + cột `kind` | Bảng đã ship kèm RLS + code client. Tách là churn không đổi lấy chức năng. `check (kind <> 'RoommateWanted' or needed_count is not null)` giữ được ràng buộc shape. |
| Media | `Media(owner_type, owner_id)` polymorphic | `listing_media(listing_id)` | Polymorphic ownership không RLS được mà không cần `CASE` qua 6 bảng owner + 1 definer helper mỗi nhánh. Scoped theo listing: policy 3 dòng. Mở rộng khi thật cần bằng bảng `*_media` thứ 2. |

Ghi thêm 2 quyết định để tra cứu về sau:
- **`Repairing` bị loại**, dùng `Hidden` (§3.1).
- **`profiles.id` độc lập với `profiles.user_id`** — đã gây bug #1 và sẽ gây lại. CP4 **không restructure** (rủi ro, chạm auth trigger); thay vào đó mọi service dùng `user_id` và type có comment cảnh báo. Follow-up tuỳ chọn: migration cho `profiles.id = user_id`. Ngoài scope, ghi lại để không quên.

---

## 13. Drop trước production

> Đã đối chiếu 2026-08-08 với `database.types.ts` sinh từ DB thật. Đúng **hai**
> hàm `demo_*` tồn tại trên remote, cả hai đều liệt kê dưới đây.

| Object | Vì sao tồn tại | Vì sao phải drop |
|---|---|---|
| `demo_link_me_to_seeded_occupancy(p_property_id uuid default null)` | Review verified-only bất khả thi trên DB sạch (cần link Confirmed + hợp đồng ≥30 ngày). Đây là thứ khiến luồng 4a demo được. | **Nó backdate `contracts.created_at`/`start_date`** và set `link_status='Confirmed'` mà không có ownership assert (đó chính là mục đích). Chỉ chấp nhận được trên DB demo. |
| `demo_enable_public_profiles()` | BR-024: review chỉ hiện công khai khi khu bật `is_public_profile_enabled`. Hàm bật hàng loạt + sinh `public_slug` để `/khu-tro/:slug` mở được ngay. | Ít nguy hiểm hơn hàm trên — nó chỉ đụng khu của **chính caller** (`where owner_id = auth.uid()`). Vẫn phải drop: nó bật hồ sơ công khai HÀNG LOẠT, tức người dùng thật có thể vô tình công khai mọi khu chỉ bằng một lời gọi mà UI không hỏi lại. |

Ràng buộc bắt buộc của `demo_link_me_to_seeded_occupancy`: chỉ tác động lên
`occupancies` có `user_id is null`, chỉ trong property mà chủ có email kết thúc
`@tronhanh.demo`, và **phải mang tiền tố `demo_`**.

⚠️ Comment header của `demo_enable_public_profiles` trong migration
`20260725101100_demo_helpers.sql` ghi nhầm tên là
`demo_enable_property_public_profile` (số ít, có `property_`). Hàm đó **không tồn
tại**; grep theo tên trong comment sẽ ra 0 hit trên DB. Tên thật là
`demo_enable_public_profiles()`.

Mọi hàm `demo_*` thêm sau này phải được thêm vào bảng này.
