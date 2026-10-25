-- Kiểm chứng đơn payOS sau giao dịch thật — CHỈ ĐỌC.
-- Chạy: pnpm exec supabase db query --linked --file scripts/sql/verify-payos/saas-orders.sql
-- Đọc kết quả: docs/PAYMENT_VERIFICATION_VI.md. Đơn PAID mà cột ok_* = false ⇒ lỗi đối soát.

-- 1. Gói Quản lý vận hành (saas_orders, dải order_code 300000000000+)
--    PAID ⇒ phải có payments.purpose = 'Subscription' cùng số tiền, và
--    user_subscriptions của người mua đang ACTIVE, hạn sau ngày trả tiền.
select
  'saas' as kind,
  o.order_code,
  u.email,
  p.name as plan,
  o.amount,
  o.is_renewal,
  o.status,
  o.payos_reference,
  o.created_at,
  o.paid_at,
  pay.amount as payment_amount,
  s.status as subscription_status,
  s.expire_date,
  (o.status <> 'PAID') or (pay.id is not null and pay.amount = o.amount and pay.purpose = 'Subscription') as ok_payment,
  (o.status <> 'PAID') or (s.status = 'ACTIVE' and s.expire_date > o.paid_at::date) as ok_subscription
from public.saas_orders o
join auth.users u on u.id = o.seller_id
join public.subscription_plans p on p.id = o.plan_id
left join public.payments pay on pay.id = o.payment_id
left join lateral (
  select status, expire_date from public.user_subscriptions
   where seller_id = o.seller_id order by created_at desc limit 1
) s on true
order by o.created_at desc
limit 10;
