-- ═══════════════════════════════════════════════════════════════════════════
-- SEED 20 NGƯỜI DÙNG DEMO + 15 TIN CHO THUÊ + 10 TIN NHU CẦU
--
-- Dán NGUYÊN FILE vào Supabase SQL Editor rồi Run. Chạy lại nhiều lần an toàn:
-- mỗi phần đều bỏ qua bản ghi đã tồn tại.
--
-- ⚠️ DEMO-ONLY. Xóa trước production — snippet dọn ở cuối file.
--
-- ⚠️ ĐÃ CHẠY FILE NÀY BẢN CŨ RỒI? Chạy lại KHÔNG có tác dụng.
-- Mọi `insert` dưới đây đều có chốt `where not exists (... title = d.title ...)`,
-- mà tiêu đề không đổi giữa các bản — nên lần chạy thứ hai bỏ qua hết và các
-- dòng cũ vẫn giữ `ward_code` NULL. Chạy xong thấy "thành công" mà không có gì
-- thay đổi.
-- Muốn cập nhật dữ liệu đã seed: dùng `backfill_area_codes.sql` (vá tại chỗ,
-- giữ nguyên tài khoản), hoặc xóa bằng snippet cuối file rồi chạy lại file này.
--
-- ── VÌ SAO LÀ SQL CHỨ KHÔNG PHẢI `dbSeeder.ts` ─────────────────────────────
-- `dbSeeder` chạy trong trình duyệt bằng phiên của NGƯỜI ĐANG ĐĂNG NHẬP, nên
-- nó chỉ tạo được dữ liệu cho chính người đó. Muốn 20 tài khoản KHÁC NHAU thì
-- phải tạo `auth.users`, mà đó là việc chỉ làm được ở phía server. Không đưa
-- `service_role` key vào frontend chỉ để làm việc này (CLAUDE.md §4, §11).
--
-- ── MẬT KHẨU ──────────────────────────────────────────────────────────────
-- Cả 20 tài khoản dùng chung `TroNhanh@2026`, giống 4 tài khoản demo cũ.
--
-- ── DỮ LIỆU ĐƯỢC THIẾT KẾ ĐỂ BỘ LỌC CÓ KẾT QUẢ ────────────────────────────
-- 15 tin phủ đủ 6 quận, 5 loại hình, cả 4 khoảng giá và cả 7 tiện ích của
-- `src/shared/constants/catalog.ts`. Nếu chế bừa thì người xem bấm "Dưới 2
-- triệu" hay "Ký túc xá" sẽ ra danh sách rỗng và tưởng bộ lọc hỏng.
-- ═══════════════════════════════════════════════════════════════════════════

-- ══ 1. Hai mươi tài khoản ══════════════════════════════════════════════════
-- Ghi thẳng vào `auth.users` thay vì gọi API đăng ký: 20 lần `signUp` liên tiếp
-- sẽ đụng rate limit của Supabase Auth.
--
-- `email_confirmed_at = now()` để đăng nhập được ngay, không phụ thuộc việc
-- email confirmation đang bật hay tắt.
--
-- Bốn cột token đặt chuỗi RỖNG chứ không để NULL: GoTrue đọc chúng vào kiểu
-- string không nullable, gặp NULL sẽ ném "Database error querying schema" ngay
-- lúc đăng nhập — lỗi trông như hỏng server chứ không liên quan gì tới tài khoản.
--
-- Trigger `on_auth_user_created` tự tạo `profiles` + role `Renter`, nên khối
-- dưới chỉ cần cấp thêm role `Seller` cho nhóm đăng tin.
do $$
declare
  v_uid uuid;
  v_rec record;
