import { supabase } from "../../shared/supabaseClient";

export type BoostPackage = { days: number; amount: number };
export type BoostCheckout = { checkoutUrl: string; orderCode: number; amount: number };

function isBoostPackage(value: unknown): value is BoostPackage {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return Number.isSafeInteger(item.days) && Number(item.days) > 0
    && Number.isSafeInteger(item.amount) && Number(item.amount) > 0;
}

function isBoostCheckout(value: unknown): value is BoostCheckout {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.checkoutUrl === "string"
    && Number.isSafeInteger(item.orderCode)
    && Number(item.orderCode) > 0
    && Number.isSafeInteger(item.amount)
    && Number(item.amount) > 0;
}

function ensurePayosCheckoutUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "pay.payos.vn") {
    throw new Error("PAYOS_INVALID_CHECKOUT_URL");
  }
  return url.toString();
}

async function normalizeFunctionError(error: unknown): Promise<Error> {
  const context = (error as { context?: { clone?: () => { json: () => Promise<unknown> } } } | null)?.context;
  try {
    if (context?.clone) {
      const payload = await context.clone().json();
      if (payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string") {
        return new Error((payload as { error: string }).error);
      }
    }
  } catch {
    // The generic function error below remains a safe fallback.
  }
  return error instanceof Error ? error : new Error(String(error ?? "PAYMENT_UNAVAILABLE"));
}

export function formatBoostVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export async function getBoostPackages(): Promise<BoostPackage[]> {
  const { data, error } = await supabase.functions.invoke<{ packages?: unknown }>("payos-boost-packages");
  const packages = Array.isArray(data?.packages) ? data.packages.filter(isBoostPackage) : [];
  if (error || packages.length === 0) {
    throw error ? await normalizeFunctionError(error) : new Error("BOOST_PACKAGES_UNAVAILABLE");
  }
  return packages.sort((a, b) => a.days - b.days);
}

export async function createBoostCheckout(listingId: string, days: number): Promise<BoostCheckout> {
  const { data, error } = await supabase.functions.invoke<unknown>("payos-create-checkout", {
    body: { listingId, days },
  });
  if (error) throw await normalizeFunctionError(error);
  if (!isBoostCheckout(data)) throw new Error("PAYOS_INVALID_RESPONSE");
  return { ...data, checkoutUrl: ensurePayosCheckoutUrl(data.checkoutUrl) };
}

export function redirectToBoostCheckout(checkout: BoostCheckout): void {
  window.sessionStorage.setItem("tronhanh.pendingBoostOrder", String(checkout.orderCode));
  window.location.assign(checkout.checkoutUrl);
}

export function getBoostCheckoutErrorMessage(error: unknown, fallback = "Không tạo được liên kết thanh toán. Vui lòng thử lại."): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("PAYMENT_NOT_AVAILABLE")) return "Gói nổi bật đang tạm đóng. Vui lòng thử lại sau.";
  if (message.includes("BOOST_ALREADY_PAID_PENDING_APPROVAL")) return "Gói Boost này đã được thanh toán và đang chờ tin được duyệt.";
  if (message.includes("BOOST_ORDER_ALREADY_PAID")) return "Đơn Boost này đã được thanh toán. Kiểm tra trạng thái tin trong Quản lý tin đăng.";
  if (message.includes("BOOST_ORDER_NEEDS_REVIEW")) return "Đơn Boost đã được chuyển sang đối soát. Vui lòng liên hệ hỗ trợ với mã đơn.";
  if (message.includes("BOOST_OPEN_ORDER_PACKAGE_MISMATCH")) return "Tin này đã có đơn Boost chưa thanh toán cho gói khác. Hãy chọn lại gói cũ để tiếp tục thanh toán.";
  if (message.includes("BOOST_ORDER_REJECTED")) return "Tin này chưa đủ điều kiện tạo đơn Boost.";
  if (message.includes("PAYOS_INVALID_CHECKOUT_URL")) return "Liên kết thanh toán không hợp lệ. Vui lòng liên hệ hỗ trợ.";
  return fallback;
}
