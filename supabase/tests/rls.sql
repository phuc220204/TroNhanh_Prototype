-- ═══════════════════════════════════════════════════════════════════════════
-- RLS ISOLATION TEST — dán NGUYÊN FILE vào Supabase SQL Editor và Run.
--
-- KHÔNG cần thay UUID: script tự tra theo email @tronhanh.demo.
--
-- Kiểm RLS ở TẦNG SQL đáng tin hơn nhiều so với đi click qua UI: nó kiểm đúng
-- cơ chế đang bảo vệ dữ liệu, không kiểm cái UI tình cờ không hiển thị.
--
-- ĐỌC KẾT QUẢ: bảng cuối cùng. Cột `passed` phải TRUE ở TẤT CẢ các dòng.
-- Dòng nào FALSE là một lỗ bảo mật thật — sửa policy trước khi làm gì khác.
--
-- Yêu cầu: đã tạo 4 account demo (seller.a / seller.b / renter.a / admin).
-- Toàn bộ chạy trong transaction và rollback — KHÔNG thay đổi dữ liệu.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create temp table if not exists rls_results (
  test   text,
  passed boolean,
  detail text
) on commit drop;

do $$
declare
  v_a       uuid;   -- seller.a  (có nhiều dữ liệu)
  v_b       uuid;   -- seller.b  (tồn tại để chứng minh cô lập)
  v_renter  uuid;
  v_admin   uuid;
  v_count   integer;
  v_bool    boolean;
