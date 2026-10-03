-- Production hardening for subscriptions and listing moderation.
--
-- Demo helpers and the arbitrary subscription-status RPC were intentionally
-- useful while reviewing the prototype, but must not be callable by normal
-- authenticated users in production. Listing writes are also moved behind
-- narrowly-scoped RPCs so sellers cannot promote Pending/Rejected/Draft rows
-- to Active through the REST API.

insert into public.platform_settings (key, value, updated_at)
values ('auto_approve_listings', 'false'::jsonb, now())
on conflict (key) do update
set value = excluded.value,
    updated_at = excluded.updated_at;

-- Server-side validation for every write path (RPC, dashboard or future API).
-- A trigger is used instead of validating historical rows so the deployment is
-- not blocked by legacy seed data; every newly inserted/updated row is strict.
create or replace function public.validate_rental_listing_market_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Bản nháp và tin đã ẩn/xóa có thể là dữ liệu cũ chưa đủ trường. Chỉ khi tin
  -- bước vào hàng chờ duyệt hoặc hiển thị mới phải đạt toàn bộ ràng buộc.
  if new.status not in ('PendingApproval', 'Active') then
    return new;
  end if;

  if char_length(btrim(coalesce(new.title, ''))) not between 10 and 120 then
    raise exception 'INVALID_LISTING_TITLE' using errcode = '23514';
  end if;
  if char_length(btrim(coalesce(new.address, ''))) not between 5 and 255 then
    raise exception 'INVALID_LISTING_ADDRESS' using errcode = '23514';
  end if;
  if char_length(btrim(coalesce(new.description, ''))) not between 10 and 5000 then
    raise exception 'INVALID_LISTING_DESCRIPTION' using errcode = '23514';
  end if;
  if new.price < 100000 or new.price > 1000000000 then
    raise exception 'INVALID_LISTING_PRICE' using errcode = '23514';
  end if;
  if new.area < 5 or new.area > 1000 then
    raise exception 'INVALID_LISTING_AREA' using errcode = '23514';
  end if;
  if coalesce(new.contact_phone, '') !~ '^0[0-9]{8,9}$' then
    raise exception 'INVALID_LISTING_PHONE' using errcode = '23514';
  end if;
  if new.electricity_price is not null and (new.electricity_price < 0 or new.electricity_price > 10000000) then
    raise exception 'INVALID_ELECTRICITY_PRICE' using errcode = '23514';
  end if;
  if new.water_price is not null and (new.water_price < 0 or new.water_price > 10000000) then
    raise exception 'INVALID_WATER_PRICE' using errcode = '23514';
  end if;
  if new.service_price is not null and (new.service_price < 0 or new.service_price > 100000000) then
    raise exception 'INVALID_SERVICE_PRICE' using errcode = '23514';
  end if;
  if new.deposit is not null and (new.deposit < 0 or new.deposit > 1000000000) then
    raise exception 'INVALID_DEPOSIT' using errcode = '23514';
  end if;
  if (new.latitude is null) <> (new.longitude is null) then
    raise exception 'INVALID_LISTING_COORDINATES' using errcode = '23514';
  end if;
  if new.latitude is not null and (new.latitude < -90 or new.latitude > 90
      or new.longitude < -180 or new.longitude > 180) then
    raise exception 'INVALID_LISTING_COORDINATES' using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists trg_validate_rental_listing_market_fields on public.rental_listings;
drop trigger if exists trg_validate_rental_listing_insert on public.rental_listings;
drop trigger if exists trg_validate_rental_listing_update on public.rental_listings;
create trigger trg_validate_rental_listing_insert
before insert on public.rental_listings
for each row execute function public.validate_rental_listing_market_fields();
create trigger trg_validate_rental_listing_update
before update of status, title, address, description, price, area, contact_phone,
  electricity_price, water_price, service_price, deposit, latitude, longitude
on public.rental_listings
for each row execute function public.validate_rental_listing_market_fields();

-- Các helper reviewer từng là SECURITY DEFINER và được grant cho mọi tài khoản
-- đăng nhập. Production không chỉ ẩn nút: xóa hẳn bề mặt gọi ở database.
drop function if exists public.demo_link_me_to_seeded_occupancy(uuid);
drop function if exists public.demo_enable_public_profiles();
drop function if exists public.set_subscription_status(text);

