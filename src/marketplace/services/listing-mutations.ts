import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";
import type { UploadedMedia } from "../../shared/services/media-service";
import type { Json } from "../../shared/types/database.types";

export interface CreateListingInput {
  id?: string;
  title: string;
  description: string;
  propertyType: string;
  price: number;
  area: number;
  address: string;
  /** TÊN phường/xã — lưu để hiển thị. */
  district: string;
  /** Mã tỉnh/thành và phường/xã (mô hình 2 cấp từ 01/07/2025) — lưu để LỌC. */
  provinceCode?: number | null;
  wardCode?: number | null;
  contactPhone: string;
  contactName: string;
  amenities?: string[];
  media?: UploadedMedia[];
  /** Toạ độ ghim trên bản đồ. Ghi vào cột thật, không phải chỉ trong metadata. */
  latitude?: number | null;
  longitude?: number | null;
  /** Khối `metadata` jsonb: curfew, costs, nearby, coords. */
  metadata?: object | null;
  /** false = lưu nháp (Draft). Mặc định true = gửi đăng. */
  submit?: boolean;
}

/**
 * Tạo tin đăng + amenities + media + kích hoạt Seller trong MỘT lời gọi RPC (atomic).
 * @returns id của tin vừa tạo.
 */
export async function createListing(input: CreateListingInput): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("create_listing_with_details", {
      p_listing: {
        id: input.id ?? null,
        title: input.title,
        description: input.description,
        property_type: input.propertyType,
        price: input.price,
        area: input.area,
        address: input.address,
        district: input.district,
        province_code: input.provinceCode ?? null,
        ward_code: input.wardCode ?? null,
        contact_phone: input.contactPhone,
        contact_name: input.contactName,
        // `boost_expire_at` CỐ Ý không có ở đây: boost chỉ đặt được qua RPC
        // `boost_listing()` sau khi ghi thanh toán. Gửi từ đây thì trigger
        // `trg_guard_boost_expire_at` raise BOOST_REQUIRES_PAYMENT.
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        metadata: input.metadata ?? {},
      } as any,
      p_amenities: input.amenities ?? [],
      p_media: (input.media ?? []) as any,
      p_submit: input.submit ?? true,
    });
    if (error) throw error;
    return data as string;
  } catch (err) {
    logError("listing-mutations.createListing", err);
    throw err;
  }
}

export interface UpdateListingInput {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  price: number;
  area: number;
  address: string;
  /** TÊN phường/xã — lưu để hiển thị. */
  district: string;
  /** Mã tỉnh/thành và phường/xã (mô hình 2 cấp từ 01/07/2025) — lưu để LỌC. */
  provinceCode?: number | null;
  wardCode?: number | null;
  contactPhone: string;
  contactName: string;
  electricityPrice?: number | null;
  waterPrice?: number | null;
  waterUnit?: string | null;
  servicePrice?: number | null;
  deposit?: number | null;
  accessPolicy?: string | null;
  accessOpenTime?: string | null;
  accessCloseTime?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  metadata?: Record<string, any> | null;
  amenities?: string[];
  media?: UploadedMedia[];
}

/**
 * Cập nhật tin đăng + amenities + media thông qua RPC update_listing_with_details.
 * @returns status mới của tin (ví dụ: 'Active', 'PendingApproval').
 */
export async function updateListing(input: UpdateListingInput): Promise<string> {
  try {
    const listingData: Record<string, unknown> = {
      title: input.title,
      property_type: input.propertyType,
      price: input.price,
      area: input.area,
      address: input.address,
      district: input.district,
      province_code: input.provinceCode ?? null,
      ward_code: input.wardCode ?? null,
      description: input.description,
      contact_phone: input.contactPhone,
      contact_name: input.contactName,
      electricity_price: input.electricityPrice ?? null,
      water_price: input.waterPrice ?? null,
      water_unit: input.waterUnit ?? null,
      service_price: input.servicePrice ?? null,
      deposit: input.deposit ?? null,
      access_policy: input.accessPolicy ?? null,
      access_open_time: input.accessOpenTime ?? null,
      access_close_time: input.accessCloseTime ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      metadata: input.metadata ?? {},
    };

    const mediaData: Record<string, unknown>[] = (input.media ?? []).map((m) => ({
      storage_path: m.storage_path,
      sort_order: m.sort_order,
      width: m.width ?? null,
      height: m.height ?? null,
      size_bytes: m.size_bytes ?? null,
      mime_type: m.mime_type ?? null,
    }));

    const { data, error } = await supabase.rpc("update_listing_with_details", {
      p_listing_id: input.id,
      p_listing: listingData as Json,
      p_amenities: input.amenities ?? [],
      p_media: mediaData as Json,
    });
    if (error) throw error;
    return (data as string) || "";
  } catch (err) {
    logError("listing-mutations.updateListing", err);
    throw err;
  }
}


