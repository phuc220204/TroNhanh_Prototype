-- Kiểm BR-014 qua view (20261011090000 + 20261011100000). Chạy:
--   supabase db query --linked --file supabase/tests/public_listings_view.sql
-- Rollback toàn bộ.

begin;

create temp table if not exists view_results (test text, passed boolean, detail text) on commit drop;
grant all on view_results to anon, authenticated;

-- Áp trạng thái sau bước cuối ngay trong transaction (idempotent nếu đã áp).
revoke select on public.rental_listings from anon;
grant select (id, status, deleted_at) on public.rental_listings to anon;

do $$
declare
  v_count integer;
  v_media integer;
  v_amen integer;
  v_text text;
begin
  perform set_config('request.jwt.claims', '', true);
  set local role anon;

  begin
    perform contact_phone from public.rental_listings limit 1;
    insert into view_results values ('anon KHÔNG đọc rental_listings.contact_phone', false, 'đọc được');
  exception when insufficient_privilege then
    insert into view_results values ('anon KHÔNG đọc rental_listings.contact_phone', true, sqlerrm);
  end;

  begin
    select count(*) into v_count from public.public_rental_listings;
    select count(*) into v_media from public.listing_media m
      where m.listing_id in (select id from public.public_rental_listings);
    select count(*) into v_amen from public.listing_amenities a
      where a.listing_id in (select id from public.public_rental_listings);
    insert into view_results values ('anon đọc view + ảnh + tiện ích', v_count > 0 and v_media > 0 and v_amen > 0,
      v_count || ' tin, ' || v_media || ' ảnh, ' || v_amen || ' tiện ích');
  exception when others then
    insert into view_results values ('anon đọc view + ảnh + tiện ích', false, sqlerrm);
  end;

  begin
    select string_agg(id::text, ',') into v_text from (
      select id from public.public_rental_listings order by is_boost_active desc, created_at desc limit 3
    ) t;
    insert into view_results values ('anon sắp xếp theo is_boost_active', v_text is not null, v_text);
  exception when others then
    insert into view_results values ('anon sắp xếp theo is_boost_active', false, sqlerrm);
  end;

  begin
    select count(*) into v_count from public.public_rental_listings where contact_phone_masked ~ '^[0-9]{9,}$';
    insert into view_results values ('view chỉ có số đã che', v_count = 0, v_count || ' số đầy đủ');
  exception when others then
    insert into view_results values ('view chỉ có số đã che', false, sqlerrm);
  end;
  reset role;
end;
$$;

select case when passed then 'PASS' else 'FAIL' end as result, test, detail from view_results order by passed, test;

rollback;
