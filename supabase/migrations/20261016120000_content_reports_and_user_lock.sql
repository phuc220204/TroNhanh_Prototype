-- ═══════════════════════════════════════════════════════════════════════════
-- Báo cáo vi phạm + khóa tài khoản (mục 4b báo cáo kiểm thử 16/10/2026).
--
-- Trước migration này:
--   • `reviews.report_count` không có đường nào tăng ⇒ hàng chờ /quan-tri/danh-gia
--     luôn rỗng; không có nút "báo cáo tin lừa đảo".
--   • Admin không khóa được tài khoản lừa đảo.
--
-- Gồm:
--   1. Bảng `content_reports` — chỉ ghi qua RPC, người báo cáo đọc được báo cáo
--      của chính mình, Moderator đọc tất cả.
--   2. `report_content`        — người dùng báo cáo tin cho thuê / đánh giá / tin nhu cầu.
--   3. `list_open_reports`     — Moderator xem hàng chờ, gom theo đối tượng.
--   4. `resolve_reports`       — Moderator ẩn nội dung + đóng báo cáo (một transaction).
--   5. `admin_set_user_lock`   — Admin khóa/mở khóa tài khoản: đặt
--      auth.users.banned_until (GoTrue chặn đăng nhập + làm mới token) và xóa
--      phiên hiện có. Access token đang cầm còn sống tới khi hết hạn (≤ 1 giờ).
--   6. `admin_list_users` trả thêm `locked_until`.
--
-- Không dùng service_role, không Edge Function: hàm security definer do postgres
-- sở hữu được phép ghi auth.users / auth.sessions. Biên bảo mật = assert
-- has_role(…,'Admin') / is_moderator() trong body.
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Bảng báo cáo ─────────────────────────────────────────────────────────
create table if not exists public.content_reports (
  id              uuid primary key default gen_random_uuid(),
  target_type     text not null check (target_type in ('RentalListing', 'Review', 'DemandPost')),
  target_id       uuid not null,
  reporter_id     uuid not null references auth.users(id) on delete cascade,
  reason          text not null check (reason in ('Scam', 'WrongInfo', 'AlreadyRented', 'Duplicate', 'Offensive', 'Other')),
  details         text check (char_length(details) <= 1000),
  status          text not null default 'Open' check (status in ('Open', 'Resolved', 'Dismissed')),
  resolved_by     uuid references auth.users(id),
  resolved_at     timestamptz,
  resolution_note text check (char_length(resolution_note) <= 1000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Một người chỉ báo cáo một đối tượng một lần ⇒ không spam đẩy số đếm.
  unique (reporter_id, target_type, target_id)
);

create index if not exists idx_content_reports_open
  on public.content_reports (target_type, target_id) where status = 'Open';

drop trigger if exists update_content_reports_modtime on public.content_reports;
create trigger update_content_reports_modtime
  before update on public.content_reports
  for each row execute procedure public.update_updated_at_column();

alter table public.content_reports enable row level security;

drop policy if exists "Reporter reads own reports" on public.content_reports;
create policy "Reporter reads own reports" on public.content_reports
  for select to authenticated
  using (reporter_id = auth.uid());

drop policy if exists "Moderator reads all reports" on public.content_reports;
create policy "Moderator reads all reports" on public.content_reports
  for select to authenticated
  using (public.is_moderator());

-- Không có policy INSERT/UPDATE/DELETE: mọi ghi đi qua RPC bên dưới.
grant select on public.content_reports to authenticated;

-- ── 2. Người dùng báo cáo ───────────────────────────────────────────────────
create or replace function public.report_content(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default null
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid;
  v_owner uuid;
  v_report_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  if p_target_type not in ('RentalListing', 'Review', 'DemandPost') then
    raise exception 'INVALID_REPORT' using errcode = 'P0001';
  end if;
  if p_reason not in ('Scam', 'WrongInfo', 'AlreadyRented', 'Duplicate', 'Offensive', 'Other') then
    raise exception 'INVALID_REPORT' using errcode = 'P0001';
  end if;
  if p_reason = 'Other' and coalesce(trim(p_details), '') = '' then
    raise exception 'REPORT_DETAILS_REQUIRED' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_details, '')) > 1000 then
    raise exception 'INVALID_REPORT' using errcode = 'P0001';
  end if;

  -- Chủ sở hữu derive server-side; chỉ báo cáo được nội dung đang hiển thị.
  if p_target_type = 'RentalListing' then
    select seller_id into v_owner from public.rental_listings
     where id = p_target_id and deleted_at is null and status = 'Active';
  elsif p_target_type = 'Review' then
    select author_user_id into v_owner from public.reviews
     where id = p_target_id and deleted_at is null and status <> 'Hidden';
  else
    select renter_id into v_owner from public.demand_posts
     where id = p_target_id and deleted_at is null and status = 'Active';
  end if;
  if v_owner is null then raise exception 'REPORT_TARGET_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_owner = v_uid then raise exception 'CANNOT_REPORT_OWN_CONTENT' using errcode = 'P0001'; end if;

  begin
    insert into public.content_reports (target_type, target_id, reporter_id, reason, details)
    values (p_target_type, p_target_id, v_uid, p_reason, nullif(trim(p_details), ''))
    returning id into v_report_id;
  exception when unique_violation then
    raise exception 'ALREADY_REPORTED' using errcode = 'P0001';
  end;

  -- Giữ report_count cho hàng chờ đánh giá cũ (/quan-tri/danh-gia, admin_dashboard_stats).
  if p_target_type = 'Review' then
    update public.reviews set report_count = coalesce(report_count, 0) + 1 where id = p_target_id;
  end if;

  return v_report_id;
