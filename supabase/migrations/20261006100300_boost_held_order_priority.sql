-- Sửa sau review: đơn PAID_PENDING_APPROVAL luôn được ưu tiên trong
-- begin_boost_checkout. Từ khi có CANCELLED, một đơn cũ có thể được trả muộn
-- (thành PAID_PENDING_APPROVAL) trong khi đã có đơn LINKED mới hơn; bản trước chỉ
-- xét đơn mới nhất nên bỏ lọt chốt chặn "đã trả, đang chờ duyệt" ⇒ khách trả lần hai.
-- Chữ ký và kiểu trả về giữ nguyên ⇒ create or replace là đủ.

create or replace function public.begin_boost_checkout(
  p_seller_id uuid,
  p_listing_id uuid,
  p_days integer
) returns table (order_code bigint, amount integer, replaced_order_code bigint)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_listing public.rental_listings;
  v_open_order public.boost_orders;
  v_config jsonb;
  v_index integer;
  v_amount numeric;
  v_replaced_order_code bigint;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_seller_id is null or p_listing_id is null or p_days is null then
    raise exception 'INVALID_BOOST_PACKAGE' using errcode = '23514';
  end if;

  -- Khóa listing trước — cùng thứ tự khóa với webhook/moderation/delete.
  select * into v_listing from public.rental_listings
  where id = p_listing_id and deleted_at is null for update;
  if not found or v_listing.seller_id <> p_seller_id
      or v_listing.status not in ('PendingApproval', 'Active') then
    raise exception 'LISTING_NOT_CONTACTABLE' using errcode = '23514';
  end if;

  select value into v_config from public.platform_settings
  where key = 'boost_config';
  if v_config is null then
    raise exception 'BOOST_CONFIG_MISSING' using errcode = '23514';
  end if;
  select ordinality - 1 into v_index
  from jsonb_array_elements(v_config -> 'days') with ordinality as d(value, ordinality)
  where (d.value)::integer = p_days limit 1;
  if v_index is null then
    raise exception 'INVALID_BOOST_PACKAGE' using errcode = '23514';
  end if;
  v_amount := ((v_config -> 'price') -> v_index)::numeric;
  if v_amount is null or v_amount <= 0 or v_amount > 1000000000
      or v_amount <> trunc(v_amount) then
    raise exception 'BOOST_CONFIG_MISSING' using errcode = '23514';
  end if;

  -- Đã có đơn trả tiền đang chờ duyệt (kể cả đơn CANCELLED được trả muộn) thì
  -- LUÔN trả về đơn đó để Edge Function báo 409 — không cho trả lần hai, bất kể
  -- đơn PENDING/LINKED nào mới hơn.
  select * into v_open_order from public.boost_orders
  where listing_id = p_listing_id and status = 'PAID_PENDING_APPROVAL'
  order by created_at desc
  limit 1;
  if found then
    return query select v_open_order.order_code, v_open_order.amount, null::bigint;
    return;
  end if;

  select * into v_open_order from public.boost_orders
  where listing_id = p_listing_id
    and status in ('PENDING', 'LINKED')
  order by created_at desc
  limit 1
  for update;

  if found then

    if v_open_order.days = p_days
        and v_open_order.amount = v_amount::integer
        and v_open_order.created_at > now() - interval '10 minutes' then
      return query select v_open_order.order_code, v_open_order.amount, null::bigint;
      return;
    end if;

    update public.boost_orders
    set status = 'CANCELLED', updated_at = now()
    where boost_orders.order_code = v_open_order.order_code;
    v_replaced_order_code := v_open_order.order_code;
  end if;

  return query
    with inserted as (
      insert into public.boost_orders (listing_id, seller_id, days, amount)
      values (p_listing_id, p_seller_id, p_days, v_amount::integer)
      returning boost_orders.order_code, boost_orders.amount
    )
    select inserted.order_code, inserted.amount, v_replaced_order_code from inserted;
end $$;

revoke execute on function public.begin_boost_checkout(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.begin_boost_checkout(uuid, uuid, integer) to service_role;
