-- ═══════════════════════════════════════════════════════════════════════════
-- 0500 — REVIEWS (BR-022, BR-023, BR-024, BR-030) + PUBLIC PROPERTY PROFILE
--
-- ⚠️  NGUY CƠ RÒ RỈ DỮ LIỆU — ĐỌC TRƯỚC KHI SỬA FILE NÀY
--
--     TUYỆT ĐỐI KHÔNG thêm policy public/anon SELECT lên bảng `properties`.
--     RLS là ROW-level, KHÔNG phải COLUMN-level. Một policy public sẽ phơi
--     `bank_account_number`, `bank_account_name`, và toàn bộ đơn giá ngay lúc
--     ai đó "bật trang khu trọ công khai". Đây là cách dễ nhất để biến CP4
--     thành một rò rỉ dữ liệu thật.
--
--     BR-024 CHỈ được implement bằng view allow-list cột (bên dưới).
--
-- Xem docs/cp4/02_SCHEMA_DECISIONS.md §2, §7
-- Idempotent: chạy lại an toàn.
-- ═══════════════════════════════════════════════════════════════════════════

-- ══ PROPERTIES: cột cho public profile + rating tổng hợp (BR-024) ══════════
alter table public.properties
  add column if not exists is_public_profile_enabled boolean not null default false,
  add column if not exists public_slug  text,
  add column if not exists avg_rating   numeric,
  add column if not exists review_count integer not null default 0;

create unique index if not exists uq_properties_public_slug
  on public.properties (public_slug) where public_slug is not null;

-- ══ VIEW ALLOW-LIST CỘT — cách DUY NHẤT đúng cho BR-024 ═══════════════════
-- `security_invoker = false` (default của PG) = view chạy dưới quyền owner nên
-- RLS của base table KHÔNG áp dụng. Đó chính là thứ khiến ALLOW-LIST CỘT trở
-- thành biên bảo mật. Ghi rõ ra để sau này không ai "sửa" thành `true`
-- hoặc thêm cột bank_* vào select list.
drop view if exists public.property_public_profiles;
create view public.property_public_profiles with (security_invoker = false) as
  select id, name, district, public_slug, avg_rating, review_count
  from public.properties
  where is_public_profile_enabled = true and deleted_at is null;

grant select on public.property_public_profiles to anon, authenticated;

create or replace function public.is_property_public(p_property uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.properties
    where id = p_property and is_public_profile_enabled = true and deleted_at is null
  );
$$;
revoke execute on function public.is_property_public(uuid) from public, anon;
grant  execute on function public.is_property_public(uuid) to anon, authenticated;

-- ══ BẢNG REVIEWS ══════════════════════════════════════════════════════════
-- QUYẾT ĐỊNH: phản hồi của Seller là CỘT trên reviews, KHÔNG phải bảng
-- review_replies. Cardinality đúng 0..1; spec §6 mô hình hoá nó là field;
-- không cần sắp xếp/phân trang; một bảng riêng thêm cả một bề mặt RLS cho
-- một chuỗi text.
create table if not exists public.reviews (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid references public.properties(id) on delete cascade not null,
  author_user_id    uuid references auth.users(id) on delete cascade not null,
  -- unique ⇒ BR-023: đúng 1 review / 1 đợt ở
  contract_id       uuid references public.contracts(id) on delete set null unique,
  rating            integer not null check (rating between 1 and 5),
  content           text check (char_length(content) <= 1000),
  status            text not null default 'Visible'
                      check (status in ('Visible', 'Hidden', 'Reported')),
  report_count      integer not null default 0,
  seller_reply      text check (char_length(seller_reply) <= 1000),
  seller_replied_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);
create index if not exists idx_reviews_property on public.reviews (property_id, status, created_at desc);
create index if not exists idx_reviews_author   on public.reviews (author_user_id);

alter table public.reviews enable row level security;

drop trigger if exists update_reviews_modtime on public.reviews;
create trigger update_reviews_modtime before update on public.reviews
  for each row execute procedure public.update_updated_at_column();

