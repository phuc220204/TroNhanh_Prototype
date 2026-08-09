-- ═══════════════════════════════════════════════════════════════════════════
-- `public_demand_posts` lộ thêm `desired_province_code` / `desired_ward_codes`
--
-- View này khai cột TƯỜNG MINH (không `dp.*`) — cố ý, vì nó chạy
-- `security_invoker = false` tức bỏ qua RLS của `demand_posts`. Ưu điểm là cột
-- mới không tự động lộ ra công khai; cái giá là mỗi lần thêm cột cần công khai
-- thì phải sửa view, nếu không client đọc mãi không thấy và tưởng dữ liệu chưa
-- được ghi.
--
-- Hai cột mã khu vực AN TOÀN để công khai: chúng chỉ là mã hành chính, đúng thứ
-- người tìm trọ vốn đã công bố trong tin của mình.
--
-- Phần còn lại của view giữ NGUYÊN từng dòng so với `20260729140000` —
-- `rejection_reason` (ghi chú nội bộ Moderator) và `deleted_at` vẫn bị loại,
-- `status = 'Active'` vẫn nằm trong view chứ không phải ở client.
--
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
    dp.desired_province_code,
    dp.desired_ward_codes,
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