begin
  for v_rec in
    select * from (values
      ('nguyen.van.a@tronhanh.demo', 'Nguyễn Văn A', '0910000000', true),
      ('nguyen.van.b@tronhanh.demo', 'Nguyễn Văn B', '0910000001', true),
      ('nguyen.van.c@tronhanh.demo', 'Nguyễn Văn C', '0910000002', true),
      ('nguyen.van.d@tronhanh.demo', 'Nguyễn Văn D', '0910000003', true),
      ('nguyen.van.e@tronhanh.demo', 'Nguyễn Văn E', '0910000004', true),
      ('nguyen.van.f@tronhanh.demo', 'Nguyễn Văn F', '0910000005', true),
      ('nguyen.van.g@tronhanh.demo', 'Nguyễn Văn G', '0910000006', true),
      ('nguyen.van.h@tronhanh.demo', 'Nguyễn Văn H', '0910000007', true),
      ('nguyen.van.i@tronhanh.demo', 'Nguyễn Văn I', '0910000008', true),
      ('nguyen.van.j@tronhanh.demo', 'Nguyễn Văn J', '0910000009', true),
      ('tran.thi.a@tronhanh.demo', 'Trần Thị A', '0920000000', false),
      ('tran.thi.b@tronhanh.demo', 'Trần Thị B', '0920000001', false),
      ('tran.thi.c@tronhanh.demo', 'Trần Thị C', '0920000002', false),
      ('tran.thi.d@tronhanh.demo', 'Trần Thị D', '0920000003', false),
      ('tran.thi.e@tronhanh.demo', 'Trần Thị E', '0920000004', false),
      ('tran.thi.f@tronhanh.demo', 'Trần Thị F', '0920000005', false),
      ('tran.thi.g@tronhanh.demo', 'Trần Thị G', '0920000006', false),
      ('tran.thi.h@tronhanh.demo', 'Trần Thị H', '0920000007', false),
      ('tran.thi.i@tronhanh.demo', 'Trần Thị I', '0920000008', false),
      ('tran.thi.j@tronhanh.demo', 'Trần Thị J', '0920000009', false)
    ) as t(email, full_name, phone, is_seller)
  loop
    if exists (select 1 from auth.users where email = v_rec.email) then
      continue;
    end if;

    v_uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_uid, 'authenticated', 'authenticated', v_rec.email,
      crypt('TroNhanh@2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_rec.full_name, 'contact_phone', v_rec.phone),
      now() - (random() * interval '60 days'), now(),
      '', '', '', ''
    );

    -- Thiếu dòng identities thì tài khoản TỒN TẠI nhưng đăng nhập bằng email
    -- không hoạt động. Với provider 'email', `provider_id` chính là user id.
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', v_rec.email),
      'email', v_uid::text, now(), now(), now()
    );

    if v_rec.is_seller then
      update public.profiles set is_seller = true where user_id = v_uid;
      insert into public.user_roles (user_id, role) values (v_uid, 'Seller')
      on conflict (user_id, role) do nothing;
    end if;
  end loop;
end $$;

-- ══ 2. Mười lăm tin cho thuê ═══════════════════════════════════════════════
-- KHÔNG đặt `boost_expire_at`: trigger `trg_guard_boost_expire_at` chặn mọi lần
-- ghi cột đó ngoài RPC `boost_listing()`. Tin nổi bật đã có sẵn ở dữ liệu của
-- `seller.a` nên BR-005 vẫn demo được.
--
-- `approved_at` + `expire_at` đặt tay cho khớp BR-026 (tin duyệt có hạn 60 ngày).
insert into public.rental_listings (
  seller_id, title, property_type, price, province_code, ward_code, district, area, status,
  approved_at, expire_at, address, description, contact_name, contact_phone,
  access_policy, access_close_time
)
select
  u.id, d.title, d.property_type, d.price, 79, d.ward_code, d.ward_name, d.area, 'Active',
  now(), now() + interval '60 days', d.address, d.description,
  p.full_name, p.contact_phone, d.access_policy, d.close_time::time
