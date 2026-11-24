-- ═══════════════════════════════════════════════════════════════════════════
-- T43 — Điều khoản hợp đồng + chụp danh sách dịch vụ lúc ký (để in hợp đồng)
--
-- 1. `contracts` thêm: ngày thu tiền hàng tháng, chu kỳ thu (tháng), điều khoản bổ sung.
-- 2. `contract_services`: bản chụp dịch vụ + đơn giá TẠI THỜI ĐIỂM KÝ. Hợp đồng
--    in ra phải ghi đúng giá đã thỏa thuận, kể cả khi sau này chủ trọ đổi giá ở
--    tab Dịch vụ. Chụp bằng TRIGGER sau khi thêm hợp đồng ⇒ mọi đường tạo hợp đồng
--    đều có, không phụ thuộc client. Hợp đồng cũ: backfill từ giá đang áp.
--    ⚠️ Hóa đơn (create_invoice_v2) VẪN tính theo giá đang áp của phòng — bản
--    chụp chỉ dùng để in hợp đồng. Đổi điều đó là quyết định nghiệp vụ riêng.
-- 3. `create_occupancy_with_contract` nhận thêm 3 trường điều khoản (giữ nguyên
--    chữ ký và mọi kiểm tra cũ); RPC mới `update_contract_terms` để sửa sau.
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.contracts
  add column if not exists payment_day          smallint,
  add column if not exists billing_cycle_months smallint not null default 1,
  add column if not exists extra_terms          text;

alter table public.contracts drop constraint if exists contracts_payment_day_check;
alter table public.contracts add constraint contracts_payment_day_check
  check (payment_day is null or payment_day between 1 and 31);
alter table public.contracts drop constraint if exists contracts_billing_cycle_check;
alter table public.contracts add constraint contracts_billing_cycle_check
  check (billing_cycle_months between 1 and 12);
alter table public.contracts drop constraint if exists contracts_extra_terms_length;
alter table public.contracts add constraint contracts_extra_terms_length
  check (extra_terms is null or char_length(extra_terms) <= 4000);

-- ── contract_services ───────────────────────────────────────────────────────
create table if not exists public.contract_services (
  id             uuid primary key default gen_random_uuid(),
  contract_id    uuid not null references public.contracts(id) on delete cascade,
  service_id     uuid references public.property_services(id) on delete set null,
  owner_id       uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  unit           text not null,
  fee_category   text not null check (fee_category in ('Service', 'PassThrough')),
  quantity_basis text not null check (quantity_basis in ('Meter', 'PerOccupant', 'PerVehicle', 'Fixed')),
  meter_type     text check (meter_type in ('Electricity', 'Water')),
  unit_price     numeric not null check (unit_price >= 0),
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint uq_contract_services unique (contract_id, service_id)
);

create index if not exists idx_contract_services_contract on public.contract_services (contract_id);
create index if not exists idx_contract_services_owner    on public.contract_services (owner_id);

drop trigger if exists update_contract_services_modtime on public.contract_services;
create trigger update_contract_services_modtime before update on public.contract_services
  for each row execute procedure public.update_updated_at_column();
drop trigger if exists guard_saas_write_contract_services on public.contract_services;
create trigger guard_saas_write_contract_services before insert or update or delete on public.contract_services
  for each row execute function public.guard_saas_workspace_write();

alter table public.contract_services enable row level security;
drop policy if exists "Owner reads contract services" on public.contract_services;
create policy "Owner reads contract services" on public.contract_services
  for select to authenticated using (owner_id = auth.uid());
revoke all on public.contract_services from anon;
revoke insert, update, delete on public.contract_services from authenticated;
grant select on public.contract_services to authenticated;

