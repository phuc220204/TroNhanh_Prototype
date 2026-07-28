import { supabase } from "../supabaseClient";
import type { SubscriptionStatus } from "../types/status";
import { toSubscriptionStatus } from "../types/status";

export interface SubscriptionData {
  status: SubscriptionStatus;
  trialDaysLeft: number;
  plan: any | null;
  limits: { maxProperties: number; maxRooms: number };
  isReadOnly: boolean;
  canWrite: boolean;
  expireDate: string | null;
}

const DEFAULT_NONE_SUBSCRIPTION: SubscriptionData = {
  status: "NONE",
  trialDaysLeft: 0,
  plan: null,
  limits: { maxProperties: 1, maxRooms: 5 },
  isReadOnly: false,
  canWrite: false,
  expireDate: null,
};

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

  const status = toSubscriptionStatus(data.status);
  let trialDaysLeft = 0;

  if (status === "TRIAL" && data.expire_date) {
    const exp = new Date(data.expire_date);
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
    limits: {
      maxProperties: status === "NONE" ? 1 : 999,
      maxRooms: status === "NONE" ? 5 : 999,
    },
    isReadOnly,
    canWrite,
    expireDate: data.expire_date || null,
  };
}

/**
 * Activate 30-day trial for current user via RPC set_subscription_status.
 */
export async function activateTrial(userId: string): Promise<void> {
  if (!userId) return;
  const { error } = await supabase.rpc("set_subscription_status", { p_status: "TRIAL" });
  if (error) throw error;
}

/**
 * Set demo subscription status (NONE | TRIAL | ACTIVE | READ_ONLY) via RPC set_subscription_status.
 * ⚠️ Uses RPC set_subscription_status to ensure seller_id := auth.uid() on backend.
 */
export async function setDemoStatus(userId: string, status: SubscriptionStatus): Promise<void> {
  if (!userId) return;
  const { error } = await supabase.rpc("set_subscription_status", { p_status: status });
  if (error) throw error;
}
