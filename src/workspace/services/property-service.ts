import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

export interface PropertyItem {
  id: string;
  name: string;
  address: string;
  district: string;
  city?: string;
  total_rooms?: number;
  owner_id: string;
  created_at: string;
  electricity_unit_price?: number;
  water_unit_price?: number;
  service_fee?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  /** BR-024 — bật thì review của khu mới hiện công khai. */
  is_public_profile_enabled?: boolean;
  public_slug?: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
}

/**
 * Fetch all properties owned by a specific landlord.
 */
export async function getPropertiesByOwner(ownerId: string | undefined): Promise<PropertyItem[]> {
  if (!ownerId) return [];
  try {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as PropertyItem[];
  } catch (err) {
    logError("property-service.getPropertiesByOwner", err);
    return [];
  }
}

/**
 * Fetch a single property details by ID.
 */
export async function getPropertyById(id: string): Promise<PropertyItem | null> {
  if (!id) return null;
  try {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data as PropertyItem | null;
  } catch (err) {
    logError("property-service.getPropertyById", err);
    return null;
  }
}

/** Đúng những cột màn Cài đặt khu trọ được phép ghi. */
export interface PropertySettingsInput {
  name?: string;
  address?: string;
  electricity_unit_price?: number;
  water_unit_price?: number;
  service_fee?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
}

const EDITABLE_SETTING_KEYS = [
  "name",
  "address",
  "electricity_unit_price",
  "water_unit_price",
  "service_fee",
  "bank_name",
  "bank_account_number",
  "bank_account_name",
] as const;

/**
 * Update property settings (pricing & banking info).
 * Chỉ ghi các cột trong allow-list — không nhận object tùy ý từ caller,
 * để một field thừa lọt vào form không thành một lệnh UPDATE cột khác.
 */
export async function updatePropertySettings(
  id: string,
  settings: PropertySettingsInput
): Promise<void> {
  if (!id) return;
  const patch: PropertySettingsInput = {};
  for (const key of EDITABLE_SETTING_KEYS) {
    const value = settings[key];
    if (value !== undefined) (patch as Record<string, unknown>)[key] = value;
  }
  if (Object.keys(patch).length === 0) return;

  try {
    const { error } = await supabase
      .from("properties")
      .update(patch)
      .eq("id", id);
    if (error) throw error;
  } catch (err) {
    logError("property-service.updatePropertySettings", err);
    throw err;
  }
}

/**
 * BR-011 — Số phòng đang cho thuê của một khu, để UI giải thích TRƯỚC khi bấm xóa.
 * ⚠️ Đây KHÔNG phải guard. Guard thật nằm trong RPC `soft_delete_property`;
 * con số này chỉ để hiện "còn N phòng đang thuê" thay vì để người dùng ăn lỗi.
 */
export async function countRentedRooms(propertyId: string): Promise<number> {
  if (!propertyId) return 0;
  try {
    const { data, error } = await supabase.rpc("count_rented_rooms", {
      p_property_id: propertyId,
    });
    if (error) throw error;
    return data ?? 0;
  } catch (err) {
    logError("property-service.countRentedRooms", err);
    return 0;
  }
}

/**
 * BR-011 — Xóa mềm một khu trọ qua RPC `soft_delete_property`.
 * ⚠️ KHÔNG truyền owner_id: RPC derive `auth.uid()` và tự assert ownership.
 * RPC chặn khi khu còn phòng `Rented` (raise `PROPERTY_HAS_RENTED_ROOMS`),
 * và soft-delete luôn các phòng còn lại để chúng không mồ côi.
 */
export async function softDeleteProperty(propertyId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("soft_delete_property", {
      p_property_id: propertyId,
    });
    if (error) throw error;
  } catch (err) {
    logError("property-service.softDeleteProperty", err);
    throw err;
  }
}