end $$;

revoke execute on function public.report_content(text, uuid, text, text) from public, anon;
grant  execute on function public.report_content(text, uuid, text, text) to authenticated;

-- ── 3. Hàng chờ của Moderator ───────────────────────────────────────────────
create or replace function public.list_open_reports()
returns table (
  target_type text,
  target_id uuid,
  target_title text,
  target_owner_id uuid,
  report_count integer,
  reasons text[],
  latest_details text,
  first_reported_at timestamptz,
  last_reported_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.is_moderator() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;

  return query
  with grouped as (
    select r.target_type, r.target_id,
           count(*)::integer as report_count,
           array_agg(distinct r.reason) as reasons,
           (array_agg(r.details order by r.created_at desc) filter (where r.details is not null))[1] as latest_details,
           min(r.created_at) as first_reported_at,
           max(r.created_at) as last_reported_at
      from public.content_reports r
     where r.status = 'Open'
     group by r.target_type, r.target_id
  )
  select g.target_type, g.target_id,
         coalesce(l.title, left(rv.content, 120), d.title, '(nội dung đã bị xóa)'),
         coalesce(l.seller_id, rv.author_user_id, d.renter_id),
         g.report_count, g.reasons, g.latest_details, g.first_reported_at, g.last_reported_at
    from grouped g
    left join public.rental_listings l on g.target_type = 'RentalListing' and l.id = g.target_id
    left join public.reviews rv        on g.target_type = 'Review'        and rv.id = g.target_id
    left join public.demand_posts d    on g.target_type = 'DemandPost'    and d.id = g.target_id
   order by g.report_count desc, g.last_reported_at desc
   limit 200;
end $$;

revoke execute on function public.list_open_reports() from public, anon;
grant  execute on function public.list_open_reports() to authenticated;

-- ── 4. Xử lý báo cáo ────────────────────────────────────────────────────────
-- p_hide = true  ⇒ ẩn nội dung (ghi moderation_logs) + đóng báo cáo là Resolved.
-- p_hide = false ⇒ đóng báo cáo là Dismissed, nội dung giữ nguyên.
create or replace function public.resolve_reports(
  p_target_type text,
  p_target_id uuid,
  p_hide boolean,
  p_note text default null
) returns integer
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid;
  v_count integer;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.is_moderator() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_target_type not in ('RentalListing', 'Review', 'DemandPost') then
    raise exception 'INVALID_REPORT' using errcode = 'P0001';
  end if;
  if p_hide and coalesce(trim(p_note), '') = '' then
    raise exception 'REASON_REQUIRED' using errcode = 'P0001';
  end if;

  if p_hide then
    if p_target_type = 'RentalListing' then
      update public.rental_listings
         set status = 'Hidden', moderated_by = v_uid, moderated_at = now()
       where id = p_target_id and deleted_at is null;
    elsif p_target_type = 'Review' then
      update public.reviews set status = 'Hidden' where id = p_target_id;
    else
      update public.demand_posts set status = 'Hidden' where id = p_target_id;
    end if;

    insert into public.moderation_logs (target_type, target_id, moderator_id, action, reason)
    values (p_target_type, p_target_id, v_uid, 'Hide', trim(p_note));
  end if;

  update public.content_reports
     set status = case when p_hide then 'Resolved' else 'Dismissed' end,
         resolved_by = v_uid,
         resolved_at = now(),
         resolution_note = nullif(trim(p_note), '')
   where target_type = p_target_type
     and target_id = p_target_id
     and status = 'Open';
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'REPORT_TARGET_NOT_FOUND' using errcode = 'P0001'; end if;

  return v_count;
end $$;

revoke execute on function public.resolve_reports(text, uuid, boolean, text) from public, anon;
grant  execute on function public.resolve_reports(text, uuid, boolean, text) to authenticated;

-- ── 5. Khóa / mở khóa tài khoản (chỉ Admin) ─────────────────────────────────
create or replace function public.admin_set_user_lock(
  p_user_id uuid,
  p_locked boolean,
  p_reason text default null
) returns timestamptz
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid;
  v_until timestamptz;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.has_role(v_uid, 'Admin') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_user_id = v_uid then raise exception 'CANNOT_LOCK_SELF' using errcode = 'P0001'; end if;
  if public.has_role(p_user_id, 'Admin') then raise exception 'CANNOT_LOCK_ADMIN' using errcode = 'P0001'; end if;
  if p_locked and coalesce(trim(p_reason), '') = '' then
    raise exception 'REASON_REQUIRED' using errcode = 'P0001';
  end if;

  -- GoTrue coi banned_until > now() là bị khóa. Không dùng 'infinity': mốc 100 năm
  -- an toàn cho bộ parse thời gian của GoTrue.
  v_until := case when p_locked then now() + interval '100 years' else null end;

  update auth.users set banned_until = v_until where id = p_user_id;
  if not found then raise exception 'USER_NOT_FOUND' using errcode = 'P0001'; end if;

  -- Xóa phiên ⇒ refresh token chết, người bị khóa không gia hạn được phiên.
  if p_locked then
    delete from auth.sessions where user_id = p_user_id;
  end if;

  insert into public.moderation_logs (target_type, target_id, moderator_id, action, reason)
  values ('User', p_user_id, v_uid, case when p_locked then 'Lock' else 'Unlock' end, nullif(trim(p_reason), ''));

  return v_until;
end $$;

revoke execute on function public.admin_set_user_lock(uuid, boolean, text) from public, anon;
grant  execute on function public.admin_set_user_lock(uuid, boolean, text) to authenticated;

-- ── 6. Danh bạ admin trả thêm trạng thái khóa ───────────────────────────────
-- Đổi kiểu trả về ⇒ phải drop rồi tạo lại.
drop function if exists public.admin_list_users(text);
create function public.admin_list_users(p_search text default null)
returns table (
  user_id uuid,
  full_name text,
  email text,
  is_seller boolean,
  roles text[],
  created_at timestamptz,
  locked_until timestamptz
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
    p.created_at,
    case when u.banned_until > now() then u.banned_until else null end
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
