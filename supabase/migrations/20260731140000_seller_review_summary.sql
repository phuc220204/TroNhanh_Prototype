-- ═══════════════════════════════════════════════════════════════════════════
-- T26 — màn "Đánh giá khu trọ" của chủ trọ cần dữ liệu của CẢ HAI domain:
-- `properties` (workspace) và `reviews` (marketplace).
--
-- §2.2: mọi crossing ngoài 2 điểm nối được phép PHẢI làm server-side trong RPC,
-- không phải bằng cách để page của shell này import service của shell kia.
-- Vì vậy gộp vào một RPC thay vì cho workspace/pages import review-service.
--
-- ⚠️ CỘT TƯỜNG MINH: `properties` chứa bank_account_number / bank_account_name.
-- `security definer` bỏ qua RLS nên `p.*` ở đây là rò rỉ thẳng (§3.2).
-- Idempotent: create or replace.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.get_my_properties_review_summary()
returns table (
  property_id       uuid,
  property_name     text,
  district          text,
  public_slug       text,
  is_public_profile boolean,
  avg_rating        numeric,
  review_count      integer
)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    p.name,
    p.district,
    p.public_slug,
    p.is_public_profile_enabled,
    p.avg_rating,
    p.review_count
  from public.properties p
  where auth.uid() is not null
    and p.owner_id = auth.uid()
    and p.deleted_at is null
  order by p.created_at desc;
$$;

revoke execute on function public.get_my_properties_review_summary() from public, anon;
grant  execute on function public.get_my_properties_review_summary() to authenticated;
