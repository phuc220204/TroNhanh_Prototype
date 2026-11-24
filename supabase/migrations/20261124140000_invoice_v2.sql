-- ═══════════════════════════════════════════════════════════════════════════
-- T41 — Hóa đơn v2: tách nhóm khoản thu, kỳ từ–đến, cộng thêm/giảm trừ, ghi chú
--
-- VÌ SAO: hóa đơn cũ chỉ có tối đa 4 dòng cố định (nhà/điện/nước/dịch vụ), số
-- tiền do client gửi lên, không có giảm trừ, không ghi chú, không biết khoản nào
-- là doanh thu của chủ trọ, khoản nào là thu hộ (T40).
--
-- ── invoice_items.fee_category ───────────────────────────────────────────────
--   'Rent' · 'Service' (doanh thu) · 'PassThrough' (thu hộ) · 'Adjustment' (±)
-- Hóa đơn cũ được backfill theo `type`. Trigger `fill_invoice_item_fee_category`
-- tự điền cho dòng tạo bằng RPC cũ `create_invoice_with_items` — RPC đó CÒN GIỮ
-- trên DB vì frontend đang deploy vẫn gọi nó; drop ở migration dọn dẹp sau khi
-- frontend mới lên (xem docs/cp4/tasks/T41_invoice_v2.md).
--
-- ── create_invoice_v2: mọi con số derive ở server ───────────────────────────
--   - Tiền phòng = rent_price × (số tháng đủ + số ngày lẻ / 30) trên khoảng
--     [billing_from, billing_to] (tính cả hai đầu). Hợp đồng Active derive server.
--   - Dịch vụ: đơn giá = giá riêng phòng ?? giá khu (room_services/property_services).
--     'Meter' → số lượng & đơn giá lấy từ utility_readings của kỳ (đơn giá đã
--     snapshot lúc ghi chỉ số); client không gửi được số điện.
--   - Cộng thêm / giảm trừ: chủ trọ tự nhập, bắt buộc lý do, được âm; tổng ≥ 0.
--   - total_amount = Σ amount. Client không gửi giá, không gửi tổng.
--
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Cột mới ──────────────────────────────────────────────────────────────
alter table public.invoices
  add column if not exists billing_from date,
  add column if not exists billing_to   date,
  add column if not exists note         text;

alter table public.invoices drop constraint if exists invoices_note_length;
alter table public.invoices add constraint invoices_note_length
  check (note is null or char_length(note) <= 255);

alter table public.invoices drop constraint if exists invoices_billing_range;
alter table public.invoices add constraint invoices_billing_range
  check (billing_from is null or billing_to is null or billing_from <= billing_to);

alter table public.invoice_items
  add column if not exists fee_category text,
  add column if not exists service_id   uuid references public.property_services(id) on delete set null,
  add column if not exists unit         text,
  add column if not exists meta         jsonb;

-- Backfill hóa đơn cũ. Điện/nước/dịch vụ cũ coi là doanh thu (cùng quy ước seed T40).
update public.invoice_items
   set fee_category = case type
                        when 'Rent'  then 'Rent'
                        when 'Other' then 'Adjustment'
                        else 'Service'
                      end
 where fee_category is null;

create or replace function public.fill_invoice_item_fee_category()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.fee_category is null then
    new.fee_category := case new.type
                          when 'Rent'  then 'Rent'
                          when 'Other' then 'Adjustment'
                          else 'Service'
                        end;
  end if;
  return new;
end $$;

revoke all on function public.fill_invoice_item_fee_category() from public, anon, authenticated;

drop trigger if exists fill_invoice_item_fee_category on public.invoice_items;
create trigger fill_invoice_item_fee_category
  before insert or update on public.invoice_items
  for each row execute function public.fill_invoice_item_fee_category();

alter table public.invoice_items alter column fee_category set not null;

alter table public.invoice_items drop constraint if exists invoice_items_fee_category_check;
alter table public.invoice_items add constraint invoice_items_fee_category_check
  check (fee_category in ('Rent', 'Service', 'PassThrough', 'Adjustment'));

