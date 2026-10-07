-- Vá bảo mật sau rà soát 2026-10-06 (đối chiếu DB production).
--
-- 1. BR-014: khách chưa đăng nhập đọc được SĐT đầy đủ qua REST (che chỉ ở UI).
-- 2. Policy ghi của bảng SaaS chỉ kiểm `owner_id = auth.uid()`, không kiểm khóa
--    ngoại ⇒ chủ trọ A chèn chỉ số / hợp đồng / hóa đơn lên phòng của B (BR-007),
--    tự dựng occupancy "Confirmed" + hợp đồng lùi ngày để có review giả
--    (BR-022/029). Mọi thao tác ghi các bảng đó đã đi qua RPC SECURITY DEFINER ⇒
--    thu hồi quyền ghi trực tiếp (RPC chạy với quyền owner nên không bị ảnh hưởng).
-- 3. Review / occupancy / hội thoại / tin nhắn: policy UPDATE không giới hạn cột.
-- 4. Chủ khu tự sửa `avg_rating` / `review_count` (hiện công khai).
-- 5. Tin nhu cầu: người đăng tự đặt `status` (vượt kiểm duyệt, gỡ ẩn).
-- 6. `create_invoice_with_items` nhận số âm và `unit_price` từ client.
--
-- Idempotent: chạy lại an toàn.

-- 1a (che SĐT tin cho thuê) nằm ở 20261009085000 (thêm cột) và 20261009100000
-- (thu hồi quyền cột — chỉ push SAU khi frontend mới đã deploy).

-- ── 1b. Tin nhu cầu: khách chỉ đọc qua view, view che SĐT + địa chỉ hiện tại ──
create or replace view public.public_demand_posts
with (security_invoker = false) as
select
  dp.id,
  dp.renter_id,
  dp.kind,
  dp.status,
  dp.title,
  dp.description,
  dp.desired_districts,
  dp.desired_province_code,
  dp.desired_ward_codes,
  dp.price_min,
  dp.price_max,
  dp.property_type,
  dp.min_area,
  dp.desired_amenities,
  dp.move_in_date,
  dp.occupant_count,
  case when auth.uid() is null then null else dp.current_address end as current_address,
  dp.district,
  dp.share_price,
  dp.needed_count,
  dp.gender_requirement,
  dp.requirements,
  dp.contact_name,
  case
    when auth.uid() is not null then dp.contact_phone
    when dp.contact_phone is null or length(dp.contact_phone) < 7 then null
    else left(dp.contact_phone, 4) || '***' || right(dp.contact_phone, 3)
  end as contact_phone,
  dp.expire_at,
  dp.created_at,
  dp.updated_at,
  coalesce(p.full_name, 'Khách thuê') as renter_name
from public.demand_posts dp
left join public.profiles p on dp.renter_id = p.user_id
where dp.deleted_at is null and dp.status = 'Active';

grant select on public.public_demand_posts to anon, authenticated;
revoke select on public.demand_posts from anon;

-- ── 2. Thu hồi ghi trực tiếp — chỉ ghi qua RPC ───────────────────────────────
revoke insert, update, delete on
  public.contracts,
  public.occupancies,
  public.invoices,
  public.invoice_items,
  public.utility_readings,
  public.payments,
  public.reviews,
  public.conversations
from anon, authenticated;

-- Tin nhắn: gửi (insert) vẫn trực tiếp; sửa/xóa thì không (mark_conversation_read là RPC).
revoke update, delete on public.messages from anon, authenticated;
-- Phòng: tạo vẫn trực tiếp (kèm trigger bên dưới); sửa qua `update_room`, xóa qua RPC khu.
revoke update, delete on public.rooms from anon, authenticated;

-- ── 3. Phòng phải nằm trong khu của chính người tạo ──────────────────────────
create or replace function public.guard_room_property_owner()
returns trigger
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Không có JWT (migration, service_role) thì không đánh giá như chủ trọ.
  if auth.uid() is null then
    return new;
  end if;
  if not exists (
    select 1 from public.properties
    where id = new.property_id and owner_id = new.owner_id and deleted_at is null
  ) then
    raise exception 'PROPERTY_NOT_OWNED' using errcode = '42501';
  end if;
  return new;
end $$;

revoke execute on function public.guard_room_property_owner() from public, anon, authenticated;

drop trigger if exists guard_room_property_owner on public.rooms;
create trigger guard_room_property_owner
  before insert or update of property_id on public.rooms
  for each row execute function public.guard_room_property_owner();

