-- ═══════════════════════════════════════════════════════════════════════════
-- 0900 — RPC CORE (1, 2, 5, 6, 7, 13)
--
-- ⚠️  LUẬT KHÔNG ĐƯỢC VI PHẠM TRONG BẤT KỲ HÀM NÀO DƯỚI ĐÂY
--
--  (1) `security definer` BYPASS RLS ⇒ assert ownership BÊN TRONG body
--      CHÍNH LÀ biên bảo mật. Không có assert = không có bảo mật.
--      RLS KHÔNG cứu bạn ở đây.
--
--  (2) `set search_path = public` là BẮT BUỘC, không phải trang trí
--      (chống search-path hijacking khi hàm gọi thứ gì không qualified).
--
--  (3) GIÁ TRỊ NHẠY CẢM DERIVE SERVER-SIDE, KHÔNG NHẬN TỪ CLIENT:
--      seller_id · owner_id · status của tin · previous_reading · unit_price
--      · invoice.total_amount. Nhận từ client = cho client tự phong quyền.
--
--  (4) Raise domain error làm MESSAGE ('READING_LOWER_THAN_PREVIOUS'), không
--      phải văn xuôi → supabase-error.ts map sang tiếng Việt bằng bảng tra.
--
-- Xem docs/cp4/03_RPC_CONTRACTS.md
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
    seller_id, room_id, property_id, title, property_type, price, district, area,
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

-- ══ 2. update_listing_with_details ════════════════════════════════════════
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

