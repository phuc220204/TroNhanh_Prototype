-- Kiểm chứng đơn payOS sau giao dịch thật — CHỈ ĐỌC.
-- Chạy: pnpm exec supabase db query --linked --file scripts/sql/verify-payos/boost-orders.sql
-- Đọc kết quả: docs/PAYMENT_VERIFICATION_VI.md. Đơn PAID mà cột ok_* = false ⇒ lỗi đối soát.

-- 2. Boost tin cho thuê (boost_orders)
--    PAID ⇒ tin có boost_payment_verified = true và boost_expire_at còn hạn.
--    PAID_PENDING_APPROVAL ⇒ đang chờ duyệt tin, Boost chưa chạy là ĐÚNG.
select
  'boost' as kind,
  o.order_code,
  u.email,
  o.days,
  o.amount,
  o.status,
  o.created_at,
  o.paid_at,
  l.title,
  l.boost_payment_verified,
  l.boost_expire_at,
  (o.status <> 'PAID') or (l.boost_payment_verified and l.boost_expire_at > o.paid_at) as ok_boost
from public.boost_orders o
join auth.users u on u.id = o.seller_id
left join public.rental_listings l on l.id = o.listing_id
order by o.created_at desc
limit 10;
