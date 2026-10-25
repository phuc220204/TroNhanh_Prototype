-- Kiểm chứng đơn payOS sau giao dịch thật — CHỈ ĐỌC.
-- Chạy: pnpm exec supabase db query --linked --file scripts/sql/verify-payos/demand-boost-orders.sql
-- Đọc kết quả: docs/PAYMENT_VERIFICATION_VI.md. Đơn PAID mà cột ok_* = false ⇒ lỗi đối soát.

-- 3. Đẩy tin nhu cầu (demand_boost_orders)
--    PAID ⇒ tin nhu cầu có boost_expire_at sau thời điểm trả tiền.
select
  'demand_boost' as kind,
  o.order_code,
  u.email,
  o.days,
  o.amount,
  o.status,
  o.created_at,
  o.paid_at,
  d.title,
  d.boost_expire_at,
  (o.status <> 'PAID') or (d.boost_expire_at > o.paid_at) as ok_boost
from public.demand_boost_orders o
join auth.users u on u.id = o.renter_id
left join public.demand_posts d on d.id = o.demand_post_id
order by o.created_at desc
limit 10;
