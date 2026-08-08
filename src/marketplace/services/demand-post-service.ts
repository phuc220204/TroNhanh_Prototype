import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

export interface DemandPostItem {
  id: string;
  renter_id: string;
  kind: "RoomWanted" | "RoommateWanted";
  title: string;
  description?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  /** TÊN các phường/xã mong muốn — để hiển thị. */
  desired_districts?: string[] | null;
  /** Mã tỉnh/thành mong muốn (mô hình 2 cấp từ 01/07/2025) — để LỌC. */
  desired_province_code?: number | null;
  /** Mã các phường/xã mong muốn. Rỗng = cả tỉnh. */
  desired_ward_codes?: number[] | null;
  price_min?: number | null;
  price_max?: number | null;
  status: "Pending" | "Active" | "Rejected" | "Hidden" | "Expired";
  created_at: string;
  updated_at: string;

  // RoomWanted fields
  property_type?: string | null;
  min_area?: number | null;
  desired_amenities?: string[] | null;
  move_in_date?: string | null;
  occupant_count?: number | null;

  // RoommateWanted fields
  current_address?: string | null;
  district?: string | null;
  share_price?: number | null;
  needed_count?: number | null;
  gender_requirement?: "Any" | "Male" | "Female" | null;
  requirements?: string[] | null;

  // Resolved UI fields
  renter_name?: string | null;
  name?: string;
  initials?: string;
}

export interface DemandPostFilter {
  kind?: "RoomWanted" | "RoommateWanted" | "all";
  /** Mã tỉnh/thành. `null`/bỏ trống = tất cả. */
  provinceCode?: number | null;
  /** Mã phường/xã — khớp khi tin có chứa mã này trong `desired_ward_codes`. */
  wardCode?: number | null;
  priceMin?: number;
  priceMax?: number;
}

export function formatDemandPostItem(item: any): DemandPostItem {
  const name = item.contact_name || item.renter_name || "Khách thuê";
  const words = name.trim().split(/\s+/).filter(Boolean);
  let initials = "KT";
  if (words.length >= 2) {
    initials = (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
  } else if (words.length === 1 && words[0]!.length > 0) {
    initials = words[0]!.substring(0, 2).toUpperCase();
  }

  return {
    ...item,
    name,
    initials,
  };
}

/**
 * List all active demand posts from public view.
 */
export async function listActiveDemandPosts(filter?: DemandPostFilter): Promise<DemandPostItem[]> {
  try {
    let q = supabase.from("public_demand_posts")
      .select("*")
      .eq("status", "Active")
      .order("created_at", { ascending: false });

    if (filter?.kind && filter.kind !== "all") {
      q = q.eq("kind", filter.kind);
    }
    if (filter?.provinceCode != null) {
      q = q.eq("desired_province_code", filter.provinceCode);
    }
    if (filter?.wardCode != null) {
      // `contains` vì `desired_ward_codes` là mảng: người tìm trọ có thể nhắm
      // nhiều phường cùng lúc, và tin khớp khi CHỨA phường đang lọc.
      q = q.contains("desired_ward_codes", [filter.wardCode]);
    }
    if (filter?.priceMin !== undefined && filter.priceMin > 0) {
      q = q.gte("price_max", filter.priceMin);
    }
    if (filter?.priceMax !== undefined && filter.priceMax > 0) {
      q = q.lte("price_min", filter.priceMax);
    }

    const { data, error } = await q;

    if (error) throw error;
    return ((data || []) as any[]).map(formatDemandPostItem);
  } catch (err) {
    logError("demand-post-service.listActiveDemandPosts", err);
    return [];
  }
}

/**
 * Get a single demand post by ID from public view.
 */
export async function getDemandPostById(id: string): Promise<DemandPostItem | null> {
  if (!id) return null;
  try {
    const { data, error } = await supabase.from("public_demand_posts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return formatDemandPostItem(data);
  } catch (err) {
    logError("demand-post-service.getDemandPostById", err);
    return null;
  }
}

/**
 * List demand posts created by current user.
 */
export async function listMyDemandPosts(): Promise<DemandPostItem[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return [];

    const { data, error } = await supabase
      .from("demand_posts")
      .select("*")
      .eq("renter_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ((data || []) as any[]).map(formatDemandPostItem);
  } catch (err) {
    logError("demand-post-service.listMyDemandPosts", err);
    return [];
  }
}

/**
 * Create a new demand post (RoomWanted or RoommateWanted).
 */
export async function createDemandPost(payload: Partial<DemandPostItem>): Promise<string> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw new Error("AUTH_REQUIRED");

    const { data, error } = await supabase
      .from("demand_posts")
      .insert({
        renter_id: user.id,
        kind: payload.kind || "RoomWanted",
        title: payload.title || "Tin nhu cầu",
        description: payload.description || null,
        contact_name: payload.contact_name || null,
        contact_phone: payload.contact_phone || null,
        desired_districts: payload.desired_districts || [],
        desired_province_code: payload.desired_province_code ?? null,
        desired_ward_codes: payload.desired_ward_codes || [],
        price_min: payload.price_min || 0,
        price_max: payload.price_max || 0,
        status: "Active", // Auto approved by default configuration
        ...(payload.kind === "RoomWanted"
          ? {
              property_type: payload.property_type || null,
              min_area: payload.min_area || null,
              desired_amenities: payload.desired_amenities || [],
              move_in_date: payload.move_in_date || null,
              occupant_count: payload.occupant_count || 1,
            }
          : {
              current_address: payload.current_address || null,
              district: payload.district || null,
              share_price: payload.share_price || 0,
              needed_count: payload.needed_count || 1,
              gender_requirement: payload.gender_requirement || "Any",
              requirements: payload.requirements || [],
            }),
      } as any)
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  } catch (err) {
    logError("demand-post-service.createDemandPost", err);
    throw err;
  }
}

/**
 * Update an existing demand post.
 */
export async function updateDemandPost(id: string, payload: Partial<DemandPostItem>): Promise<void> {
  try {
    const { error } = await supabase
      .from("demand_posts")
      .update(payload as any)
      .eq("id", id);

    if (error) throw error;
  } catch (err) {
    logError("demand-post-service.updateDemandPost", err);
    throw err;
  }
}

/**
 * Set demand post status (Active / Hidden / Expired).
 */
export async function setDemandPostStatus(id: string, status: "Active" | "Hidden" | "Expired"): Promise<void> {
  try {
    const { error } = await supabase
      .from("demand_posts")
      .update({ status } as any)
      .eq("id", id);

    if (error) throw error;
  } catch (err) {
    logError("demand-post-service.setDemandPostStatus", err);
    throw err;
  }
}

/**
 * Soft delete a demand post.
 */
export async function deleteDemandPost(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("demand_posts")
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) throw error;
  } catch (err) {
    logError("demand-post-service.deleteDemandPost", err);
    throw err;
  }
}