from (values
  ('nguyen.van.a@tronhanh.demo', 'Phòng trọ mới xây, cửa sổ lớn, hẻm xe hơi', 'Phòng trọ', 1800000, 26785, 'Phường Trung Mỹ Tây', 18, '45/7 Nguyễn Ảnh Thủ, Trung Mỹ Tây', 'Phòng vừa hoàn thiện tháng trước, tường sơn mới, cửa sổ hướng đông nên sáng cả buổi sáng. Hẻm 4m xe hơi vào tận nơi, khu này không ngập nước.', 'Free', null),
  ('nguyen.van.a@tronhanh.demo', 'Căn hộ mini có bếp riêng, gần chợ Hạnh Thông Tây', 'Căn hộ mini', 4500000, 26890, 'Phường Hạnh Thông', 32, '212 Quang Trung, Phường 10', 'Bếp và khu giặt tách hẳn khỏi phòng ngủ, có ban công phơi đồ. Đi bộ 5 phút ra chợ Hạnh Thông Tây, ngay trạm xe buýt số 24.', 'Free', null),
  ('nguyen.van.b@tronhanh.demo', 'Ký túc xá sinh viên 4 người/phòng, có máy giặt chung', 'Ký túc xá', 1200000, 26824, 'Phường Thủ Đức', 28, '18 Đường số 6, Linh Trung', 'Giường tầng khung sắt chắc chắn, mỗi bạn một tủ khóa riêng. Khu vực chung có máy giặt và bàn học tự quản. Ưu tiên sinh viên năm nhất.', 'Restricted', '23:00'),
  ('nguyen.van.b@tronhanh.demo', 'Phòng trọ gác lửng, tách biệt chủ, giờ giấc tự do', 'Phòng trọ', 2600000, 26800, 'Phường Linh Xuân', 22, '77/3 Võ Văn Ngân, Bình Thọ', 'Gác lửng đổ bê tông chịu lực, kê vừa nệm 1m6. Lối đi riêng không chung cửa với chủ nhà nên về khuya thoải mái.', 'Free', null),
  ('nguyen.van.c@tronhanh.demo', 'Căn hộ dịch vụ full nội thất, tòa nhà có thang máy', 'Căn hộ dịch vụ', 7500000, 27475, 'Phường Tân Hưng', 42, '159 Nguyễn Thị Thập, Tân Phú', 'Nội thất còn mới: giường, tủ âm tường, sofa, bếp từ và máy giặt riêng trong phòng. Tòa nhà có thang máy, bảo vệ trực 24/7.', 'Free', null),
  ('nguyen.van.c@tronhanh.demo', 'Studio yên tĩnh trong khu dân cư Him Lam', 'Căn hộ mini', 5800000, 27478, 'Phường Tân Thuận', 30, '23 Đường số 1, Him Lam', 'Nằm sâu trong khu dân cư nên rất yên, hầu như không nghe tiếng xe. Hợp với người làm việc tại nhà. Cửa sổ nhìn ra mảng xanh nội khu.', 'Free', null),
  ('nguyen.van.d@tronhanh.demo', 'Nhà nguyên căn 1 trệt 1 lầu, 2 phòng ngủ', 'Nhà nguyên căn', 9500000, 26956, 'Phường Thạnh Mỹ Tây', 60, '31/12 Xô Viết Nghệ Tĩnh, Phường 21', 'Tầng trệt là phòng khách và bếp, trên lầu có 2 phòng ngủ và sân phơi. Sân trước để được 3 xe máy. Hợp gia đình nhỏ hoặc nhóm bạn ở chung.', 'Free', null),
  ('nguyen.van.d@tronhanh.demo', 'Phòng trọ giá tốt cho người đi làm, gần Hàng Xanh', 'Phòng trọ', 1900000, 26944, 'Phường Gia Định', 16, '94/5 Đinh Bộ Lĩnh, Phường 26', 'Phòng gọn, đủ chỗ kê giường 1m4 và một bàn làm việc. Cách vòng xoay Hàng Xanh 700m nên vào trung tâm rất nhanh. Giá đã gồm phí rác và nước.', 'Free', null),
  ('nguyen.van.e@tronhanh.demo', 'Căn hộ mini WC riêng, nhận nuôi thú cưng', 'Căn hộ mini', 3800000, 27163, 'Phường Hòa Hưng', 26, '168 Tô Hiến Thành, Phường 15', 'Chủ nhà cũng nuôi mèo nên rất thoải mái chuyện thú cưng, chỉ cần giữ vệ sinh chung. WC riêng có bình nóng lạnh. Gần Vạn Hạnh Mall.', 'Free', null),
  ('nguyen.van.e@tronhanh.demo', 'Phòng master có ban công, view thoáng tầng cao', 'Phòng trọ', 4200000, 27169, 'Phường Diên Hồng', 28, '45 Bà Hạt, Phường 9', 'Phòng lớn nhất tầng, ban công riêng đủ kê bàn cà phê. Ở tầng 4 nên thoáng và ít bụi. Có chỗ để xe máy trong nhà.', 'Free', null),
  ('nguyen.van.f@tronhanh.demo', 'Căn hộ dịch vụ 2 phòng ngủ, dọn phòng hàng tuần', 'Căn hộ dịch vụ', 12000000, 27478, 'Phường Tân Thuận', 55, '1 Đường số 11, Tân Phong', 'Dịch vụ dọn phòng và thay ga giường mỗi tuần đã tính trong giá. Hai phòng ngủ đều có cửa sổ. Tòa nhà có hồ bơi và phòng gym dùng chung.', 'Free', null),
  ('nguyen.van.g@tronhanh.demo', 'Phòng trọ sạch sẽ, an ninh, có camera hành lang', 'Phòng trọ', 2300000, 26876, 'Phường An Nhơn', 20, '60/14 Lê Đức Thọ, Phường 16', 'Hành lang và cổng đều có camera, chủ nhà ở ngay tầng trệt. Dãy chỉ 8 phòng nên yên tĩnh, người thuê chủ yếu là nhân viên văn phòng.', 'Free', null),
  ('nguyen.van.h@tronhanh.demo', 'Nhà nguyên căn hẻm rộng, phù hợp nhóm ở ghép', 'Nhà nguyên căn', 8000000, 26800, 'Phường Linh Xuân', 50, '5 Đường 12, Trường Thọ', 'Ba phòng ngủ nhỏ, chia vừa cho 3–4 bạn ở ghép. Bếp rộng, có sân sau phơi đồ. Hẻm rộng 5m, gần chợ Thủ Đức.', 'Free', null),
  ('nguyen.van.i@tronhanh.demo', 'Căn hộ mini gần ĐH Bách Khoa cơ sở 2', 'Căn hộ mini', 3500000, 26800, 'Phường Linh Xuân', 24, '9 Đường số 3, Đông Hòa', 'Đi bộ 10 phút tới cổng trường. Phòng có gác để đồ, bếp nhỏ và máy lạnh mới lắp năm nay. Nhiều bạn Bách Khoa đang thuê cùng dãy.', 'Free', null),
  ('nguyen.van.j@tronhanh.demo', 'Ký túc xá nữ, quản lý chặt, đóng cửa 23h', 'Ký túc xá', 1500000, 27169, 'Phường Diên Hồng', 30, '220 Lý Thường Kiệt, Phường 14', 'Chỉ nhận nữ, có quản lý ở cùng khu. Cổng đóng lúc 23h nên phụ huynh yên tâm. Bếp chung và khu giặt phơi riêng cho từng tầng.', 'Restricted', '23:00')
) as d(email, title, property_type, price, ward_code, ward_name, area, address, description,
          access_policy, close_time)
