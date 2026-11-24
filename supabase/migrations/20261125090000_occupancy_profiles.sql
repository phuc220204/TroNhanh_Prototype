-- ═══════════════════════════════════════════════════════════════════════════
-- T42 — Hồ sơ người ở (giấy tờ, tạm trú), xe, thông tin chủ trọ (Bên A)
--
-- VÌ SAO: hợp đồng in (T43) và tờ khai tạm trú CT01 (T44) cần ngày sinh, số
-- CCCD/hộ chiếu, nơi cấp, thường trú… của người ở và của chủ trọ; "Giữ xe"
-- cần tính theo số xe thật của phòng.
--
-- ── VÌ SAO BẢNG RIÊNG, KHÔNG THÊM CỘT VÀO `occupancies` ─────────────────────
-- `occupancies` bị `select *` / embed ở nhiều màn (danh sách phòng, người ở,
-- "Phòng của tôi"). Số giấy tờ tùy thân là dữ liệu cá nhân nhạy cảm: để ở bảng
-- 1–1 `occupancy_profiles` thì chỉ màn hồ sơ mới đọc tới, và policy viết riêng.
--
-- ── QUYỀN ĐỌC ───────────────────────────────────────────────────────────────
--   chủ trọ: mọi hàng của mình (owner_id)
--   người ở đã liên kết & xác nhận (BR-029): CHỈ hồ sơ/xe của chính mình
--     → helper có sẵn `is_linked_occupant(occupancy_id)` (security definer).
--   Người ở ghép KHÔNG đọc được giấy tờ của nhau.
-- Mọi ghi đi qua RPC; owner_id derive server-side.
--
-- Ảnh CCCD (mặt trước/sau): chưa làm — cần bucket riêng tư + signed URL.
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. occupancy_profiles ───────────────────────────────────────────────────
create table if not exists public.occupancy_profiles (
  occupancy_id              uuid primary key references public.occupancies(id) on delete cascade,
  owner_id                  uuid not null references auth.users(id) on delete cascade,
  date_of_birth             date,
  gender                    text check (gender in ('Male', 'Female', 'Other')),
  id_document_type          text not null default 'CCCD' check (id_document_type in ('CCCD', 'Passport')),
  id_number                 text check (id_number is null or id_number ~ '^[A-Za-z0-9]{6,20}$'),
  id_issue_date             date,
  id_issue_place            text check (id_issue_place is null or char_length(id_issue_place) <= 120),
  permanent_address         text check (permanent_address is null or char_length(permanent_address) <= 255),
  occupation                text check (occupation is null or char_length(occupation) <= 80),
  relation_to_primary       text check (relation_to_primary is null or char_length(relation_to_primary) <= 40),
  is_room_contact           boolean not null default false,
  temp_residence_registered boolean not null default false,
  temp_residence_from       date,
  temp_residence_to         date,
  is_info_verified          boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint occupancy_profiles_temp_range check (
    temp_residence_from is null or temp_residence_to is null or temp_residence_from <= temp_residence_to
  )
);

comment on table public.occupancy_profiles is
  'T42 — giấy tờ & tạm trú của người ở (1–1 occupancies). Dữ liệu cá nhân nhạy cảm: chỉ chủ trọ và chính người ở đã liên kết đọc được.';

create index if not exists idx_occupancy_profiles_owner on public.occupancy_profiles (owner_id);

