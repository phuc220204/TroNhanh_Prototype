import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

/**
 * Danh bạ người dùng cho khu quản trị.
 *
 * ⚠️ KHÔNG query thẳng `profiles`: bảng chỉ có policy SELECT
 * `auth.uid() = user_id`, nên client sẽ nhận đúng 1 dòng của chính mình mà
 * KHÔNG có lỗi nào. Phải đi qua RPC `admin_list_users` (migration 20260730120000).
 */

/** Đúng 2 vai trò RPC chấp nhận. `Admin` cố ý KHÔNG cấp được qua UI. */
export type GrantableRole = "Seller" | "Moderator";

export interface AdminUserRow {
  user_id: string;
  full_name: string | null;
  email: string;
  is_seller: boolean;
  roles: string[];
  created_at: string;
}

export async function listUsers(search = ""): Promise<AdminUserRow[]> {
  try {
    const { data, error } = await supabase.rpc("admin_list_users", {
      ...(search.trim() ? { p_search: search.trim() } : {}),
    });
    if (error) throw error;
    return (data || []) as AdminUserRow[];
  } catch (err) {
    logError("admin-user-service.listUsers", err);
    throw err;
  }
}

export async function grantRole(userId: string, role: GrantableRole): Promise<void> {
  try {
    const { error } = await supabase.rpc("grant_role", { p_user_id: userId, p_role: role });
    if (error) throw error;
  } catch (err) {
    logError("admin-user-service.grantRole", err);
    throw err;
  }
}

export async function revokeRole(userId: string, role: GrantableRole): Promise<void> {
  try {
    const { error } = await supabase.rpc("revoke_role", { p_user_id: userId, p_role: role });
    if (error) throw error;
  } catch (err) {
    logError("admin-user-service.revokeRole", err);
    throw err;
  }
}

export interface AdminDashboardStats {
  pending_listings: number;
  active_listings: number;
  reported_reviews: number;
  total_users: number;
}

export async function getDashboardStats(): Promise<AdminDashboardStats | null> {
  try {
    const { data, error } = await supabase.rpc("admin_dashboard_stats");
    if (error) throw error;
    const row = (data as AdminDashboardStats[] | null)?.[0];
    return row ?? null;
  } catch (err) {
    logError("admin-user-service.getDashboardStats", err);
    throw err;
  }
}
