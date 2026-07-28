-- ═══════════════════════════════════════════════════════════════════════════
-- T25 fix — inbox lấy được tên đối phương và tiêu đề tin tham chiếu.
--
-- VẤN ĐỀ 1 (bug người dùng báo): `profiles` chỉ có policy SELECT
-- `auth.uid() = user_id`, nên client đọc profile của người kia luôn bị RLS lọc
-- mất row — KHÔNG có lỗi, chỉ trả null. Inbox vì thế hiện "Người dùng".
--
-- VÌ SAO KHÔNG THÊM POLICY PUBLIC LÊN `profiles`: RLS là row-level, không phải
-- column-level. Policy public sẽ phơi luôn `contact_phone` của mọi người
-- (BR-014 yêu cầu che SĐT với khách). Cùng nguyên tắc với `properties` (§3.2):
-- cần đọc một phần bảng có cột nhạy cảm thì allow-list cột, không dùng policy.
--
-- VẤN ĐỀ 2 (ranh giới shell): messaging-service.ts nằm ở src/shared/services/
-- nhưng phải đọc `rental_listings` / `demand_posts` để lấy tiêu đề — hai bảng
-- đó thuộc marketplace (§2.1). Gom việc join vào RPC này để tầng shared không
-- chạm bảng của domain khác. Phụ thu: tin đã Hidden/Expired vẫn ra tiêu đề,
-- và inbox chỉ còn 1 round-trip thay vì 2 truy vấn mỗi hội thoại.
--
-- BẢO MẬT: hàm không nhận tham số. Mọi thứ nó trả về đều giới hạn trong các
-- hội thoại mà chính người gọi là initiator hoặc poster, nên không dò được ai.
-- Chỉ trả `full_name` — không bao giờ trả `contact_phone`.
-- Idempotent: create or replace.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.get_my_conversations()
returns table (
  id                   uuid,
  ref_type             text,
  ref_id               uuid,
  initiator_id         uuid,
  poster_id            uuid,
  status               text,
  last_message_at      timestamptz,
  last_message_preview text,
  initiator_unread     integer,
  poster_unread        integer,
  created_at           timestamptz,
  updated_at           timestamptz,
  partner_id           uuid,
  partner_name         text,
  ref_title            text
)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    c.ref_type,
    c.ref_id,
    c.initiator_id,
    c.poster_id,
    c.status,
    c.last_message_at,
    c.last_message_preview,
    c.initiator_unread,
    c.poster_unread,
    c.created_at,
    c.updated_at,
    case when c.initiator_id = auth.uid() then c.poster_id else c.initiator_id end
      as partner_id,
    p.full_name as partner_name,
    case c.ref_type
      when 'RentalListing' then rl.title
      when 'DemandPost'    then dp.title
    end as ref_title
  from public.conversations c
  left join public.profiles p
    on p.user_id = case when c.initiator_id = auth.uid() then c.poster_id else c.initiator_id end
  left join public.rental_listings rl
    on c.ref_type = 'RentalListing' and rl.id = c.ref_id
  left join public.demand_posts dp
    on c.ref_type = 'DemandPost' and dp.id = c.ref_id
  where auth.uid() is not null
    and auth.uid() in (c.initiator_id, c.poster_id)
  order by c.last_message_at desc;
$$;

-- Không cấp cho anon: khách chưa đăng nhập không có hội thoại nào, và hàm này
-- không được dùng trong bất kỳ policy nào nên không cần EXECUTE cho anon (§3.1).
revoke execute on function public.get_my_conversations() from public, anon;
grant  execute on function public.get_my_conversations() to authenticated;