-- A customer may start a trial once. The client cannot choose an arbitrary
-- status or expiry date.
create or replace function public.activate_subscription_trial()
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_plan     uuid;
  v_existing public.user_subscriptions;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  -- Hai click/tab đồng thời của cùng một tài khoản phải tuần tự; nếu chưa có
  -- row để `for update` khóa thì advisory lock vẫn ngăn tạo hai trial.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  -- Schema cũ không có unique(seller_id), còn policy demo cho seller ghi thẳng.
  -- Không chỉ xem row đầu tiên: một row NONE cũ không được che một trial/ACTIVE
  -- khác và cho cùng tài khoản nhận thêm 30 ngày miễn phí.
  if exists (
    select 1 from public.user_subscriptions
    where seller_id = v_uid and status <> 'NONE'
  ) then
    raise exception 'SUBSCRIPTION_TRIAL_UNAVAILABLE' using errcode = 'P0001';
  end if;

  select * into v_existing
  from public.user_subscriptions
  where seller_id = v_uid and status = 'NONE'
  order by created_at
  limit 1
  for update;

  select id into v_plan
  from public.subscription_plans
  order by price, created_at
  limit 1;

  if v_existing.id is null then
    insert into public.user_subscriptions (
      seller_id, plan_id, start_date, expire_date, status
    ) values (
      v_uid, v_plan, current_date, current_date + 30, 'TRIAL'
    );
  else
    update public.user_subscriptions
    set plan_id = coalesce(plan_id, v_plan),
        start_date = current_date,
        expire_date = current_date + 30,
        status = 'TRIAL'
    where id = v_existing.id;
  end if;
end $$;

-- Only an already-approved listing may be hidden or restored. No client input
-- can transition Draft/PendingApproval/Rejected/Expired/Rented to Active.
create or replace function public.set_listing_visibility(
  p_listing_id uuid,
  p_visible boolean
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_listing    public.rental_listings;
  v_new_status text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into v_listing
  from public.rental_listings
  where id = p_listing_id and deleted_at is null
  for update;

  if not found or v_listing.seller_id <> v_uid then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_visible then
    if v_listing.status <> 'Hidden' or v_listing.approved_at is null then
      raise exception 'INVALID_LISTING_VISIBILITY_TRANSITION' using errcode = 'P0001';
    end if;
    v_new_status := 'Active';
  else
    if v_listing.status <> 'Active' then
      raise exception 'INVALID_LISTING_VISIBILITY_TRANSITION' using errcode = 'P0001';
    end if;
    v_new_status := 'Hidden';
  end if;

  update public.rental_listings
  set status = v_new_status
  where id = p_listing_id;

  return v_new_status;
end $$;

create or replace function public.delete_listing(p_listing_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  update public.rental_listings
  set deleted_at = now(),
      status = 'Hidden'
  where id = p_listing_id
    and seller_id = v_uid
    and deleted_at is null;

  if not found then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
end $$;

-- Incrementing a public listing view is intentionally anonymous, but callers
-- cannot choose the resulting count or touch any other listing field. Keeping
-- the increment in SQL also makes concurrent page views atomic.
create or replace function public.increment_listing_view(p_listing_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.rental_listings
  set view_count = coalesce(view_count, 0) + 1
  where id = p_listing_id
    and deleted_at is null
    and status = 'Active';
$$;

-- Remove broad owner-write policies. Reads remain available through the
-- dedicated policies; all writes use ownership-checking SECURITY DEFINER RPCs.
drop policy if exists "Seller manage listings" on public.rental_listings;
drop policy if exists "Public view active listings" on public.rental_listings;
create policy "Public view active listings" on public.rental_listings
  for select
  using (status = 'Active' and deleted_at is null);

-- Amenity/media cũng là nội dung của tin. Chặn sửa trực tiếp để mọi thay đổi
-- đều đi qua RPC có kiểm tra chủ sở hữu và cùng một transaction với tin chính.
drop policy if exists "Seller manage amenities" on public.listing_amenities;
drop policy if exists "Seller reads own amenities" on public.listing_amenities;
create policy "Seller reads own amenities" on public.listing_amenities
  for select to authenticated
  using (exists (
    select 1 from public.rental_listings
    where rental_listings.id = listing_amenities.listing_id
      and rental_listings.seller_id = auth.uid()
  ));

drop policy if exists "Seller manages own media" on public.listing_media;
drop policy if exists "Seller reads own media" on public.listing_media;
create policy "Seller reads own media" on public.listing_media
  for select to authenticated
  using (exists (
    select 1 from public.rental_listings
    where rental_listings.id = listing_media.listing_id
      and rental_listings.seller_id = auth.uid()
  ));

drop policy if exists "Owner subscriptions access" on public.user_subscriptions;
drop policy if exists "Owner reads subscriptions" on public.user_subscriptions;
create policy "Owner reads subscriptions" on public.user_subscriptions
  for select to authenticated
  using (auth.uid() = seller_id);

revoke execute on function public.activate_subscription_trial() from public, anon;
revoke execute on function public.set_listing_visibility(uuid, boolean) from public, anon;
revoke execute on function public.delete_listing(uuid) from public, anon;
revoke execute on function public.increment_listing_view(uuid) from public;

grant execute on function public.activate_subscription_trial() to authenticated;
grant execute on function public.set_listing_visibility(uuid, boolean) to authenticated;
grant execute on function public.delete_listing(uuid) to authenticated;
grant execute on function public.increment_listing_view(uuid) to anon, authenticated;
