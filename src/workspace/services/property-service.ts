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