-- ══ 5. create_invoice_with_items ══════════════════════════════════════════
create or replace function public.create_invoice_with_items(
  p_room_id     uuid,
  p_contract_id uuid,
  p_period      text,
  p_due_date    date,
  p_items       jsonb
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid        uuid;
  v_invoice_id uuid;
  v_total      numeric := 0;
  v_item       jsonb;
  v_amount     numeric;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  if not exists (select 1 from public.rooms
                 where id = p_room_id and owner_id = v_uid and deleted_at is null)
  then raise exception 'ROOM_NOT_OWNED'; end if;

  if p_contract_id is not null then
    if not exists (select 1 from public.contracts
                   where id = p_contract_id and room_id = p_room_id
                     and owner_id = v_uid and deleted_at is null)
    then raise exception 'FORBIDDEN'; end if;
  end if;

  -- ── total_amount TÍNH SERVER-SIDE, KHÔNG ĐỌC TỪ CLIENT ────────────────
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if (v_item ->> 'type') not in ('Rent','Electricity','Water','Service','Other') then
      raise exception 'INVALID_INVOICE_ITEM_TYPE';
    end if;
    v_total := v_total + coalesce((v_item ->> 'amount')::numeric, 0);
  end loop;

  begin
    insert into public.invoices (room_id, contract_id, owner_id, period, due_date, total_amount, status)
    values (p_room_id, p_contract_id, v_uid, p_period, p_due_date, v_total,
            case when p_due_date < current_date then 'Overdue' else 'Unpaid' end)
    returning id into v_invoice_id;
  exception when unique_violation then
    raise exception 'INVOICE_PERIOD_EXISTS';
  end;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_amount := coalesce((v_item ->> 'amount')::numeric, 0);
    insert into public.invoice_items (invoice_id, type, description, quantity, unit_price, amount)
    values (
      v_invoice_id,
      v_item ->> 'type',
      v_item ->> 'description',
      coalesce((v_item ->> 'quantity')::numeric, 1),
      coalesce((v_item ->> 'unit_price')::numeric, v_amount),
      v_amount
    );
  end loop;

  return v_invoice_id;
end $$;

-- ══ 6. record_utility_reading ═════════════════════════════════════════════
create or replace function public.record_utility_reading(
  p_room_id uuid,
  p_type    text,
  p_period  text,
  p_current numeric
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid        uuid;
  v_previous   numeric;
  v_unit_price numeric;
  v_property   uuid;
  v_id         uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  if p_type not in ('Electricity', 'Water') then raise exception 'INVALID_READING_TYPE'; end if;

  select property_id into v_property from public.rooms
    where id = p_room_id and owner_id = v_uid and deleted_at is null;
  if v_property is null then raise exception 'ROOM_NOT_OWNED'; end if;

  -- ── previous_reading DERIVE SERVER-SIDE (không nhận từ client) ─────────
  select current_reading into v_previous
    from public.utility_readings
    where room_id = p_room_id and type = p_type and deleted_at is null and period < p_period
    order by period desc limit 1;
  v_previous := coalesce(v_previous, 0);

  if p_current < v_previous then raise exception 'READING_LOWER_THAN_PREVIOUS'; end if;

  -- ── unit_price ĐỌC TỪ properties (không nhận từ client) ───────────────
  select case when p_type = 'Electricity' then electricity_unit_price else water_unit_price end
    into v_unit_price from public.properties where id = v_property;

  insert into public.utility_readings
    (room_id, owner_id, type, period, previous_reading, current_reading, unit_price)
  values (p_room_id, v_uid, p_type, p_period, v_previous, p_current, coalesce(v_unit_price, 0))
  on conflict (room_id, type, period) where deleted_at is null
  do update set current_reading = excluded.current_reading,
                previous_reading = excluded.previous_reading,
                unit_price = excluded.unit_price
  returning id into v_id;

  return v_id;
end $$;

-- ══ 7. record_payment ═════════════════════════════════════════════════════
create or replace function public.record_payment(
  p_invoice_id uuid,
  p_amount     numeric,
  p_method     text,
  p_paid_at    timestamptz default now()
) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid      uuid;
  v_inv      public.invoices;
  v_paid     numeric;
  v_status   text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  if p_method not in ('Cash', 'BankTransfer') then raise exception 'INVALID_PAYMENT_METHOD'; end if;

  select * into v_inv from public.invoices
    where id = p_invoice_id and deleted_at is null for update;
  if not found or v_inv.owner_id <> v_uid then raise exception 'FORBIDDEN'; end if;

  -- purpose CỐ ĐỊNH — không nhận từ client
  insert into public.payments (invoice_id, owner_id, amount, method, paid_at, purpose)
  values (p_invoice_id, v_uid, p_amount, p_method, p_paid_at, 'RentInvoice');

  select coalesce(sum(amount), 0) into v_paid from public.payments where invoice_id = p_invoice_id;

  -- BR-004
  if v_paid >= v_inv.total_amount then v_status := 'Paid';
  elsif v_paid > 0                then v_status := 'PartiallyPaid';
  else                                 v_status := 'Unpaid';
  end if;
  if v_status <> 'Paid' and v_inv.due_date < current_date then v_status := 'Overdue'; end if;

  update public.invoices set status = v_status where id = p_invoice_id;
  return v_status;
end $$;

-- ══ 13. set_subscription_status ═══════════════════════════════════════════
-- Thay lệnh ghi trực tiếp từ client trong LandlordShell — giữ cho toggle demo
-- không thể chạm row của người khác.
create or replace function public.set_subscription_status(p_status text)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid; v_plan uuid; v_existing uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_status not in ('NONE','TRIAL','ACTIVE','READ_ONLY') then
    raise exception 'INVALID_SUBSCRIPTION_STATUS';
  end if;

  select id into v_plan from public.subscription_plans order by price limit 1;
  select id into v_existing from public.user_subscriptions where seller_id = v_uid limit 1;

  if v_existing is null then
    insert into public.user_subscriptions (seller_id, plan_id, start_date, expire_date, status)
    values (
      v_uid, v_plan, current_date,
      case when p_status = 'TRIAL'     then current_date + 30
           when p_status = 'ACTIVE'    then current_date + 1095
           when p_status = 'READ_ONLY' then current_date - 1
           else current_date end,
      p_status
    );
  else
    update public.user_subscriptions set
      status      = p_status,
      start_date  = case when p_status in ('TRIAL','ACTIVE') then current_date else start_date end,
      expire_date = case when p_status = 'TRIAL'     then current_date + 30
                         when p_status = 'ACTIVE'    then current_date + 1095
                         when p_status = 'READ_ONLY' then current_date - 1
                         else expire_date end
    where id = v_existing;
  end if;
end $$;

-- ══ GRANTS ════════════════════════════════════════════════════════════════
revoke execute on function public.create_listing_with_details(jsonb, text[], jsonb, boolean) from public, anon;
revoke execute on function public.update_listing_with_details(uuid, jsonb, text[], jsonb)    from public, anon;
revoke execute on function public.create_invoice_with_items(uuid, uuid, text, date, jsonb)   from public, anon;
revoke execute on function public.record_utility_reading(uuid, text, text, numeric)          from public, anon;
revoke execute on function public.record_payment(uuid, numeric, text, timestamptz)           from public, anon;
revoke execute on function public.set_subscription_status(text)                              from public, anon;

grant execute on function public.create_listing_with_details(jsonb, text[], jsonb, boolean) to authenticated;
grant execute on function public.update_listing_with_details(uuid, jsonb, text[], jsonb)    to authenticated;
grant execute on function public.create_invoice_with_items(uuid, uuid, text, date, jsonb)   to authenticated;
grant execute on function public.record_utility_reading(uuid, text, text, numeric)          to authenticated;
grant execute on function public.record_payment(uuid, numeric, text, timestamptz)           to authenticated;
grant execute on function public.set_subscription_status(text)                              to authenticated;