join auth.users u      on u.email = d.email
join public.profiles p on p.user_id = u.id
where not exists (
  select 1 from public.rental_listings rl
   where rl.seller_id = u.id and rl.title = d.title and rl.deleted_at is null
);

-- ══ 3. Tiện ích của từng tin ═══════════════════════════════════════════════
-- Giá trị phải nằm trong đúng 7 mục của `catalog.ts`, nếu không bộ lọc tiện ích
-- sẽ không khớp tin nào.
insert into public.listing_amenities (listing_id, amenity)
select l.id, a.amenity
from (values
  ('nguyen.van.a@tronhanh.demo', 'Phòng trọ mới xây, cửa sổ lớn, hẻm xe hơi', 'Wifi'),
  ('nguyen.van.a@tronhanh.demo', 'Phòng trọ mới xây, cửa sổ lớn, hẻm xe hơi', 'Chỗ để xe'),
  ('nguyen.van.a@tronhanh.demo', 'Căn hộ mini có bếp riêng, gần chợ Hạnh Thông Tây', 'Máy lạnh'),
  ('nguyen.van.a@tronhanh.demo', 'Căn hộ mini có bếp riêng, gần chợ Hạnh Thông Tây', 'Wifi'),
  ('nguyen.van.a@tronhanh.demo', 'Căn hộ mini có bếp riêng, gần chợ Hạnh Thông Tây', 'WC riêng'),
  ('nguyen.van.a@tronhanh.demo', 'Căn hộ mini có bếp riêng, gần chợ Hạnh Thông Tây', 'Chỗ để xe'),
  ('nguyen.van.b@tronhanh.demo', 'Ký túc xá sinh viên 4 người/phòng, có máy giặt chung', 'Wifi'),
  ('nguyen.van.b@tronhanh.demo', 'Ký túc xá sinh viên 4 người/phòng, có máy giặt chung', 'Chỗ để xe'),
  ('nguyen.van.b@tronhanh.demo', 'Phòng trọ gác lửng, tách biệt chủ, giờ giấc tự do', 'Gác lửng'),
  ('nguyen.van.b@tronhanh.demo', 'Phòng trọ gác lửng, tách biệt chủ, giờ giấc tự do', 'Wifi'),
  ('nguyen.van.b@tronhanh.demo', 'Phòng trọ gác lửng, tách biệt chủ, giờ giấc tự do', 'Giờ giấc tự do'),
  ('nguyen.van.c@tronhanh.demo', 'Căn hộ dịch vụ full nội thất, tòa nhà có thang máy', 'Máy lạnh'),
  ('nguyen.van.c@tronhanh.demo', 'Căn hộ dịch vụ full nội thất, tòa nhà có thang máy', 'Wifi'),
  ('nguyen.van.c@tronhanh.demo', 'Căn hộ dịch vụ full nội thất, tòa nhà có thang máy', 'WC riêng'),
  ('nguyen.van.c@tronhanh.demo', 'Căn hộ dịch vụ full nội thất, tòa nhà có thang máy', 'Chỗ để xe'),
  ('nguyen.van.c@tronhanh.demo', 'Studio yên tĩnh trong khu dân cư Him Lam', 'Máy lạnh'),
  ('nguyen.van.c@tronhanh.demo', 'Studio yên tĩnh trong khu dân cư Him Lam', 'Wifi'),
  ('nguyen.van.c@tronhanh.demo', 'Studio yên tĩnh trong khu dân cư Him Lam', 'WC riêng'),
  ('nguyen.van.d@tronhanh.demo', 'Nhà nguyên căn 1 trệt 1 lầu, 2 phòng ngủ', 'Chỗ để xe'),
  ('nguyen.van.d@tronhanh.demo', 'Nhà nguyên căn 1 trệt 1 lầu, 2 phòng ngủ', 'WC riêng'),
  ('nguyen.van.d@tronhanh.demo', 'Nhà nguyên căn 1 trệt 1 lầu, 2 phòng ngủ', 'Giờ giấc tự do'),
  ('nguyen.van.d@tronhanh.demo', 'Nhà nguyên căn 1 trệt 1 lầu, 2 phòng ngủ', 'Cho nuôi thú cưng'),
  ('nguyen.van.d@tronhanh.demo', 'Phòng trọ giá tốt cho người đi làm, gần Hàng Xanh', 'Wifi'),
  ('nguyen.van.d@tronhanh.demo', 'Phòng trọ giá tốt cho người đi làm, gần Hàng Xanh', 'Chỗ để xe'),
  ('nguyen.van.e@tronhanh.demo', 'Căn hộ mini WC riêng, nhận nuôi thú cưng', 'Máy lạnh'),
  ('nguyen.van.e@tronhanh.demo', 'Căn hộ mini WC riêng, nhận nuôi thú cưng', 'Wifi'),
  ('nguyen.van.e@tronhanh.demo', 'Căn hộ mini WC riêng, nhận nuôi thú cưng', 'WC riêng'),
  ('nguyen.van.e@tronhanh.demo', 'Căn hộ mini WC riêng, nhận nuôi thú cưng', 'Cho nuôi thú cưng'),
  ('nguyen.van.e@tronhanh.demo', 'Phòng master có ban công, view thoáng tầng cao', 'Máy lạnh'),
  ('nguyen.van.e@tronhanh.demo', 'Phòng master có ban công, view thoáng tầng cao', 'Wifi'),
  ('nguyen.van.e@tronhanh.demo', 'Phòng master có ban công, view thoáng tầng cao', 'WC riêng'),
  ('nguyen.van.e@tronhanh.demo', 'Phòng master có ban công, view thoáng tầng cao', 'Chỗ để xe'),
  ('nguyen.van.f@tronhanh.demo', 'Căn hộ dịch vụ 2 phòng ngủ, dọn phòng hàng tuần', 'Máy lạnh'),
  ('nguyen.van.f@tronhanh.demo', 'Căn hộ dịch vụ 2 phòng ngủ, dọn phòng hàng tuần', 'Wifi'),
  ('nguyen.van.f@tronhanh.demo', 'Căn hộ dịch vụ 2 phòng ngủ, dọn phòng hàng tuần', 'WC riêng'),
  ('nguyen.van.f@tronhanh.demo', 'Căn hộ dịch vụ 2 phòng ngủ, dọn phòng hàng tuần', 'Chỗ để xe'),
  ('nguyen.van.g@tronhanh.demo', 'Phòng trọ sạch sẽ, an ninh, có camera hành lang', 'Wifi'),
  ('nguyen.van.g@tronhanh.demo', 'Phòng trọ sạch sẽ, an ninh, có camera hành lang', 'Chỗ để xe'),
  ('nguyen.van.g@tronhanh.demo', 'Phòng trọ sạch sẽ, an ninh, có camera hành lang', 'WC riêng'),
  ('nguyen.van.h@tronhanh.demo', 'Nhà nguyên căn hẻm rộng, phù hợp nhóm ở ghép', 'Chỗ để xe'),
  ('nguyen.van.h@tronhanh.demo', 'Nhà nguyên căn hẻm rộng, phù hợp nhóm ở ghép', 'Giờ giấc tự do'),
  ('nguyen.van.h@tronhanh.demo', 'Nhà nguyên căn hẻm rộng, phù hợp nhóm ở ghép', 'WC riêng'),
  ('nguyen.van.i@tronhanh.demo', 'Căn hộ mini gần ĐH Bách Khoa cơ sở 2', 'Máy lạnh'),
  ('nguyen.van.i@tronhanh.demo', 'Căn hộ mini gần ĐH Bách Khoa cơ sở 2', 'Wifi'),
  ('nguyen.van.i@tronhanh.demo', 'Căn hộ mini gần ĐH Bách Khoa cơ sở 2', 'Gác lửng'),
  ('nguyen.van.j@tronhanh.demo', 'Ký túc xá nữ, quản lý chặt, đóng cửa 23h', 'Wifi'),
  ('nguyen.van.j@tronhanh.demo', 'Ký túc xá nữ, quản lý chặt, đóng cửa 23h', 'Chỗ để xe')
) as a(email, title, amenity)
join auth.users u              on u.email = a.email
join public.rental_listings l  on l.seller_id = u.id
                              and l.title = a.title
                              and l.deleted_at is null
