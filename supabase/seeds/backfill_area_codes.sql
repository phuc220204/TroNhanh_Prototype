-- ═══════════════════════════════════════════════════════════════════════════
-- VÁ MÃ KHU VỰC cho dữ liệu demo seed TRƯỚC 2026-08-09
--
-- Dùng khi bạn ĐÃ chạy `20_demo_users_and_posts.sql` bản cũ (hoặc đã bấm
-- "Khởi tạo dữ liệu mẫu") và không muốn xóa đi làm lại.
--
-- VÌ SAO CHẠY LẠI FILE SEED KHÔNG ĂN THUA: file đó chống trùng bằng
-- `where not exists (... seller_id = u.id and title = d.title ...)`. Tiêu đề
-- không đổi, nên mọi `insert` bị bỏ qua và các dòng cũ vẫn giữ `ward_code` NULL
-- — chạy xong thấy "thành công" mà không có gì thay đổi.
--
-- Script này KHÔNG xóa gì: chỉ `update` những dòng còn thiếu mã, và đổi
-- `district` từ tên quận cũ sang tên phường/xã 2025.
--
-- Chạy lại nhiều lần an toàn (mệnh đề `where ... is null` tự chặn lần hai).
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ══ 1. Mười lăm tin của nhóm nguyen.van.* ═════════════════════════════════
update public.rental_listings l set
  province_code = 79,
  ward_code     = v.ward_code,
  district      = v.ward_name,
  updated_at    = now()
from (values
  ('Phòng trọ mới xây, cửa sổ lớn, hẻm xe hơi', 26785, 'Phường Trung Mỹ Tây'),
  ('Căn hộ mini có bếp riêng, gần chợ Hạnh Thông Tây', 26890, 'Phường Hạnh Thông'),
  ('Ký túc xá sinh viên 4 người/phòng, có máy giặt chung', 26824, 'Phường Thủ Đức'),
  ('Phòng trọ gác lửng, tách biệt chủ, giờ giấc tự do', 26800, 'Phường Linh Xuân'),
  ('Căn hộ dịch vụ full nội thất, tòa nhà có thang máy', 27475, 'Phường Tân Hưng'),
  ('Studio yên tĩnh trong khu dân cư Him Lam', 27478, 'Phường Tân Thuận'),
  ('Nhà nguyên căn 1 trệt 1 lầu, 2 phòng ngủ', 26956, 'Phường Thạnh Mỹ Tây'),
  ('Phòng trọ giá tốt cho người đi làm, gần Hàng Xanh', 26944, 'Phường Gia Định'),
  ('Căn hộ mini WC riêng, nhận nuôi thú cưng', 27163, 'Phường Hòa Hưng'),
  ('Phòng master có ban công, view thoáng tầng cao', 27169, 'Phường Diên Hồng'),
  ('Căn hộ dịch vụ 2 phòng ngủ, dọn phòng hàng tuần', 27478, 'Phường Tân Thuận'),
  ('Phòng trọ sạch sẽ, an ninh, có camera hành lang', 26876, 'Phường An Nhơn'),
  ('Nhà nguyên căn hẻm rộng, phù hợp nhóm ở ghép', 26800, 'Phường Linh Xuân'),
  ('Căn hộ mini gần ĐH Bách Khoa cơ sở 2', 26800, 'Phường Linh Xuân'),
  ('Ký túc xá nữ, quản lý chặt, đóng cửa 23h', 27169, 'Phường Diên Hồng')
) as v(title, ward_code, ward_name)
where l.title = v.title and l.ward_code is null and l.deleted_at is null;

-- ══ 2. Bốn tin của seller.a (do dbSeeder tạo) ═════════════════════════════
update public.rental_listings l set
  province_code = 79,
  ward_code     = v.ward_code,
  district      = v.ward_name,
  updated_at    = now()
from (values
  ('Studio Full Nội Thất gần ĐH RMIT', 27475, 'Phường Tân Hưng'),
  ('Duplex Ban Công View Đẹp, Full Nội Thất', 26956, 'Phường Thạnh Mỹ Tây'),
  ('Căn Hộ Mini Full Nội Thất Thủ Đức', 26824, 'Phường Thủ Đức'),
  ('Phòng Master Rộng, Có Ban Công Riêng', 26890, 'Phường Hạnh Thông')
) as v(title, ward_code, ward_name)
where l.title = v.title and l.ward_code is null and l.deleted_at is null;