-- Chụp dịch vụ đang áp của phòng vào một hợp đồng (không ghi đè bản đã có).
create or replace function public.snapshot_contract_services(p_contract_id uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  insert into public.contract_services
    (contract_id, service_id, owner_id, name, unit, fee_category, quantity_basis, meter_type, unit_price, sort_order)
  select c.id, s.id, c.owner_id, s.name, s.unit, s.fee_category, s.quantity_basis, s.meter_type,
         coalesce(rs.unit_price_override, s.unit_price), s.sort_order
    from public.contracts c
    join public.room_services rs on rs.room_id = c.room_id
    join public.property_services s on s.id = rs.service_id and s.deleted_at is null and s.is_active
   where c.id = p_contract_id
  on conflict (contract_id, service_id) do nothing;
end $$;

revoke all on function public.snapshot_contract_services(uuid) from public, anon, authenticated;

create or replace function public.trg_snapshot_contract_services()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.snapshot_contract_services(new.id);
  return null;
end $$;

revoke all on function public.trg_snapshot_contract_services() from public, anon, authenticated;

drop trigger if exists snapshot_contract_services on public.contracts;
create trigger snapshot_contract_services
  after insert on public.contracts
  for each row execute function public.trg_snapshot_contract_services();

-- Backfill hợp đồng còn hiệu lực (giá đang áp — gần nhất với thỏa thuận ta có).
do $$
declare v_id uuid;
begin
  for v_id in select id from public.contracts where deleted_at is null and status in ('Active', 'Draft') loop
    perform public.snapshot_contract_services(v_id);
  end loop;
end $$;

-- ── create_occupancy_with_contract: + payment_day / billing_cycle_months / extra_terms ──
-- Thân hàm giữ nguyên bản 20260725101000, chỉ thêm 3 cột ở INSERT contracts.
create or replace function public.create_occupancy_with_contract(
  p_room_id   uuid,
  p_occupant  jsonb,
  p_contract  jsonb
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid          uuid;
  v_owner        uuid;
  v_occupancy_id uuid;
  v_contract_id  uuid;
  v_start        date;
  v_end          date;
  v_link_user    uuid;
  v_payment_day  smallint;
  v_cycle        smallint;
  v_terms        text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select owner_id into v_owner from public.rooms
    where id = p_room_id and deleted_at is null for update;
  if v_owner is null      then raise exception 'ROOM_NOT_OWNED'; end if;
  if v_owner <> v_uid     then raise exception 'ROOM_NOT_OWNED'; end if;

  v_start := (p_contract ->> 'start_date')::date;
  v_end   := (p_contract ->> 'end_date')::date;
  if v_end <= v_start then raise exception 'INVALID_CONTRACT_PERIOD'; end if;

  v_payment_day := nullif(p_contract ->> 'payment_day', '')::smallint;
  v_cycle       := coalesce(nullif(p_contract ->> 'billing_cycle_months', '')::smallint, 1);
  v_terms       := nullif(btrim(coalesce(p_contract ->> 'extra_terms', '')), '');
  if v_payment_day is not null and (v_payment_day < 1 or v_payment_day > 31) then raise exception 'INVALID_PAYMENT_DAY'; end if;
  if v_cycle < 1 or v_cycle > 12 then raise exception 'INVALID_BILLING_CYCLE'; end if;
  if v_terms is not null and char_length(v_terms) > 4000 then raise exception 'CONTRACT_TERMS_TOO_LONG'; end if;

  -- BR-006: không 2 hợp đồng Active chồng thời gian trên cùng phòng
  if exists (
    select 1 from public.contracts
    where room_id = p_room_id and status = 'Active' and deleted_at is null
      and (start_date, end_date) overlaps (v_start, v_end)
  ) then raise exception 'ROOM_HAS_ACTIVE_CONTRACT'; end if;

  v_link_user := nullif(p_occupant ->> 'user_id', '')::uuid;

  insert into public.occupancies (
    room_id, owner_id, user_id, full_name, phone_number,
    start_date, end_date, occupant_count, is_active, link_status
  ) values (
    p_room_id,
    v_uid,
    v_link_user,
    p_occupant ->> 'full_name',
    p_occupant ->> 'phone_number',
    v_start,
    nullif(p_occupant ->> 'end_date', '')::date,
    coalesce((p_occupant ->> 'occupant_count')::integer, 1),
    true,
    -- BR-029: KHÔNG BAO GIỜ tự động 'Confirmed'.
    case when v_link_user is not null then 'Pending' else null end
  ) returning id into v_occupancy_id;

  insert into public.contracts (
    room_id, occupancy_id, owner_id, start_date, end_date, rent_price, deposit, status,
    payment_day, billing_cycle_months, extra_terms
  ) values (
    p_room_id, v_occupancy_id, v_uid, v_start, v_end,
    (p_contract ->> 'rent_price')::numeric,
    coalesce((p_contract ->> 'deposit')::numeric, 0),
    'Active',
    v_payment_day, v_cycle, v_terms
  ) returning id into v_contract_id;

  update public.rooms set status = 'Rented' where id = p_room_id;

  -- BR-027: tin đăng liên kết chuyển sang Đã cho thuê.
  update public.rental_listings set status = 'Rented'
    where room_id = p_room_id and status in ('Active', 'PendingApproval') and deleted_at is null;

  return jsonb_build_object('occupancy_id', v_occupancy_id, 'contract_id', v_contract_id);
end $$;

revoke execute on function public.create_occupancy_with_contract(uuid, jsonb, jsonb) from public, anon;
grant  execute on function public.create_occupancy_with_contract(uuid, jsonb, jsonb) to authenticated;

-- ── update_contract_terms ───────────────────────────────────────────────────
create or replace function public.update_contract_terms(
  p_contract_id          uuid,
  p_payment_day          smallint,
  p_billing_cycle_months smallint,
  p_extra_terms          text
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid   uuid;
  v_terms text := nullif(btrim(coalesce(p_extra_terms, '')), '');
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  if not exists (select 1 from public.contracts
                  where id = p_contract_id and owner_id = v_uid and deleted_at is null) then
    raise exception 'CONTRACT_NOT_OWNED';
  end if;
  if p_payment_day is not null and (p_payment_day < 1 or p_payment_day > 31) then raise exception 'INVALID_PAYMENT_DAY'; end if;
  if coalesce(p_billing_cycle_months, 1) < 1 or coalesce(p_billing_cycle_months, 1) > 12 then raise exception 'INVALID_BILLING_CYCLE'; end if;
  if v_terms is not null and char_length(v_terms) > 4000 then raise exception 'CONTRACT_TERMS_TOO_LONG'; end if;

  update public.contracts
     set payment_day = p_payment_day,
         billing_cycle_months = coalesce(p_billing_cycle_months, 1),
         extra_terms = v_terms,
         updated_at = now()
   where id = p_contract_id;
end $$;

revoke execute on function public.update_contract_terms(uuid, smallint, smallint, text) from public, anon;
grant  execute on function public.update_contract_terms(uuid, smallint, smallint, text) to authenticated;