where not exists (
  select 1 from public.listing_amenities la
   where la.listing_id = l.id and la.amenity = a.amenity
);

-- ══ 4. Mười tin nhu cầu ════════════════════════════════════════════════════
-- Cả hai loại `RoomWanted` và `RoommateWanted`; mỗi tin chỉ điền bộ cột của
-- loại mình, cột của loại kia để NULL — đúng như form thật ghi xuống.
insert into public.demand_posts (
  renter_id, kind, title, desired_districts, desired_province_code, desired_ward_codes,
  price_min, price_max, status,
  description, contact_name, contact_phone, expire_at,
  property_type, min_area, move_in_date, occupant_count, desired_amenities,
  current_address, district, share_price, needed_count, gender_requirement, requirements
)
select
  u.id, d.kind, d.title, d.ward_names, 79, d.ward_codes, d.price_min, d.price_max, 'Active',
  d.description, p.full_name, p.contact_phone, now() + interval '60 days',
  d.property_type, d.min_area, d.move_in_date::date, d.occupant_count, d.desired_amenities,
  d.current_address, d.district, d.share_price, d.needed_count, d.gender_requirement, d.requirements
from (values
  ('tran.thi.a@tronhanh.demo', 'RoomWanted', 'Tìm phòng trọ có gác khu Thủ Đức, dọn vào đầu tháng sau', array['Phường Thủ Đức', 'Phường Trung Mỹ Tây']::text[], array[26824, 26785]::integer[], 1500000, 2500000, 'Mình là sinh viên năm 3, cần phòng có gác để tiết kiệm diện tích. Ở một mình, ít nấu ăn, giờ giấc ổn định.',
   'Phòng trọ', 16, '2026-09-01', 1, array['Gác lửng', 'Wifi']::text[],
   null, null, null, null, null, array[]::text[]),
  ('tran.thi.b@tronhanh.demo', 'RoomWanted', 'Cần căn hộ mini có bếp riêng khu Gò Vấp', array['Phường Hạnh Thông', 'Phường Trung Mỹ Tây']::text[], array[26890, 26785]::integer[], 3000000, 4500000, 'Hai vợ chồng mới cưới, cần bếp riêng để tự nấu. Ưu tiên chỗ để được xe máy trong nhà.',
   'Căn hộ mini', 25, '2026-08-20', 2, array['WC riêng', 'Chỗ để xe', 'Máy lạnh']::text[],
   null, null, null, null, null, array[]::text[]),
  ('tran.thi.c@tronhanh.demo', 'RoommateWanted', 'Tìm 1 bạn nữ ở ghép căn hộ 2PN Quận 7', array['Phường Tân Hưng']::text[], array[27475]::integer[], 2500000, 3500000, 'Căn hộ đã có sẵn nội thất, mình ở phòng nhỏ, bạn lấy phòng lớn hơn. Mình đi làm giờ hành chính, sạch sẽ, không hút thuốc.',
   null, null, null, null, array[]::text[],
   'Chung cư Sunrise City, Nguyễn Hữu Thọ', 'Phường Tân Hưng', 3200000, 1, 'Female', array['Không hút thuốc', 'Giữ vệ sinh chung']::text[]),
  ('tran.thi.d@tronhanh.demo', 'RoomWanted', 'Tìm phòng cho nuôi mèo, khu Quận 10 hoặc Quận 12', array['Phường Hòa Hưng', 'Phường Trung Mỹ Tây']::text[], array[27163, 26785]::integer[], 2500000, 4000000, 'Mình có một bé mèo đã triệt sản và tiêm phòng đầy đủ, rất ít kêu. Cần chủ nhà đồng ý cho nuôi thú cưng.',
   'Phòng trọ', 20, '2026-09-15', 1, array['Cho nuôi thú cưng', 'WC riêng']::text[],
   null, null, null, null, null, array[]::text[]),
  ('tran.thi.e@tronhanh.demo', 'RoommateWanted', 'Cần 2 bạn ở ghép nhà nguyên căn Thủ Đức', array['Phường Thủ Đức']::text[], array[26824]::integer[], 1500000, 2200000, 'Nhà 3 phòng ngủ, hiện có 1 bạn ở. Cần thêm 2 người chia tiền nhà và điện nước. Sân để xe rộng.',
   null, null, null, null, array[]::text[],
   'Đường 12, Trường Thọ, Thủ Đức', 'Phường Thủ Đức', 2000000, 2, 'Any', array['Không tụ tập ồn sau 22h']::text[]),
  ('tran.thi.f@tronhanh.demo', 'RoomWanted', 'Tìm căn hộ dịch vụ Quận 7 cho người đi làm', array['Phường Tân Hưng', 'Phường Thạnh Mỹ Tây']::text[], array[27475, 26956]::integer[], 6000000, 9000000, 'Mình làm ở khu Phú Mỹ Hưng, muốn thuê chỗ có thang máy và bảo vệ. Ưu tiên nơi có dọn phòng định kỳ.',
   'Căn hộ dịch vụ', 35, '2026-08-25', 1, array['Máy lạnh', 'WC riêng', 'Chỗ để xe']::text[],
   null, null, null, null, null, array[]::text[]),
  ('tran.thi.g@tronhanh.demo', 'RoomWanted', 'Sinh viên tìm ký túc xá dưới 1,5 triệu', array['Phường Thủ Đức', 'Phường Hòa Hưng']::text[], array[26824, 27163]::integer[], 800000, 1500000, 'Mình cần chỗ ở rẻ, ở ghép nhiều người cũng được. Chủ yếu cần chỗ ngủ và bàn học, wifi ổn định là được.',
   'Ký túc xá', 0, '2026-09-05', 1, array['Wifi']::text[],
   null, null, null, null, null, array[]::text[]),
  ('tran.thi.h@tronhanh.demo', 'RoommateWanted', 'Tìm bạn nam ở ghép phòng trọ Bình Thạnh', array['Phường Thạnh Mỹ Tây']::text[], array[26956]::integer[], 1200000, 1800000, 'Phòng 20m2 có gác, mình ở dưới, bạn ở gác. Mình làm ca tối nên ban ngày phòng khá trống.',
   null, null, null, null, array[]::text[],
   'Đinh Bộ Lĩnh, Phường 26, Bình Thạnh', 'Phường Thạnh Mỹ Tây', 1500000, 1, 'Male', array['Đi làm giờ hành chính']::text[]),
  ('tran.thi.i@tronhanh.demo', 'RoomWanted', 'Cần nhà nguyên căn cho nhóm 4 người đi làm', array['Phường Thạnh Mỹ Tây', 'Phường Hạnh Thông']::text[], array[26956, 26890]::integer[], 7000000, 10000000, 'Nhóm 4 bạn đi làm, cần nhà ít nhất 2 phòng ngủ và chỗ để 4 xe máy. Ký hợp đồng dài hạn 1 năm.',
   'Nhà nguyên căn', 45, '2026-10-01', 4, array['Chỗ để xe', 'Giờ giấc tự do']::text[],
   null, null, null, null, null, array[]::text[]),
  ('tran.thi.j@tronhanh.demo', 'RoomWanted', 'Tìm phòng giờ giấc tự do, mình đi làm ca đêm', array['Phường Hòa Hưng', 'Phường Thạnh Mỹ Tây']::text[], array[27163, 26956]::integer[], 2000000, 3500000, 'Mình làm ca đêm nên về nhà lúc 1–2h sáng, cần nơi không khóa cổng sớm. Ở một mình, không nấu nướng nhiều.',
   'Phòng trọ', 18, '2026-09-10', 1, array['Giờ giấc tự do', 'Máy lạnh']::text[],
   null, null, null, null, null, array[]::text[])
) as d(email, kind, title, ward_names, ward_codes, price_min, price_max, description,
          property_type, min_area, move_in_date, occupant_count, desired_amenities,
          current_address, district, share_price, needed_count, gender_requirement, requirements)
