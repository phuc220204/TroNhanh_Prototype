import { logError } from "../../../shared/services/supabase-error";
import { createBoostCheckout, getBoostCheckoutErrorMessage, redirectToBoostCheckout } from "../../services/boost-payment-service";

/** Tin ở hai trạng thái này mới tạo được đơn Boost (khớp `begin_boost_checkout`). */
export function canCheckoutBoostForStatus(status: string): boolean {
  return status === "PendingApproval" || status === "Active";
}

/**
 * Tạo đơn Boost cho tin vừa gửi rồi chuyển sang payOS.
 * @returns `null` khi đã chuyển trang; ngược lại là message lỗi tiếng Việt để hiển thị.
 */
export async function startBoostCheckoutForListing(listingId: string, days: number): Promise<string | null> {
  try {
    const checkout = await createBoostCheckout(listingId, days);
    redirectToBoostCheckout(checkout);
    return null;
  } catch (checkoutError) {
    logError("listing-boost-checkout.startBoostCheckoutForListing", checkoutError);
    return getBoostCheckoutErrorMessage(
      checkoutError,
      "Tin đã được lưu nhưng chưa mở được payOS. Bạn có thể thanh toán lại trong Quản lý tin đăng.",
    );
  }
}
