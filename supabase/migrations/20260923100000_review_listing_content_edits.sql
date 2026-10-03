-- TRN-010: mọi thay đổi nội dung hiển thị của tin đã duyệt phải quay lại hàng chờ.
-- RPC cũ chỉ tính title/price/address/description; ảnh, tiện ích và tin Hidden
-- có thể đổi nội dung rồi hiện lại mà không qua moderator.
create or replace function public.update_listing_with_details(
  p_listing_id uuid,
  p_listing jsonb,
  p_amenities text[] default null,
  p_media jsonb default null
) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_old public.rental_listings;
  v_new_status text;
  v_auto_approve boolean;
  v_significant boolean;
  v_amenity text;
  v_media jsonb;
  v_keep_paths text[];
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select * into v_old from public.rental_listings
  where id = p_listing_id and deleted_at is null for update;
  if not found or v_old.seller_id <> v_uid then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- So sánh đúng các giá trị mà UPDATE bên dưới sẽ ghi, kể cả đường dẫn ảnh.
  -- Chỉ đổi thứ tự ảnh/tiện ích không bắt duyệt lại nội dung.
  v_significant :=
       coalesce(p_listing ->> 'title', v_old.title) is distinct from v_old.title
    or coalesce(p_listing ->> 'property_type', v_old.property_type) is distinct from v_old.property_type
    or coalesce(nullif(p_listing ->> 'price', '')::numeric, v_old.price) is distinct from v_old.price
    or coalesce(p_listing ->> 'address', v_old.address) is distinct from v_old.address
    or coalesce(p_listing ->> 'district', v_old.district) is distinct from v_old.district
    or (case when p_listing ? 'province_code' then nullif(p_listing ->> 'province_code', '')::integer else v_old.province_code end) is distinct from v_old.province_code
    or (case when p_listing ? 'ward_code' then nullif(p_listing ->> 'ward_code', '')::integer else v_old.ward_code end) is distinct from v_old.ward_code
    or coalesce(nullif(p_listing ->> 'area', '')::numeric, v_old.area) is distinct from v_old.area
    or coalesce(p_listing ->> 'description', v_old.description) is distinct from v_old.description
    or coalesce(p_listing ->> 'contact_phone', v_old.contact_phone) is distinct from v_old.contact_phone
    or coalesce(p_listing ->> 'contact_name', v_old.contact_name) is distinct from v_old.contact_name
    or (case when p_listing ? 'electricity_price' then nullif(p_listing ->> 'electricity_price', '')::numeric else v_old.electricity_price end) is distinct from v_old.electricity_price
    or (case when p_listing ? 'water_price' then nullif(p_listing ->> 'water_price', '')::numeric else v_old.water_price end) is distinct from v_old.water_price
    or coalesce(nullif(p_listing ->> 'water_unit', ''), v_old.water_unit) is distinct from v_old.water_unit
    or (case when p_listing ? 'service_price' then nullif(p_listing ->> 'service_price', '')::numeric else v_old.service_price end) is distinct from v_old.service_price
    or (case when p_listing ? 'deposit' then nullif(p_listing ->> 'deposit', '')::numeric else v_old.deposit end) is distinct from v_old.deposit
    or coalesce(nullif(p_listing ->> 'access_policy', ''), v_old.access_policy) is distinct from v_old.access_policy
    or (case when p_listing ? 'access_open_time' then nullif(p_listing ->> 'access_open_time', '')::time else v_old.access_open_time end) is distinct from v_old.access_open_time
    or (case when p_listing ? 'access_close_time' then nullif(p_listing ->> 'access_close_time', '')::time else v_old.access_close_time end) is distinct from v_old.access_close_time
    or (case when p_listing ? 'latitude' then nullif(p_listing ->> 'latitude', '')::numeric else v_old.latitude end) is distinct from v_old.latitude
    or (case when p_listing ? 'longitude' then nullif(p_listing ->> 'longitude', '')::numeric else v_old.longitude end) is distinct from v_old.longitude
    or coalesce(p_listing -> 'metadata', v_old.metadata) is distinct from v_old.metadata
    or (p_amenities is not null and
        coalesce((select array_agg(amenity order by amenity)
                  from public.listing_amenities where listing_id = p_listing_id), '{}'::text[])
        is distinct from
        coalesce((select array_agg(amenity order by amenity)
                  from unnest(p_amenities) as supplied(amenity)), '{}'::text[]))
    or (p_media is not null and
        coalesce((select array_agg(storage_path order by storage_path)
                  from public.listing_media where listing_id = p_listing_id), '{}'::text[])
        is distinct from
        coalesce((select array_agg(path order by path)
                  from (select item ->> 'storage_path' as path
                        from jsonb_array_elements(p_media) item) supplied), '{}'::text[]));

  select coalesce((value)::boolean, false) into v_auto_approve
  from public.platform_settings where key = 'auto_approve_listings';
  v_auto_approve := coalesce(v_auto_approve, false);

  if v_significant and v_old.status in ('Active', 'Hidden') and not v_auto_approve then
    v_new_status := 'PendingApproval';
  elsif v_old.status = 'Rejected' then
    v_new_status := case when v_auto_approve then 'Active' else 'PendingApproval' end;
  else
    v_new_status := v_old.status;
  end if;

  update public.rental_listings set
    title             = coalesce(p_listing ->> 'title', title),
    property_type     = coalesce(p_listing ->> 'property_type', property_type),
    price             = coalesce(nullif(p_listing ->> 'price', '')::numeric, price),
    district          = coalesce(p_listing ->> 'district', district),
    province_code     = case when p_listing ? 'province_code' then nullif(p_listing ->> 'province_code', '')::integer else province_code end,
    ward_code         = case when p_listing ? 'ward_code' then nullif(p_listing ->> 'ward_code', '')::integer else ward_code end,
    area              = coalesce(nullif(p_listing ->> 'area', '')::numeric, area),
    address           = coalesce(p_listing ->> 'address', address),
    description       = coalesce(p_listing ->> 'description', description),
    contact_phone     = coalesce(p_listing ->> 'contact_phone', contact_phone),
    contact_name      = coalesce(p_listing ->> 'contact_name', contact_name),
    electricity_price = case when p_listing ? 'electricity_price' then nullif(p_listing ->> 'electricity_price', '')::numeric else electricity_price end,
    water_price       = case when p_listing ? 'water_price' then nullif(p_listing ->> 'water_price', '')::numeric else water_price end,
    water_unit        = coalesce(nullif(p_listing ->> 'water_unit', ''), water_unit),
    service_price     = case when p_listing ? 'service_price' then nullif(p_listing ->> 'service_price', '')::numeric else service_price end,
    deposit           = case when p_listing ? 'deposit' then nullif(p_listing ->> 'deposit', '')::numeric else deposit end,
    access_policy     = coalesce(nullif(p_listing ->> 'access_policy', ''), access_policy),
    access_open_time  = case when p_listing ? 'access_open_time' then nullif(p_listing ->> 'access_open_time', '')::time else access_open_time end,
    access_close_time = case when p_listing ? 'access_close_time' then nullif(p_listing ->> 'access_close_time', '')::time else access_close_time end,
    latitude          = case when p_listing ? 'latitude' then nullif(p_listing ->> 'latitude', '')::numeric else latitude end,
    longitude         = case when p_listing ? 'longitude' then nullif(p_listing ->> 'longitude', '')::numeric else longitude end,
    metadata          = coalesce(p_listing -> 'metadata', metadata),
    status            = v_new_status,
    approved_at       = case when v_new_status = 'PendingApproval' then null else approved_at end,
    rejection_reason  = case when v_new_status <> 'Rejected' then null else rejection_reason end
  where id = p_listing_id;

  if p_amenities is not null then
    delete from public.listing_amenities where listing_id = p_listing_id;
    foreach v_amenity in array p_amenities loop
      if coalesce(v_amenity, '') <> '' then
        insert into public.listing_amenities (listing_id, amenity)
        values (p_listing_id, v_amenity);
      end if;
    end loop;
  end if;

  if p_media is not null then
    select coalesce(array_agg(item ->> 'storage_path'), '{}') into v_keep_paths
    from jsonb_array_elements(p_media) item;

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
      ) on conflict (listing_id, sort_order) do update
        set storage_path = excluded.storage_path,
            width = excluded.width, height = excluded.height,
            size_bytes = excluded.size_bytes, mime_type = excluded.mime_type;
    end loop;
  end if;

  return v_new_status;
end $$;

-- Không cho thay bytes của ảnh đã duyệt qua Storage API mà giữ nguyên path.
-- Upload của ứng dụng luôn dùng UUID mới, nên INSERT là đủ. Ảnh chỉ được xóa
-- khỏi bucket sau khi RPC đã bỏ liên kết ảnh khỏi tin (hoặc xóa mềm tin).
-- Policy của storage.objects phải thấy cả tin mà caller không đọc được qua RLS.
create or replace function public.is_listing_media_in_use(p_storage_path text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.listing_media m
    join public.rental_listings l on l.id = m.listing_id
    where m.storage_path = p_storage_path and l.deleted_at is null
  );
$$;
revoke execute on function public.is_listing_media_in_use(text) from public, anon;
grant execute on function public.is_listing_media_in_use(text) to authenticated;

drop policy if exists "Owner updates own folder" on storage.objects;
drop policy if exists "Owner deletes own folder" on storage.objects;
drop policy if exists "Owner deletes unlisted images" on storage.objects;
create policy "Owner deletes unlisted images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_listing_media_in_use(name)
  );
