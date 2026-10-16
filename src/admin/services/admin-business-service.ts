import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";
import { toSubscriptionStatus, type SubscriptionStatus } from "../../shared/types/status";

/**
 * Số liệu kinh doanh cho khu quản trị — CHỈ qua RPC admin (§2.3). Cả hai RPC
 * assert `has_role(auth.uid(), 'Admin')` bên trong body (migration 20261016170000);
 * guard ở UI chỉ để không gọi thừa.
 */

export interface AdminBusinessStats {
  active_subscriptions: number;
  trial_subscriptions: number;
  saas_revenue: number;
  boost_revenue: number;
  demand_boost_revenue: number;
  needs_review_orders: number;
}

/** Gói ACTIVE/TRIAL còn hạn, doanh thu payOS tháng này (PAID), đơn NEEDS_REVIEW. */
export async function getBusinessStats(): Promise<AdminBusinessStats | null> {
  try {
    const { data, error } = await supabase.rpc("admin_business_stats");
    if (error) throw error;
    const row = data?.[0];
    if (!row) return null;
    // bigint về dạng number|string tùy driver ⇒ ép số một chỗ.
    return {
      active_subscriptions: Number(row.active_subscriptions),
      trial_subscriptions: Number(row.trial_subscriptions),
      saas_revenue: Number(row.saas_revenue),
      boost_revenue: Number(row.boost_revenue),
      demand_boost_revenue: Number(row.demand_boost_revenue),
      needs_review_orders: Number(row.needs_review_orders),
    };
  } catch (err) {
    logError("admin-business-service.getBusinessStats", err);
    throw err;
  }
}

export interface AdminSubscriptionRow {
  seller_id: string;
  /** Trạng thái hiệu lực — RPC đã quy đổi READ_ONLY khi quá hạn. */
  status: SubscriptionStatus;
  expire_date: string | null;
  plan_name: string | null;
}

export async function listSubscriptions(): Promise<AdminSubscriptionRow[]> {
  try {
    const { data, error } = await supabase.rpc("admin_list_subscriptions");
    if (error) throw error;
    return (data || []).map((row) => ({
      seller_id: row.seller_id,
      status: toSubscriptionStatus(row.status),
      expire_date: row.expire_date ?? null,
      plan_name: row.plan_name ?? null,
    }));
  } catch (err) {
    logError("admin-business-service.listSubscriptions", err);
    throw err;
  }
}
