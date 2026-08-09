-- ═══════════════════════════════════════════════════════════════════════════
-- Một phòng — nhiều người ở, cùng đứng tên MỘT hợp đồng.
--
-- HIỆN TRẠNG (vì sao phải sửa):
--   `contracts.occupancy_id` là 1-1, và `occupancies` chỉ có MỘT `full_name` +
--   MỘT `user_id`. Người thứ hai trong phòng chỉ tồn tại dưới dạng con số
--   `occupant_count` — không tên, không SĐT, không gắn được tài khoản, và
--   KHÔNG đánh giá được (can_review_contract join đúng 1 occupancy).
--   Muốn thêm người thứ hai thì phải tạo hợp đồng thứ hai → đụng BR-006
--   (ROOM_HAS_ACTIVE_CONTRACT). Nói cách khác: mô hình đang chặn đúng luật,
--   nhưng luật đang được áp lên sai thực thể.
--
-- CÁCH SỬA — THUẦN BỔ SUNG, không phá dữ liệu cũ:
--   `occupancies.contract_id` (nullable) + `occupancies.is_primary`.
--   • Người đại diện: chính occupancy mà `contracts.occupancy_id` đang trỏ tới,
--     `is_primary = true`.
--   • Người ở cùng: occupancy MỚI, cùng `contract_id`, `is_primary = false`,
--     KHÔNG sinh hợp đồng mới ⇒ BR-006 giữ nguyên, không nới một chữ nào.
--   `contracts.occupancy_id` giữ nguyên (trỏ người đại diện) nên mọi RPC/policy
--   cũ vẫn chạy y như trước.
--
-- ⚠️ BR-023 KHÔNG đổi trong migration này: `reviews.contract_id` vẫn UNIQUE,
--   tức MỘT đánh giá cho MỘT đợt ở, ai viết trước thì người đó viết. Nới thành
--   mỗi người ở một đánh giá là thay đổi business rule — phải do chủ dự án
--   quyết, không phải hệ quả phụ của một migration kỹ thuật.
-- Idempotent: add column if not exists + create or replace.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.occupancies
  add column if not exists contract_id uuid references public.contracts(id) on delete cascade,
  add column if not exists is_primary  boolean not null default true;

create index if not exists idx_occupancies_contract
  on public.occupancies (contract_id) where deleted_at is null;

-- Backfill: mọi occupancy đang được một hợp đồng trỏ tới là người đại diện.
update public.occupancies o
   set contract_id = c.id,
       is_primary  = true
  from public.contracts c
 where c.occupancy_id = o.id
   and o.contract_id is null;

-- ══ can_review_contract — mở cho NGƯỜI Ở CÙNG, giữ nguyên mọi cổng ═════════
-- Chỉ đổi ĐÚNG một thứ: cách tìm occupancy (theo contract_id thay vì chỉ
-- c.occupancy_id). Ba điều kiện chống gian lận giữ nguyên từng chữ:
--   link_status='Confirmed' (BR-029) · owner <> người review (BR-030)
--   · ≥30 ngày hoặc ≥1 payment (BR-022).
create or replace function public.can_review_contract(p_user uuid, p_contract uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.contracts c
    join public.rooms r       on r.id = c.room_id
    join public.occupancies o on (o.contract_id = c.id or o.id = c.occupancy_id)
    where c.id = p_contract
      and c.deleted_at is null
      and o.deleted_at is null
      and o.user_id     = p_user
      and o.link_status = 'Confirmed'
      and r.owner_id   <> p_user
      and (
        c.created_at <= now() - interval '30 days'
        or exists (
          select 1 from public.payments p
          join public.invoices i on i.id = p.invoice_id
          where i.contract_id = c.id
        )
      )
  );
$$;
revoke execute on function public.can_review_contract(uuid, uuid) from public, anon;
grant  execute on function public.can_review_contract(uuid, uuid) to authenticated;

