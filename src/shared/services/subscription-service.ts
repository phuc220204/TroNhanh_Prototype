import { supabase } from "../supabaseClient";
import type { SubscriptionStatus } from "../types/status";
import { toSubscriptionStatus } from "../types/status";
import { toLocalISODate } from "../utils/format";

/** Số ngày dùng thử — khớp `activate_subscription_trial` (migration 20261008090000). */
export const TRIAL_DAYS = 15;

export interface SubscriptionData {
  status: SubscriptionStatus;
  trialDaysLeft: number;
  plan: any | null;
  isReadOnly: boolean;
  canWrite: boolean;
  expireDate: string | null;
}

const DEFAULT_NONE_SUBSCRIPTION: SubscriptionData = {
  status: "NONE",
  trialDaysLeft: 0,
  plan: null,
  isReadOnly: false,
  canWrite: false,
  expireDate: null,
};

/**
 * BR-015: backend expiry is authoritative even if a stale row still says
 * TRIAL/ACTIVE. The date column is a calendar date, so compare YYYY-MM-DD
 * values instead of parsing it as midnight UTC.
 */
export function effectiveSubscriptionStatus(
  rawStatus: string | null | undefined,
  expireDate: string | null | undefined,
  today = toLocalISODate(),
): SubscriptionStatus {
  const status = toSubscriptionStatus(rawStatus);
  if (
    (status === "TRIAL" || status === "ACTIVE") &&
    (!expireDate || expireDate < today)
  ) {
    return "READ_ONLY";
  }
  return status;
}

/**
 * Fetch current user's SaaS subscription from database.
 */
export async function getMySubscription(userId: string | undefined): Promise<SubscriptionData> {
  if (!userId) return DEFAULT_NONE_SUBSCRIPTION;

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("status, expire_date, plan_id, subscription_plans(*)")
    .eq("seller_id", userId)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_NONE_SUBSCRIPTION;
  }

  const status = effectiveSubscriptionStatus(data.status, data.expire_date);
  let trialDaysLeft = 0;

  if (status === "TRIAL" && data.expire_date) {
    // A date-only value expires at the end of that day, not at 00:00 UTC.
    const exp = new Date(`${data.expire_date}T23:59:59.999Z`);
    const now = new Date();
    const diffTime = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    trialDaysLeft = diffDays > 0 ? diffDays : 0;
  }

  const isReadOnly = status === "READ_ONLY";
  const canWrite = status === "TRIAL" || status === "ACTIVE";

  return {
    status,
    trialDaysLeft,
    plan: data.subscription_plans || null,
    isReadOnly,
    canWrite,
    expireDate: data.expire_date || null,
  };
}

/**
 * Kích hoạt một lần dùng thử qua RPC chuyên biệt; client không được tự chọn
 * trạng thái gói hay ngày hết hạn.
 */
export async function activateTrial(userId: string): Promise<void> {
  if (!userId) return;
  const { error } = await supabase.rpc("activate_subscription_trial" as any);
  if (error) throw error;
}
