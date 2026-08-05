-- ═══════════════════════════════════════════════════════════════════════════
-- T26 — hai RPC hỗ trợ luồng đánh giá.
--
-- ⚠️ KHÔNG nới `can_review_contract()`. Cổng 30 ngày + link_status='Confirmed'
-- + không-tự-review là toàn bộ giá trị chống gian lận của tính năng (BR-022,
-- BR-029, BR-030). Hai hàm dưới đây chỉ ĐỌC lại kết quả của nó để UI hiển thị
-- đúng, không thay thế và không nới điều kiện.
-- ═══════════════════════════════════════════════════════════════════════════

-- ══ 1. get_my_stays ═══════════════════════════════════════════════════════
-- VÌ SAO CẦN RPC: renter đọc được `occupancies` và `contracts` của mình, nhưng
-- `rooms` và `properties` chỉ có policy owner-only. Query thẳng để lấy tên khu
-- / mã phòng sẽ bị RLS lọc mất row mà KHÔNG báo lỗi — đúng loại bug đã xảy ra
-- ở inbox (T25) và danh bạ admin (T21).
--
-- ⚠️ DANH SÁCH CỘT TƯỜNG MINH. `properties` chứa bank_account_number /
-- bank_account_name; `security definer` bỏ qua RLS nên `p.*` ở đây sẽ phơi số
-- tài khoản ngân hàng của chủ trọ cho người ở (§3.2).
create or replace function public.get_my_stays()
returns table (
  occupancy_id      uuid,
  link_status       text,
  occupant_name     text,
  contract_id       uuid,
  contract_status   text,
  start_date        date,
  end_date          date,
  rent_price        numeric,
  deposit           numeric,
  room_id           uuid,
  room_code         text,
  property_id       uuid,
  property_name     text,
  property_district text,
  public_slug       text,
  is_public_profile boolean,
  can_review        boolean,
  review_id         uuid,
  review_rating     integer,
  review_content    text,
  review_created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    o.id,
    o.link_status,
    o.full_name,
    c.id,
    c.status,
    c.start_date,
    c.end_date,
    c.rent_price,
    c.deposit,
    r.id,
    r.room_code,
    p.id,
    p.name,
    p.district,
    p.public_slug,
    p.is_public_profile_enabled,
    -- Không tự tính lại điều kiện: gọi đúng hàm là nguồn chân lý.
    coalesce(public.can_review_contract(auth.uid(), c.id), false),
    rv.id,
    rv.rating,
    rv.content,
    rv.created_at
  from public.occupancies o
  left join public.contracts  c on c.occupancy_id = o.id and c.deleted_at is null
  left join public.rooms      r on r.id = o.room_id
  left join public.properties p on p.id = r.property_id
  left join public.reviews    rv on rv.contract_id = c.id
                                and rv.author_user_id = auth.uid()
                                and rv.deleted_at is null
  where auth.uid() is not null
    and o.user_id = auth.uid()
    and o.deleted_at is null
  order by o.is_active desc nulls last, c.start_date desc nulls last;
$$;

revoke execute on function public.get_my_stays() from public, anon;
grant  execute on function public.get_my_stays() to authenticated;

-- ══ 2. set_property_public_profile ════════════════════════════════════════
-- BR-024: bật/tắt trang khu trọ công khai. Sinh `public_slug` server-side vì
-- cột có unique index — để client tự bịa slug sẽ đụng nhau và lỗi khó hiểu.
create or replace function public.set_property_public_profile(
  p_property_id uuid,
  p_enabled     boolean
) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid  uuid;
  v_slug text;
  v_base text;
  v_n    integer := 0;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  if not public.owns_property(p_property_id) then
    raise exception 'PROPERTY_NOT_OWNED';
  end if;

  select public_slug into v_slug from public.properties where id = p_property_id;

  if p_enabled and coalesce(v_slug, '') = '' then
    -- Bỏ dấu tiếng Việt bằng translate() thuần SQL — KHÔNG dùng extension
    -- `unaccent` vì nó không được bật trên project này.
    select lower(regexp_replace(
             regexp_replace(
               translate(
                 name,
                 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ'
                 || 'ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ',
                 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
                 || 'AAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'
               ),
               '[^a-zA-Z0-9]+', '-', 'g'),
             '(^-+|-+$)', '', 'g'))
      into v_base
      from public.properties where id = p_property_id;

    v_base := nullif(v_base, '');
    if v_base is null then v_base := 'khu-tro'; end if;

    v_slug := v_base;
    while exists (select 1 from public.properties
                  where public_slug = v_slug and id <> p_property_id) loop
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n;
    end loop;
  end if;

  update public.properties
     set is_public_profile_enabled = p_enabled,
         public_slug = case when p_enabled then v_slug else public_slug end
   where id = p_property_id;

  return v_slug;
end $$;

revoke execute on function public.set_property_public_profile(uuid, boolean) from public, anon;
grant  execute on function public.set_property_public_profile(uuid, boolean) to authenticated;