-- ══ add_occupant_to_contract ══════════════════════════════════════════════
-- Thêm người ở cùng vào hợp đồng ĐÃ CÓ. Không đụng `contracts` nên không thể
-- vô tình tạo hợp đồng chồng thời gian.
create or replace function public.add_occupant_to_contract(
  p_contract_id uuid,
  p_occupant    jsonb
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid   uuid;
  v_owner uuid;
  v_room  uuid;
  v_start date;
  v_id    uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select owner_id, room_id, start_date into v_owner, v_room, v_start
    from public.contracts
   where id = p_contract_id and deleted_at is null;

  if v_owner is null  then raise exception 'CONTRACT_NOT_FOUND'; end if;
  if v_owner <> v_uid then raise exception 'CONTRACT_NOT_OWNED'; end if;

  if coalesce(trim(p_occupant ->> 'full_name'), '') = '' then
    raise exception 'OCCUPANT_NAME_REQUIRED';
  end if;

  insert into public.occupancies (
    room_id, owner_id, user_id, full_name, phone_number,
    start_date, occupant_count, is_active, link_status,
    contract_id, is_primary
  ) values (
    v_room,
    v_uid,                                   -- ← derive, không nhận từ client
    nullif(p_occupant ->> 'user_id', '')::uuid,
    trim(p_occupant ->> 'full_name'),
    p_occupant ->> 'phone_number',
    coalesce(nullif(p_occupant ->> 'start_date', '')::date, v_start),
    1,
    true,
    -- BR-029: người ở cùng cũng phải TỰ xác nhận, không auto Confirmed.
    case when nullif(p_occupant ->> 'user_id', '') is null then null else 'Pending' end,
    p_contract_id,
    false
  ) returning id into v_id;

  return v_id;
end $$;

revoke execute on function public.add_occupant_to_contract(uuid, jsonb) from public, anon;
grant  execute on function public.add_occupant_to_contract(uuid, jsonb) to authenticated;

-- ══ Người ở cùng phải đọc được hợp đồng / hóa đơn của phòng mình ═══════════
-- Policy cũ gọi `is_linked_occupant(contracts.occupancy_id)` — mà cột đó trỏ
-- NGƯỜI ĐẠI DIỆN. Người ở cùng sẽ không đọc được gì, và lỗi này im lặng
-- (RLS lọc mất row, không có thông báo nào).
--
-- Helper mới nhận CONTRACT thay vì OCCUPANCY, phủ cả hai đường:
-- occupancy trỏ bởi contract, và occupancy có contract_id trỏ ngược lại.
create or replace function public.is_contract_occupant(p_contract uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.contracts c
    join public.occupancies o on (o.contract_id = c.id or o.id = c.occupancy_id)
    where c.id = p_contract
      and c.deleted_at is null
      and o.deleted_at is null
      and o.user_id = auth.uid()
      and o.link_status = 'Confirmed'
  );
$$;
revoke execute on function public.is_contract_occupant(uuid) from public, anon;
grant  execute on function public.is_contract_occupant(uuid) to authenticated;

drop policy if exists "Linked renter reads own contracts" on public.contracts;
create policy "Linked renter reads own contracts" on public.contracts
  for select to authenticated using (public.is_contract_occupant(id));

drop policy if exists "Linked renter reads own invoices" on public.invoices;
create policy "Linked renter reads own invoices" on public.invoices
  for select to authenticated using (public.is_contract_occupant(contract_id));

-- ══ get_my_stays — người ở cùng cũng thấy đợt ở của mình ══════════════════
-- Đổi ĐÚNG một chỗ: nối contract theo `o.contract_id` trước, chỉ fallback về
-- `c.occupancy_id` cho dữ liệu cũ chưa backfill.
create or replace function public.get_my_stays()
returns table (
  occupancy_id      uuid,
  link_status       text,
  occupant_name     text,
  contract_id       uuid,
  contract_status   text,
  start_date        date,
  end_date          date,
  rent_price        numeric,
  deposit           numeric,
  room_id           uuid,
  room_code         text,
  property_id       uuid,
  property_name     text,
  property_district text,
  public_slug       text,
  is_public_profile boolean,
  can_review        boolean,
  review_id         uuid,
  review_rating     integer,
  review_content    text,
  review_created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    o.id, o.link_status, o.full_name,
    c.id, c.status, c.start_date, c.end_date, c.rent_price, c.deposit,
    r.id, r.room_code,
    p.id, p.name, p.district, p.public_slug, p.is_public_profile_enabled,
    coalesce(public.can_review_contract(auth.uid(), c.id), false),
    rv.id, rv.rating, rv.content, rv.created_at
  from public.occupancies o
  left join public.contracts c
    on (c.id = o.contract_id or (o.contract_id is null and c.occupancy_id = o.id))
   and c.deleted_at is null
  left join public.rooms      r on r.id = o.room_id
  left join public.properties p on p.id = r.property_id
  left join public.reviews    rv on rv.contract_id = c.id
                                and rv.author_user_id = auth.uid()
                                and rv.deleted_at is null
  where auth.uid() is not null
    and o.user_id = auth.uid()
    and o.deleted_at is null
  order by o.is_active desc nulls last, c.start_date desc nulls last;
$$;

revoke execute on function public.get_my_stays() from public, anon;
grant  execute on function public.get_my_stays() to authenticated;
