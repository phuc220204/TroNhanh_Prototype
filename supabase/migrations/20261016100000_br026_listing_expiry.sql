-- ═══════════════════════════════════════════════════════════════════════════
-- BR-026: tin được duyệt có hạn `listing_ttl_days` (mặc định 60) ngày.
--
-- Trước migration này `expire_at` chỉ được GHI mà không ai ĐỌC: không job nào
-- chuyển tin sang `Expired`, view công khai cũng không lọc ⇒ ngày 16/10/2026
-- có 20/24 tin công khai đã quá hạn (đăng 07–09/08) vẫn hiện "Còn trống".
--
-- Gồm:
--   1. Trigger: tin bước vào `Active` mà chưa có `expire_at` thì tự đặt
--      (đường sửa tin Rejected → Active trong update_listing_with_details không
--      đặt expire_at; tin seed SQL cũng thiếu).
--   2. Backfill `expire_at` cho tin Active đang null, tính từ ngày duyệt/đăng.
--   3. `expire_due_listings()` + job pg_cron mỗi 15 phút: Active quá hạn → Expired.
--   4. View `public_rental_listings` lọc `expire_at > now()` — khách không thấy
--      tin quá hạn trong khoảng trống giữa hai lần job chạy.
--   5. RPC `renew_listing`: chủ tin gia hạn tin Expired. Không có đường này thì
--      tin của chủ trọ chết vĩnh viễn sau 60 ngày.
--
-- Chỉ tin `Active` bị hết hạn. Tin `Hidden` KHÔNG đụng tới: Moderator có thể
-- đã ẩn tin (moderate_listing 'Hide'); chuyển nó sang Expired rồi cho chủ tin
-- gia hạn = lối vòng qua quyết định kiểm duyệt.
--
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Hàm nội bộ: đọc TTL từ platform_settings ────────────────────────────────
create or replace function public.listing_ttl_interval()
returns interval
language sql
stable
security definer
set search_path = public
as $$
  select make_interval(days => coalesce(
    (select (value)::integer from public.platform_settings where key = 'listing_ttl_days'),
    60
  ));
$$;

revoke execute on function public.listing_ttl_interval() from public, anon, authenticated;

-- ── 1. Trigger: Active luôn có expire_at ────────────────────────────────────
create or replace function public.set_listing_expire_at()
returns trigger
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if new.status = 'Active' and new.expire_at is null then
    new.expire_at := now() + public.listing_ttl_interval();
  end if;
  return new;
end $$;

revoke execute on function public.set_listing_expire_at() from public, anon, authenticated;

drop trigger if exists trg_set_listing_expire_at on public.rental_listings;
create trigger trg_set_listing_expire_at
  before insert or update of status, expire_at on public.rental_listings
  for each row execute function public.set_listing_expire_at();

-- ── 2. Backfill tin Active thiếu expire_at ──────────────────────────────────
-- Tính từ lúc tin thật sự lên sàn, không phải từ hôm nay — nếu không, tin seed
-- 08/08 được "tặng" thêm 60 ngày.
update public.rental_listings
   set expire_at = coalesce(approved_at, first_published_at, created_at) + public.listing_ttl_interval()
 where status = 'Active'
   and expire_at is null
   and deleted_at is null;

-- ── 3. Job hết hạn ──────────────────────────────────────────────────────────
create or replace function public.expire_due_listings()
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.rental_listings
     set status = 'Expired'
   where status = 'Active'
     and deleted_at is null
     and expire_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Không client nào được gọi: chỉ pg_cron (chạy dưới role postgres).
revoke execute on function public.expire_due_listings() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

-- cron.schedule theo tên là upsert ⇒ chạy lại migration không nhân đôi job.
select cron.schedule(
  'expire-due-listings',
  '*/15 * * * *',
  $$select public.expire_due_listings()$$
);

-- Áp ngay cho dữ liệu hiện có, không đợi lần chạy đầu của job.
select public.expire_due_listings();

-- ── 4. View công khai: không hiện tin quá hạn ───────────────────────────────
-- Giữ nguyên allow-list cột của 20261011090000; chỉ thêm điều kiện expire_at.
create or replace view public.public_rental_listings
with (security_invoker = false) as
select
  l.id, l.seller_id, l.room_id, l.title, l.property_type, l.price, l.district, l.area, l.status,
  l.boost_expire_at, l.created_at, l.updated_at, l.deleted_at, l.contact_name, l.address,
  l.description, l.approved_at, l.expire_at,
  l.view_count, l.property_id, l.electricity_price, l.water_price, l.water_unit, l.service_price,
  l.deposit, l.access_policy, l.access_open_time, l.access_close_time, l.latitude, l.longitude,
  l.metadata, l.province_code, l.ward_code, l.boost_payment_verified, l.first_published_at,
  l.contact_phone_masked,
  (coalesce(l.boost_payment_verified, false)
     and l.boost_expire_at is not null
     and l.boost_expire_at > now()) as is_boost_active
from public.rental_listings l
where l.status = 'Active'
  and l.deleted_at is null
  and l.expire_at > now();

comment on view public.public_rental_listings is
  'INTENTIONAL security_invoker=false (CLAUDE.md §3.2): tin đang hiển thị cho khách (Active, chưa quá expire_at — BR-026), allow-list cột, không có contact_phone (BR-014). Không đổi sang invoker. Thêm cột công khai ⇒ thêm vào view.';

grant select on public.public_rental_listings to anon, authenticated;

-- ── 5. RPC gia hạn tin ──────────────────────────────────────────────────────
-- Expired → Active (tự duyệt) hoặc PendingApproval (kiểm duyệt tay, giống tin
-- mới). Trả về trạng thái mới để UI hiện đúng nhãn.
create or replace function public.renew_listing(p_listing_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_listing public.rental_listings;
  v_auto_approve boolean;
  v_new_status text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select * into v_listing from public.rental_listings
   where id = p_listing_id and deleted_at is null
   for update;
  if not found or v_listing.seller_id <> v_uid then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_listing.status <> 'Expired' then
    raise exception 'LISTING_NOT_EXPIRED' using errcode = 'P0001';
  end if;

  -- Cùng luật với link_listing_to_room: một phòng chỉ đứng sau một tin đang hiển thị.
  if v_listing.room_id is not null and exists (
    select 1 from public.rental_listings
     where room_id = v_listing.room_id
       and id <> p_listing_id
       and deleted_at is null
       and status in ('Active', 'PendingApproval')
  ) then
    raise exception 'ROOM_ALREADY_LISTED';
  end if;

  select coalesce((value)::boolean, false) into v_auto_approve
    from public.platform_settings where key = 'auto_approve_listings';
  v_new_status := case when coalesce(v_auto_approve, false) then 'Active' else 'PendingApproval' end;

  update public.rental_listings
     set status      = v_new_status,
         approved_at = case when v_new_status = 'Active' then now() else null end,
         expire_at   = case when v_new_status = 'Active' then now() + public.listing_ttl_interval() else null end
   where id = p_listing_id;

  return v_new_status;
end $$;

revoke execute on function public.renew_listing(uuid) from public, anon;
grant  execute on function public.renew_listing(uuid) to authenticated;
