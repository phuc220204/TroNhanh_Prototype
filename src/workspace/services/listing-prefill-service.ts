import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";
import type { ListingPrefill } from "../../shared/types/listing-prefill";

/** Loại hình mặc định: `properties` chưa có cột loại hình, phòng trong khu trọ là "Phòng trọ". */
const DEFAULT_ROOM_TYPE = "Phòng trọ";

/**
 * "Tạo tin từ phòng trống" (CLAUDE.md §2.2, điểm nối số 1): đọc phòng + khu của
 * CHÍNH chủ trọ rồi dựng giá trị điền sẵn cho form đăng tin.
 *
 * Chỉ select cột công khai trên tin đăng — KHÔNG đọc STK ngân hàng, người ở, hợp
 * đồng. RLS của `rooms`/`properties` (`owner_id = auth.uid()`) đảm bảo không đọc
 * được phòng người khác; RPC tạo tin còn kiểm tra lại `room_id` một lần nữa.
 *
 * Đơn giá riêng của phòng (`null` = theo giá khu) được ưu tiên hơn giá khu.
 *
 * @returns `null` khi phòng không tồn tại / đã xóa. NÉM lỗi khi truy vấn lỗi.
 */
export async function getRoomListingPrefill(roomId: string): Promise<ListingPrefill | null> {
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select(`
        id, room_code, floor, area, price, electricity_price, water_price, service_fee,
        properties!inner(name, address, district, province_code, ward_code, electricity_unit_price, water_unit_price, service_fee, deleted_at)
      `)
      .eq("id", roomId)
      .is("deleted_at", null)
      .is("properties.deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const property = data.properties;
    const positiveOrUndefined = (value: number | null | undefined) =>
      value != null && Number(value) > 0 ? Number(value) : undefined;
    const serviceFee = data.service_fee ?? property.service_fee;

    return {
      roomId: data.id,
      title: `Cho thuê phòng ${data.room_code} - ${property.name}`,
      roomType: DEFAULT_ROOM_TYPE,
      address: property.address ?? undefined,
      district: property.district ?? undefined,
      provinceCode: property.province_code,
      wardCode: property.ward_code,
      area: positiveOrUndefined(data.area),
      price: positiveOrUndefined(data.price),
      floor: data.floor ?? undefined,
      electric: positiveOrUndefined(data.electricity_price ?? property.electricity_unit_price),
      water: positiveOrUndefined(data.water_price ?? property.water_unit_price),
      // Hóa đơn tính nước theo chỉ số đồng hồ ⇒ đơn giá khu là theo m³.
      waterUnit: "cubic",
      // `0` = khu không thu phí dịch vụ — vẫn là giá trị hợp lệ để điền.
      service: serviceFee == null ? undefined : Number(serviceFee),
    };
  } catch (err) {
    logError("listing-prefill-service.getRoomListingPrefill", err);
    throw err;
  }
}
