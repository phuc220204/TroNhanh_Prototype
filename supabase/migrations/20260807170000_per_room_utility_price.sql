-- ═══════════════════════════════════════════════════════════════════════════
-- Đơn giá điện / nước / dịch vụ theo TỪNG PHÒNG, không chỉ theo khu
--
-- NGHIỆP VỤ (chủ dự án nêu): giá điện nước không cố định một mức cho cả khu. Chủ
-- trọ có thể đang thu 3.500đ/kWh với các hợp đồng cũ, còn phòng ký mới thì
-- 3.700đ/kWh. Đó là quyết định kinh doanh theo từng phòng, từng thời điểm — không
-- phải một thuộc tính của khu trọ.
--
-- HIỆN TRẠNG: `record_utility_reading` đọc đơn giá từ `properties`, tức là mọi
-- phòng trong khu buộc dùng một giá. Muốn phòng mới giá khác thì phải đổi giá khu,
-- và khi đó mọi phòng còn lại cũng đổi theo.
--
-- ── PHẦN ĐÃ ĐÚNG SẴN, GIỮ NGUYÊN ──────────────────────────────────────────
-- `utility_readings.unit_price` đã SNAPSHOT giá tại thời điểm ghi chỉ số. Nhờ vậy
-- đổi giá hôm nay KHÔNG làm sai lệch hóa đơn các kỳ trước — hóa đơn cũ giữ đúng
-- giá đã áp lúc đó. Đây là điều kiện tiên quyết để cho phép đổi giá; nếu hóa đơn
-- đọc giá "hiện tại" thì mỗi lần tăng giá là mọi hóa đơn lịch sử bị viết lại.
--
-- ── CÁCH LÀM: ghi đè ở cấp phòng, không thay thế cấp khu ───────────────────
-- Ba cột NULLABLE trên `rooms`. `null` = "theo giá của khu" — nên toàn bộ dữ liệu
-- hiện có không đổi hành vi, và chủ trọ chỉ phải nhập giá riêng cho những phòng
-- thực sự khác.
--
-- Cố ý KHÔNG dùng `default 0`: `0` là một mức giá hợp lệ (khu không thu phí dịch
-- vụ), nên không thể vừa dùng nó làm "chưa khai" vừa làm "miễn phí". `null` phân
-- biệt được hai ý đó; `0` thì không.
--
-- ── VÌ SAO KHÔNG ĐẶT GIÁ Ở `contracts` ────────────────────────────────────
-- Nghe hợp lý hơn ("giá theo hợp đồng"), nhưng `utility_readings` gắn với ROOM,
-- không gắn contract — phòng trống vẫn ghi được chỉ số, và một phòng có thể qua
-- nhiều hợp đồng trong cùng kỳ. Đặt ở `rooms` giữ đường tra giá là một bước, còn
-- lịch sử giá thì đã có sẵn trong snapshot `utility_readings.unit_price`.
--
-- Idempotent: add column if not exists + create or replace.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.rooms
  add column if not exists electricity_price numeric,
  add column if not exists water_price       numeric,
  add column if not exists service_fee       numeric;

comment on column public.rooms.electricity_price is
  'Đơn giá điện riêng của phòng (VND/kWh). NULL = dùng properties.electricity_unit_price.';
comment on column public.rooms.water_price is
  'Đơn giá nước riêng của phòng. NULL = dùng properties.water_unit_price.';
comment on column public.rooms.service_fee is
  'Phí dịch vụ riêng của phòng (VND/tháng). NULL = dùng properties.service_fee.';

-- ══ record_utility_reading: ưu tiên giá phòng, fallback giá khu ════════════
-- Đổi ĐÚNG một chỗ: cách tra `v_unit_price`. Mọi thứ khác giữ nguyên từng dòng —
-- assert ownership, validate `current >= previous`, và snapshot `unit_price`.
create or replace function public.record_utility_reading(
  p_room_id uuid,
  p_type    text,
  p_period  text,
  p_current numeric
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid        uuid;
  v_owner      uuid;
  v_property   uuid;
  v_previous   numeric;
  v_unit_price numeric;
  v_id         uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  if p_type not in ('Electricity', 'Water') then
    raise exception 'INVALID_READING_TYPE';
  end if;

  select owner_id, property_id into v_owner, v_property
    from public.rooms where id = p_room_id and deleted_at is null;

  if v_owner is null  then raise exception 'ROOM_NOT_OWNED'; end if;
  if v_owner <> v_uid then raise exception 'ROOM_NOT_OWNED'; end if;

  -- previous_reading derive server-side: chỉ số kỳ trước của CHÍNH phòng này.
  select current_reading into v_previous
    from public.utility_readings
   where room_id = p_room_id and type = p_type and deleted_at is null
   order by period desc
   limit 1;

  v_previous := coalesce(v_previous, 0);

  if p_current < v_previous then
    raise exception 'READING_LOWER_THAN_PREVIOUS';
  end if;

  -- Giá riêng của phòng trước, giá khu sau. `coalesce` bỏ qua NULL nên phòng chưa
  -- khai giá riêng vẫn dùng giá khu như trước — dữ liệu cũ không đổi hành vi.
  select coalesce(
           case when p_type = 'Electricity' then r.electricity_price else r.water_price end,
           case when p_type = 'Electricity' then p.electricity_unit_price else p.water_unit_price end
         )
    into v_unit_price
    from public.rooms r
    join public.properties p on p.id = r.property_id
   where r.id = p_room_id;

  insert into public.utility_readings
    (room_id, owner_id, type, period, previous_reading, current_reading, unit_price)
  values (p_room_id, v_uid, p_type, p_period, v_previous, p_current, coalesce(v_unit_price, 0))
  on conflict (room_id, type, period) do update
    set previous_reading = excluded.previous_reading,
        current_reading  = excluded.current_reading,
        unit_price       = excluded.unit_price,
        updated_at       = now()
  returning id into v_id;

  return v_id;
end $$;

revoke execute on function public.record_utility_reading(uuid, text, text, numeric) from public, anon;
grant  execute on function public.record_utility_reading(uuid, text, text, numeric) to authenticated;

-- ══ get_room_effective_prices — giá ĐANG áp cho một phòng ══════════════════
-- UI cần trả lời "phòng này đang tính giá bao nhiêu, và giá đó là riêng của phòng
-- hay thừa hưởng từ khu". Tính ở client thì phải kéo cả row `properties` sang
-- workspace và tự lặp lại logic coalesce ở mỗi chỗ hiển thị.
create or replace function public.get_room_effective_prices(p_room_id uuid)
returns table (
  electricity_price      numeric,
  water_price            numeric,
  service_fee            numeric,
  electricity_is_override boolean,
  water_is_override       boolean,
  service_is_override     boolean
)
language sql stable security definer set search_path = public as $$
  select
    coalesce(r.electricity_price, p.electricity_unit_price),
    coalesce(r.water_price,       p.water_unit_price),
    coalesce(r.service_fee,       p.service_fee),
    r.electricity_price is not null,
    r.water_price       is not null,
    r.service_fee       is not null
  from public.rooms r
  join public.properties p on p.id = r.property_id
  where r.id = p_room_id
    and r.deleted_at is null
    and r.owner_id = auth.uid();   -- ← không cho dò phòng của người khác
$$;

revoke execute on function public.get_room_effective_prices(uuid) from public, anon;
grant  execute on function public.get_room_effective_prices(uuid) to authenticated;
