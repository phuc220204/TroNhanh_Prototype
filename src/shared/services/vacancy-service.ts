/**
 * ⚠️  ĐIỂM NỐI DUY NHẤT ĐƯỢC PHÉP GIỮA marketplace VÀ workspace
 *
 * CLAUDE.md §2.1 cấm marketplace và workspace query bảng của nhau. File này là
 * ngoại lệ ĐƯỢC PHÊ DUYỆT, tồn tại cho đúng một mục đích: trang
 * `/chu-tro/tim-nguoi-thue` (luồng 4c) cần xếp hạng demand post theo độ khớp với
 * phòng trống của Seller — mà `rooms`/`properties` là bảng workspace, còn
 * `demand_posts` là bảng marketplace.
 *
 * HỢP ĐỒNG CỦA FILE NÀY — đừng nới:
 *   ✅ Trả ĐÚNG { roomId, propertyName, district, price, area }
 *   ❌ KHÔNG trả occupancy, contract, invoice, người ở, doanh thu, thông tin
 *      ngân hàng, hay bất cứ dữ liệu vận hành nào.
 *   ❌ KHÔNG thêm hàm mới vào file này. Cần crossing khác → làm SERVER-SIDE
 *      trong một RPC, không phải ở đây.
 *
 * Nếu ai đó thêm field vào VacantRoomSummary, đó là dấu hiệu ranh giới đang bị
 * xói mòn — hãy hỏi lại thay vì thêm.
 */
import { supabase } from "../supabaseClient";
import { withErrorHandling } from "./supabase-error";

export interface VacantRoomSummary {
  roomId: string;
  propertyName: string;
  /** TÊN khu vực để hiển thị. Với khu tạo trước 01/07/2025 là tên quận cũ. */
  district: string | null;
  /**
   * Mã phường/xã của khu trọ.
   *
   * Ghi chú ở đầu file cấm thêm field vô cớ, nên nói rõ vì sao field này KHÔNG
   * làm xói mòn ranh giới §2.2: nó không mang thông tin MỚI nào từ workspace
   * sang marketplace — đó đúng là dữ liệu `district` đã có ở dòng trên, chỉ ở
   * dạng mã thay vì tên. Sau khi cấp quận/huyện bị bãi bỏ, khớp theo tên là
   * khớp trên một vốn từ đã chết.
   *
   * Vẫn KHÔNG có ở đây: đơn giá điện nước, số tài khoản, tình trạng hợp đồng.
   */
  wardCode: number | null;
  price: number;
  area: number;
}

/**
 * Phòng trống của Seller đang đăng nhập.
 * RLS (`owner_id = auth.uid()`) lo phần cô lập dữ liệu — không cần lọc ở client.
 */
export async function getMyVacantRoomSummaries(): Promise<VacantRoomSummary[]> {
  return withErrorHandling("vacancy-service.getMyVacantRoomSummaries", async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, price, area, properties!inner(name, district, province_code, ward_code)")
      .eq("status", "Available")
      .is("deleted_at", null);

    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      roomId: r.id,
      propertyName: r.properties?.name ?? "",
      district: r.properties?.district ?? null,
      wardCode: r.properties?.ward_code ?? null,
      price: Number(r.price),
      area: Number(r.area),
    }));
  });
}

/**
 * Điểm khớp giữa một demand post và tập phòng trống của Seller.
 * Thuần hàm số — không chạm DB, test được độc lập.
 *
 * Thang điểm (tối đa 100):
 *   +50 khớp khu vực   (điều kiện cần thực tế: người thuê hiếm khi đổi khu)
 *   +35 khoảng giá giao nhau
 *   +15 diện tích đạt yêu cầu tối thiểu
 */
export function scoreDemandMatch(
  post: {
    /** @deprecated Tên quận cũ — chỉ còn để khớp tin đăng trước 01/07/2025. */
    desired_districts: string[] | null;
    desired_ward_codes?: number[] | null;
    price_min: number;
    price_max: number;
    min_area: number | null;
  },
  rooms: VacantRoomSummary[],
): { score: number; bestRoomId: string | null } {
  let best = 0;
  let bestRoomId: string | null = null;

  for (const room of rooms) {
    let score = 0;

    // Khớp theo MÃ phường trước — mã ổn định và không phụ thuộc cách viết tên.
    // Chỉ khi một trong hai phía chưa có mã (tin/khu trọ tạo trước khi chuyển
    // sang mô hình 2 cấp) mới rơi về so khớp tên, nếu không dữ liệu cũ sẽ mất
    // điểm khu vực và biến mất khỏi danh sách ghép nối.
    const wardCodes = post.desired_ward_codes ?? [];
    const districts = post.desired_districts ?? [];
    if (room.wardCode != null && wardCodes.length > 0) {
      if (wardCodes.includes(room.wardCode)) score += 50;
    } else if (room.district && districts.includes(room.district)) {
      score += 50;
    }

    // Giao nhau của [price_min, price_max] và giá phòng
    if (room.price >= post.price_min && room.price <= post.price_max) {
      score += 35;
    } else {
      // Lệch ≤15% vẫn đáng hiện, điểm giảm dần
      const nearest = room.price < post.price_min ? post.price_min : post.price_max;
      const drift = Math.abs(room.price - nearest) / Math.max(nearest, 1);
      if (drift <= 0.15) score += Math.round(35 * (1 - drift / 0.15));
    }

    if (post.min_area == null || room.area >= post.min_area) score += 15;

    if (score > best) {
      best = score;
      bestRoomId = room.roomId;
    }
  }

  return { score: best, bestRoomId };
}
