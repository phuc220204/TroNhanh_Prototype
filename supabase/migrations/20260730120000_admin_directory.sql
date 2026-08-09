-- ═══════════════════════════════════════════════════════════════════════════
-- T21 — hai RPC đọc cho khu quản trị.
--
-- VÌ SAO CẦN RPC chứ không query thẳng:
--   `profiles` chỉ có policy SELECT `auth.uid() = user_id`. Query danh sách
--   người dùng từ client sẽ bị RLS lọc còn đúng 1 dòng của chính mình —
--   KHÔNG báo lỗi, chỉ ra kết quả sai. Cùng loại bug đã xảy ra ở inbox (T25).
--   Đếm tổng user bằng `count: exact, head: true` cũng ra 1 vì lý do đó.
--
-- KHÔNG mở policy public/moderator lên `profiles`: bảng có `contact_phone`,
-- RLS là row-level không phải column-level (§3.2).
--
-- PHÂN QUYỀN CỐ Ý KHÁC NHAU:
--   - admin_dashboard_stats  → is_moderator()  (Admin + Moderator): chỉ số đếm.
--   - admin_list_users       → chỉ Admin: có email, khớp với grant_role/
--     revoke_role vốn cũng chỉ Admin. Moderator không cần danh bạ email.
-- Idempotent: create or replace.
-- ═══════════════════════════════════════════════════════════════════════════

-- ══ 1. admin_dashboard_stats ══════════════════════════════════════════════
create or replace function public.admin_dashboard_stats()
returns table (
  pending_listings integer,
  active_listings  integer,
  reported_reviews integer,
  total_users      integer
)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::integer from public.rental_listings
      where status = 'PendingApproval' and deleted_at is null),
    (select count(*)::integer from public.rental_listings
      where status = 'Active' and deleted_at is null),
    (select count(*)::integer from public.reviews
      where report_count > 0 and status <> 'Hidden' and deleted_at is null),
    (select count(*)::integer from public.profiles)
  where public.is_moderator();
$$;

revoke execute on function public.admin_dashboard_stats() from public, anon;
grant  execute on function public.admin_dashboard_stats() to authenticated;

-- ══ 2. admin_list_users ═══════════════════════════════════════════════════
-- `roles` gộp thành mảng để UI không phải bắn thêm truy vấn cho từng người.
create or replace function public.admin_list_users(p_search text default null)
returns table (
  user_id    uuid,
  full_name  text,
  email      text,
  is_seller  boolean,
  roles      text[],
  created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    p.user_id,
    p.full_name,
    u.email::text,
    coalesce(p.is_seller, false),
    coalesce(
      (select array_agg(r.role order by r.role)
         from public.user_roles r where r.user_id = p.user_id),
      '{}'::text[]
    ),
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where public.has_role(auth.uid(), 'Admin')
    and (
      coalesce(trim(p_search), '') = ''
      or p.full_name ilike '%' || trim(p_search) || '%'
      or u.email     ilike '%' || trim(p_search) || '%'
    )
  order by p.created_at desc
  limit 200;
$$;

revoke execute on function public.admin_list_users(text) from public, anon;
grant  execute on function public.admin_list_users(text) to authenticated;
