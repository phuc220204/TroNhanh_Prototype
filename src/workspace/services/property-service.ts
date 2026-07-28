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