begin
  select id into v_a      from auth.users where email = 'seller.a@tronhanh.demo';
  select id into v_b      from auth.users where email = 'seller.b@tronhanh.demo';
  select id into v_renter from auth.users where email = 'renter.a@tronhanh.demo';
  select id into v_admin  from auth.users where email = 'admin@tronhanh.demo';

  if v_a is null or v_b is null or v_renter is null or v_admin is null then
    insert into rls_results values
      ('SETUP: đủ 4 account demo', false,
       'Thiếu account. Cần seller.a / seller.b / renter.a / admin @tronhanh.demo');
    return;
  end if;
  insert into rls_results values ('SETUP: đủ 4 account demo', true, null);

  -- ═══ TEST 1: Seller B KHÔNG thấy dữ liệu SaaS của Seller A (BR-007) ══════
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_count from public.properties      where owner_id = v_a;
  reset role;
  insert into rls_results values ('1a. B không đọc được properties của A', v_count = 0, 'thấy ' || v_count || ' dòng');

  set local role authenticated;
  select count(*) into v_count from public.rooms           where owner_id = v_a;
  reset role;
  insert into rls_results values ('1b. B không đọc được rooms của A', v_count = 0, 'thấy ' || v_count || ' dòng');

  set local role authenticated;
  select count(*) into v_count from public.occupancies     where owner_id = v_a;
  reset role;
  insert into rls_results values ('1c. B không đọc được occupancies của A', v_count = 0, 'thấy ' || v_count || ' dòng');

  set local role authenticated;
  select count(*) into v_count from public.contracts       where owner_id = v_a;
  reset role;
  insert into rls_results values ('1d. B không đọc được contracts của A', v_count = 0, 'thấy ' || v_count || ' dòng');

  set local role authenticated;
  select count(*) into v_count from public.invoices        where owner_id = v_a;
  reset role;
  insert into rls_results values ('1e. B không đọc được invoices của A', v_count = 0, 'thấy ' || v_count || ' dòng');

  set local role authenticated;
  select count(*) into v_count from public.utility_readings where owner_id = v_a;
  reset role;
  insert into rls_results values ('1f. B không đọc được utility_readings của A', v_count = 0, 'thấy ' || v_count || ' dòng');

  set local role authenticated;
  select count(*) into v_count from public.payments        where owner_id = v_a;
  reset role;
  insert into rls_results values ('1g. B không đọc được payments của A', v_count = 0, 'thấy ' || v_count || ' dòng');

  -- ═══ TEST 2 & 3: anon đọc được tin Active, KHÔNG đọc được tin chưa duyệt ══
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  select count(*) into v_count from public.rental_listings where status = 'Active';
  reset role;
  insert into rls_results values ('2. anon đọc được tin Active', v_count > 0, 'thấy ' || v_count || ' tin');

  set local role anon;
  select count(*) into v_count from public.rental_listings
    where status in ('Draft','PendingApproval','Rejected','Hidden');
  reset role;
  insert into rls_results values ('3. anon KHÔNG thấy tin chưa duyệt/đã ẩn', v_count = 0, 'thấy ' || v_count || ' tin');

  -- ═══ TEST 4: ⚠️ RÒ RỈ CỘT NGÂN HÀNG — test quan trọng nhất ══════════════
  -- RLS là ROW-level, không phải COLUMN-level. Nếu ai đó thêm policy public
  -- SELECT lên `properties`, bank_account_number sẽ public ngay.
  set local role anon;
  select count(*) into v_count from public.properties;
  reset role;
  insert into rls_results values ('4a. anon KHÔNG đọc được bảng properties', v_count = 0, 'thấy ' || v_count || ' dòng');

  select count(*) into v_count
    from information_schema.columns
    where table_schema = 'public' and table_name = 'property_public_profiles'
      and column_name like 'bank%';
  insert into rls_results values ('4b. view public KHÔNG có cột bank_*', v_count = 0, 'có ' || v_count || ' cột bank');

  select bool_and(column_name in
      ('id','name','district','public_slug','avg_rating','review_count'))
    into v_bool
    from information_schema.columns
    where table_schema = 'public' and table_name = 'property_public_profiles';
  insert into rls_results values ('4c. view public đúng allow-list 6 cột', coalesce(v_bool, false), null);

  -- ═══ TEST 5: user thường KHÔNG tự nâng quyền Admin ══════════════════════
  -- Đây là lý do role nằm ở bảng user_roles (không có policy INSERT) chứ không
  -- phải cột profiles.role (profiles CÓ policy update cho chính chủ).
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_renter, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select public.is_moderator() into v_bool;
  reset role;
  insert into rls_results values ('5a. renter thường không phải moderator', v_bool = false, null);

  begin
    set local role authenticated;
    insert into public.user_roles (user_id, role) values (v_renter, 'Admin');
    reset role;
    insert into rls_results values ('5b. renter KHÔNG tự cấp được role Admin', false, 'INSERT THÀNH CÔNG — LỖ BẢO MẬT');
  exception when others then
    reset role;
    insert into rls_results values ('5b. renter KHÔNG tự cấp được role Admin', true, 'bị chặn: ' || sqlerrm);
  end;

  -- ═══ TEST 6: review verified-only (BR-022, BR-030) ═════════════════════
  select count(*) into v_count from public.contracts c
    where public.can_review_contract(v_renter, c.id);
  insert into rls_results values ('6a. renter chưa gắn phòng thì không đủ điều kiện review', v_count = 0, v_count || ' hợp đồng đủ điều kiện');

  select count(*) into v_count from public.contracts c
    where c.owner_id = v_a and public.can_review_contract(v_a, c.id);
  insert into rls_results values ('6b. BR-030 chủ khu không tự review khu mình', v_count = 0, v_count || ' hợp đồng đủ điều kiện');

  -- ═══ TEST 7: nhắn tin — người thứ 3 không đọc được gì ══════════════════
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_count from public.conversations
    where v_admin not in (initiator_id, poster_id);
  reset role;
  insert into rls_results values ('7. người ngoài không đọc được hội thoại', v_count = 0, 'thấy ' || v_count || ' hội thoại');

  -- ═══ TEST 8: RPC từ chối user không đủ quyền ═══════════════════════════
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_renter, 'role', 'authenticated')::text, true);

  begin
    set local role authenticated;
    perform public.moderate_listing(
      (select id from public.rental_listings limit 1), 'Approve', null);
    reset role;
    insert into rls_results values ('8a. non-moderator bị chặn ở moderate_listing', false, 'GỌI ĐƯỢC — LỖ BẢO MẬT');
  exception when others then
    reset role;
    insert into rls_results values ('8a. non-moderator bị chặn ở moderate_listing', sqlerrm like '%FORBIDDEN%', 'lỗi: ' || sqlerrm);
  end;

  begin
    set local role authenticated;
    perform public.grant_role(v_renter, 'Moderator');
    reset role;
    insert into rls_results values ('8b. non-admin bị chặn ở grant_role', false, 'GỌI ĐƯỢC — LỖ BẢO MẬT');
  exception when others then
    reset role;
    insert into rls_results values ('8b. non-admin bị chặn ở grant_role', sqlerrm like '%FORBIDDEN%', 'lỗi: ' || sqlerrm);
  end;

  -- ═══ TEST 9: user_roles không có policy ghi ════════════════════════════
  select count(*) into v_count from pg_policies
    where schemaname = 'public' and tablename = 'user_roles'
      and cmd in ('INSERT','UPDATE','DELETE','ALL');
  insert into rls_results values ('9. user_roles không có policy ghi', v_count = 0, 'có ' || v_count || ' policy ghi');

  -- ═══ TEST 10: mọi bảng nghiệp vụ đều bật RLS ═══════════════════════════
  select count(*) into v_count from pg_tables t
    join pg_class c on c.relname = t.tablename
    where t.schemaname = 'public' and c.relrowsecurity = false;
  insert into rls_results values ('10. mọi bảng public đều bật RLS', v_count = 0, v_count || ' bảng CHƯA bật');

exception when others then
  reset role;
  insert into rls_results values ('LỖI KHI CHẠY TEST', false, sqlerrm);
end $$;

-- ── KẾT QUẢ: cột `passed` phải TRUE ở TẤT CẢ các dòng ─────────────────────
select
  case when passed then '✅' else '❌ FAIL' end as kq,
  test,
  detail
from rls_results
order by passed, test;

rollback;

-- ═══════════════════════════════════════════════════════════════════════════
-- KIỂM STORAGE (không làm được bằng SQL) — chạy trong console browser khi đã
-- đăng nhập bằng seller.a:
--
--   await supabase.storage.from('listing-images')
--     .upload('00000000-0000-0000-0000-000000000000/x/y.webp', new Blob(['x']))
--
-- → PHẢI trả về lỗi. Nếu upload thành công vào thư mục của uid khác thì storage
--   policy đang hỏng (seller_id phải là segment ĐẦU của path).
-- ═══════════════════════════════════════════════════════════════════════════
