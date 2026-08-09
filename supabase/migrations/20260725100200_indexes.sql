-- ═══════════════════════════════════════════════════════════════════════════
-- 0200 — INDEXES
--
-- Trước migration này mọi trang danh sách `select("*")` toàn bộ row Active rồi
-- filter trong memory. Sau khi service layer chuyển filter về server (T11a),
-- các index dưới đây là thứ khiến nó không chậm.
--
-- CHỌN pg_trgm THAY VÌ tsvector: dấu tiếng Việt + ô search hình dạng substring
-- làm to_tsvector thành lựa chọn tệ hơn và bắt phải cấu hình `unaccent`.
-- pg_trgm + ilike '%kw%' là một extension và index được dùng thật.
--
-- Idempotent: chạy lại an toàn.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pg_trgm;

-- ── DE-DUPE TRƯỚC KHI TẠO UNIQUE INDEX ────────────────────────────────────
-- Seeder có thể đã tạo cặp (contract_id, period) trùng. Nếu không dọn trước,
-- `supabase db push` bị CHẶN ở đây và cả migration sau không chạy được.
do $$
begin
  delete from public.invoices i
  using public.invoices j
  where i.contract_id is not null
    and i.contract_id = j.contract_id
    and i.period      = j.period
    and i.deleted_at  is null and j.deleted_at is null
    and i.created_at  > j.created_at;

  delete from public.utility_readings u
  using public.utility_readings v
  where u.room_id = v.room_id
    and u.type    = v.type
    and u.period  = v.period
    and u.deleted_at is null and v.deleted_at is null
    and u.created_at > v.created_at;
end $$;

-- ── MARKETPLACE — trang danh sách ─────────────────────────────────────────
-- idx_listings_browse phục vụ đúng thứ tự BR-005 (boost còn hạn xếp trước).
create index if not exists idx_listings_browse on public.rental_listings
  (status, boost_expire_at desc nulls last, created_at desc) where deleted_at is null;
create index if not exists idx_listings_filter on public.rental_listings
  (status, district, price) where deleted_at is null;
create index if not exists idx_listings_seller   on public.rental_listings (seller_id, status);
create index if not exists idx_listings_property on public.rental_listings (property_id);
create index if not exists idx_listings_room     on public.rental_listings (room_id);

create index if not exists idx_listings_title_trgm on public.rental_listings using gin (title gin_trgm_ops);
create index if not exists idx_listings_addr_trgm  on public.rental_listings using gin (address gin_trgm_ops);

create index if not exists idx_amenities_listing on public.listing_amenities (listing_id);
create index if not exists idx_amenities_amenity on public.listing_amenities (amenity);

-- ── WORKSPACE ─────────────────────────────────────────────────────────────
create index if not exists idx_rooms_property on public.rooms (property_id, status) where deleted_at is null;
create index if not exists idx_rooms_owner    on public.rooms (owner_id, status)    where deleted_at is null;
create index if not exists idx_props_owner    on public.properties (owner_id)       where deleted_at is null;

create index if not exists idx_occ_room on public.occupancies (room_id) where deleted_at is null;
create index if not exists idx_occ_user on public.occupancies (user_id) where user_id is not null;

create index if not exists idx_contracts_room  on public.contracts (room_id, status) where deleted_at is null;
create index if not exists idx_contracts_occ   on public.contracts (occupancy_id);

create unique index if not exists uq_invoice_contract_period
  on public.invoices (contract_id, period) where deleted_at is null and contract_id is not null;
create index if not exists idx_invoices_owner on public.invoices (owner_id, status) where deleted_at is null;

create unique index if not exists uq_reading_room_type_period
  on public.utility_readings (room_id, type, period) where deleted_at is null;

create index if not exists idx_payments_invoice on public.payments (invoice_id);

create index if not exists idx_subs_seller on public.user_subscriptions (seller_id);

-- ── DEMAND POSTS ──────────────────────────────────────────────────────────
create index if not exists idx_demand_browse    on public.demand_posts (status, kind, created_at desc) where deleted_at is null;
create index if not exists idx_demand_renter    on public.demand_posts (renter_id, status);
create index if not exists idx_demand_districts on public.demand_posts using gin (desired_districts);

-- ── PROFILES ──────────────────────────────────────────────────────────────
-- Bug #1 (query .eq("id", …) thay vì .eq("user_id", …)) khiến lookup này chạy
-- rất nhiều; đảm bảo nó có index.
create index if not exists idx_profiles_user on public.profiles (user_id);
