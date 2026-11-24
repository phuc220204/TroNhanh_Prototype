-- ═══════════════════════════════════════════════════════════════════════════
-- T40 — Danh mục phí dịch vụ theo khu (property_services + room_services)
--
-- VÌ SAO: trước đây mỗi khu chỉ có 3 con số cứng (điện / nước / "phí dịch vụ").
-- Chủ trọ không khai được wifi, rác, giữ xe, phí quản lý… thành từng khoản riêng,
-- và không phân biệt được khoản nào là DOANH THU (phí dịch vụ) với khoản nào chỉ
-- THU HỘ bên thứ 3 (rác, điện/nước thu đúng giá gốc, giữ xe của bãi khác). Hộ
-- kinh doanh cho thuê trọ cần tách hai loại này khi kê khai thuế.
--
-- "Thu hộ" ở đây là CHỦ TRỌ thu hộ bên thứ 3. Nền tảng vẫn KHÔNG giữ tiền (AS-002).
--
-- ── MÔ HÌNH ──────────────────────────────────────────────────────────────────
--  property_services  : dịch vụ của khu (tên, đơn vị, loại khoản, cách tính, đơn giá)
--  room_services      : dịch vụ nào áp cho phòng nào (+ giá riêng của phòng, nullable)
--
--  fee_category   : 'Service' (doanh thu) | 'PassThrough' (thu hộ)
--                   'Rent'/'Adjustment' chỉ xuất hiện trên dòng hóa đơn (T41), không
--                   phải loại của một dịch vụ.
--  quantity_basis : 'Meter' (theo chỉ số — chỉ điện/nước, map vào utility_readings)
--                   'PerOccupant' (theo số người) | 'Fixed' (cố định mỗi kỳ)
--                   'PerVehicle' sẽ thêm ở T42 khi có bảng xe.
--
-- ── CỘT GIÁ CŨ = BẢN SAO CHỈ-ĐỌC ─────────────────────────────────────────────
-- properties.electricity_unit_price / water_unit_price / service_fee và
-- rooms.electricity_price / water_price / service_fee KHÔNG bị xóa. Chúng được
-- trigger `sync_legacy_service_prices` tính lại từ danh mục mỗi khi danh mục đổi,
-- để mọi chỗ đang đọc chúng (record_utility_reading, gợi ý đăng tin từ phòng,
-- form hóa đơn cũ) tiếp tục đúng. Client không ghi chúng nữa:
--   - rooms.*  : luôn = giá ĐANG ÁP cho phòng (0 nếu phòng không dùng dịch vụ đó)
--   - service_fee = tổng các dịch vụ 'Fixed' đang áp (khoản 'PerOccupant' chưa có
--     trong form hóa đơn cũ — T41 thay form đó).
--
-- Idempotent: if not exists / create or replace / drop ... if exists.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Bảng ─────────────────────────────────────────────────────────────────
create table if not exists public.property_services (
  id                  uuid primary key default gen_random_uuid(),
  property_id         uuid not null references public.properties(id) on delete cascade,
  owner_id            uuid not null references auth.users(id) on delete cascade,
  name                text not null check (char_length(btrim(name)) between 1 and 80),
  unit                text not null check (char_length(btrim(unit)) between 1 and 20),
  fee_category        text not null check (fee_category in ('Service', 'PassThrough')),
  quantity_basis      text not null check (quantity_basis in ('Meter', 'PerOccupant', 'Fixed')),
  meter_type          text check (meter_type in ('Electricity', 'Water')),
  unit_price          numeric not null default 0 check (unit_price >= 0),
  apply_to_new_rooms  boolean not null default true,
  sort_order          integer not null default 0,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  constraint property_services_meter_shape check (
    (quantity_basis = 'Meter' and meter_type is not null)
    or (quantity_basis <> 'Meter' and meter_type is null)
  )
);

comment on table public.property_services is
  'Danh mục phí của khu trọ (T40). fee_category tách doanh thu (Service) với thu hộ (PassThrough).';

create unique index if not exists uq_property_services_name
  on public.property_services (property_id, lower(btrim(name)))
  where deleted_at is null;

-- Mỗi khu tối đa 1 dịch vụ theo đồng hồ điện và 1 theo đồng hồ nước: chỉ số
-- (utility_readings) gắn theo (phòng, Electricity|Water), không gắn theo dịch vụ.
create unique index if not exists uq_property_services_meter
  on public.property_services (property_id, meter_type)
  where deleted_at is null and meter_type is not null;

