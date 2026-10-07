-- Xử lý các mục Low còn lại sau rà soát 2026-10-06. Idempotent.
--
-- 1. listing_media.storage_path không bắt buộc thuộc thư mục người đăng ⇒ gắn
--    được ảnh của người khác (họ không xóa được vì "đang dùng").
-- 2. link_renter_account trả USER_NOT_FOUND_BY_EMAIL ⇒ dò được email đã đăng ký.
-- 3. Kiểm "SĐT đã dùng" tính cả SĐT CHƯA xác minh ⇒ khai bừa SĐT lúc đăng ký là
--    chặn được chủ thật (phone_taken).
-- 4. increment_listing_view gọi tùy ý ⇒ thổi lượt xem.
-- 5. profiles: người dùng tự sửa is_seller.

-- ── 1. Ảnh tin phải nằm trong thư mục của người đăng ─────────────────────────
create or replace function public.guard_listing_media_path()
returns trigger
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Không có JWT (migration, service_role) hoặc moderator ⇒ không áp.
  if auth.uid() is null or public.is_moderator() then
    return new;
  end if;
  if new.storage_path is null or new.storage_path not like auth.uid()::text || '/%' then
    raise exception 'MEDIA_PATH_NOT_OWNED' using errcode = '42501';
  end if;
  return new;
end $$;

revoke execute on function public.guard_listing_media_path() from public, anon, authenticated;

drop trigger if exists guard_listing_media_path on public.listing_media;
create trigger guard_listing_media_path
  before insert or update of storage_path on public.listing_media
  for each row execute function public.guard_listing_media_path();

-- ── 2. Gắn tài khoản người ở không tiết lộ email đã đăng ký hay chưa ─────────
alter table public.occupancies add column if not exists pending_link_email text;

