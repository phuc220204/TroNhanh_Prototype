import {
  Wind, Wifi, Layers, Car, Bath, Clock,
  Refrigerator, WashingMachine, Fingerprint, ParkingCircle, PawPrint,
} from "lucide-react";
import type { ElementType } from "react";

/**
 * NGUỒN CHÂN LÝ DUY NHẤT cho tiện ích của tin cho thuê.
 *
 * Trước đây có HAI danh sách lệch nhau: form đăng tin có 11 mục, trang chi tiết
 * có 6 mục với nhãn khác ("Wifi" vs "Wifi tốc độ cao") — nên trang chi tiết
 * không khớp được icon và rơi hết về Wifi.
 *
 * ⚠️ `listing_amenities.amenity` lưu **LABEL tiếng Việt**, không lưu `key`.
 * Bộ lọc ở AllListingsPage/SearchResultsPage và `mapAmenityToKey()` đều so theo
 * label. Ghi `key` vào DB sẽ làm cả bộ lọc lẫn icon chết im lặng.
 * `key` chỉ dùng làm định danh trong state của form.
 */
export interface AmenityOption {
  key: string;
  label: string;
  Icon: ElementType;
}

export const AMENITY_OPTIONS: AmenityOption[] = [
  { key: "ac",      label: "Máy lạnh",           Icon: Wind },
  { key: "wifi",    label: "Wifi",               Icon: Wifi },
  { key: "loft",    label: "Gác lửng",           Icon: Layers },
  { key: "parking", label: "Chỗ để xe",          Icon: Car },
  { key: "bath",    label: "WC riêng",           Icon: Bath },
  { key: "free",    label: "Giờ giấc tự do",     Icon: Clock },
  { key: "fridge",  label: "Tủ lạnh",            Icon: Refrigerator },
  { key: "washer",  label: "Máy giặt riêng",     Icon: WashingMachine },
  { key: "finger",  label: "Khóa vân tay",       Icon: Fingerprint },
  { key: "garage",  label: "Hầm để xe",          Icon: ParkingCircle },
  { key: "pet",     label: "Cho nuôi thú cưng",  Icon: PawPrint },
];

/** key trong form → label lưu vào DB. Không khớp thì trả nguyên input. */
export function amenityKeyToLabel(key: string): string {
  return AMENITY_OPTIONS.find((a) => a.key === key)?.label ?? key;
}

/**
 * Icon cho một giá trị đọc từ DB. Nhận cả label lẫn key để tin cũ
 * (đã lỡ lưu key trước khi có backfill) vẫn hiện đúng icon.
 */
export function amenityIcon(value: string): ElementType {
  const norm = value.toLowerCase().trim();
  const found =
    AMENITY_OPTIONS.find((a) => a.label.toLowerCase() === norm) ??
    AMENITY_OPTIONS.find((a) => a.key === norm) ??
    AMENITY_OPTIONS.find((a) => norm.includes(a.label.toLowerCase()));
  return found?.Icon ?? Wifi;
}

/** Nhãn hiển thị cho giá trị đọc từ DB — tin cũ lưu key vẫn ra tiếng Việt. */
export function amenityLabel(value: string): string {
  const norm = value.toLowerCase().trim();
  const found = AMENITY_OPTIONS.find((a) => a.key === norm);
  return found ? found.label : value;
}