-- ── 4. properties: client chỉ ghi các cột thông tin & cấu hình ───────────────
-- avg_rating/review_count do trigger review tính; hồ sơ công khai qua
-- `set_property_public_profile`; xóa qua `soft_delete_property`.
revoke insert, update on public.properties from anon, authenticated;
grant insert (
  name, address, district, province_code, ward_code, floor_count,
  bank_name, bank_account_number, bank_account_name,
  electricity_unit_price, water_unit_price, service_fee
) on public.properties to authenticated;
grant update (
  name, address, district, province_code, ward_code, floor_count,
  bank_name, bank_account_number, bank_account_name,
  electricity_unit_price, water_unit_price, service_fee
) on public.properties to authenticated;

-- ── 5. Tin nhu cầu: trạng thái do server quyết ───────────────────────────────
create or replace function public.guard_demand_post_write()
returns trigger
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_auto_approve boolean;
begin
  if auth.uid() is null or public.is_moderator() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select coalesce((value)::text = 'true', true) into v_auto_approve
      from public.platform_settings where key = 'auto_approve_demand_posts';
    new.status := case when coalesce(v_auto_approve, true) then 'Active' else 'PendingApproval' end;
    new.expire_at := null;
    new.deleted_at := null;
    return new;
  end if;

  new.renter_id := old.renter_id;
  new.expire_at := old.expire_at;
  if new.status is distinct from old.status
     and not (old.status in ('Active', 'Hidden', 'Expired')
              and new.status in ('Active', 'Hidden', 'Expired')) then
    raise exception 'DEMAND_STATUS_TRANSITION_INVALID' using errcode = 'P0001';
  end if;
  return new;
end $$;

revoke execute on function public.guard_demand_post_write() from public, anon, authenticated;

drop trigger if exists guard_demand_post_write on public.demand_posts;
create trigger guard_demand_post_write
  before insert or update on public.demand_posts
  for each row execute function public.guard_demand_post_write();

-- ── 6. Hóa đơn: kiểm số tiền, đơn giá derive server-side ─────────────────────
create or replace function public.create_invoice_with_items(
  p_room_id uuid,
  p_contract_id uuid,
  p_period text,
  p_due_date date,
  p_items jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid        uuid;
  v_invoice_id uuid;
  v_total      numeric := 0;
  v_item       jsonb;
  v_amount     numeric;
  v_quantity   numeric;
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

  if jsonb_typeof(coalesce(p_items, 'null'::jsonb)) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'INVOICE_ITEMS_REQUIRED';
  end if;

  -- total_amount TÍNH SERVER-SIDE từ các khoản đã kiểm.
  for v_item in select * from jsonb_array_elements(p_items) loop
    if (v_item ->> 'type') not in ('Rent','Electricity','Water','Service','Other') then
      raise exception 'INVALID_INVOICE_ITEM_TYPE';
    end if;
    v_amount := coalesce((v_item ->> 'amount')::numeric, 0);
    v_quantity := coalesce((v_item ->> 'quantity')::numeric, 1);
    if v_amount < 0 or v_quantity <= 0 then
      raise exception 'INVALID_INVOICE_ITEM_AMOUNT';
    end if;
    v_total := v_total + v_amount;
  end loop;

  begin
    insert into public.invoices (room_id, contract_id, owner_id, period, due_date, total_amount, status)
    values (p_room_id, p_contract_id, v_uid, p_period, p_due_date, v_total,
            case when p_due_date < current_date then 'Overdue' else 'Unpaid' end)
    returning id into v_invoice_id;
  exception when unique_violation then
    raise exception 'INVOICE_PERIOD_EXISTS';
  end;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_amount := coalesce((v_item ->> 'amount')::numeric, 0);
    v_quantity := coalesce((v_item ->> 'quantity')::numeric, 1);
    insert into public.invoice_items (invoice_id, type, description, quantity, unit_price, amount)
    values (
      v_invoice_id,
      v_item ->> 'type',
      v_item ->> 'description',
      v_quantity,
      -- Không nhận unit_price từ client: thành tiền / số lượng.
      round(v_amount / v_quantity, 2),
      v_amount
    );
  end loop;

  return v_invoice_id;
end $$;

revoke execute on function public.create_invoice_with_items(uuid, uuid, text, date, jsonb) from public, anon;
grant  execute on function public.create_invoice_with_items(uuid, uuid, text, date, jsonb) to authenticated;
