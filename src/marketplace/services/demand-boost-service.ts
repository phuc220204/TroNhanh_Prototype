import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";
import { toFunctionError } from "../../shared/services/edge-function-error";
import { getPlatformSettingValue } from "../../shared/services/platform-settings-service";

/**
 * Đẩy tin nhu cầu — giao dịch B2C (Renter trả phí cho nền tảng).
 *
 * ⚠️ Client KHÔNG gửi giá: Edge Function `payos-create-demand-checkout` → RPC
 * `begin_demand_boost_checkout` tự lấy giá từ `demand_boost_config`. Gói đọc ở
 * đây chỉ để hiển thị.
 */

export type DemandBoostPackage = { days: number; amount: number };
export type DemandBoostCheckout = { checkoutUrl: string; orderCode: number; amount: number };
export type DemandBoostOrderStatus = "PENDING" | "LINKED" | "PAID" | "CANCELLED";

const PENDING_ORDER_KEY = "tronhanh.pendingDemandBoostOrder";

export async function getDemandBoostPackages(): Promise<DemandBoostPackage[]> {
  const config = (await getPlatformSettingValue("demand_boost_config")) as { days?: unknown; price?: unknown } | null;
  const days = Array.isArray(config?.days) ? config.days : [];
  const prices = Array.isArray(config?.price) ? config.price : [];
  const packages = days
    .map((day, index) => ({ days: Number(day), amount: Number(prices[index]) }))
    .filter((item) => Number.isSafeInteger(item.days) && item.days > 0
      && Number.isSafeInteger(item.amount) && item.amount > 0);
  if (packages.length === 0) throw new Error("DEMAND_BOOST_CONFIG_INVALID");
  return packages.sort((a, b) => a.days - b.days);
}

export async function createDemandBoostCheckout(demandPostId: string, days: number): Promise<DemandBoostCheckout> {
  try {
    const { data, error } = await supabase.functions.invoke<DemandBoostCheckout>("payos-create-demand-checkout", {
      body: { demandPostId, days },
    });
    if (error) throw await toFunctionError(error);
    if (!data || !Number.isSafeInteger(data.orderCode) || typeof data.checkoutUrl !== "string") {
      throw new Error("PAYOS_INVALID_RESPONSE");
    }
    const url = new URL(data.checkoutUrl);
    if (url.protocol !== "https:" || url.hostname !== "pay.payos.vn") throw new Error("PAYOS_INVALID_RESPONSE");
    return { ...data, checkoutUrl: url.toString() };
  } catch (err) {
    logError("demand-boost-service.createDemandBoostCheckout", err);
    throw err;
  }
}

export function redirectToDemandBoostCheckout(checkout: DemandBoostCheckout): void {
  try {
    // Dự phòng khi URL trả về mất orderCode — không phải dữ liệu auth.
    window.sessionStorage.setItem(PENDING_ORDER_KEY, String(checkout.orderCode));
  } catch {
    // Không lưu được thì vẫn có orderCode trên URL trả về.
  }
  window.location.assign(checkout.checkoutUrl);
}

export function getPendingDemandBoostOrder(): number | null {
  try {
    const value = Number(window.sessionStorage.getItem(PENDING_ORDER_KEY));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function clearPendingDemandBoostOrder(): void {
  try {
    window.sessionStorage.removeItem(PENDING_ORDER_KEY);
  } catch {
    // bỏ qua
  }
}

/** Trạng thái đơn khi quay lại từ payOS — URL chỉ để hiển thị, server mới là bằng chứng. */
export async function getDemandBoostOrderStatus(orderCode: number): Promise<{ status: DemandBoostOrderStatus; amount: number }> {
  try {
    const { data, error } = await supabase.functions.invoke<{ order?: { kind?: string; status: DemandBoostOrderStatus; amount: number } }>(
      "payos-check-status",
      { body: { orderCode } },
    );
    if (error) throw await toFunctionError(error);
    if (!data?.order || data.order.kind !== "demand_boost") throw new Error("ORDER_NOT_FOUND");
    return { status: data.order.status, amount: data.order.amount };
  } catch (err) {
    logError("demand-boost-service.getDemandBoostOrderStatus", err);
    throw err;
  }
}
