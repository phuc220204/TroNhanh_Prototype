import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";
import type { UploadedMedia } from "../../shared/services/media-service";

export interface CreateListingInput {
  id?: string;
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
  media?: UploadedMedia[];
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
        contact_phone: input.contactPhone,
        contact_name: input.contactName,
        boost_expire_at: input.boostExpireAt ?? null,
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
 * Boost listing VIP.
 */
export async function boostListing(id: string, days = 7): Promise<string> {
  try {
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("rental_listings")
      .update({ boost_expire_at: futureDate })
      .eq("id", id);
    if (error) throw error;
    return futureDate;
  } catch (err) {
    logError("listing-mutations.boostListing", err);
    throw err;
  }
}
