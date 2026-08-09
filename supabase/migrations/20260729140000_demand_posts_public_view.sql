-- ═══════════════════════════════════════════════════════════════════════════
-- T22 — view công khai cho demand post, để lấy tên người đăng.
--
-- VÌ SAO CẦN VIEW: `demand_posts.renter_id` tham chiếu `auth.users`, KHÔNG có
-- FK sang `profiles`, nên không join được bằng PostgREST. Và `profiles` chỉ có
-- policy SELECT `auth.uid() = user_id` — query thẳng tên người khác sẽ bị RLS
-- lọc mất row mà không báo lỗi (đúng bug đã xảy ra ở inbox T25).
--
-- VÌ SAO KHÔNG MỞ POLICY PUBLIC LÊN `profiles`: bảng có `contact_phone`.
-- RLS là row-level, không phải column-level (§3.2).
--
-- ⚠️ `security_invoker = false` ⇒ view chạy bằng quyền OWNER và BỎ QUA RLS của
-- `demand_posts`. Vì vậy hai thứ dưới đây là BIÊN BẢO MẬT, không phải trang trí:
--   1. Danh sách cột TƯỜNG MINH — không `dp.*`. Cột thêm vào bảng sau này sẽ
--      KHÔNG tự động lộ ra công khai.
--   2. `status = 'Active'` nằm TRONG view — nếu chỉ lọc ở client thì bất kỳ ai
--      cũng đọc được tin Draft/Hidden/Rejected bằng cách gọi thẳng PostgREST.
--
-- CỐ Ý LOẠI: `rejection_reason` (ghi chú nội bộ của Moderator) và `deleted_at`.
-- Idempotent: drop ... if exists + create.
-- ═══════════════════════════════════════════════════════════════════════════

drop view if exists public.public_demand_posts;

create view public.public_demand_posts with (security_invoker = false) as
  select
    dp.id,
    dp.renter_id,
    dp.kind,
    dp.status,
    dp.title,
    dp.description,
    dp.desired_districts,
    dp.price_min,
    dp.price_max,
    dp.property_type,
    dp.min_area,
    dp.desired_amenities,
    dp.move_in_date,
    dp.occupant_count,
    dp.current_address,
    dp.district,
    dp.share_price,
    dp.needed_count,
    dp.gender_requirement,
    dp.requirements,
    dp.contact_name,
    dp.contact_phone,
    dp.expire_at,
    dp.created_at,
    dp.updated_at,
    coalesce(p.full_name, 'Khách thuê') as renter_name
  from public.demand_posts dp
  left join public.profiles p on dp.renter_id = p.user_id
  where dp.deleted_at is null
    and dp.status = 'Active';

grant select on public.public_demand_posts to anon, authenticated;
