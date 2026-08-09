-- ═══════════════════════════════════════════════════════════════════════════
-- Hai RPC tin đăng ghi thêm `province_code` / `ward_code`
--
-- Migration `20260809100000` đã thêm hai cột, nhưng đường GHI đi qua
-- `create_listing_with_details` / `update_listing_with_details` — hai hàm chỉ
-- đọc những khóa chúng biết trong `p_listing`, nên cột mới sẽ vĩnh viễn NULL.
-- Bộ lọc theo tỉnh/phường khi đó luôn trả rỗng, mà không có lỗi nào báo.
--
-- Phải `create or replace` NGUYÊN hàm (Postgres không cho sửa từng phần), nên
-- file này chép lại thân hàm từ `20260725100900_rpcs_core.sql` rồi chỉ chèn
-- thêm hai cột. KHÔNG sửa file gốc — nó đã apply lên remote, `db push` bỏ qua
-- file cũ nên sửa ở đó là thay đổi không bao giờ tới DB.
--
-- BR-003: đổi phường/xã được tính là "sửa field quan trọng" ⇒ tin Active quay
-- về PendingApproval khi đang bật kiểm duyệt thủ công. Đổi địa điểm là đổi đúng
-- thứ người tìm trọ dựa vào để quyết định, ngang với đổi giá hay địa chỉ.
--
-- Idempotent: create or replace.
-- ═══════════════════════════════════════════════════════════════════════════

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
    seller_id, room_id, property_id, title, property_type, price, district, area,
    province_code, ward_code,
    status, boost_expire_at, contact_phone, contact_name, address, description,
    electricity_price, water_price, water_unit, service_price, deposit,
    access_policy, access_open_time, access_close_time, latitude, longitude, metadata,
    approved_at, expire_at
  ) values (
    v_uid,                                        -- ← KHÔNG lấy từ p_listing
    v_room_id,
    v_property_id,
    p_listing ->> 'title',
    p_listing ->> 'property_type',
    (p_listing ->> 'price')::numeric,
    p_listing ->> 'district',
    (p_listing ->> 'area')::numeric,
    nullif(p_listing ->> 'province_code', '')::integer,
    nullif(p_listing ->> 'ward_code', '')::integer,
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

-- ══ update_listing_with_details ══════════════════════════════════════════
create or replace function public.update_listing_with_details(
  p_listing_id uuid,
  p_listing    jsonb,
  p_amenities  text[] default null,
  p_media      jsonb  default null
) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid            uuid;
  v_seller         uuid;
  v_status         text;
  v_new_status     text;
  v_auto_approve   boolean;
  v_significant    boolean := false;
  v_amenity        text;
  v_media          jsonb;
  v_keep_paths     text[];
  v_old            public.rental_listings;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select * into v_old from public.rental_listings
    where id = p_listing_id and deleted_at is null for update;
  if not found then raise exception 'FORBIDDEN'; end if;
  v_seller := v_old.seller_id;
  v_status := v_old.status;
  if v_seller <> v_uid then raise exception 'FORBIDDEN'; end if;

  -- ── BR-003: field quan trọng đổi → cần duyệt lại ───────────────────────
  v_significant :=
       coalesce(p_listing ->> 'title',         v_old.title)         is distinct from v_old.title
    or coalesce(nullif(p_listing ->> 'price', '')::numeric, v_old.price) is distinct from v_old.price
    or coalesce(p_listing ->> 'address',       v_old.address)       is distinct from v_old.address
    or coalesce(p_listing ->> 'district',      v_old.district)      is distinct from v_old.district
    or coalesce(nullif(p_listing ->> 'ward_code', '')::integer, v_old.ward_code) is distinct from v_old.ward_code
    or coalesce(nullif(p_listing ->> 'area', '')::numeric, v_old.area) is distinct from v_old.area
    or coalesce(p_listing ->> 'property_type', v_old.property_type) is distinct from v_old.property_type
    or coalesce(p_listing ->> 'description',   v_old.description)   is distinct from v_old.description;

  select coalesce((value)::boolean, true) into v_auto_approve
    from public.platform_settings where key = 'auto_approve_listings';
  v_auto_approve := coalesce(v_auto_approve, true);

  if v_significant and v_status = 'Active' and not v_auto_approve then
    v_new_status := 'PendingApproval';
  elsif v_status = 'Rejected' then
    -- "Sửa & gửi lại": tin bị từ chối, sau khi sửa thì vào lại vòng duyệt
    v_new_status := case when v_auto_approve then 'Active' else 'PendingApproval' end;
  else
    v_new_status := v_status;
  end if;

  update public.rental_listings set
    title             = coalesce(p_listing ->> 'title',         title),
    property_type     = coalesce(p_listing ->> 'property_type', property_type),
    price             = coalesce(nullif(p_listing ->> 'price', '')::numeric, price),
    district          = coalesce(p_listing ->> 'district',      district),
    province_code     = coalesce(nullif(p_listing ->> 'province_code', '')::integer, province_code),
    ward_code         = coalesce(nullif(p_listing ->> 'ward_code', '')::integer, ward_code),
    area              = coalesce(nullif(p_listing ->> 'area', '')::numeric, area),
    address           = coalesce(p_listing ->> 'address',       address),
    description       = coalesce(p_listing ->> 'description',   description),
    contact_phone     = coalesce(p_listing ->> 'contact_phone', contact_phone),
    contact_name      = coalesce(p_listing ->> 'contact_name',  contact_name),
    electricity_price = coalesce(nullif(p_listing ->> 'electricity_price', '')::numeric, electricity_price),
    water_price       = coalesce(nullif(p_listing ->> 'water_price', '')::numeric, water_price),
    water_unit        = coalesce(nullif(p_listing ->> 'water_unit', ''), water_unit),
    service_price     = coalesce(nullif(p_listing ->> 'service_price', '')::numeric, service_price),
    deposit           = coalesce(nullif(p_listing ->> 'deposit', '')::numeric, deposit),
    access_policy     = coalesce(nullif(p_listing ->> 'access_policy', ''), access_policy),
    access_open_time  = coalesce(nullif(p_listing ->> 'access_open_time', '')::time, access_open_time),
    access_close_time = coalesce(nullif(p_listing ->> 'access_close_time', '')::time, access_close_time),
    latitude          = coalesce(nullif(p_listing ->> 'latitude', '')::numeric, latitude),
    longitude         = coalesce(nullif(p_listing ->> 'longitude', '')::numeric, longitude),
    metadata          = coalesce(p_listing -> 'metadata', metadata),
    status            = v_new_status,
    rejection_reason  = case when v_new_status <> 'Rejected' then null else rejection_reason end
  where id = p_listing_id;

  -- ── Amenities: replace toàn bộ (null = không đổi) ──────────────────────
  if p_amenities is not null then
    delete from public.listing_amenities where listing_id = p_listing_id;
    foreach v_amenity in array p_amenities loop
      if coalesce(v_amenity, '') <> '' then
        insert into public.listing_amenities (listing_id, amenity) values (p_listing_id, v_amenity);
      end if;
    end loop;
  end if;

  -- ── Media: reconcile theo storage_path (null = không đổi) ──────────────
  if p_media is not null then
    select coalesce(array_agg(m ->> 'storage_path'), '{}')
      into v_keep_paths
      from jsonb_array_elements(p_media) m;

    delete from public.listing_media
      where listing_id = p_listing_id and not (storage_path = any(v_keep_paths));

    for v_media in select * from jsonb_array_elements(p_media) loop
      insert into public.listing_media (
        listing_id, storage_path, sort_order, width, height, size_bytes, mime_type
      ) values (
        p_listing_id, v_media ->> 'storage_path',
        coalesce((v_media ->> 'sort_order')::integer, 0),
        nullif(v_media ->> 'width', '')::integer,
        nullif(v_media ->> 'height', '')::integer,
        nullif(v_media ->> 'size_bytes', '')::integer,
        v_media ->> 'mime_type'
      )
      on conflict (listing_id, sort_order) do update
        set storage_path = excluded.storage_path,
            width = excluded.width, height = excluded.height,
            size_bytes = excluded.size_bytes, mime_type = excluded.mime_type;
    end loop;
  end if;

  return v_new_status;   -- để UI nói được "tin của bạn cần duyệt lại"
end $$;
