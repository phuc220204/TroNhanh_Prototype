-- ═══════════════════════════════════════════════════════════════════════════
-- 0400 — ROLES · SECURITY-DEFINER HELPERS · MODERATION · PLATFORM SETTINGS
--
-- ⚠️  FILE QUAN TRỌNG NHẤT VỀ BẢO MẬT TRONG CP4. Đọc kỹ 2 điều dưới đây.
--
-- ─────────────────────────────────────────────────────────────────────────
-- (1) VÌ SAO `user_roles` LÀ BẢNG RIÊNG, KHÔNG PHẢI CỘT `profiles.role`
--
--     `profiles` ĐÃ CÓ policy `for update using (auth.uid() = user_id)`.
--     Một cột `role` ở đó cho phép BẤT KỲ AI tự nâng mình thành Admin bằng
--     một request PATCH duy nhất. Đây là lỗ privilege-escalation, KHÔNG phải
--     chuyện style. Ngoài ra spec §1.8 làm role additive n-n ([Renter, Seller])
--     — một cột không diễn tả được.
--
--     `user_roles` CỐ Ý KHÔNG CÓ policy INSERT/UPDATE/DELETE.
--     Ghi chỉ qua security-definer RPC (grant_role / revoke_role, migration 0900b).
--
-- ─────────────────────────────────────────────────────────────────────────
-- (2) LUẬT: KHÔNG BAO GIỜ INLINE `exists()` VÀO BẢNG CALLER ĐỌC KHÔNG ĐƯỢC
--
--     `exists (...)` lồng trong policy CŨNG CHỊU RLS của bảng bên trong
--     ⇒ âm thầm trả `false`. Không lỗi, không warning — chỉ có list rỗng bí ẩn.
--     Mọi predicate như vậy PHẢI bọc trong hàm `security definer stable`.
--
--     Tác dụng phụ có lợi: cũng phá được vòng lặp RLS — policy trên `user_roles`
--     gọi has_role() KHÔNG recurse, chính vì definer function bypass RLS.
--
--     Ngoại lệ duy nhất được inline: khi cả hai phía đều đọc được row đó bằng
--     RLS của chính họ (xem messages ↔ conversations ở migration 0700).
--
-- Xem docs/cp4/02_SCHEMA_DECISIONS.md §1, §2, §6
-- Idempotent: chạy lại an toàn.
-- ═══════════════════════════════════════════════════════════════════════════

-- ══ BẢNG USER_ROLES ═══════════════════════════════════════════════════════
create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  role       text not null check (role in ('Renter', 'Seller', 'Admin', 'Moderator')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, role)
);
create index if not exists idx_user_roles_user on public.user_roles (user_id);
create index if not exists idx_user_roles_role on public.user_roles (role);

alter table public.user_roles enable row level security;

drop trigger if exists update_user_roles_modtime on public.user_roles;
create trigger update_user_roles_modtime before update on public.user_roles
  for each row execute procedure public.update_updated_at_column();

-- ══ SECURITY-DEFINER HELPERS ══════════════════════════════════════════════
-- Mọi helper: `stable security definer set search_path = public`.
-- `set search_path` là BẮT BUỘC (chống search-path hijacking), không phải trang trí.

create or replace function public.has_role(p_user uuid, p_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = p_user and role = p_role);
$$;

create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('Admin', 'Moderator')
  );
$$;

create or replace function public.owns_property(p_property uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.properties
    where id = p_property and owner_id = auth.uid() and deleted_at is null
  );
$$;

create or replace function public.owns_room(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.rooms
    where id = p_room and owner_id = auth.uid() and deleted_at is null
  );
$$;

-- Renter đã được gắn VÀ đã xác nhận (BR-029). Dùng cho policy đọc
-- contracts/invoices của chính mình ở "Phòng của tôi" (migration 0500 §7.4).
create or replace function public.is_linked_occupant(p_occupancy uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.occupancies
    where id = p_occupancy
      and user_id = auth.uid()
      and link_status = 'Confirmed'
      and deleted_at is null
  );
$$;

revoke execute on function public.has_role(uuid, text)      from public, anon;
revoke execute on function public.is_moderator()            from public, anon;
revoke execute on function public.owns_property(uuid)        from public, anon;
revoke execute on function public.owns_room(uuid)            from public, anon;
revoke execute on function public.is_linked_occupant(uuid)   from public, anon;

grant execute on function public.has_role(uuid, text)       to authenticated;
grant execute on function public.is_moderator()              to authenticated;
grant execute on function public.owns_property(uuid)         to authenticated;
grant execute on function public.owns_room(uuid)             to authenticated;
grant execute on function public.is_linked_occupant(uuid)    to authenticated;

-- ══ POLICY CHO USER_ROLES ═════════════════════════════════════════════════
-- Gọi is_moderator() (definer) nên KHÔNG recurse vào chính user_roles.
drop policy if exists "See own roles"  on public.user_roles;
drop policy if exists "Admin sees all" on public.user_roles;

