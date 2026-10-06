/** Copy hướng dẫn cho wizard đăng tin — gom một chỗ để các step dùng chung. */

export const DESCRIPTION_PLACEHOLDER = [
  "Ví dụ: Phòng 25m² mới sơn, có gác, cửa sổ thoáng, giờ giấc tự do.",
  "• Giao thông: gần trạm xe buýt tuyến 19, 53; 2 phút ra đường lớn.",
  "• Gần trường: ĐH Bách Khoa 5 phút đi bộ, ĐH Kinh tế 10 phút đi xe.",
  "• Tiện ích: chợ, siêu thị, cửa hàng tiện lợi, tiệm giặt ngay đầu hẻm.",
  "• Khu vực: khu dân cư an ninh, nhiều quán ăn, khu vui chơi buổi tối.",
  "• Phù hợp: sinh viên, người đi làm; tối đa 2 người/phòng.",
].join("\n");

export const DESCRIPTION_TIPS: readonly string[] = [
  "Tuyến xe buýt / trạm gần nhất và thời gian đi bộ ra trạm.",
  "Các trường học gần đó (tên trường, mất bao lâu để đến).",
  "Tiện ích quanh phòng: chợ, siêu thị, bệnh viện, tiệm giặt…",
  "Không khí khu vực: khu dân cư, an ninh, quán ăn, chỗ vui chơi.",
  "Giờ giấc, chỗ để xe, số người ở tối đa và đối tượng phù hợp.",
];

export const TITLE_HINT =
  "Nên ghi loại phòng + khu vực + điểm nổi bật, ví dụ: \"Phòng có gác gần ĐH Bách Khoa, có máy lạnh\".";

export const PHOTO_TIPS: readonly string[] = [
  "Chụp ban ngày, đủ sáng, cầm máy ngang để thấy cả phòng.",
  "Nên có ảnh nhà vệ sinh, bếp, chỗ để xe và lối vào.",
  "Ảnh đầu tiên là ảnh bìa — chọn ảnh đẹp nhất.",
];