create index if not exists idx_property_services_owner
  on public.property_services (owner_id)
  where deleted_at is null;

create table if not exists public.room_services (
  id                   uuid primary key default gen_random_uuid(),
  room_id              uuid not null references public.rooms(id) on delete cascade,
  service_id           uuid not null references public.property_services(id) on delete cascade,
  owner_id             uuid not null references auth.users(id) on delete cascade,
  unit_price_override  numeric check (unit_price_override is null or unit_price_override >= 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint uq_room_services_room_service unique (room_id, service_id)
);

comment on column public.room_services.unit_price_override is
  'Giá riêng của phòng cho dịch vụ này. NULL = dùng property_services.unit_price.';

create index if not exists idx_room_services_service on public.room_services (service_id);
create index if not exists idx_room_services_owner   on public.room_services (owner_id);

drop trigger if exists update_property_services_modtime on public.property_services;
create trigger update_property_services_modtime before update on public.property_services
  for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_room_services_modtime on public.room_services;
create trigger update_room_services_modtime before update on public.room_services
  for each row execute procedure public.update_updated_at_column();

-- BR-015: hết gói → READ_ONLY cũng chặn danh mục phí (hàng có owner_id).
drop trigger if exists guard_saas_write_property_services on public.property_services;
create trigger guard_saas_write_property_services
  before insert or update or delete on public.property_services
  for each row execute function public.guard_saas_workspace_write();

drop trigger if exists guard_saas_write_room_services on public.room_services;
create trigger guard_saas_write_room_services
  before insert or update or delete on public.room_services
  for each row execute function public.guard_saas_workspace_write();

-- ── 2. RLS: chỉ chủ khu đọc; mọi ghi đi qua RPC ─────────────────────────────
alter table public.property_services enable row level security;
alter table public.room_services     enable row level security;

drop policy if exists "Owner reads own property services" on public.property_services;
create policy "Owner reads own property services" on public.property_services
  for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Owner reads own room services" on public.room_services;
create policy "Owner reads own room services" on public.room_services
  for select to authenticated
  using (owner_id = auth.uid());

revoke insert, update, delete on public.property_services from anon, authenticated;
revoke insert, update, delete on public.room_services     from anon, authenticated;
revoke select on public.property_services from anon;
revoke select on public.room_services     from anon;
grant  select on public.property_services to authenticated;
grant  select on public.room_services     to authenticated;

-- ── 3. Đồng bộ cột giá cũ từ danh mục ───────────────────────────────────────
create or replace function public.sync_legacy_service_prices(p_property_id uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if p_property_id is null then return; end if;
  -- seed_default_property_services tạm tắt đồng bộ để không ghi đè giá riêng cũ
  -- của phòng trước khi kịp chép sang room_services; nó tự gọi lại ở cuối.
  if current_setting('tronhanh.skip_price_sync', true) = 'on' then return; end if;

  with live as (
    select * from public.property_services
     where property_id = p_property_id and deleted_at is null and is_active
  ), next as (
    select
      coalesce((select unit_price from live where meter_type = 'Electricity' limit 1), 0) as elec,
      coalesce((select unit_price from live where meter_type = 'Water'       limit 1), 0) as water,
      coalesce((select sum(unit_price) from live where quantity_basis = 'Fixed'), 0)       as fee
  )
  update public.properties p
     set electricity_unit_price = n.elec,
         water_unit_price       = n.water,
         service_fee            = n.fee
    from next n
   where p.id = p_property_id
     and (p.electricity_unit_price, p.water_unit_price, p.service_fee)
         is distinct from (n.elec, n.water, n.fee);

  with applied as (
    select rs.room_id, s.meter_type, s.quantity_basis,
           coalesce(rs.unit_price_override, s.unit_price) as price
      from public.room_services rs
      join public.property_services s on s.id = rs.service_id
     where s.property_id = p_property_id and s.deleted_at is null and s.is_active
  ), next as (
    select r.id,
           coalesce((select a.price from applied a where a.room_id = r.id and a.meter_type = 'Electricity' limit 1), 0) as elec,
           coalesce((select a.price from applied a where a.room_id = r.id and a.meter_type = 'Water'       limit 1), 0) as water,
           coalesce((select sum(a.price) from applied a where a.room_id = r.id and a.quantity_basis = 'Fixed'), 0)       as fee
      from public.rooms r
     where r.property_id = p_property_id and r.deleted_at is null
  )
  update public.rooms r
     set electricity_price = n.elec,
         water_price       = n.water,
         service_fee       = n.fee
    from next n
   where r.id = n.id
     and (r.electricity_price, r.water_price, r.service_fee)
         is distinct from (n.elec, n.water, n.fee);
end $$;

revoke all on function public.sync_legacy_service_prices(uuid) from public, anon, authenticated;

create or replace function public.trg_sync_prices_from_property_services()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_legacy_service_prices(coalesce(new.property_id, old.property_id));
  if tg_op = 'UPDATE' and new.property_id is distinct from old.property_id then
    perform public.sync_legacy_service_prices(old.property_id);
  end if;
  return null;
end $$;

revoke all on function public.trg_sync_prices_from_property_services() from public, anon, authenticated;

drop trigger if exists sync_prices_from_property_services on public.property_services;
create trigger sync_prices_from_property_services
  after insert or update or delete on public.property_services
  for each row execute function public.trg_sync_prices_from_property_services();

create or replace function public.trg_sync_prices_from_room_services()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_property uuid;
begin
  select property_id into v_property
    from public.rooms where id = coalesce(new.room_id, old.room_id);
  perform public.sync_legacy_service_prices(v_property);
  return null;
end $$;

revoke all on function public.trg_sync_prices_from_room_services() from public, anon, authenticated;

drop trigger if exists sync_prices_from_room_services on public.room_services;
create trigger sync_prices_from_room_services
  after insert or update or delete on public.room_services
  for each row execute function public.trg_sync_prices_from_room_services();

-- ── 4. Khu mới / phòng mới tự có dịch vụ mặc định ──────────────────────────
-- Dịch vụ mặc định dựng từ 3 cột giá cũ. Điện/nước để loại 'Service' (tính là
-- doanh thu) — an toàn khi kê khai; chủ trọ thu đúng giá gốc thì tự đổi sang
-- 'Thu hộ' ở trang Dịch vụ.
create or replace function public.seed_default_property_services(p_property_id uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_prop public.properties%rowtype;
  v_has_room_fee boolean;
begin
  select * into v_prop from public.properties where id = p_property_id;
  if v_prop.id is null then return; end if;
  if exists (select 1 from public.property_services where property_id = p_property_id) then
    return;   -- đã có danh mục (kể cả đã xóa) → không seed lại
  end if;

  perform set_config('tronhanh.skip_price_sync', 'on', true);

  insert into public.property_services
    (property_id, owner_id, name, unit, fee_category, quantity_basis, meter_type, unit_price, sort_order)
  values
    (v_prop.id, v_prop.owner_id, 'Tiền điện', 'kWh', 'Service', 'Meter', 'Electricity', coalesce(v_prop.electricity_unit_price, 0), 10),
    (v_prop.id, v_prop.owner_id, 'Tiền nước', 'm³',  'Service', 'Meter', 'Water',       coalesce(v_prop.water_unit_price, 0),       20);

  select exists (
    select 1 from public.rooms
     where property_id = p_property_id and deleted_at is null and coalesce(service_fee, 0) > 0
  ) into v_has_room_fee;

  if coalesce(v_prop.service_fee, 0) > 0 or v_has_room_fee then
    insert into public.property_services
      (property_id, owner_id, name, unit, fee_category, quantity_basis, unit_price, sort_order)
    values
      (v_prop.id, v_prop.owner_id, 'Phí dịch vụ', 'Tháng', 'Service', 'Fixed', coalesce(v_prop.service_fee, 0), 30);
  end if;

  -- Áp cho mọi phòng hiện có, giữ giá riêng cũ của phòng làm override.
  insert into public.room_services (room_id, service_id, owner_id, unit_price_override)
  select r.id, s.id, r.owner_id,
         case s.meter_type
           when 'Electricity' then r.electricity_price
           when 'Water'       then r.water_price
           else r.service_fee
         end
    from public.rooms r
    join public.property_services s on s.property_id = r.property_id and s.deleted_at is null
   where r.property_id = p_property_id and r.deleted_at is null
  on conflict (room_id, service_id) do nothing;

  perform set_config('tronhanh.skip_price_sync', 'off', true);
  perform public.sync_legacy_service_prices(p_property_id);
end $$;

revoke all on function public.seed_default_property_services(uuid) from public, anon, authenticated;

create or replace function public.trg_seed_services_for_new_property()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.seed_default_property_services(new.id);
  return null;
end $$;

revoke all on function public.trg_seed_services_for_new_property() from public, anon, authenticated;

drop trigger if exists seed_services_for_new_property on public.properties;
create trigger seed_services_for_new_property
  after insert on public.properties
  for each row execute function public.trg_seed_services_for_new_property();

create or replace function public.trg_apply_services_to_new_room()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.room_services (room_id, service_id, owner_id)
  select new.id, s.id, new.owner_id
    from public.property_services s
   where s.property_id = new.property_id
     and s.deleted_at is null and s.is_active and s.apply_to_new_rooms
  on conflict (room_id, service_id) do nothing;
  return null;
end $$;

revoke all on function public.trg_apply_services_to_new_room() from public, anon, authenticated;

drop trigger if exists apply_services_to_new_room on public.rooms;
create trigger apply_services_to_new_room
  after insert on public.rooms
  for each row execute function public.trg_apply_services_to_new_room();

-- Seed cho các khu đang có.
do $$
declare v_id uuid;
begin
  for v_id in select id from public.properties where deleted_at is null loop
    perform public.seed_default_property_services(v_id);
  end loop;
end $$;

-- ── 5. RPC ghi ──────────────────────────────────────────────────────────────
-- Tạo/sửa một dịch vụ + bộ phòng áp dụng, atomic. p_id null = tạo mới.
-- p_room_ids null = giữ nguyên bộ phòng (khi sửa) / áp mọi phòng (khi tạo mới).
create or replace function public.upsert_property_service(
  p_id                 uuid,
  p_property_id        uuid,
  p_name               text,
  p_unit               text,
  p_fee_category       text,
  p_quantity_basis     text,
  p_meter_type         text,
  p_unit_price         numeric,
  p_apply_to_new_rooms boolean,
  p_room_ids           uuid[]
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid      uuid;
  v_id       uuid;
  v_name     text := btrim(coalesce(p_name, ''));
  v_unit     text := btrim(coalesce(p_unit, ''));
  v_meter    text := case when p_quantity_basis = 'Meter' then p_meter_type else null end;
  v_property uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  if p_id is null then
    if not exists (select 1 from public.properties
                    where id = p_property_id and owner_id = v_uid and deleted_at is null) then
      raise exception 'PROPERTY_NOT_OWNED';
    end if;
    v_property := p_property_id;
  else
    select property_id into v_property
      from public.property_services
     where id = p_id and owner_id = v_uid and deleted_at is null
       for update;
    if v_property is null then raise exception 'SERVICE_NOT_FOUND'; end if;
  end if;

  if v_name = '' or char_length(v_name) > 80 then raise exception 'SERVICE_NAME_REQUIRED'; end if;
  if v_unit = '' or char_length(v_unit) > 20 then raise exception 'SERVICE_UNIT_REQUIRED'; end if;
  if p_fee_category not in ('Service', 'PassThrough') then raise exception 'INVALID_FEE_CATEGORY'; end if;
  if p_quantity_basis not in ('Meter', 'PerOccupant', 'Fixed') then raise exception 'INVALID_QUANTITY_BASIS'; end if;
  if p_quantity_basis = 'Meter' and coalesce(v_meter, '') not in ('Electricity', 'Water') then
    raise exception 'INVALID_METER_TYPE';
  end if;
  if p_unit_price is null or p_unit_price < 0 then raise exception 'INVALID_UNIT_PRICE'; end if;

  if p_room_ids is not null and exists (
    select 1 from unnest(p_room_ids) as x(room_id)
     where not exists (select 1 from public.rooms r
                        where r.id = x.room_id and r.property_id = v_property
                          and r.owner_id = v_uid and r.deleted_at is null)
  ) then
    raise exception 'ROOM_NOT_OWNED';
  end if;

  begin
    if p_id is null then
      insert into public.property_services
        (property_id, owner_id, name, unit, fee_category, quantity_basis, meter_type,
         unit_price, apply_to_new_rooms, sort_order)
      values
        (v_property, v_uid, v_name, v_unit, p_fee_category, p_quantity_basis, v_meter,
         p_unit_price, coalesce(p_apply_to_new_rooms, true),
         coalesce((select max(sort_order) + 10 from public.property_services where property_id = v_property), 10))
      returning id into v_id;
    else
      update public.property_services
         set name = v_name, unit = v_unit, fee_category = p_fee_category,
             quantity_basis = p_quantity_basis, meter_type = v_meter,
             unit_price = p_unit_price,
             apply_to_new_rooms = coalesce(p_apply_to_new_rooms, apply_to_new_rooms)
       where id = p_id
      returning id into v_id;
    end if;
  exception when unique_violation then
    if v_meter is not null and exists (
      select 1 from public.property_services
       where property_id = v_property and meter_type = v_meter and deleted_at is null
         and id is distinct from p_id
    ) then
      raise exception 'SERVICE_METER_EXISTS';
    end if;
    raise exception 'SERVICE_NAME_EXISTS';
  end;

  if p_room_ids is not null or p_id is null then
    delete from public.room_services
     where service_id = v_id
       and p_room_ids is not null
       and room_id <> all (p_room_ids);

    insert into public.room_services (room_id, service_id, owner_id)
    select r.id, v_id, v_uid
      from public.rooms r
     where r.property_id = v_property and r.deleted_at is null
       and (p_room_ids is null or r.id = any (p_room_ids))
    on conflict (room_id, service_id) do nothing;
  end if;

  return v_id;
end $$;

revoke execute on function public.upsert_property_service(uuid, uuid, text, text, text, text, text, numeric, boolean, uuid[]) from public, anon;
grant  execute on function public.upsert_property_service(uuid, uuid, text, text, text, text, text, numeric, boolean, uuid[]) to authenticated;

-- Xóa mềm: giữ hàng để hóa đơn/hợp đồng cũ còn tham chiếu được (T41/T43).
create or replace function public.delete_property_service(p_id uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  if not exists (select 1 from public.property_services
                  where id = p_id and owner_id = v_uid and deleted_at is null) then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  delete from public.room_services where service_id = p_id;
  update public.property_services
     set deleted_at = now(), is_active = false
   where id = p_id;
end $$;

revoke execute on function public.delete_property_service(uuid) from public, anon;
grant  execute on function public.delete_property_service(uuid) to authenticated;

-- Dịch vụ áp cho MỘT phòng + giá riêng (dùng ở "Sửa phòng"), atomic.
-- p_items: [{ "service_id": uuid, "applied": bool, "unit_price_override": number|null }]
create or replace function public.set_room_services(p_room_id uuid, p_items jsonb)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid      uuid;
  v_property uuid;
  v_item     jsonb;
  v_service  uuid;
  v_override numeric;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select property_id into v_property
    from public.rooms
   where id = p_room_id and owner_id = v_uid and deleted_at is null;
  if v_property is null then raise exception 'ROOM_NOT_OWNED'; end if;

  if jsonb_typeof(coalesce(p_items, 'null'::jsonb)) <> 'array' then
    raise exception 'INVALID_ROOM_SERVICES';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_service := (v_item ->> 'service_id')::uuid;
    if not exists (select 1 from public.property_services
                    where id = v_service and property_id = v_property
                      and owner_id = v_uid and deleted_at is null) then
      raise exception 'SERVICE_NOT_FOUND';
    end if;

    if coalesce((v_item ->> 'applied')::boolean, false) then
      v_override := nullif(v_item ->> 'unit_price_override', '')::numeric;
      if v_override is not null and v_override < 0 then raise exception 'INVALID_UNIT_PRICE'; end if;
      insert into public.room_services (room_id, service_id, owner_id, unit_price_override)
      values (p_room_id, v_service, v_uid, v_override)
      on conflict (room_id, service_id) do update
        set unit_price_override = excluded.unit_price_override;
    else
      delete from public.room_services where room_id = p_room_id and service_id = v_service;
    end if;
  end loop;
end $$;

revoke execute on function public.set_room_services(uuid, jsonb) from public, anon;
grant  execute on function public.set_room_services(uuid, jsonb) to authenticated;

-- ── 6. Đọc giá đang áp của phòng: từ danh mục ──────────────────────────────
-- Giữ nguyên chữ ký (form hóa đơn cũ dùng). *_is_override = phòng có giá riêng.
create or replace function public.get_room_effective_prices(p_room_id uuid)
returns table (
  electricity_price       numeric,
  water_price             numeric,
  service_fee             numeric,
  electricity_is_override boolean,
  water_is_override       boolean,
  service_is_override     boolean
)
language sql stable security definer set search_path = public as $$
  with room as (
    select r.id from public.rooms r
     where r.id = p_room_id and r.deleted_at is null and r.owner_id = auth.uid()
  ), applied as (
    select s.meter_type, s.quantity_basis, rs.unit_price_override,
           coalesce(rs.unit_price_override, s.unit_price) as price
      from public.room_services rs
      join public.property_services s on s.id = rs.service_id
     where rs.room_id = p_room_id and s.deleted_at is null and s.is_active
  )
  select
    coalesce((select price from applied where meter_type = 'Electricity' limit 1), 0),
    coalesce((select price from applied where meter_type = 'Water' limit 1), 0),
    (select sum(price) from applied where quantity_basis = 'Fixed'),
    coalesce((select unit_price_override is not null from applied where meter_type = 'Electricity' limit 1), false),
    coalesce((select unit_price_override is not null from applied where meter_type = 'Water' limit 1), false),
    coalesce((select bool_or(unit_price_override is not null) from applied where quantity_basis = 'Fixed'), false)
  from room;
$$;

revoke execute on function public.get_room_effective_prices(uuid) from public, anon;
grant  execute on function public.get_room_effective_prices(uuid) to authenticated;

-- ── 7. update_room: không còn ghi giá (giá đi theo danh mục) ────────────────
-- Giữ nguyên chữ ký để client cũ không vỡ; 3 tham số giá bị BỎ QUA.
create or replace function public.update_room(
  p_room_id           uuid,
  p_room_code         text,
  p_area              numeric,
  p_price             numeric,
  p_floor             integer,
  p_status            text,
  p_description       text,
  p_electricity_price numeric,
  p_water_price       numeric,
  p_service_fee       numeric
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid         uuid;
  v_owner       uuid;
  v_old_status  text;
  v_code        text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select owner_id, status into v_owner, v_old_status
    from public.rooms
   where id = p_room_id and deleted_at is null
     for update;

  if v_owner is null  then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_owner <> v_uid then raise exception 'ROOM_NOT_OWNED'; end if;

  v_code := btrim(coalesce(p_room_code, ''));
  if v_code = '' then raise exception 'ROOM_CODE_REQUIRED'; end if;
  if p_area is null  or p_area  <= 0 then raise exception 'INVALID_ROOM_AREA';  end if;
  if p_price is null or p_price <= 0 then raise exception 'INVALID_ROOM_PRICE'; end if;
  if p_status not in ('Available', 'Deposited', 'Rented', 'Hidden') then
    raise exception 'INVALID_ROOM_STATUS';
  end if;

  update public.rooms
     set room_code   = v_code,
         area        = p_area,
         price       = p_price,
         floor       = coalesce(p_floor, floor),
         status      = p_status,
         description = nullif(btrim(coalesce(p_description, '')), ''),
         updated_at  = now()
   where id = p_room_id;

  -- BR-027 — chỉ khi phòng THỰC SỰ chuyển sang Rented.
  if p_status = 'Rented' and v_old_status is distinct from 'Rented' then
    update public.rental_listings
       set status     = 'Rented',
           updated_at = now()
     where room_id = p_room_id
       and status in ('Active', 'PendingApproval')
       and deleted_at is null;
  end if;
end $$;

revoke execute on function public.update_room(uuid, text, numeric, numeric, integer, text, text, numeric, numeric, numeric) from public, anon;
grant  execute on function public.update_room(uuid, text, numeric, numeric, integer, text, text, numeric, numeric, numeric) to authenticated;

-- ── 8. Client không ghi cột giá cũ của khu nữa ─────────────────────────────
revoke insert, update on public.properties from anon, authenticated;
grant insert (
  name, address, district, province_code, ward_code, floor_count,
  bank_name, bank_account_number, bank_account_name,
  electricity_unit_price, water_unit_price, service_fee
) on public.properties to authenticated;   -- insert vẫn nhận để seed dịch vụ mặc định
grant update (
  name, address, district, province_code, ward_code, floor_count,
  bank_name, bank_account_number, bank_account_name
) on public.properties to authenticated;