create policy "See own roles"  on public.user_roles for select using (auth.uid() = user_id);
create policy "Admin sees all" on public.user_roles for select using (public.is_moderator());
-- CỐ Ý KHÔNG có policy insert/update/delete — chỉ ghi qua RPC.

-- ══ TRIGGER SIGNUP: mọi tài khoản mới mặc định là Renter ══════════════════
-- create or replace giữ nguyên trigger đang gắn trên auth.users.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, contact_phone, is_seller)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'contact_phone',
    false
  )
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'Renter')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

-- Backfill role Renter cho user đã tồn tại trước migration này
insert into public.user_roles (user_id, role)
select id, 'Renter' from auth.users
on conflict (user_id, role) do nothing;

-- Backfill role Seller cho ai đã có listing hoặc property
insert into public.user_roles (user_id, role)
select distinct seller_id, 'Seller' from public.rental_listings where seller_id is not null
on conflict (user_id, role) do nothing;
insert into public.user_roles (user_id, role)
select distinct owner_id, 'Seller' from public.properties where owner_id is not null
on conflict (user_id, role) do nothing;

-- ══ PLATFORM_SETTINGS ═════════════════════════════════════════════════════
-- auto_approve_listings mặc định `true`: giám khảo đăng tin rồi không thấy gì
-- hiện = app lỗi. Nhưng bỏ kiểm duyệt = mất luồng 4b. Xem docs/cp4/07_RISKS.md #1.
create table if not exists public.platform_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz default now() not null
);

insert into public.platform_settings (key, value) values
  ('auto_approve_listings',    'true'::jsonb),
  ('auto_approve_demand_posts','true'::jsonb),
  ('listing_ttl_days',         '60'::jsonb),
  ('boost_config',             '{"days":[7,15,30],"price":[20000,35000,60000]}'::jsonb)
on conflict (key) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists "Anyone reads settings" on public.platform_settings;
create policy "Anyone reads settings" on public.platform_settings
  for select to anon, authenticated using (true);
-- Ghi qua RPC set_platform_setting (Admin only) — migration 0900b.

-- ══ MODERATION_LOGS ═══════════════════════════════════════════════════════
create table if not exists public.moderation_logs (
  id           uuid primary key default gen_random_uuid(),
  target_type  text not null check (target_type in
                 ('RentalListing', 'DemandPost', 'Review', 'Conversation', 'Message', 'User')),
  target_id    uuid not null,
  moderator_id uuid references auth.users(id) on delete set null,   -- null = tự động (demo)
  action       text not null check (action in
                 ('Approve', 'Reject', 'Hide', 'Restore', 'Lock', 'Unlock')),
  reason       text,
  created_at   timestamptz default now() not null
);
create index if not exists idx_modlogs_target on public.moderation_logs (target_type, target_id, created_at desc);
create index if not exists idx_modlogs_mod    on public.moderation_logs (moderator_id, created_at desc);

alter table public.moderation_logs enable row level security;

drop policy if exists "Moderators read logs" on public.moderation_logs;
create policy "Moderators read logs" on public.moderation_logs
  for select using (public.is_moderator());
-- Ghi chỉ qua RPC (moderate_listing / grant_role) — không có policy insert.

-- ══ MODERATOR ĐỌC QUEUE ═══════════════════════════════════════════════════
drop policy if exists "Moderator views all listings" on public.rental_listings;
drop policy if exists "Moderator views all demand"   on public.demand_posts;

create policy "Moderator views all listings" on public.rental_listings
  for select using (public.is_moderator());
create policy "Moderator views all demand" on public.demand_posts
  for select using (public.is_moderator());

-- ⚠️ CỐ Ý KHÔNG CÓ POLICY UPDATE CHO MODERATOR.
-- Mọi thay đổi trạng thái phải qua moderate_listing() ⇒ MỌI transition bị buộc
-- ghi một audit row vào moderation_logs. Không thể bỏ sót. Nếu ai đó thêm policy
-- UPDATE ở đây, audit trail mất tác dụng — đó là regression.

-- ══ SELLER ĐỌC ĐƯỢC TIN CỦA MÌNH Ở MỌI TRẠNG THÁI ════════════════════════
-- Policy public hiện có chỉ cho `status = 'Active'`. Sau khi có PendingApproval /
-- Rejected / Draft, Seller phải thấy tin của chính mình để sửa & gửi lại.
drop policy if exists "Seller views own listings" on public.rental_listings;
create policy "Seller views own listings" on public.rental_listings
  for select using (auth.uid() = seller_id);

drop policy if exists "Renter views own demand posts" on public.demand_posts;
create policy "Renter views own demand posts" on public.demand_posts
  for select using (auth.uid() = renter_id);
