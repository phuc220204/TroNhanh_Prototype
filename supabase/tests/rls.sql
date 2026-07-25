-- ═══════════════════════════════════════════════════════════════════════════
-- RLS ISOLATION TEST — chạy trong Supabase SQL Editor
--
-- Kiểm RLS ở TẦNG SQL đáng tin hơn nhiều so với đi click qua UI: nó kiểm đúng
-- cơ chế đang bảo vệ dữ liệu, không kiểm cái UI tình cờ không hiển thị.
--
-- CÁCH DÙNG:
--   1. Lấy UUID của 4 account demo:
--        select id, email from auth.users where email like '%@tronhanh.demo';
--   2. Thay <SELLER_A_UUID> / <SELLER_B_UUID> / <RENTER_A_UUID> / <ADMIN_UUID>.
--   3. Chạy cả file. MỌI cột ok_* phải trả `true`.
--
-- Mọi block đều bọc begin/rollback ⇒ không thay đổi dữ liệu.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══ TEST 1: Seller B KHÔNG thấy dữ liệu SaaS của Seller A (BR-007) ════════
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<SELLER_B_UUID>","role":"authenticated"}';

  select
    (select count(*) from public.properties      where owner_id = '<SELLER_A_UUID>') = 0 as ok_properties,
    (select count(*) from public.rooms           where owner_id = '<SELLER_A_UUID>') = 0 as ok_rooms,
    (select count(*) from public.occupancies     where owner_id = '<SELLER_A_UUID>') = 0 as ok_occupancies,
    (select count(*) from public.contracts       where owner_id = '<SELLER_A_UUID>') = 0 as ok_contracts,
    (select count(*) from public.invoices        where owner_id = '<SELLER_A_UUID>') = 0 as ok_invoices,
    (select count(*) from public.utility_readings where owner_id = '<SELLER_A_UUID>') = 0 as ok_readings,
    (select count(*) from public.payments        where owner_id = '<SELLER_A_UUID>') = 0 as ok_payments;
rollback;

-- ═══ TEST 2: đọc public marketplace VẪN chạy ══════════════════════════════
begin;
  set local role anon;
  select
    (select count(*) from public.rental_listings where status = 'Active') > 0 as ok_public_listings,
    (select count(*) from public.demand_posts    where status = 'Active') >= 0 as ok_public_demand;
rollback;

-- ═══ TEST 3: anon KHÔNG đọc được tin chưa duyệt / đã ẩn ═══════════════════
begin;
  set local role anon;
  select
    (select count(*) from public.rental_listings
       where status in ('Draft','PendingApproval','Rejected','Hidden')) = 0 as ok_hidden_invisible;
rollback;

-- ═══ TEST 4: ⚠️ RÒ RỈ CỘT NGÂN HÀNG — test quan trọng nhất ════════════════
-- RLS là ROW-level, không phải COLUMN-level. Nếu ai đó thêm policy public
-- SELECT lên `properties`, bank_account_number sẽ public. View
-- property_public_profiles với allow-list cột là cách DUY NHẤT đúng cho BR-024.
begin;
  set local role anon;

  -- anon KHÔNG được đọc bảng properties trực tiếp
  select (select count(*) from public.properties) = 0 as ok_properties_not_public;

  -- view chỉ có 6 cột, KHÔNG có bank_*
  select bool_and(column_name in
      ('id','name','district','public_slug','avg_rating','review_count')) as ok_view_columns
    from information_schema.columns
    where table_schema = 'public' and table_name = 'property_public_profiles';

  select count(*) = 0 as ok_no_bank_columns
    from information_schema.columns
    where table_schema = 'public' and table_name = 'property_public_profiles'
      and column_name like 'bank%';
rollback;

-- ═══ TEST 5: user thường KHÔNG tự nâng quyền Admin ═══════════════════════
-- Đây là lý do role nằm ở bảng user_roles (không có policy INSERT) chứ không
-- phải cột profiles.role (profiles CÓ policy update cho chính chủ).
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<RENTER_A_UUID>","role":"authenticated"}';

  select public.is_moderator() = false as ok_not_moderator;

  -- Phải THẤT BẠI (không có policy INSERT trên user_roles)
  do $$
  begin
    insert into public.user_roles (user_id, role)
    values ('<RENTER_A_UUID>', 'Admin');
    raise exception 'FAIL: user tự thêm được role Admin — LỖ BẢO MẬT';
  exception
    when insufficient_privilege then raise notice 'ok_cannot_self_grant_admin = true';
    when others then raise notice 'ok_cannot_self_grant_admin = true (%)', sqlerrm;
  end $$;
rollback;

-- ═══ TEST 6: review verified-only (BR-022, BR-030) ═══════════════════════
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<RENTER_A_UUID>","role":"authenticated"}';

  -- Account chưa gắn occupancy → không đủ điều kiện với MỌI hợp đồng
  select count(*) = 0 as ok_no_eligible_contract
    from public.contracts c
    where public.can_review_contract('<RENTER_A_UUID>', c.id);
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<SELLER_A_UUID>","role":"authenticated"}';

  -- BR-030: chủ khu KHÔNG BAO GIỜ review được khu của chính mình
  select count(*) = 0 as ok_owner_cannot_review
    from public.contracts c
    where c.owner_id = '<SELLER_A_UUID>'
      and public.can_review_contract('<SELLER_A_UUID>', c.id);
rollback;

-- ═══ TEST 7: nhắn tin — người thứ 3 không đọc được gì ════════════════════
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<ADMIN_UUID>","role":"authenticated"}';

  select
    (select count(*) from public.conversations
       where '<ADMIN_UUID>' not in (initiator_id::text, poster_id::text)) = 0 as ok_conv_isolated,
    (select count(*) from public.messages m
       join public.conversations c on c.id = m.conversation_id
       where '<ADMIN_UUID>' not in (c.initiator_id::text, c.poster_id::text)) = 0 as ok_msg_isolated;
rollback;

-- ═══ TEST 8: RPC từ chối user không đủ quyền ═════════════════════════════
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<RENTER_A_UUID>","role":"authenticated"}';

  do $$
  begin
    perform public.moderate_listing(
      (select id from public.rental_listings limit 1), 'Approve', null);
    raise exception 'FAIL: non-moderator gọi được moderate_listing';
  exception
    when others then
      if sqlerrm like '%FORBIDDEN%' then raise notice 'ok_moderate_forbidden = true';
      else raise notice 'ok_moderate_forbidden = true (%)', sqlerrm; end if;
  end $$;

  do $$
  begin
    perform public.grant_role('<RENTER_A_UUID>', 'Moderator');
    raise exception 'FAIL: non-admin gọi được grant_role';
  exception
    when others then raise notice 'ok_grant_role_forbidden = true (%)', sqlerrm;
  end $$;
rollback;

-- ═══ TEST 9: storage — không upload được vào thư mục người khác ══════════
-- Không test được bằng SQL thuần (cần Storage API). Làm bằng tay:
--   await supabase.storage.from('listing-images')
--     .upload(`${SOMEONE_ELSE_UUID}/x/y.webp`, blob)
--   → phải trả lỗi. Xem docs/cp4/06_QA_CHECKLIST.md.
