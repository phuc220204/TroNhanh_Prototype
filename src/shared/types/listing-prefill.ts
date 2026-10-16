/**
 * Dữ liệu điền sẵn form đăng tin, truyền qua `navigate("/dang-tin-cho-thue",
 * { state: { prefill } })`.
 *
 * Đây là điểm nối số 1 của CLAUDE.md §2.2 ("Tạo tin từ phòng trống"): workspace
 * dựng object này từ bảng của chính nó, marketplace chỉ đọc nó làm giá trị ban
 * đầu của form. Đặt kiểu ở `shared/` để hai shell thống nhất hình dạng mà không
 * import lẫn nhau. Mọi field đều tùy chọn — thiếu gì người đăng tự nhập.
 *
 * Chỉ chứa thông tin CÔNG KHAI trên tin đăng. KHÔNG thêm STK ngân hàng, người
 * ở, hợp đồng hay hóa đơn.
 */
export interface ListingPrefill {
  /** Phòng sẽ gắn với tin. RPC tạo tin tự kiểm tra phòng có thuộc người đăng. */
  roomId?: string;
  title?: string;
  roomType?: string;
  address?: string;
  /** TÊN phường/xã để hiển thị. */
  district?: string;
  provinceCode?: number | null;
  wardCode?: number | null;
  area?: number;
  price?: number;
  floor?: number;
  phone?: string;
  /** Đơn giá điện (đ/kWh). */
  electric?: number;
  /** Đơn giá nước — theo `waterUnit`. */
  water?: number;
  waterUnit?: "person" | "cubic";
  /** Phí dịch vụ hằng tháng. */
  service?: number;
}
