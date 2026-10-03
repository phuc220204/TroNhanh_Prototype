-- Phone-first registration, verified contact phones, and server-owned OTP challenges.
alter table public.profiles
  add column if not exists contact_email text,
  add column if not exists contact_phone_verified_at timestamptz;

create table if not exists public.phone_verification_challenges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_e164 text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  last_sent_at timestamptz not null default now(),
  send_window_started_at timestamptz not null default now(),
  sends_in_window integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.phone_verification_rate_limits (
  phone_e164 text primary key,
  last_sent_at timestamptz not null default now(),
  window_started_at timestamptz not null default now(),
  sends_in_window integer not null default 1
);

alter table public.phone_verification_challenges enable row level security;
alter table public.phone_verification_rate_limits enable row level security;
revoke all on public.phone_verification_challenges, public.phone_verification_rate_limits from anon, authenticated;
grant all on public.phone_verification_challenges, public.phone_verification_rate_limits to service_role;

-- Profiles may still edit their name/email, but a browser cannot claim a verified
-- number or change the number without completing the server OTP flow.
create or replace function public.guard_profile_phone_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.contact_phone is distinct from old.contact_phone
      or new.contact_phone_verified_at is distinct from old.contact_phone_verified_at)
     and current_setting('app.phone_verification_write', true) is distinct from 'allowed' then
    raise exception 'PHONE_VERIFICATION_REQUIRED' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_phone_verification on public.profiles;
create trigger guard_profile_phone_verification
before update of contact_phone, contact_phone_verified_at on public.profiles
for each row execute function public.guard_profile_phone_verification();

-- New phone-auth and Google users share this trigger; email is contact metadata,
-- never the authentication identity for new phone-first registrations.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  v_full_name := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  )), '');
  if v_full_name is null and new.email is not null then
    v_full_name := split_part(new.email, '@', 1);
  end if;
  if v_full_name is null and new.phone is not null then
    v_full_name := new.phone;
  end if;

  insert into public.profiles (user_id, full_name, contact_phone, contact_email, is_seller)
  values (
    new.id,
    v_full_name,
    coalesce(new.raw_user_meta_data ->> 'contact_phone', new.phone),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'contact_email', new.email)), ''),
    false
  )
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'Renter')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create or replace function public.begin_contact_phone_verification(
  p_user_id uuid,
  p_phone_e164 text,
  p_otp_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
      and case
        when regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') like '84%'
          then '0' || substr(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 3)
        else regexp_replace(coalesce(u.phone, ''), '\D', '', 'g')
      end = v_national
    union all
    select 1 from public.profiles p
    where p.user_id <> p_user_id
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
$$;

create or replace function public.invalidate_contact_phone_verification(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.phone_verification_challenges
  set otp_hash = '!', expires_at = now(), attempts = 5
  where user_id = p_user_id;
$$;

create or replace function public.complete_contact_phone_verification(
  p_user_id uuid,
  p_otp_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
      and case when regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') like '84%'
        then '0' || substr(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 3)
        else regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') end = v_national
    union all
    select 1 from public.profiles p
    where p.user_id <> p_user_id
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
  update public.phone_verification_challenges
  set otp_hash = '!', expires_at = now(), attempts = 5
  where user_id = p_user_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.begin_contact_phone_verification(uuid, text, text) from public, anon, authenticated;
revoke all on function public.invalidate_contact_phone_verification(uuid) from public, anon, authenticated;
revoke all on function public.complete_contact_phone_verification(uuid, text) from public, anon, authenticated;
grant execute on function public.begin_contact_phone_verification(uuid, text, text) to service_role;
grant execute on function public.invalidate_contact_phone_verification(uuid) to service_role;
grant execute on function public.complete_contact_phone_verification(uuid, text) to service_role;

create or replace function public.current_user_has_verified_phone()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u where u.id = auth.uid() and u.phone_confirmed_at is not null
  ) or exists (
    select 1 from public.profiles p where p.user_id = auth.uid() and p.contact_phone_verified_at is not null
  );
$$;
revoke all on function public.current_user_has_verified_phone() from public, anon;
grant execute on function public.current_user_has_verified_phone() to authenticated, service_role;

create or replace function public.require_verified_phone_for_posting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Direct SQL maintenance/seeds and trusted service-role jobs have no end-user
  -- session; untrusted Data API inserts are still blocked by RLS policies.
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then return new; end if;
  if not public.current_user_has_verified_phone() then
    raise exception 'PHONE_VERIFICATION_REQUIRED' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists rental_listings_require_verified_phone on public.rental_listings;
create trigger rental_listings_require_verified_phone
before insert on public.rental_listings
for each row execute function public.require_verified_phone_for_posting();

drop trigger if exists demand_posts_require_verified_phone on public.demand_posts;
create trigger demand_posts_require_verified_phone
before insert on public.demand_posts
for each row execute function public.require_verified_phone_for_posting();
