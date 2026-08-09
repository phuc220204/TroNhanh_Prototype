-- ═══════════════════════════════════════════════════════════════════════════
-- Backfill `listing_amenities.amenity`: key → label tiếng Việt.
--
-- VÌ SAO: sau khi tách DangTinPage ở T19, phép ánh xạ key→label bị đánh rơi
-- (`amenities.map(key => key)`), nên mọi tin đăng từ đó tới nay lưu `ac`,
-- `loft`, `washer`… thay vì `Máy lạnh`, `Gác lửng`, `Máy giặt riêng`.
--
-- HẬU QUẢ: bộ lọc tiện ích ở /tat-ca-phong và /tim-phong so theo LABEL nên
-- không khớp row nào; `mapAmenityToKey()` trả icon Wifi cho mọi tiện ích.
--
-- Bảng KHÔNG có unique(listing_id, amenity) nên update không thể vỡ vì trùng —
-- nhưng một tin lỡ có cả `ac` lẫn `Máy lạnh` sẽ hiện nhãn hai lần, nên dọn sau.
-- Idempotent: chạy lại chỉ đụng đúng các row còn là key.
-- ═══════════════════════════════════════════════════════════════════════════

with amenity_map(key, label) as (
  values
    ('ac',      'Máy lạnh'),
    ('wifi',    'Wifi'),
    ('loft',    'Gác lửng'),
    ('parking', 'Chỗ để xe'),
    ('bath',    'WC riêng'),
    ('free',    'Giờ giấc tự do'),
    ('fridge',  'Tủ lạnh'),
    ('washer',  'Máy giặt riêng'),
    ('finger',  'Khóa vân tay'),
    ('garage',  'Hầm để xe'),
    ('pet',     'Cho nuôi thú cưng')
)
update public.listing_amenities a
   set amenity = amenity_map.label
  from amenity_map
 where a.amenity = amenity_map.key;

-- Gộp nhãn trùng trong cùng một tin, giữ lại row cũ nhất.
delete from public.listing_amenities a
using public.listing_amenities b
where a.listing_id = b.listing_id
  and a.amenity    = b.amenity
  and a.ctid > b.ctid;