join auth.users u      on u.email = d.email
join public.profiles p on p.user_id = u.id
where not exists (
  select 1 from public.demand_posts dp
   where dp.renter_id = u.id and dp.title = d.title and dp.deleted_at is null
);

-- ══ 5. KIỂM TRA — cột `thuc_te` phải bằng `mong_doi` ở MỌI dòng ════════════
select 'tài khoản demo mới' as muc, count(*) as thuc_te, 20 as mong_doi
  from auth.users
 where email like 'nguyen.van.%@tronhanh.demo' or email like 'tran.thi.%@tronhanh.demo'
union all
select 'có dòng identities (đăng nhập được)', count(*), 20
  from auth.identities i
  join auth.users u on u.id = i.user_id
 where u.email like 'nguyen.van.%@tronhanh.demo' or u.email like 'tran.thi.%@tronhanh.demo'
union all
select 'hồ sơ profiles (trigger tự tạo)', count(*), 20
  from public.profiles p
  join auth.users u on u.id = p.user_id
 where u.email like 'nguyen.van.%@tronhanh.demo' or u.email like 'tran.thi.%@tronhanh.demo'
union all
select 'người đăng tin có role Seller', count(*), 10
  from public.user_roles r
  join auth.users u on u.id = r.user_id
 where r.role = 'Seller' and u.email like 'nguyen.van.%@tronhanh.demo'
