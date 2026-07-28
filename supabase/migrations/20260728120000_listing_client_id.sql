-- ═══════════════════════════════════════════════════════════════════════════
-- T19 — cho phép client sinh trước `id` của tin đăng.
--
-- VÌ SAO: ảnh phải upload vào `{seller_id}/{listing_id}/...` TRƯỚC khi row
-- rental_listings tồn tại (docs/cp4/tasks/T19_image_upload.md §4, phương án a).
-- Client sinh uuid, upload ảnh, rồi truyền chính uuid đó vào RPC.
--
-- AN TOÀN: `id` không phải giá trị nhạy cảm — nó không quyết định quyền.
-- `seller_id` vẫn derive từ auth.uid(), `status` vẫn derive server-side.
-- Trùng id sẽ bị primary key chặn, không ghi đè row người khác.
--
-- Đây là file migration MỚI vì 20260725100900 đã apply lên remote —
-- `db push` không chạy lại file cũ (CLAUDE.md §3).
-- Idempotent: create or replace.
-- ═══════════════════════════════════════════════════════════════════════════

-- ══ 1. create_listing_with_details ════════════════════════════════════════
create or replace function public.create_listing_with_details(
  p_listing   jsonb,
  p_amenities text[]   default '{}',
  p_media     jsonb    default '[]'::jsonb,
  p_submit    boolean  default true
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid          uuid;
  v_listing_id   uuid;
  v_status       text;
  v_auto_approve boolean;
  v_room_id      uuid;
  v_property_id  uuid;
  v_ttl_days     integer;
  v_amenity      text;
  v_media        jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  -- ── Assert ownership của các khoá ngoại trỏ sang workspace ──────────────
  v_room_id     := nullif(p_listing ->> 'room_id', '')::uuid;
  v_property_id := nullif(p_listing ->> 'property_id', '')::uuid;

  if v_room_id is not null then
    if not exists (select 1 from public.rooms
                   where id = v_room_id and owner_id = v_uid and deleted_at is null)
    then raise exception 'ROOM_NOT_OWNED'; end if;
  end if;

  if v_property_id is not null then
    if not exists (select 1 from public.properties
                   where id = v_property_id and owner_id = v_uid and deleted_at is null)
    then raise exception 'PROPERTY_NOT_OWNED'; end if;
  end if;

  -- ── STATUS LÀ DERIVED, KHÔNG BAO GIỜ NHẬN TỪ CLIENT ────────────────────
  select coalesce((value)::boolean, true) into v_auto_approve
    from public.platform_settings where key = 'auto_approve_listings';
  v_auto_approve := coalesce(v_auto_approve, true);

  select coalesce((value)::integer, 60) into v_ttl_days
    from public.platform_settings where key = 'listing_ttl_days';
  v_ttl_days := coalesce(v_ttl_days, 60);

  if not p_submit then
    v_status := 'Draft';
  elsif v_auto_approve then
    v_status := 'Active';
  else
    v_status := 'PendingApproval';
  end if;

  insert into public.rental_listings (
    id, seller_id, room_id, property_id, title, property_type, price, district, area,
    status, boost_expire_at, contact_phone, contact_name, address, description,
    electricity_price, water_price, water_unit, service_price, deposit,
    access_policy, access_open_time, access_close_time, latitude, longitude, metadata,
    approved_at, expire_at
  ) values (
    coalesce(nullif(p_listing ->> 'id', '')::uuid, gen_random_uuid()),
    v_uid,                                        -- ← KHÔNG lấy từ p_listing
    v_room_id,
    v_property_id,
    p_listing ->> 'title',
    p_listing ->> 'property_type',
    (p_listing ->> 'price')::numeric,
    p_listing ->> 'district',
    (p_listing ->> 'area')::numeric,
    v_status,                                     -- ← derived
    nullif(p_listing ->> 'boost_expire_at', '')::timestamptz,
    p_listing ->> 'contact_phone',
    p_listing ->> 'contact_name',
    p_listing ->> 'address',
    p_listing ->> 'description',
    nullif(p_listing ->> 'electricity_price', '')::numeric,
    nullif(p_listing ->> 'water_price', '')::numeric,
    coalesce(nullif(p_listing ->> 'water_unit', ''), 'person'),
    nullif(p_listing ->> 'service_price', '')::numeric,
    nullif(p_listing ->> 'deposit', '')::numeric,
    coalesce(nullif(p_listing ->> 'access_policy', ''), 'Free'),
    nullif(p_listing ->> 'access_open_time', '')::time,
    nullif(p_listing ->> 'access_close_time', '')::time,
    nullif(p_listing ->> 'latitude', '')::numeric,
    nullif(p_listing ->> 'longitude', '')::numeric,
    coalesce(p_listing -> 'metadata', '{}'::jsonb),
    case when v_status = 'Active' then now() else null end,
    case when v_status = 'Active' then now() + (v_ttl_days || ' days')::interval else null end
  ) returning id into v_listing_id;

  -- ── Amenities ──────────────────────────────────────────────────────────
  if p_amenities is not null then
    foreach v_amenity in array p_amenities loop
      if coalesce(v_amenity, '') <> '' then
        insert into public.listing_amenities (listing_id, amenity)
        values (v_listing_id, v_amenity);
      end if;
    end loop;
  end if;

  -- ── Media (KHÔNG enforce "≥3 ảnh" ở đây — chỉ ở form Yup) ──────────────
  for v_media in select * from jsonb_array_elements(coalesce(p_media, '[]'::jsonb)) loop
    insert into public.listing_media (
      listing_id, storage_path, sort_order, width, height, size_bytes, mime_type
    ) values (
      v_listing_id,
      v_media ->> 'storage_path',
      coalesce((v_media ->> 'sort_order')::integer, 0),
      nullif(v_media ->> 'width', '')::integer,
      nullif(v_media ->> 'height', '')::integer,
      nullif(v_media ->> 'size_bytes', '')::integer,
      v_media ->> 'mime_type'
    );
  end loop;

  -- ── Kích hoạt Seller (sửa bug #1: profiles khoá theo user_id) ──────────
  update public.profiles set is_seller = true where user_id = v_uid;
  insert into public.user_roles (user_id, role) values (v_uid, 'Seller')
    on conflict (user_id, role) do nothing;

  -- ── Audit trail đầy đủ cả khi auto-approve (07_RISKS.md #1) ────────────
  if v_status = 'Active' then
    insert into public.moderation_logs (target_type, target_id, moderator_id, action, reason)
    values ('RentalListing', v_listing_id, null, 'Approve', 'auto (demo)');
  end if;

  return v_listing_id;
end $$;

revoke execute on function public.create_listing_with_details(jsonb, text[], jsonb, boolean) from public, anon;
grant  execute on function public.create_listing_with_details(jsonb, text[], jsonb, boolean) to authenticated;
