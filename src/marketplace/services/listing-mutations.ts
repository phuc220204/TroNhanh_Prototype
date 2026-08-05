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
  district: string;
  contactPhone: string;
  contactName: string;
  boostExpireAt?: string | null;
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
        contact_phone: input.contactPhone,
        contact_name: input.contactName,
        boost_expire_at: input.boostExpireAt ?? null,
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
  district: string;
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
