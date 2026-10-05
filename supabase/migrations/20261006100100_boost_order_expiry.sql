-- Đơn Boost chưa thanh toán không còn bị kẹt.
--
-- Trước đây một đơn PENDING/LINKED được dùng lại mãi mãi: đổi gói báo
-- BOOST_OPEN_ORDER_PACKAGE_MISMATCH không lối thoát, link payOS cũ có thể đã hết
-- hạn, admin đổi giá thì đơn cũ vẫn giữ giá cũ.
--
-- Giờ: Edge Function tạo link payOS sống 15 phút (`expiredAt`). Đơn mở chỉ được
-- dùng lại khi CÙNG gói, CÙNG giá hiện tại và tạo chưa quá 10 phút (link trả về
-- luôn còn ≥ 5 phút). Ngược lại đơn cũ chuyển CANCELLED và tạo đơn mới; mã đơn
-- bị thay được trả về để Edge Function hủy link cũ bên payOS (best-effort).
--
-- Tiền vẫn về cho một đơn CANCELLED (khách trả link cũ trước khi nó hết hạn):
-- `complete_verified_boost_payment` chỉ bỏ qua PAID_PENDING_APPROVAL/PAID/
-- NEEDS_REVIEW, nên đơn CANCELLED được ghi nhận và cấp Boost như đơn thường —
-- đã trả tiền thì phải có quyền lợi.

alter table public.boost_orders
  drop constraint if exists boost_orders_status_check;
alter table public.boost_orders
  add constraint boost_orders_status_check
  check (status in ('PENDING', 'LINKED', 'PAID_PENDING_APPROVAL', 'PAID', 'NEEDS_REVIEW', 'CANCELLED'));

-- Đổi kiểu trả về (thêm replaced_order_code) ⇒ phải drop rồi tạo lại.
drop function if exists public.begin_boost_checkout(uuid, uuid, integer);

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

  select * into v_open_order from public.boost_orders
  where listing_id = p_listing_id
    and status in ('PENDING', 'LINKED', 'PAID_PENDING_APPROVAL')
  order by created_at desc
  limit 1
  for update;

  if found then
    -- Đã thanh toán, đang chờ duyệt: trả về để Edge Function báo 409, không tạo đơn mới.
    if v_open_order.status = 'PAID_PENDING_APPROVAL' then
      return query select v_open_order.order_code, v_open_order.amount, null::bigint;
      return;
    end if;

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