union all
select 'tin cho thuê Active', count(*), 15
  from public.rental_listings l
  join auth.users u on u.id = l.seller_id
 where u.email like 'nguyen.van.%@tronhanh.demo' and l.status = 'Active' and l.deleted_at is null
union all
select 'tin nhu cầu Active', count(*), 10
  from public.demand_posts d
  join auth.users u on u.id = d.renter_id
 where u.email like 'tran.thi.%@tronhanh.demo' and d.status = 'Active' and d.deleted_at is null;

-- ⚠️ Sau khi chạy: ĐĂNG NHẬP THỬ bằng `nguyen.van.a@tronhanh.demo` /
-- `TroNhanh@2026`. Số đếm đúng chỉ chứng minh có ROW trong bảng, không chứng
-- minh GoTrue chấp nhận mật khẩu. Đăng nhập được một lần mới là bằng chứng.

-- ═══════════════════════════════════════════════════════════════════════════
-- DỌN SẠCH (khi cần seed lại, hoặc trước production)
-- `on delete cascade` từ auth.users kéo theo profiles, user_roles,
-- rental_listings, listing_amenities và demand_posts của họ.
-- ═══════════════════════════════════════════════════════════════════════════
-- delete from auth.users
--  where email like 'nguyen.van.%@tronhanh.demo'
--     or email like 'tran.thi.%@tronhanh.demo';