-- ── 2. occupancy_vehicles ───────────────────────────────────────────────────
create table if not exists public.occupancy_vehicles (
  id            uuid primary key default gen_random_uuid(),
  occupancy_id  uuid not null references public.occupancies(id) on delete cascade,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  vehicle_type  text not null check (vehicle_type in ('Motorbike', 'EBike', 'Bicycle', 'Car')),
  name          text check (name is null or char_length(name) <= 60),
  plate_number  text check (plate_number is null or char_length(plate_number) <= 20),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_occupancy_vehicles_occupancy on public.occupancy_vehicles (occupancy_id);
create index if not exists idx_occupancy_vehicles_owner     on public.occupancy_vehicles (owner_id);

-- ── 3. landlord_legal_profiles (Bên A) ──────────────────────────────────────
create table if not exists public.landlord_legal_profiles (
  owner_id          uuid primary key references auth.users(id) on delete cascade,
  full_name         text not null check (char_length(btrim(full_name)) between 1 and 80),
  date_of_birth     date,
  id_number         text check (id_number is null or id_number ~ '^[A-Za-z0-9]{6,20}$'),
  id_issue_date     date,
  id_issue_place    text check (id_issue_place is null or char_length(id_issue_place) <= 120),
  permanent_address text check (permanent_address is null or char_length(permanent_address) <= 255),
  phone             text check (phone is null or char_length(phone) <= 20),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── 4. Trigger chung ────────────────────────────────────────────────────────
drop trigger if exists update_occupancy_profiles_modtime on public.occupancy_profiles;
create trigger update_occupancy_profiles_modtime before update on public.occupancy_profiles
  for each row execute procedure public.update_updated_at_column();
drop trigger if exists update_occupancy_vehicles_modtime on public.occupancy_vehicles;
create trigger update_occupancy_vehicles_modtime before update on public.occupancy_vehicles
  for each row execute procedure public.update_updated_at_column();
drop trigger if exists update_landlord_legal_profiles_modtime on public.landlord_legal_profiles;
create trigger update_landlord_legal_profiles_modtime before update on public.landlord_legal_profiles
  for each row execute procedure public.update_updated_at_column();

-- BR-015: hết gói → chỉ đọc.
drop trigger if exists guard_saas_write_occupancy_profiles on public.occupancy_profiles;
create trigger guard_saas_write_occupancy_profiles before insert or update or delete on public.occupancy_profiles
  for each row execute function public.guard_saas_workspace_write();
drop trigger if exists guard_saas_write_occupancy_vehicles on public.occupancy_vehicles;
create trigger guard_saas_write_occupancy_vehicles before insert or update or delete on public.occupancy_vehicles
  for each row execute function public.guard_saas_workspace_write();
drop trigger if exists guard_saas_write_landlord_legal_profiles on public.landlord_legal_profiles;
create trigger guard_saas_write_landlord_legal_profiles before insert or update or delete on public.landlord_legal_profiles
  for each row execute function public.guard_saas_workspace_write();

-- ── 5. RLS ──────────────────────────────────────────────────────────────────
alter table public.occupancy_profiles      enable row level security;
alter table public.occupancy_vehicles      enable row level security;
alter table public.landlord_legal_profiles enable row level security;

drop policy if exists "Owner reads occupancy profiles" on public.occupancy_profiles;
create policy "Owner reads occupancy profiles" on public.occupancy_profiles
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "Linked occupant reads own profile" on public.occupancy_profiles;
create policy "Linked occupant reads own profile" on public.occupancy_profiles
  for select to authenticated using (public.is_linked_occupant(occupancy_id));

drop policy if exists "Owner reads occupancy vehicles" on public.occupancy_vehicles;
create policy "Owner reads occupancy vehicles" on public.occupancy_vehicles
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "Linked occupant reads own vehicles" on public.occupancy_vehicles;
create policy "Linked occupant reads own vehicles" on public.occupancy_vehicles
  for select to authenticated using (public.is_linked_occupant(occupancy_id));

drop policy if exists "Owner reads own legal profile" on public.landlord_legal_profiles;
create policy "Owner reads own legal profile" on public.landlord_legal_profiles
  for select to authenticated using (owner_id = auth.uid());

revoke all on public.occupancy_profiles, public.occupancy_vehicles, public.landlord_legal_profiles from anon;
revoke insert, update, delete on public.occupancy_profiles, public.occupancy_vehicles, public.landlord_legal_profiles from authenticated;
grant select on public.occupancy_profiles, public.occupancy_vehicles, public.landlord_legal_profiles to authenticated;

-- ── 6. RPC: lưu hồ sơ + xe của một người ở (atomic) ─────────────────────────
-- p_profile:  { date_of_birth, gender, id_document_type, id_number, id_issue_date, id_issue_place,
--               permanent_address, occupation, relation_to_primary, is_room_contact,
--               temp_residence_registered, temp_residence_from, temp_residence_to, is_info_verified }
-- p_vehicles: [{ vehicle_type, name, plate_number }]  — THAY toàn bộ danh sách xe.
create or replace function public.save_occupancy_profile(
  p_occupancy_id uuid,
  p_profile      jsonb,
  p_vehicles     jsonb
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid      uuid;
  v_vehicle  jsonb;
  v_id_type  text;
  v_id_num   text;
  v_from     date;
  v_to       date;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  if not exists (select 1 from public.occupancies
                  where id = p_occupancy_id and owner_id = v_uid and deleted_at is null) then
    raise exception 'OCCUPANCY_NOT_OWNED';
  end if;
  if jsonb_typeof(coalesce(p_profile, 'null'::jsonb)) <> 'object' then raise exception 'INVALID_OCCUPANCY_PROFILE'; end if;
  if jsonb_typeof(coalesce(p_vehicles, '[]'::jsonb)) <> 'array' then raise exception 'INVALID_VEHICLES'; end if;
  if jsonb_array_length(coalesce(p_vehicles, '[]'::jsonb)) > 10 then raise exception 'TOO_MANY_VEHICLES'; end if;

  v_id_type := coalesce(nullif(p_profile ->> 'id_document_type', ''), 'CCCD');
  v_id_num  := nullif(regexp_replace(coalesce(p_profile ->> 'id_number', ''), '\s', '', 'g'), '');
  if v_id_type not in ('CCCD', 'Passport') then raise exception 'INVALID_ID_DOCUMENT_TYPE'; end if;
  -- CCCD: đúng 12 chữ số. Hộ chiếu: 6–20 chữ/số.
  if v_id_num is not null and v_id_type = 'CCCD' and v_id_num !~ '^\d{12}$' then raise exception 'INVALID_CCCD_NUMBER'; end if;
  if v_id_num is not null and v_id_type = 'Passport' and v_id_num !~ '^[A-Za-z0-9]{6,20}$' then raise exception 'INVALID_PASSPORT_NUMBER'; end if;

  v_from := nullif(p_profile ->> 'temp_residence_from', '')::date;
  v_to   := nullif(p_profile ->> 'temp_residence_to', '')::date;
  if v_from is not null and v_to is not null and v_from > v_to then raise exception 'INVALID_TEMP_RESIDENCE_RANGE'; end if;
  if nullif(p_profile ->> 'date_of_birth', '')::date > current_date then raise exception 'INVALID_DATE_OF_BIRTH'; end if;

  insert into public.occupancy_profiles as op (
    occupancy_id, owner_id, date_of_birth, gender, id_document_type, id_number, id_issue_date,
    id_issue_place, permanent_address, occupation, relation_to_primary, is_room_contact,
    temp_residence_registered, temp_residence_from, temp_residence_to, is_info_verified
  ) values (
    p_occupancy_id, v_uid,
    nullif(p_profile ->> 'date_of_birth', '')::date,
    nullif(p_profile ->> 'gender', ''),
    v_id_type, upper(v_id_num),
    nullif(p_profile ->> 'id_issue_date', '')::date,
    nullif(btrim(coalesce(p_profile ->> 'id_issue_place', '')), ''),
    nullif(btrim(coalesce(p_profile ->> 'permanent_address', '')), ''),
    nullif(btrim(coalesce(p_profile ->> 'occupation', '')), ''),
    nullif(btrim(coalesce(p_profile ->> 'relation_to_primary', '')), ''),
    coalesce((p_profile ->> 'is_room_contact')::boolean, false),
    coalesce((p_profile ->> 'temp_residence_registered')::boolean, false),
    v_from, v_to,
    coalesce((p_profile ->> 'is_info_verified')::boolean, false)
  )
  on conflict (occupancy_id) do update set
    date_of_birth = excluded.date_of_birth, gender = excluded.gender,
    id_document_type = excluded.id_document_type, id_number = excluded.id_number,
    id_issue_date = excluded.id_issue_date, id_issue_place = excluded.id_issue_place,
    permanent_address = excluded.permanent_address, occupation = excluded.occupation,
    relation_to_primary = excluded.relation_to_primary, is_room_contact = excluded.is_room_contact,
    temp_residence_registered = excluded.temp_residence_registered,
    temp_residence_from = excluded.temp_residence_from, temp_residence_to = excluded.temp_residence_to,
    is_info_verified = excluded.is_info_verified;

  delete from public.occupancy_vehicles where occupancy_id = p_occupancy_id;
  for v_vehicle in select * from jsonb_array_elements(coalesce(p_vehicles, '[]'::jsonb)) loop
    if coalesce(v_vehicle ->> 'vehicle_type', '') not in ('Motorbike', 'EBike', 'Bicycle', 'Car') then
      raise exception 'INVALID_VEHICLE_TYPE';
    end if;
    insert into public.occupancy_vehicles (occupancy_id, owner_id, vehicle_type, name, plate_number)
    values (
      p_occupancy_id, v_uid, v_vehicle ->> 'vehicle_type',
      nullif(btrim(coalesce(v_vehicle ->> 'name', '')), ''),
      nullif(upper(btrim(coalesce(v_vehicle ->> 'plate_number', ''))), '')
    );
  end loop;
end $$;

revoke execute on function public.save_occupancy_profile(uuid, jsonb, jsonb) from public, anon;
grant  execute on function public.save_occupancy_profile(uuid, jsonb, jsonb) to authenticated;

-- ── 7. RPC: Bên A ───────────────────────────────────────────────────────────
create or replace function public.upsert_landlord_legal_profile(p_profile jsonb)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid    uuid;
  v_name   text := btrim(coalesce(p_profile ->> 'full_name', ''));
  v_id_num text := nullif(regexp_replace(coalesce(p_profile ->> 'id_number', ''), '\s', '', 'g'), '');
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if jsonb_typeof(coalesce(p_profile, 'null'::jsonb)) <> 'object' then raise exception 'INVALID_LANDLORD_PROFILE'; end if;
  if v_name = '' or char_length(v_name) > 80 then raise exception 'LANDLORD_NAME_REQUIRED'; end if;
  if v_id_num is not null and v_id_num !~ '^[A-Za-z0-9]{6,20}$' then raise exception 'INVALID_CCCD_NUMBER'; end if;

  insert into public.landlord_legal_profiles as lp
    (owner_id, full_name, date_of_birth, id_number, id_issue_date, id_issue_place, permanent_address, phone)
  values (
    v_uid, v_name,
    nullif(p_profile ->> 'date_of_birth', '')::date,
    upper(v_id_num),
    nullif(p_profile ->> 'id_issue_date', '')::date,
    nullif(btrim(coalesce(p_profile ->> 'id_issue_place', '')), ''),
    nullif(btrim(coalesce(p_profile ->> 'permanent_address', '')), ''),
    nullif(btrim(coalesce(p_profile ->> 'phone', '')), '')
  )
  on conflict (owner_id) do update set
    full_name = excluded.full_name, date_of_birth = excluded.date_of_birth,
    id_number = excluded.id_number, id_issue_date = excluded.id_issue_date,
    id_issue_place = excluded.id_issue_place, permanent_address = excluded.permanent_address,
    phone = excluded.phone;
end $$;

revoke execute on function public.upsert_landlord_legal_profile(jsonb) from public, anon;
grant  execute on function public.upsert_landlord_legal_profile(jsonb) to authenticated;

-- ── 8. Dịch vụ "theo số xe" (Giữ xe) ────────────────────────────────────────
alter table public.property_services drop constraint if exists property_services_quantity_basis_check;
alter table public.property_services add constraint property_services_quantity_basis_check
  check (quantity_basis in ('Meter', 'PerOccupant', 'PerVehicle', 'Fixed'));

-- upsert_property_service: như T40, chỉ thêm PerVehicle vào danh sách hợp lệ.
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
  if p_quantity_basis not in ('Meter', 'PerOccupant', 'PerVehicle', 'Fixed') then raise exception 'INVALID_QUANTITY_BASIS'; end if;
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
