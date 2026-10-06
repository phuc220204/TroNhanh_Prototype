-- Kiểm migration 20261010090000_low_hardening. Chạy:
--   supabase db query --linked --file supabase/tests/low_hardening.sql
-- Mọi fixture nằm trong transaction này và bị rollback.

begin;

create temp table if not exists low_results (
  test text,
  passed boolean,
  detail text
) on commit drop;
grant all on low_results to anon, authenticated;

do $$
declare
  v_seller_a uuid;
  v_seller_b uuid;
  v_renter uuid;
  v_renter_email text;
  v_property uuid;
  v_room uuid;
  v_occupancy uuid;
  v_listing uuid;
  v_new_user uuid := gen_random_uuid();
  v_before integer;
  v_after integer;
  v_text text;
  v_uuid uuid;
begin
  select id into v_seller_a from auth.users where email = 'seller.a@tronhanh.demo';
  select id into v_seller_b from auth.users where email = 'seller.b@tronhanh.demo';
  select id, email into v_renter, v_renter_email from auth.users where email = 'renter.a@tronhanh.demo';
  if v_seller_a is null or v_seller_b is null or v_renter is null then
    insert into low_results values ('setup demo accounts', false, 'thiếu tài khoản demo');
    return;
  end if;

  perform set_config('request.jwt.claims', '', true);
  insert into public.properties (owner_id, name) values (v_seller_a, 'LOW A') returning id into v_property;
  insert into public.rooms (property_id, owner_id, room_code, area, price, status)
    values (v_property, v_seller_a, 'LOW-A', 20, 3000000, 'Available') returning id into v_room;
  insert into public.occupancies (room_id, owner_id, full_name)
    values (v_room, v_seller_a, 'Người ở LOW') returning id into v_occupancy;
  select id into v_listing from public.rental_listings
    where seller_id = v_seller_a and status = 'Active' and deleted_at is null limit 1;

  -- ── 2. Gắn tài khoản ───────────────────────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', v_seller_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.link_renter_account(v_occupancy, 'chua-co-tai-khoan-low@example.com');
    reset role;
    select pending_link_email || '|' || coalesce(user_id::text, 'null') || '|' || link_status into v_text
      from public.occupancies where id = v_occupancy;
    insert into low_results values ('email chưa đăng ký: không lỗi, giữ email chờ',
      v_text = 'chua-co-tai-khoan-low@example.com|null|Pending', v_text);
  exception when others then
    reset role;
    insert into low_results values ('email chưa đăng ký: không lỗi, giữ email chờ', false, sqlerrm);
  end;

  set local role authenticated;
  begin
    perform public.link_renter_account(v_occupancy, upper(v_renter_email));
    reset role;
    select coalesce(pending_link_email, 'null') || '|' || user_id::text into v_text
      from public.occupancies where id = v_occupancy;
    insert into low_results values ('email đã đăng ký: gắn user_id như cũ', v_text = 'null|' || v_renter, v_text);
  exception when others then
    reset role;
    insert into low_results values ('email đã đăng ký: gắn user_id như cũ', false, sqlerrm);
  end;

  set local role authenticated;
  begin
    perform public.link_renter_account(v_occupancy, 'khong-phai-email');
    reset role;
    insert into low_results values ('email sai định dạng bị chặn', false, 'không lỗi');
  exception when others then
    reset role;
    insert into low_results values ('email sai định dạng bị chặn', sqlerrm like '%INVALID_EMAIL%', sqlerrm);
  end;

  -- Email chờ được gắn khi tài khoản mới XÁC MINH email (không phải lúc đăng ký).
  set local role authenticated;
  perform public.link_renter_account(v_occupancy, 'low-new-user@example.com');
  reset role;
  perform set_config('request.jwt.claims', '', true);
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_user_meta_data)
    values (v_new_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'low-new-user@example.com', '', now(), now(), '{}'::jsonb);
  select user_id into v_uuid from public.occupancies where id = v_occupancy;
  insert into low_results values ('đăng ký chưa xác minh email: CHƯA gắn', v_uuid is null, coalesce(v_uuid::text, 'null'));
  update auth.users set email_confirmed_at = now() where id = v_new_user;
  select user_id into v_uuid from public.occupancies where id = v_occupancy;
  insert into low_results values ('xác minh email: gắn vào liên kết đang chờ', v_uuid = v_new_user, coalesce(v_uuid::text, 'null'));

  -- ── 1. Ảnh tin ─────────────────────────────────────────────────────────────
  if v_listing is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', v_seller_a, 'role', 'authenticated')::text, true);
    begin
      perform public.update_listing_with_details(v_listing, '{}'::jsonb, null,
        jsonb_build_array(jsonb_build_object('storage_path', v_seller_b::text || '/stolen.jpg', 'sort_order', 99)));
      insert into low_results values ('gắn ảnh trong thư mục người khác bị chặn', false, 'gắn được');
    exception when others then
      insert into low_results values ('gắn ảnh trong thư mục người khác bị chặn', sqlerrm like '%MEDIA_PATH_NOT_OWNED%', sqlerrm);
    end;
  else
    insert into low_results values ('gắn ảnh trong thư mục người khác bị chặn', false, 'seller A không có tin Active để thử');
  end if;

  -- ── 4. Lượt xem ────────────────────────────────────────────────────────────
  if v_listing is not null then
    select view_count into v_before from public.rental_listings where id = v_listing;
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.headers', '{"x-forwarded-for":"203.0.113.9, 10.0.0.1"}', true);
    set local role anon;
    perform public.increment_listing_view(v_listing);
    perform public.increment_listing_view(v_listing);
    perform public.increment_listing_view(v_listing);
    reset role;
    select view_count into v_after from public.rental_listings where id = v_listing;
    insert into low_results values ('cùng IP gọi 3 lần chỉ +1 lượt xem', v_after - coalesce(v_before, 0) = 1,
      coalesce(v_before, 0) || ' → ' || v_after);
    perform set_config('request.headers', '{"x-forwarded-for":"198.51.100.7"}', true);
    set local role anon;
    perform public.increment_listing_view(v_listing);
    reset role;
    select view_count into v_before from public.rental_listings where id = v_listing;
    insert into low_results values ('IP khác vẫn được tính', v_before = v_after + 1, v_after || ' → ' || v_before);
  end if;

  -- ── 5. profiles ────────────────────────────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', v_renter, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.profiles set is_seller = true where user_id = v_renter;
    insert into low_results values ('KHÔNG tự bật is_seller', false, 'sửa được');
  exception when insufficient_privilege then
    insert into low_results values ('KHÔNG tự bật is_seller', true, sqlerrm);
  end;
  begin
    update public.profiles set full_name = full_name, contact_email = contact_email where user_id = v_renter;
    insert into low_results values ('vẫn sửa được tên + email liên hệ', true, null);
  exception when others then
    insert into low_results values ('vẫn sửa được tên + email liên hệ', false, sqlerrm);
  end;
  reset role;

  -- ── 3. SĐT chưa xác minh không còn chặn người khác ──────────────────────────
  perform set_config('request.jwt.claims', '', true);
  perform set_config('app.phone_verification_write', 'allowed', true);
  update public.profiles set contact_phone = '0399999001', contact_phone_verified_at = null where user_id = v_seller_b;
  begin
    select public.begin_contact_phone_verification(v_seller_a, '+84399999001', repeat('a', 64)) ->> 'reason' into v_text;
    insert into low_results values ('SĐT chưa xác minh của người khác không chặn (không phone_taken)',
      v_text is distinct from 'phone_taken', coalesce(v_text, 'ok'));
  exception when others then
    insert into low_results values ('SĐT chưa xác minh của người khác không chặn (không phone_taken)', false, sqlerrm);
  end;
  update public.profiles set contact_phone_verified_at = now() where user_id = v_seller_b;
  begin
    select public.begin_contact_phone_verification(v_seller_a, '+84399999001', repeat('a', 64)) ->> 'reason' into v_text;
    insert into low_results values ('SĐT ĐÃ xác minh của người khác vẫn chặn', v_text = 'phone_taken', coalesce(v_text, 'ok'));
  exception when others then
    insert into low_results values ('SĐT ĐÃ xác minh của người khác vẫn chặn', false, sqlerrm);
  end;
end;
$$;

select case when passed then 'PASS' else 'FAIL' end as result, test, detail
  from low_results
 order by passed, test;

rollback;
