-- Fixture thủ công cho tests/e2e/review.spec.ts.
-- Chỉ chạy trong database kiểm thử từ SQL Editor (quyền quản trị), không đưa
-- thành RPC client-callable và không chạy như migration production.
do $$
declare
  v_renter   uuid;
  v_occupancy uuid;
  v_contract uuid;
begin
  select id into v_renter
  from auth.users
  where email = 'renter.a@tronhanh.demo';

  if v_renter is null then
    raise exception 'Thiếu tài khoản renter.a@tronhanh.demo';
  end if;

  select o.id, c.id
    into v_occupancy, v_contract
  from public.occupancies o
  join public.contracts c on (c.occupancy_id = o.id or o.contract_id = c.id)
  join public.rooms r on r.id = c.room_id
  join auth.users owner_user on owner_user.id = r.owner_id
  where o.deleted_at is null
    and c.deleted_at is null
    and (o.user_id is null or o.user_id = v_renter)
    and r.owner_id <> v_renter
    and owner_user.email like '%@tronhanh.demo'
  order by (o.user_id = v_renter) desc, o.created_at
  limit 1;

  if v_occupancy is null then
    raise exception 'Không có occupancy fixture phù hợp; hãy nạp seed SaaS trước';
  end if;

  update public.occupancies
  set user_id = v_renter,
      link_status = 'Pending',
      contract_id = coalesce(contract_id, v_contract)
  where id = v_occupancy;

  update public.contracts
  set created_at = least(created_at, now() - interval '60 days'),
      start_date = least(start_date, current_date - 60)
  where id = v_contract;
end $$;
