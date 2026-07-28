-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260728231500_occupancy_contract_rpcs.sql
-- RPCs cho quản lý hợp đồng & liên kết tài khoản Renter (T24)
-- ═══════════════════════════════════════════════════════════════════════════

-- ══ 1. terminate_contract ══════════════════════════════════════════════════
-- Kết thúc hợp đồng thuê: set contracts.status='Terminated', occupancies.is_active=false,
-- và trả room.status='Available' nếu không còn hợp đồng Active nào khác.
create or replace function public.terminate_contract(
  p_contract_id uuid,
  p_end_date    date default current_date
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid          uuid;
  v_owner        uuid;
  v_room_id      uuid;
  v_occupancy_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select owner_id, room_id, occupancy_id into v_owner, v_room_id, v_occupancy_id
    from public.contracts
    where id = p_contract_id and deleted_at is null for update;

  if v_owner is null  then raise exception 'CONTRACT_NOT_FOUND'; end if;
  if v_owner <> v_uid then raise exception 'CONTRACT_NOT_OWNED'; end if;

  -- Cập nhật hợp đồng
  update public.contracts
    set status = 'Terminated',
        end_date = coalesce(p_end_date, current_date)
    where id = p_contract_id;

  -- Cập nhật thông tin người ở
  if v_occupancy_id is not null then
    update public.occupancies
      set is_active = false,
          end_date = coalesce(p_end_date, current_date)
      where id = v_occupancy_id;
  end if;

  -- Đổi trạng thái phòng về Available nếu không còn hợp đồng Active nào khác
  if not exists (
    select 1 from public.contracts
    where room_id = v_room_id and status = 'Active' and deleted_at is null
  ) then
    update public.rooms set status = 'Available' where id = v_room_id;
  end if;
end $$;

revoke execute on function public.terminate_contract(uuid, date) from public, anon;
grant execute on function public.terminate_contract(uuid, date) to authenticated;

-- ══ 2. link_renter_account ═════════════════════════════════════════════════
-- Liên kết tài khoản Renter bằng email.
-- BR-029: KHÔNG BAO GIỜ set link_status = 'Confirmed' ở đây.
-- RPC set link_status = 'Pending', Renter phải tự xác nhận qua confirm_occupancy_link.
create or replace function public.link_renter_account(
  p_occupancy_id uuid,
  p_email        text
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid         uuid;
  v_owner       uuid;
  v_target_user uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select owner_id into v_owner from public.occupancies
    where id = p_occupancy_id and deleted_at is null;

  if v_owner is null  then raise exception 'OCCUPANCY_NOT_FOUND'; end if;
  if v_owner <> v_uid then raise exception 'OCCUPANCY_NOT_OWNED'; end if;

  select id into v_target_user from auth.users
    where lower(email) = lower(trim(p_email));

  if v_target_user is null then
    raise exception 'USER_NOT_FOUND_BY_EMAIL';
  end if;

  -- BR-029: Gắn user_id và set link_status = 'Pending'. Renter tự xác nhận sau.
  update public.occupancies
    set user_id = v_target_user,
        link_status = 'Pending'
    where id = p_occupancy_id and owner_id = v_uid;
end $$;

revoke execute on function public.link_renter_account(uuid, text) from public, anon;
grant execute on function public.link_renter_account(uuid, text) to authenticated;