create index if not exists idx_invoice_items_invoice on public.invoice_items (invoice_id);

-- ── 2. RPC create_invoice_v2 ────────────────────────────────────────────────
-- p_services:    [{ "service_id": uuid, "quantity": number }]  (Meter: quantity bị bỏ qua)
-- p_adjustments: [{ "reason": text, "amount": number }]          (amount ≠ 0, được âm)
create or replace function public.create_invoice_v2(
  p_room_id      uuid,
  p_period       text,
  p_due_date     date,
  p_billing_from date,
  p_billing_to   date,
  p_services     jsonb,
  p_adjustments  jsonb,
  p_note         text
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid        uuid;
  v_contract   public.contracts%rowtype;
  v_invoice_id uuid;
  v_end_excl   date;
  v_months     integer := 0;
  v_days       integer;
  v_rent       numeric;
  v_item       jsonb;
  v_service    record;
  v_reading    record;
  v_quantity   numeric;
  v_price      numeric;
  v_amount     numeric;
  v_reason     text;
  v_note       text := nullif(btrim(coalesce(p_note, '')), '');
  v_seen       uuid[] := '{}';
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  if not exists (select 1 from public.rooms
                  where id = p_room_id and owner_id = v_uid and deleted_at is null) then
    raise exception 'ROOM_NOT_OWNED';
  end if;

  if p_period is null or p_period !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'INVALID_PERIOD'; end if;
  if p_due_date is null then raise exception 'DUE_DATE_REQUIRED'; end if;
  if p_billing_from is null or p_billing_to is null or p_billing_from > p_billing_to
     or p_billing_to - p_billing_from > 92 then
    raise exception 'INVALID_BILLING_RANGE';
  end if;
  if v_note is not null and char_length(v_note) > 255 then raise exception 'INVOICE_NOTE_TOO_LONG'; end if;

  -- Hợp đồng Active của phòng — derive server, không nhận contract_id từ client.
  select * into v_contract
    from public.contracts
   where room_id = p_room_id and owner_id = v_uid and status = 'Active' and deleted_at is null
   order by start_date desc
   limit 1;
  if v_contract.id is null then raise exception 'CONTRACT_NOT_ACTIVE'; end if;

  begin
    insert into public.invoices
      (room_id, contract_id, owner_id, period, due_date, total_amount, status, billing_from, billing_to, note)
    values
      (p_room_id, v_contract.id, v_uid, p_period, p_due_date, 0,
       case when p_due_date < current_date then 'Overdue' else 'Unpaid' end,
       p_billing_from, p_billing_to, v_note)
    returning id into v_invoice_id;
  exception when unique_violation then
    raise exception 'INVOICE_PERIOD_EXISTS';
  end;

  -- ── Tiền phòng: tháng đủ + ngày lẻ/30, tính cả hai đầu khoảng ──
  v_end_excl := p_billing_to + 1;
  while (p_billing_from + make_interval(months => v_months + 1))::date <= v_end_excl loop
    v_months := v_months + 1;
  end loop;
  v_days := v_end_excl - (p_billing_from + make_interval(months => v_months))::date;
  v_rent := round(v_contract.rent_price * v_months + v_contract.rent_price * v_days / 30.0);

  if v_rent > 0 then
    insert into public.invoice_items
      (invoice_id, type, fee_category, description, quantity, unit_price, amount, unit, meta)
    values
      (v_invoice_id, 'Rent', 'Rent', 'Tiền phòng',
       round(v_months + v_days / 30.0, 4), v_contract.rent_price, v_rent, 'Tháng',
       jsonb_build_object('months', v_months, 'days', v_days,
                          'from', p_billing_from, 'to', p_billing_to));
  end if;

  -- ── Dịch vụ ──
  if jsonb_typeof(coalesce(p_services, '[]'::jsonb)) <> 'array' then raise exception 'INVALID_INVOICE_SERVICES'; end if;
  for v_item in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) loop
    select s.id, s.name, s.unit, s.fee_category, s.quantity_basis, s.meter_type,
           coalesce(rs.unit_price_override, s.unit_price) as price
      into v_service
      from public.room_services rs
      join public.property_services s on s.id = rs.service_id
     where rs.room_id = p_room_id
       and s.id = (v_item ->> 'service_id')::uuid
       and s.owner_id = v_uid and s.deleted_at is null and s.is_active;
    if not found then raise exception 'SERVICE_NOT_APPLIED'; end if;
    if v_service.id = any (v_seen) then raise exception 'DUPLICATE_INVOICE_SERVICE'; end if;
    v_seen := v_seen || v_service.id;

    if v_service.quantity_basis = 'Meter' then
      select previous_reading, current_reading, unit_price into v_reading
        from public.utility_readings
       where room_id = p_room_id and type = v_service.meter_type
         and period = p_period and deleted_at is null
       limit 1;
      if not found then raise exception 'READING_MISSING'; end if;
      v_quantity := greatest(v_reading.current_reading - v_reading.previous_reading, 0);
      v_price    := v_reading.unit_price;
      v_amount   := round(v_quantity * v_price);
      insert into public.invoice_items
        (invoice_id, type, fee_category, service_id, description, quantity, unit_price, amount, unit, meta)
      values
        (v_invoice_id, v_service.meter_type, v_service.fee_category, v_service.id, v_service.name,
         -- quantity > 0 là quy ước cũ của bảng; dùng 0 kWh thì vẫn ghi dòng 0đ cho minh bạch.
         greatest(v_quantity, 0), v_price, v_amount, v_service.unit,
         jsonb_build_object('previous', v_reading.previous_reading, 'current', v_reading.current_reading));
    else
      v_quantity := (v_item ->> 'quantity')::numeric;
      if v_quantity is null or v_quantity <= 0 or v_quantity > 100 then
        raise exception 'INVALID_INVOICE_QUANTITY';
      end if;
      v_amount := round(v_quantity * v_service.price);
      insert into public.invoice_items
        (invoice_id, type, fee_category, service_id, description, quantity, unit_price, amount, unit)
      values
        (v_invoice_id, 'Service', v_service.fee_category, v_service.id, v_service.name,
         v_quantity, v_service.price, v_amount, v_service.unit);
    end if;
  end loop;

  -- ── Cộng thêm / giảm trừ ──
  if jsonb_typeof(coalesce(p_adjustments, '[]'::jsonb)) <> 'array' then raise exception 'INVALID_INVOICE_ADJUSTMENTS'; end if;
  for v_item in select * from jsonb_array_elements(coalesce(p_adjustments, '[]'::jsonb)) loop
    v_reason := btrim(coalesce(v_item ->> 'reason', ''));
    v_amount := round((v_item ->> 'amount')::numeric);
    if v_reason = '' or char_length(v_reason) > 120 then raise exception 'ADJUSTMENT_REASON_REQUIRED'; end if;
    if v_amount is null or v_amount = 0 then raise exception 'INVALID_ADJUSTMENT_AMOUNT'; end if;
    insert into public.invoice_items
      (invoice_id, type, fee_category, description, quantity, unit_price, amount)
    values
      (v_invoice_id, 'Other', 'Adjustment', v_reason, 1, v_amount, v_amount);
  end loop;

  -- ── Tổng: tính lại từ các dòng đã ghi ──
  select coalesce(sum(amount), 0) into v_amount
    from public.invoice_items where invoice_id = v_invoice_id;
  if not exists (select 1 from public.invoice_items where invoice_id = v_invoice_id) then
    raise exception 'INVOICE_ITEMS_REQUIRED';
  end if;
  if v_amount < 0 then raise exception 'INVOICE_TOTAL_NEGATIVE'; end if;

  update public.invoices set total_amount = v_amount where id = v_invoice_id;
  return v_invoice_id;
end $$;

revoke execute on function public.create_invoice_v2(uuid, text, date, date, date, jsonb, jsonb, text) from public, anon;
grant  execute on function public.create_invoice_v2(uuid, text, date, date, date, jsonb, jsonb, text) to authenticated;
