import { supabase } from "../supabaseClient";
import { logError } from "./supabase-error";

/**
 * Gói SaaS & mua/gia hạn qua payOS. Bảng `subscription_plans`, `saas_orders`,
 * `user_subscriptions` thuộc shared (CLAUDE.md §2.1).
 *
 * ⚠️ Client KHÔNG gửi giá hay loại đơn: Edge Function `payos-create-saas-checkout`
 * → RPC `begin_saas_checkout` tự lấy giá (mua mới / gia hạn) từ server.
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  renewal_price: number;
  duration_months: number;
  max_properties: number;
  max_rooms: number;
}

export interface SaasCheckout {
  checkoutUrl: string;
  orderCode: number;
  amount: number;
}

export type SaasOrderStatus = "PENDING" | "LINKED" | "PAID" | "NEEDS_REVIEW" | "CANCELLED";

const PENDING_ORDER_KEY = "tronhanh.pendingSaasOrder";

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("id, name, price, renewal_price, duration_months, max_properties, max_rooms")
      .order("price", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((plan) => ({
      ...plan,
      price: Number(plan.price),
      renewal_price: Number(plan.renewal_price),
    }));
  } catch (err) {
    logError("saas-plan-service.getSubscriptionPlans", err);
    throw err;
  }
}

/** Các gói người bán đã từng trả tiền — mua lại gói đó tính giá gia hạn (khớp `begin_saas_checkout`). */
export async function getMyPaidPlanIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from("saas_orders").select("plan_id").eq("status", "PAID");
    if (error) throw error;
    return Array.from(new Set((data ?? []).map((row) => row.plan_id)));
  } catch (err) {
    logError("saas-plan-service.getMyPaidPlanIds", err);
    throw err;
  }
}

/** Mã lỗi server → câu tiếng Việt. Edge Function trả `{ error: CODE }`. */
async function toFunctionError(error: unknown): Promise<Error> {
  const context = (error as { context?: { clone?: () => { json: () => Promise<unknown> } } } | null)?.context;
  try {
    if (context?.clone) {
      const payload = await context.clone().json();
      const code = (payload as { error?: unknown } | null)?.error;
      if (typeof code === "string") return new Error(code);
    }
  } catch {
    // dùng lỗi gốc bên dưới
  }
  return error instanceof Error ? error : new Error("PAYMENT_UNAVAILABLE");
}

export async function createSaasCheckout(planId: string): Promise<SaasCheckout> {
  const { data, error } = await supabase.functions.invoke<SaasCheckout>("payos-create-saas-checkout", { body: { planId } });
  if (error) throw await toFunctionError(error);
  if (!data || typeof data.checkoutUrl !== "string" || !Number.isSafeInteger(data.orderCode)) {
    throw new Error("PAYOS_INVALID_RESPONSE");
  }
  const url = new URL(data.checkoutUrl);
  if (url.protocol !== "https:" || url.hostname !== "pay.payos.vn") throw new Error("PAYOS_INVALID_CHECKOUT_URL");
  return data;
}

export function redirectToSaasCheckout(checkout: SaasCheckout): void {
  try {
    window.sessionStorage.setItem(PENDING_ORDER_KEY, String(checkout.orderCode));
  } catch {
    // Không lưu được thì vẫn có orderCode trên URL trả về.
  }
  window.location.assign(checkout.checkoutUrl);
}

export function clearPendingSaasOrder(): void {
  try {
    window.sessionStorage.removeItem(PENDING_ORDER_KEY);
  } catch {
    // bỏ qua
  }
}

/** Trạng thái đơn khi quay lại từ payOS — URL chỉ để hiển thị, server mới là bằng chứng. */
export async function getSaasOrderStatus(orderCode: number): Promise<{ status: SaasOrderStatus; amount: number }> {
  const { data, error } = await supabase.functions.invoke<{ order?: { kind?: string; status: SaasOrderStatus; amount: number } }>(
    "payos-check-status",
    { body: { orderCode } },
  );
  if (error) throw await toFunctionError(error);
  if (!data?.order || data.order.kind !== "saas") throw new Error("ORDER_NOT_FOUND");
  return { status: data.order.status, amount: data.order.amount };
}

export function getSaasCheckoutErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("PAYMENT_NOT_AVAILABLE")) return "Thanh toán trực tuyến đang tạm đóng. Vui lòng thử lại sau.";
  if (message.includes("SAAS_ORDER_REJECTED")) return "Gói này hiện không mua được. Hãy chọn gói khác hoặc liên hệ hỗ trợ.";
  if (message.includes("AUTH_REQUIRED")) return "Phiên đăng nhập đã hết. Hãy đăng nhập lại rồi thử lại.";
  if (message.includes("PAYOS_UNAVAILABLE")) return "Cổng thanh toán payOS đang bận. Vui lòng thử lại sau ít phút.";
  return "Chưa tạo được liên kết thanh toán. Vui lòng thử lại.";
}