-- ══ VERIFIED-ONLY: can_review_contract (BR-022 + BR-029 + BR-030) ═════════
-- KHÔNG thể là CHECK constraint (cross-table).
-- DEFINER LÀ BẮT BUỘC: renter KHÔNG SELECT được contracts / rooms / occupancies,
-- nên một `exists` inline trong policy sẽ LUÔN trả false → form review không bao
-- giờ chạy được và không có lỗi nào để debug.
create or replace function public.can_review_contract(p_user uuid, p_contract uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.contracts c
    join public.rooms r       on r.id = c.room_id
    join public.occupancies o on o.id = c.occupancy_id
    where c.id = p_contract
      and c.deleted_at is null
      and o.user_id     = p_user            -- đã gắn tài khoản …
      and o.link_status = 'Confirmed'       -- … VÀ renter đã tự xác nhận (BR-029)
      and r.owner_id   <> p_user            -- BR-030: không tự review khu của mình
      and (
        -- BR-022: đã ở ≥30 ngày HOẶC đã từng thanh toán ít nhất 1 lần
        c.created_at <= now() - interval '30 days'
        or exists (
          select 1 from public.payments p
          join public.invoices i on i.id = p.invoice_id
          where i.contract_id = c.id
        )
      )
  );
$$;
revoke execute on function public.can_review_contract(uuid, uuid) from public, anon;
grant  execute on function public.can_review_contract(uuid, uuid) to authenticated;

-- ══ POLICY REVIEWS ════════════════════════════════════════════════════════
drop policy if exists "Verified renter inserts review"      on public.reviews;
drop policy if exists "Author edits own review 7d"          on public.reviews;
drop policy if exists "Public reads visible reviews"        on public.reviews;
drop policy if exists "Owner reads reviews of own property" on public.reviews;
drop policy if exists "Moderator reads all reviews"         on public.reviews;

-- App ghi qua post_review() RPC. Policy with check gọi CÙNG predicate là
-- defence in depth: anon key bị lộ vẫn không forge được review.
create policy "Verified renter inserts review" on public.reviews
  for insert to authenticated
  with check (author_user_id = auth.uid() and public.can_review_contract(auth.uid(), contract_id));

-- BR-023: sửa được trong 7 ngày
create policy "Author edits own review 7d" on public.reviews
  for update to authenticated
  using (author_user_id = auth.uid() and created_at > now() - interval '7 days');

-- BR-024: chỉ public khi khu đã bật public profile
create policy "Public reads visible reviews" on public.reviews
  for select
  using (status = 'Visible' and deleted_at is null and public.is_property_public(property_id));

create policy "Owner reads reviews of own property" on public.reviews
  for select using (public.owns_property(property_id));

create policy "Moderator reads all reviews" on public.reviews
  for select using (public.is_moderator());

-- ══ RENTER ĐỌC HỢP ĐỒNG / HÓA ĐƠN CỦA CHÍNH MÌNH ("Phòng của tôi") ════════
-- Bọc qua is_linked_occupant (definer) — xem luật ở migration 0400.
drop policy if exists "Linked renter reads own contracts" on public.contracts;
drop policy if exists "Linked renter reads own invoices"  on public.invoices;

create policy "Linked renter reads own contracts" on public.contracts
  for select using (public.is_linked_occupant(occupancy_id));

create policy "Linked renter reads own invoices" on public.invoices
  for select using (exists (
    select 1 from public.contracts c
    where c.id = invoices.contract_id and public.is_linked_occupant(c.occupancy_id)
  ));

-- Renter đọc occupancy của chính mình (để biết mình đang ở đâu + xác nhận link)
drop policy if exists "Renter reads own occupancy"    on public.occupancies;
drop policy if exists "Renter confirms own occupancy" on public.occupancies;

create policy "Renter reads own occupancy" on public.occupancies
  for select using (auth.uid() = user_id);

-- Renter chỉ được đổi link_status của chính mình (BR-029). Không sửa được gì khác
-- vì cột khác đều thuộc quyền chủ trọ; RLS không phải column-level nên ta chấp nhận
-- phạm vi này ở đây và siết thật ở RPC confirm_occupancy_link.
create policy "Renter confirms own occupancy" on public.occupancies
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ══ TRIGGER DUY TRÌ avg_rating / review_count ═════════════════════════════
-- DEFINER LÀ BẮT BUỘC: người ghi review là một renter, hoàn toàn không có
-- quyền UPDATE trên `properties`.
create or replace function public.recompute_property_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_property uuid;
begin
  v_property := coalesce(new.property_id, old.property_id);

  update public.properties p set
    avg_rating = sub.avg_rating,
    review_count = sub.review_count
  from (
    select
      round(avg(rating)::numeric, 1) as avg_rating,
      count(*)::integer              as review_count
    from public.reviews
    where property_id = v_property and status = 'Visible' and deleted_at is null
  ) sub
  where p.id = v_property;

  return null;
end;
$$;

drop trigger if exists reviews_recompute_rating on public.reviews;
create trigger reviews_recompute_rating
  after insert or update or delete on public.reviews
  for each row execute procedure public.recompute_property_rating();
