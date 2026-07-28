import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

/**
 * Input tạo tin đăng.
 *
 * ⚠️ CỐ Ý KHÔNG có `sellerId` và `status`.
 * RPC `create_listing_with_details` derive server-side:
 *   - `seller_id` = auth.uid()
 *   - `status`    = Draft / PendingApproval / Active theo `p_submit` + platform_settings.auto_approve_listings
 *   - `expire_at` = now() + listing_ttl_days (BR-026)
 * Nhận 2 giá trị này từ client = cho client tự phong quyền và tự bỏ qua kiểm duyệt (BR-001).
 */
export interface CreateListingInput {
  title: string;
  description: string;
  propertyType: string;
  price: number;
  area: number;
  address: string;
  district: string;
  contactPhone: string;
  contactName: string;
  boostExpireAt?: string | null;
  amenities?: string[];
  /** false = lưu nháp (Draft). Mặc định true = gửi đăng. */
  submit?: boolean;
}

/**
 * Tạo tin đăng + amenities + kích hoạt Seller trong MỘT lời gọi RPC (atomic).
 * @returns id của tin vừa tạo.
 */
export async function createListing(input: CreateListingInput): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("create_listing_with_details", {
      p_listing: {
        title: input.title,
        description: input.description,
        property_type: input.propertyType,
        price: input.price,
        area: input.area,
        address: input.address,
        district: input.district,
        contact_phone: input.contactPhone,
        contact_name: input.contactName,
        boost_expire_at: input.boostExpireAt ?? null,
      } as any,
      p_amenities: input.amenities ?? [],
      p_submit: input.submit ?? true,
    });
    if (error) throw error;
    return data as string;
  } catch (err) {
    logError("listing-mutations.createListing", err);
    throw err;
  }
}