-- ══ 3. Ba khu trọ của seller.a ════════════════════════════════════════════
-- Khu trọ cần mã để ghép nối với tin nhu cầu (`scoreDemandMatch`).
update public.properties p set
  province_code = 79,
  ward_code     = v.ward_code,
  district      = v.ward_name,
  updated_at    = now()
from (values
  ('Khu trọ Phan Văn Trị', 26956, 'Phường Thạnh Mỹ Tây'),
  ('Căn hộ Quận 7', 27475, 'Phường Tân Hưng'),
  ('Nhà trọ Thủ Đức', 26824, 'Phường Thủ Đức')
) as v(name, ward_code, ward_name)
where p.name = v.name and p.ward_code is null and p.deleted_at is null;

-- ══ 4. Mười tin nhu cầu của nhóm tran.thi.* ═══════════════════════════════
update public.demand_posts d set
  desired_province_code = 79,
  desired_ward_codes    = v.ward_codes,
  desired_districts     = v.ward_names,
  district              = case when d.kind = 'RoommateWanted' then v.ward_names[1] else d.district end,
  updated_at            = now()
from (values
  ('Tìm phòng trọ có gác khu Thủ Đức, dọn vào đầu tháng sau', array[26824, 26785]::integer[], array['Phường Thủ Đức', 'Phường Trung Mỹ Tây']::text[]),
  ('Cần căn hộ mini có bếp riêng khu Gò Vấp', array[26890, 26785]::integer[], array['Phường Hạnh Thông', 'Phường Trung Mỹ Tây']::text[]),
  ('Tìm 1 bạn nữ ở ghép căn hộ 2PN Quận 7', array[27475]::integer[], array['Phường Tân Hưng']::text[]),
  ('Tìm phòng cho nuôi mèo, khu Quận 10 hoặc Quận 12', array[27163, 26785]::integer[], array['Phường Hòa Hưng', 'Phường Trung Mỹ Tây']::text[]),
  ('Cần 2 bạn ở ghép nhà nguyên căn Thủ Đức', array[26824]::integer[], array['Phường Thủ Đức']::text[]),
  ('Tìm căn hộ dịch vụ Quận 7 cho người đi làm', array[27475, 26956]::integer[], array['Phường Tân Hưng', 'Phường Thạnh Mỹ Tây']::text[]),
  ('Sinh viên tìm ký túc xá dưới 1,5 triệu', array[26824, 27163]::integer[], array['Phường Thủ Đức', 'Phường Hòa Hưng']::text[]),
  ('Tìm bạn nam ở ghép phòng trọ Bình Thạnh', array[26956]::integer[], array['Phường Thạnh Mỹ Tây']::text[]),
  ('Cần nhà nguyên căn cho nhóm 4 người đi làm', array[26956, 26890]::integer[], array['Phường Thạnh Mỹ Tây', 'Phường Hạnh Thông']::text[]),
  ('Tìm phòng giờ giấc tự do, mình đi làm ca đêm', array[27163, 26956]::integer[], array['Phường Hòa Hưng', 'Phường Thạnh Mỹ Tây']::text[])
) as v(title, ward_codes, ward_names)
where d.title = v.title
  and coalesce(array_length(d.desired_ward_codes, 1), 0) = 0
  and d.deleted_at is null;

commit;

-- ══ KIỂM — mọi dòng phải là 0 ═════════════════════════════════════════════
select 'tin cho thuê còn thiếu mã' as muc, count(*) as con_thieu
  from public.rental_listings where ward_code is null and deleted_at is null
union all
select 'khu trọ còn thiếu mã', count(*)
  from public.properties where ward_code is null and deleted_at is null
union all
select 'tin nhu cầu còn thiếu mã', count(*)
  from public.demand_posts
 where coalesce(array_length(desired_ward_codes, 1), 0) = 0 and deleted_at is null;

-- Còn > 0 nghĩa là có bản ghi bạn tự tạo tay ngoài seed. Sửa chúng bằng cách
-- mở tin/khu đó lên và chọn lại khu vực trong giao diện.
