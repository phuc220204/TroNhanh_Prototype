-- Kiểm migration 20261009090000_security_hardening. Chạy:
--   supabase db query --linked --file supabase/tests/security_hardening.sql
-- Mọi fixture nằm trong transaction này và bị rollback.

begin;

create temp table if not exists hardening_results (
  test text,
  passed boolean,
  detail text
) on commit drop;
grant all on hardening_results to anon, authenticated;

do $$
declare
  v_seller_a uuid;
  v_seller_b uuid;
  v_renter uuid;
  v_property_a uuid;
  v_property_b uuid;
  v_room_a uuid;
  v_room_b uuid;
  v_room_tmp uuid;
  v_demand uuid;
  v_invoice uuid;
  v_text text;
  v_count integer;
  v_unit numeric;
begin
  select id into v_seller_a from auth.users where email = 'seller.a@tronhanh.demo';
  select id into v_seller_b from auth.users where email = 'seller.b@tronhanh.demo';
  select id into v_renter   from auth.users where email = 'renter.a@tronhanh.demo';
  if v_seller_a is null or v_seller_b is null or v_renter is null then
    insert into hardening_results values ('setup demo accounts', false, 'thiếu tài khoản demo');
    return;
  end if;

  -- Fixture tạo khi không có JWT (như migration).
  perform set_config('request.jwt.claims', '', true);
  insert into public.properties (owner_id, name) values (v_seller_a, 'HARDEN A') returning id into v_property_a;
  insert into public.properties (owner_id, name) values (v_seller_b, 'HARDEN B') returning id into v_property_b;
  insert into public.rooms (property_id, owner_id, room_code, area, price, status)
    values (v_property_a, v_seller_a, 'HARDEN-A', 20, 3000000, 'Available') returning id into v_room_a;
  insert into public.rooms (property_id, owner_id, room_code, area, price, status)
    values (v_property_b, v_seller_b, 'HARDEN-B', 20, 3000000, 'Available') returning id into v_room_b;

  -- ── Khách (anon) ───────────────────────────────────────────────────────────
  set local role anon;
  begin
    perform contact_phone from public.rental_listings limit 1;
    insert into hardening_results values ('anon KHÔNG đọc được rental_listings.contact_phone', false, 'đọc được');
  exception when insufficient_privilege then
    insert into hardening_results values ('anon KHÔNG đọc được rental_listings.contact_phone', true, sqlerrm);
  end;
  begin
    perform id, title, contact_phone_masked from public.rental_listings limit 1;
    insert into hardening_results values ('anon đọc được cột công khai + số đã che', true, null);
  exception when others then
    insert into hardening_results values ('anon đọc được cột công khai + số đã che', false, sqlerrm);
  end;
  begin
    select count(*) into v_count from public.public_demand_posts where contact_phone ~ '^[0-9+ ]{9,}$';
    insert into hardening_results values ('view tin nhu cầu che SĐT cho anon', v_count = 0, v_count || ' số đầy đủ');
  exception when others then
    insert into hardening_results values ('view tin nhu cầu che SĐT cho anon', false, sqlerrm);
  end;
  begin
    perform 1 from public.demand_posts limit 1;
    insert into hardening_results values ('anon KHÔNG đọc thẳng bảng demand_posts', false, 'đọc được');
  exception when insufficient_privilege then
    insert into hardening_results values ('anon KHÔNG đọc thẳng bảng demand_posts', true, sqlerrm);
  end;
  reset role;

  -- ── Chủ trọ A ──────────────────────────────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', v_seller_a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    insert into public.utility_readings (room_id, owner_id, type, period, previous_reading, current_reading, unit_price)
      values (v_room_b, v_seller_a, 'Electricity', '9999-12', 0, 999999, 1);
    insert into hardening_results values ('A KHÔNG chèn chỉ số vào phòng B', false, 'chèn được');
  exception when insufficient_privilege then
    insert into hardening_results values ('A KHÔNG chèn chỉ số vào phòng B', true, sqlerrm);
  end;
  begin
    insert into public.contracts (room_id, owner_id, start_date, end_date, rent_price, deposit, status)
      values (v_room_b, v_seller_a, '2020-01-01', '2030-01-01', 1, 0, 'Active');
    insert into hardening_results values ('A KHÔNG tạo hợp đồng thẳng vào bảng', false, 'chèn được');
  exception when insufficient_privilege then
    insert into hardening_results values ('A KHÔNG tạo hợp đồng thẳng vào bảng', true, sqlerrm);
  end;
  begin
    insert into public.occupancies (room_id, owner_id, full_name, user_id, link_status)
      values (v_room_a, v_seller_a, 'Giả', v_renter, 'Confirmed');
    insert into hardening_results values ('A KHÔNG tự tạo occupancy Confirmed', false, 'chèn được');
  exception when insufficient_privilege then
    insert into hardening_results values ('A KHÔNG tự tạo occupancy Confirmed', true, sqlerrm);
  end;
  begin
    update public.reviews set status = 'Visible' where false;
    insert into hardening_results values ('KHÔNG sửa thẳng bảng reviews', false, 'sửa được');
  exception when insufficient_privilege then
    insert into hardening_results values ('KHÔNG sửa thẳng bảng reviews', true, sqlerrm);
  end;
  begin
    update public.messages set content = 'x' where false;
    insert into hardening_results values ('KHÔNG sửa nội dung tin nhắn', false, 'sửa được');
  exception when insufficient_privilege then
    insert into hardening_results values ('KHÔNG sửa nội dung tin nhắn', true, sqlerrm);
  end;
  begin
    update public.conversations set status = 'Active' where false;
    insert into hardening_results values ('KHÔNG sửa thẳng hội thoại', false, 'sửa được');
  exception when insufficient_privilege then
    insert into hardening_results values ('KHÔNG sửa thẳng hội thoại', true, sqlerrm);
  end;
  begin
    insert into public.rooms (property_id, owner_id, room_code, area, price, status)
      values (v_property_b, v_seller_a, 'HARDEN-X', 20, 1, 'Available');
    insert into hardening_results values ('A KHÔNG tạo phòng trong khu của B', false, 'tạo được');
  exception when others then
    insert into hardening_results values ('A KHÔNG tạo phòng trong khu của B', sqlerrm like '%PROPERTY_NOT_OWNED%', sqlerrm);
  end;
  begin
    insert into public.rooms (property_id, owner_id, room_code, area, price, status)
      values (v_property_a, v_seller_a, 'HARDEN-A2', 20, 1, 'Available') returning id into v_room_tmp;
    insert into hardening_results values ('A vẫn tạo phòng trong khu của mình', v_room_tmp is not null, null);
  exception when others then
    insert into hardening_results values ('A vẫn tạo phòng trong khu của mình', false, sqlerrm);
  end;
  begin
    update public.properties set avg_rating = 5, review_count = 99 where id = v_property_a;
    insert into hardening_results values ('A KHÔNG tự sửa điểm đánh giá', false, 'sửa được');
  exception when insufficient_privilege then
    insert into hardening_results values ('A KHÔNG tự sửa điểm đánh giá', true, sqlerrm);
  end;
  begin
    update public.properties set name = 'HARDEN A đổi tên', electricity_unit_price = 3500 where id = v_property_a;
    insert into hardening_results values ('A vẫn sửa tên + đơn giá khu', true, null);
  exception when others then
    insert into hardening_results values ('A vẫn sửa tên + đơn giá khu', false, sqlerrm);
  end;
  begin
    perform public.create_invoice_with_items(v_room_a, null, '2099-01', current_date + 5,
      '[{"type":"Rent","description":"x","quantity":1,"unit_price":1,"amount":-1000}]'::jsonb);
    insert into hardening_results values ('hóa đơn số âm bị chặn', false, 'tạo được');
  exception when others then
    insert into hardening_results values ('hóa đơn số âm bị chặn', sqlerrm like '%INVALID_INVOICE_ITEM_AMOUNT%', sqlerrm);
  end;
  begin
    v_invoice := public.create_invoice_with_items(v_room_a, null, '2099-02', current_date + 5,
      '[{"type":"Electricity","description":"Điện","quantity":10,"unit_price":999999,"amount":35000}]'::jsonb);
    reset role;
    select unit_price into v_unit from public.invoice_items where invoice_id = v_invoice;
    insert into hardening_results values ('hóa đơn hợp lệ, đơn giá tính server-side', v_unit = 3500, 'unit_price=' || v_unit);
    set local role authenticated;
  exception when others then
    reset role;
    insert into hardening_results values ('hóa đơn hợp lệ, đơn giá tính server-side', false, sqlerrm);
    set local role authenticated;
  end;
  begin
    perform public.record_utility_reading(v_room_a, 'Electricity', '2099-03', 120);
    insert into hardening_results values ('RPC ghi chỉ số vẫn chạy', true, null);
  exception when others then
    insert into hardening_results values ('RPC ghi chỉ số vẫn chạy', false, sqlerrm);
  end;
  begin
    perform public.create_occupancy_with_contract(v_room_a,
      '{"full_name":"Người ở test","occupant_count":1}'::jsonb,
      json_build_object('start_date', current_date, 'end_date', current_date + 180, 'rent_price', 3000000, 'deposit', 0)::jsonb);
    insert into hardening_results values ('RPC tạo người ở + hợp đồng vẫn chạy', true, null);
  exception when others then
    insert into hardening_results values ('RPC tạo người ở + hợp đồng vẫn chạy', false, sqlerrm);
  end;
  reset role;

  -- ── Tin nhu cầu ────────────────────────────────────────────────────────────
  perform set_config('request.jwt.claims', '', true);
  update public.platform_settings set value = 'false'::jsonb where key = 'auto_approve_demand_posts';

  perform set_config('request.jwt.claims', json_build_object('sub', v_renter, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.demand_posts (renter_id, kind, desired_districts, price_min, price_max, status, title)
      values (v_renter, 'RoomWanted', array['Quận 1'], 1000000, 2000000, 'Active', 'HARDEN demand')
      returning id, status into v_demand, v_text;
    insert into hardening_results values ('tin nhu cầu mới theo cài đặt kiểm duyệt (tắt tự duyệt ⇒ chờ duyệt)', v_text = 'PendingApproval', v_text);
  exception when others then
    insert into hardening_results values ('tin nhu cầu mới theo cài đặt kiểm duyệt (tắt tự duyệt ⇒ chờ duyệt)', false, sqlerrm);
  end;
  reset role;

  perform set_config('request.jwt.claims', '', true);
  update public.demand_posts set status = 'Rejected' where id = v_demand;

  perform set_config('request.jwt.claims', json_build_object('sub', v_renter, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.demand_posts set status = 'Active' where id = v_demand;
    insert into hardening_results values ('tin bị từ chối KHÔNG tự bật lại Active', false, 'bật được');
  exception when others then
    insert into hardening_results values ('tin bị từ chối KHÔNG tự bật lại Active', sqlerrm like '%DEMAND_STATUS_TRANSITION_INVALID%', sqlerrm);
  end;
  reset role;
end;
$$;

select case when passed then 'PASS' else 'FAIL' end as result, test, detail
  from hardening_results
 order by passed, test;

rollback;
