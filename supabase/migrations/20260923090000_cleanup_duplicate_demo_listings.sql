-- Xóa mềm các bản sao chính xác do seeder cũ tạo cho nhiều tài khoản.
--
-- Seeder trước đây chèn cùng bốn mẫu tin cho MỖI người dùng, nên marketplace có
-- nhiều UUID/chủ khác nhau nhưng tiêu đề, địa chỉ, giá, diện tích và mô tả giống
-- hệt nhau. Chỉ giới hạn vào đúng bốn tiêu đề mẫu đã biết để không gộp nhầm tin
-- thật của hai chủ trọ khác nhau.
--
-- Idempotent: các hàng đã có deleted_at không tham gia xếp hạng ở lần chạy sau.
with ranked_demo_listings as (
  select
    id,
    row_number() over (
      partition by title, property_type, price, district, area, address, description
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.rental_listings
  where deleted_at is null
    and title in (
      'Studio Full Nội Thất gần ĐH RMIT',
      'Duplex Ban Công View Đẹp, Full Nội Thất',
      'Căn Hộ Mini Full Nội Thất Thủ Đức',
      'Phòng Master Rộng, Có Ban Công Riêng'
    )
)
update public.rental_listings as listing
set deleted_at = now()
from ranked_demo_listings as ranked
where listing.id = ranked.id
  and ranked.duplicate_rank > 1
  and listing.deleted_at is null;

-- OC1 ghi nhận đúng tin seed này dùng ảnh biểu mẫu/sơ đồ thay vì ảnh phòng.
-- Không xóa dữ liệu: đưa về hàng chờ để moderator thay ảnh hoặc từ chối.
update public.rental_listings
set status = 'PendingApproval',
    approved_at = null
where deleted_at is null
  and status = 'Active'
  and lower(btrim(title)) = lower('Cho thuê Dĩ An');
