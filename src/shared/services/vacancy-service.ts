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
  district: string | null;
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
      .select("id, price, area, properties!inner(name, district)")
      .eq("status", "Available")
      .is("deleted_at", null);

    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      roomId: r.id,
      propertyName: r.properties?.name ?? "",
      district: r.properties?.district ?? null,
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
    desired_districts: string[] | null;
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

    const districts = post.desired_districts ?? [];
    if (room.district && districts.includes(room.district)) score += 50;

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
