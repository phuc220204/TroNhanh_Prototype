-- Hủy yêu cầu liên kết tài khoản đang chờ (BR-029).
--
-- Chủ trọ gõ nhầm email thì trước đây không có đường lui: yêu cầu nằm "Chờ xác
-- nhận" mãi. (Gửi lại tới email khác đã làm được bằng `link_renter_account` —
-- nó ghi đè user_id và đặt lại Pending.) Hàm này chỉ gỡ yêu cầu ĐANG CHỜ; liên
-- kết đã Confirmed không gỡ ở đây vì nó gắn với quyền xem hóa đơn và đánh giá
-- của người ở.

create or replace function public.cancel_occupancy_link(p_occupancy_id uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid;
  v_occupancy public.occupancies;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select * into v_occupancy from public.occupancies
  where id = p_occupancy_id and deleted_at is null
  for update;

  if not found then raise exception 'OCCUPANCY_NOT_FOUND'; end if;
  -- security definer bypass RLS ⇒ đây là biên bảo mật.
  if v_occupancy.owner_id <> v_uid then raise exception 'OCCUPANCY_NOT_OWNED'; end if;
  if v_occupancy.link_status is distinct from 'Pending' then
    raise exception 'OCCUPANCY_LINK_NOT_PENDING';
  end if;

  update public.occupancies
  set user_id = null,
      link_status = null
  where id = p_occupancy_id and owner_id = v_uid;
end $$;

revoke execute on function public.cancel_occupancy_link(uuid) from public, anon;
grant execute on function public.cancel_occupancy_link(uuid) to authenticated;