create or replace function public.link_renter_account(p_occupancy_id uuid, p_email text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid         uuid;
  v_owner       uuid;
  v_email       text;
  v_target_user uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select owner_id into v_owner from public.occupancies
    where id = p_occupancy_id and deleted_at is null;

  if v_owner is null  then raise exception 'OCCUPANCY_NOT_FOUND'; end if;
  if v_owner <> v_uid then raise exception 'OCCUPANCY_NOT_OWNED'; end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_EMAIL';
  end if;

  select id into v_target_user from auth.users where lower(email) = v_email;

  -- BR-029: luôn ở trạng thái Pending, người ở tự xác nhận. Email chưa có tài
  -- khoản ⇒ giữ email chờ (trigger attach_pending_occupancy_links gắn khi họ
  -- xác minh email). Hai nhánh trả về giống hệt nhau ⇒ không dò được email.
  update public.occupancies
    set user_id = v_target_user,
        pending_link_email = case when v_target_user is null then v_email else null end,
        link_status = 'Pending'
    where id = p_occupancy_id and owner_id = v_uid;
end $$;

revoke execute on function public.link_renter_account(uuid, text) from public, anon;
grant  execute on function public.link_renter_account(uuid, text) to authenticated;

create or replace function public.cancel_occupancy_link(p_occupancy_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_occupancy public.occupancies;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select * into v_occupancy from public.occupancies
  where id = p_occupancy_id and deleted_at is null
  for update;

  if not found then raise exception 'OCCUPANCY_NOT_FOUND'; end if;
  -- security definer bypass RLS ⇒ đây là biên bảo mật.
  if v_occupancy.owner_id <> v_uid then raise exception 'OCCUPANCY_NOT_OWNED'; end if;
  if v_occupancy.link_status is distinct from 'Pending' then
    raise exception 'OCCUPANCY_LINK_NOT_PENDING';
  end if;

  update public.occupancies
  set user_id = null,
      pending_link_email = null,
      link_status = null
  where id = p_occupancy_id and owner_id = v_uid;
end $$;

revoke execute on function public.cancel_occupancy_link(uuid) from public, anon;
grant  execute on function public.cancel_occupancy_link(uuid) to authenticated;

-- Chỉ gắn khi email ĐÃ XÁC MINH: nếu gắn lúc đăng ký (email chưa xác minh), ai
-- đăng ký bằng email của người ở là chiếm được liên kết và thấy phòng/giá thuê.
create or replace function public.attach_pending_occupancy_links()
returns trigger
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if new.email is not null and new.email_confirmed_at is not null then
    update public.occupancies
      set user_id = new.id,
          pending_link_email = null
      where pending_link_email = lower(new.email)
        and user_id is null
        and link_status = 'Pending'
        and deleted_at is null;
  end if;
  return new;
end $$;

revoke execute on function public.attach_pending_occupancy_links() from public, anon, authenticated;

drop trigger if exists attach_pending_occupancy_links on auth.users;
create trigger attach_pending_occupancy_links
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.attach_pending_occupancy_links();

-- ── 3. SĐT chỉ tính là "đã dùng" khi đã xác minh ─────────────────────────────
CREATE OR REPLACE FUNCTION public.begin_contact_phone_verification(p_user_id uuid, p_phone_e164 text, p_otp_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_digits text := regexp_replace(p_phone_e164, '\D', '', 'g');
  v_national text;
  v_now timestamptz := now();
  v_user public.phone_verification_challenges%rowtype;
  v_phone public.phone_verification_rate_limits%rowtype;
  v_existing boolean;
  v_retry integer;
begin
  if v_digits like '84%' then v_national := '0' || substr(v_digits, 3);
  else v_national := v_digits;
  end if;
  if p_phone_e164 !~ '^\+84(3|5|7|8|9)[0-9]{8}$' or length(p_otp_hash) < 32 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_phone');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 1));
  perform pg_advisory_xact_lock(hashtextextended(v_digits, 0));

  select exists (
    select 1 from auth.users u
    where u.id <> p_user_id
      and u.phone_confirmed_at is not null
      and case
        when regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') like '84%'
          then '0' || substr(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 3)
        else regexp_replace(coalesce(u.phone, ''), '\D', '', 'g')
      end = v_national
    union all
    select 1 from public.profiles p
    where p.user_id <> p_user_id
      and p.contact_phone_verified_at is not null
      and case
        when regexp_replace(coalesce(p.contact_phone, ''), '\D', '', 'g') like '84%'
          then '0' || substr(regexp_replace(coalesce(p.contact_phone, ''), '\D', '', 'g'), 3)
        else regexp_replace(coalesce(p.contact_phone, ''), '\D', '', 'g')
      end = v_national
  ) into v_existing;
  if v_existing then return jsonb_build_object('ok', false, 'reason', 'phone_taken'); end if;

  select * into v_user from public.phone_verification_challenges where user_id = p_user_id for update;
  if found and v_user.last_sent_at > v_now - interval '60 seconds' then
    v_retry := greatest(1, ceil(extract(epoch from (v_user.last_sent_at + interval '60 seconds' - v_now))::numeric)::integer);
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'retry_after', v_retry);
  end if;
  if found and v_user.send_window_started_at > v_now - interval '1 hour' and v_user.sends_in_window >= 5 then
    v_retry := greatest(1, ceil(extract(epoch from (v_user.send_window_started_at + interval '1 hour' - v_now))::numeric)::integer);
    return jsonb_build_object('ok', false, 'reason', 'rate_limited', 'retry_after', v_retry);
  end if;

  insert into public.phone_verification_rate_limits(phone_e164)
  values (p_phone_e164) on conflict (phone_e164) do nothing;
  select * into v_phone from public.phone_verification_rate_limits where phone_e164 = p_phone_e164 for update;
  if v_phone.last_sent_at > v_now - interval '60 seconds' then
    v_retry := greatest(1, ceil(extract(epoch from (v_phone.last_sent_at + interval '60 seconds' - v_now))::numeric)::integer);
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'retry_after', v_retry);
  end if;
  if v_phone.window_started_at > v_now - interval '1 hour' and v_phone.sends_in_window >= 5 then
    v_retry := greatest(1, ceil(extract(epoch from (v_phone.window_started_at + interval '1 hour' - v_now))::numeric)::integer);
    return jsonb_build_object('ok', false, 'reason', 'rate_limited', 'retry_after', v_retry);
  end if;
  update public.phone_verification_rate_limits
  set last_sent_at = v_now,
      window_started_at = case when v_phone.window_started_at <= v_now - interval '1 hour' then v_now else v_phone.window_started_at end,
      sends_in_window = case when v_phone.window_started_at <= v_now - interval '1 hour' then 1 else v_phone.sends_in_window + 1 end
  where phone_e164 = p_phone_e164;

  insert into public.phone_verification_challenges(user_id, phone_e164, otp_hash, expires_at, attempts, last_sent_at, send_window_started_at, sends_in_window)
  values (p_user_id, p_phone_e164, p_otp_hash, v_now + interval '5 minutes', 0, v_now, v_now, 1)
  on conflict (user_id) do update set
    phone_e164 = excluded.phone_e164,
    otp_hash = excluded.otp_hash,
    expires_at = excluded.expires_at,
    attempts = 0,
    last_sent_at = v_now,
    send_window_started_at = case when public.phone_verification_challenges.send_window_started_at <= v_now - interval '1 hour' then v_now else public.phone_verification_challenges.send_window_started_at end,
    sends_in_window = case when public.phone_verification_challenges.send_window_started_at <= v_now - interval '1 hour' then 1 else public.phone_verification_challenges.sends_in_window + 1 end,
    created_at = v_now;

  return jsonb_build_object('ok', true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.complete_contact_phone_verification(p_user_id uuid, p_otp_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_challenge public.phone_verification_challenges%rowtype;
  v_digits text;
  v_national text;
  v_existing boolean;
begin
  select * into v_challenge from public.phone_verification_challenges where user_id = p_user_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_challenge'); end if;
  if v_challenge.expires_at <= now() then
    update public.phone_verification_challenges set otp_hash = '!', attempts = 5 where user_id = p_user_id;
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if v_challenge.attempts >= 5 then return jsonb_build_object('ok', false, 'reason', 'rate_limited'); end if;
  if v_challenge.otp_hash <> p_otp_hash then
    update public.phone_verification_challenges set attempts = attempts + 1 where user_id = p_user_id;
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  v_digits := regexp_replace(v_challenge.phone_e164, '\D', '', 'g');
  v_national := '0' || substr(v_digits, 3);
  perform pg_advisory_xact_lock(hashtextextended(v_digits, 0));
  select exists (
    select 1 from auth.users u
    where u.id <> p_user_id
      and u.phone_confirmed_at is not null
      and case when regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') like '84%'
        then '0' || substr(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 3)
        else regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') end = v_national
    union all
    select 1 from public.profiles p
    where p.user_id <> p_user_id
      and p.contact_phone_verified_at is not null
      and case when regexp_replace(coalesce(p.contact_phone, ''), '\D', '', 'g') like '84%'
        then '0' || substr(regexp_replace(coalesce(p.contact_phone, ''), '\D', '', 'g'), 3)
        else regexp_replace(coalesce(p.contact_phone, ''), '\D', '', 'g') end = v_national
  ) into v_existing;
  if v_existing then
    update public.phone_verification_challenges set otp_hash = '!', expires_at = now(), attempts = 5 where user_id = p_user_id;
    return jsonb_build_object('ok', false, 'reason', 'phone_taken');
  end if;

  perform pg_catalog.set_config('app.phone_verification_write', 'allowed', true);
  update public.profiles
  set contact_phone = v_challenge.phone_e164,
      contact_phone_verified_at = now()
  where user_id = p_user_id;
  -- Số này giờ thuộc người vừa xác minh: gỡ khỏi profile khác đang để số đó
  -- mà CHƯA xác minh (nhập lúc đăng ký) — trước đây chúng chặn chủ thật bằng phone_taken.
  update public.profiles
  set contact_phone = null
  where user_id <> p_user_id
    and contact_phone_verified_at is null
    and case when regexp_replace(coalesce(contact_phone, ''), '\D', '', 'g') like '84%'
      then '0' || substr(regexp_replace(coalesce(contact_phone, ''), '\D', '', 'g'), 3)
      else regexp_replace(coalesce(contact_phone, ''), '\D', '', 'g') end = v_national;
  update public.phone_verification_challenges
  set otp_hash = '!', expires_at = now(), attempts = 5
  where user_id = p_user_id;
  return jsonb_build_object('ok', true);
end;
$function$;

revoke all on function public.begin_contact_phone_verification(uuid, text, text) from public, anon, authenticated;
revoke all on function public.complete_contact_phone_verification(uuid, text) from public, anon, authenticated;
grant execute on function public.begin_contact_phone_verification(uuid, text, text) to service_role;
grant execute on function public.complete_contact_phone_verification(uuid, text) to service_role;

-- ── 4. Lượt xem: mỗi người xem (tài khoản hoặc IP) tính 1 lần / tin / ngày ───
create table if not exists public.listing_view_events (
  listing_id uuid not null references public.rental_listings(id) on delete cascade,
  viewer_key text not null,
  viewed_on  date not null default current_date,
  primary key (listing_id, viewer_key, viewed_on)
);
alter table public.listing_view_events enable row level security;
-- Không policy: chỉ hàm SECURITY DEFINER bên dưới ghi/đọc.
revoke all on public.listing_view_events from anon, authenticated;

create or replace function public.increment_listing_view(p_listing_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_headers json;
  v_ip text;
  v_viewer text;
  v_inserted integer;
begin
  -- Hàm này cố ý cho cả khách gọi (đếm lượt xem trang chi tiết).
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_ip := nullif(trim(split_part(coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip', ''), ',', 1)), '');
  v_viewer := coalesce(auth.uid()::text, 'ip:' || md5(v_ip));
  -- Không xác định được người xem ⇒ không đếm (thà thiếu còn hơn bị thổi số).
  if v_viewer is null then
    return;
  end if;

  insert into public.listing_view_events (listing_id, viewer_key, viewed_on)
  select p_listing_id, v_viewer, current_date
  where exists (
    select 1 from public.rental_listings
    where id = p_listing_id and deleted_at is null and status = 'Active'
  )
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.rental_listings
    set view_count = coalesce(view_count, 0) + 1
    where id = p_listing_id;
  end if;

  -- Dọn dần dữ liệu cũ, không cần job riêng.
  if random() < 0.01 then
    delete from public.listing_view_events where viewed_on < current_date - 30;
  end if;
end $$;

revoke execute on function public.increment_listing_view(uuid) from public;
grant  execute on function public.increment_listing_view(uuid) to anon, authenticated;

-- ── 5. profiles: người dùng chỉ sửa tên + email liên hệ ──────────────────────
-- SĐT đổi qua luồng xác minh (Edge Function + RPC service_role); is_seller do
-- create_listing_with_details bật.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, contact_email) on public.profiles to authenticated;