/**
 * Update listing status (e.g. Active <-> Hidden).
 */
export async function updateListingStatus(id: string, status: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("rental_listings")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
  } catch (err) {
    logError("listing-mutations.updateListingStatus", err);
    throw err;
  }
}

/**
 * Soft delete listing.
 */
export async function deleteListing(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("rental_listings")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  } catch (err) {
    logError("listing-mutations.deleteListing", err);
    throw err;
  }
}

/**
 * Gán phòng cho một tin đăng đã có, hoặc bỏ gán (`roomId = null`).
 *
 * ⚠️ Đi qua RPC `link_listing_to_room`, KHÔNG update cột trực tiếp. Cần assert
 * HAI quyền sở hữu cùng lúc — tin là của tôi VÀ phòng cũng là của tôi. RLS trên
 * `rental_listings` chỉ kiểm điều thứ nhất, nên update trực tiếp cho phép gán
 * phòng của người khác vào tin của mình; sau đó BR-027 sẽ đổi trạng thái tin của
 * tôi theo phòng người ta.
 *
 * `property_id` do server suy ra từ phòng — không nhận từ client, nếu không tin
 * có thể trỏ tới một khu khác với khu của phòng.
 *
 * Domain error: `LISTING_NOT_FOUND` · `FORBIDDEN` · `ROOM_NOT_FOUND` ·
 * `ROOM_NOT_OWNED` · `ROOM_ALREADY_LISTED`.
 */
export async function linkListingToRoom(
  listingId: string,
  roomId: string | null
): Promise<void> {
  try {
    // `p_room_id = null` là giá trị HỢP LỆ theo thiết kế RPC (bỏ gán phòng), nhưng
    // generated types khai nó là `string` vì SQL không có `DEFAULT` — Supabase chỉ
    // sinh optional cho param có default.
    //
    // Cast ở ĐÚNG một chỗ, không sửa dữ liệu cho khớp type. Ở T11c từng có lần
    // chọn `input.contractId || ""` để qua typecheck, và Postgres cast `""` sang
    // uuid rồi ném 22P02 — sửa lỗi type bằng cách tạo ra lỗi runtime.
    // Cùng cách xử lý như `createInvoiceWithItems` trong billing-service.
    const args = {
      p_listing_id: listingId,
      p_room_id: roomId,
    } as unknown as Parameters<typeof supabase.rpc<"link_listing_to_room">>[1];

    const { error } = await supabase.rpc("link_listing_to_room", args);
    if (error) throw error;
  } catch (err) {
    logError("listing-mutations.linkListingToRoom", err);
    throw err;
  }
}

/**
 * Đẩy tin nổi bật (boost) — BR-005.
 *
 * ⚠️ ĐI QUA RPC, KHÔNG update cột trực tiếp. Bản trước của hàm này chạy
 * `.from("rental_listings").update({ boost_expire_at })` — nghĩa là client tự đặt
 * được ngày hết hạn boost, không trả một đồng nào, và tin xếp đầu mọi danh sách
 * (BR-005). Cột `boost_expire_at` giờ có trigger canh; mọi đường ghi khác ngoài
 * RPC này đều bị raise `BOOST_REQUIRES_PAYMENT`.
 *
 * `days` phải là một gói có trong `platform_settings.boost_config`
 * (7 / 15 / 30). Giá do server tra từ config — client không gửi giá.
 *
 * @returns `boost_expire_at` mới (server tính, có cộng dồn nếu boost còn hạn).
 */
export async function boostListing(id: string, days = 7): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("boost_listing", {
      p_listing_id: id,
      p_days: days,
    });
    if (error) throw error;
    return data as string;
  } catch (err) {
    logError("listing-mutations.boostListing", err);
    throw err;
  }
}
