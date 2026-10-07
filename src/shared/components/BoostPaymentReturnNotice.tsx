import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import { C, font } from "../theme";

type BoostOrderStatus = "PENDING" | "LINKED" | "PAID_PENDING_APPROVAL" | "PAID" | "NEEDS_REVIEW" | "CANCELLED";
type ReturnState = { kind: "loading" | "error" | BoostOrderStatus; message?: string; amount?: number };

/**
 * Đọc từ query của ROUTER (nằm sau `#`), không phải `window.location.search`:
 * payOS trả về `/tai-khoan/tin-cho-thue?boost=…` và `path-to-hash-redirect`
 * đã chuyển nó thành `/#/tai-khoan/tin-cho-thue?boost=…`.
 */
function getReturnOrder(search: string) {
  const params = new URLSearchParams(search);
  const result = params.get("boost");
  if (result !== "return" && result !== "cancel") return null;
  const fromUrl = Number(params.get("orderCode"));
  const fromStorage = Number(window.sessionStorage.getItem("tronhanh.pendingBoostOrder"));
  const orderCode = Number.isSafeInteger(fromUrl) && fromUrl > 0 ? fromUrl : fromStorage;
  return Number.isSafeInteger(orderCode) && orderCode > 0 ? { result, orderCode } : { result, orderCode: null };
}

export function BoostPaymentReturnNotice() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const returnOrder = useMemo(() => getReturnOrder(location.search), [location.search]);
  const [state, setState] = useState<ReturnState>({ kind: "loading" });
  const [checking, setChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!returnOrder?.orderCode) {
      setState({ kind: "error", message: "Không tìm thấy mã đơn để kiểm tra. Hãy mở mục tin đăng và liên hệ hỗ trợ nếu đã chuyển tiền." });
      return;
    }
    if (!user) {
      setState({ kind: "error", message: "Hãy đăng nhập lại bằng tài khoản đã tạo đơn để xem trạng thái thanh toán." });
      return;
    }
    setChecking(true);
    setState({ kind: "loading" });
    try {
      const { data, error } = await supabase.functions.invoke<{ order: { status: BoostOrderStatus; amount: number } }>("payos-check-status", {
        body: { orderCode: returnOrder.orderCode },
      });
      if (error || !data?.order) {
        setState({ kind: "error", message: "Chưa kiểm tra được đơn thanh toán. Thử kiểm tra lại sau ít phút." });
        return;
      }
      if (data.order.status === "PAID_PENDING_APPROVAL" || data.order.status === "PAID" || data.order.status === "NEEDS_REVIEW") {
        window.sessionStorage.removeItem("tronhanh.pendingBoostOrder");
      }
      setState({ kind: data.order.status, amount: data.order.amount });
    } catch {
      setState({ kind: "error", message: "Chưa kiểm tra được đơn thanh toán. Thử kiểm tra lại sau ít phút." });
    } finally {
      setChecking(false);
    }
  }, [returnOrder, user]);

  useEffect(() => {
    if (returnOrder) void checkStatus();
  }, [checkStatus, returnOrder]);

  if (!returnOrder) return null;

  const dismiss = () => {
    window.sessionStorage.removeItem("tronhanh.pendingBoostOrder");
    const params = new URLSearchParams(location.search);
    params.delete("boost");
    params.delete("orderCode");
    const nextSearch = params.toString();
    navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" }, { replace: true });
  };
  const loginPath = `/dang-nhap?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`;

  let message = state.message ?? "";
  if (state.kind === "loading") message = "Đang kiểm tra trạng thái đơn với máy chủ…";
  if (state.kind === "PAID_PENDING_APPROVAL") message = `Đã nhận thanh toán đơn ${returnOrder.orderCode}${state.amount ? ` · ${new Intl.NumberFormat("vi-VN").format(state.amount)} đ` : ""}. Tin đang chờ duyệt; Boost sẽ bắt đầu khi moderator duyệt tin.`;
  if (state.kind === "PAID") message = `Đã xác nhận thanh toán đơn ${returnOrder.orderCode}${state.amount ? ` · ${new Intl.NumberFormat("vi-VN").format(state.amount)} đ` : ""}.`;
  if (state.kind === "NEEDS_REVIEW") message = "Đã nhận thanh toán nhưng tin cần được hỗ trợ đối soát. Vui lòng liên hệ bộ phận hỗ trợ và cung cấp mã đơn.";
  // Đơn bị thay bằng đơn mới (đổi gói/giá) hoặc link quá hạn — chưa nhận tiền.
  if (state.kind === "CANCELLED") message = `Đơn ${returnOrder.orderCode} đã hết hạn hoặc đã được thay bằng đơn mới và chưa ghi nhận thanh toán. Nếu bạn đã chuyển tiền qua link cũ, hệ thống vẫn ghi nhận khi payOS xác nhận — hãy kiểm tra lại sau ít phút trước khi thanh toán lần nữa.`;
  if (state.kind === "PENDING" || state.kind === "LINKED") {
    message = returnOrder.result === "cancel"
      ? `Đơn ${returnOrder.orderCode} chưa được xác nhận thanh toán. Nếu bạn đã chuyển tiền, hãy kiểm tra lại sau ít phút; đừng tạo giao dịch lần hai.`
      : `PayOS chưa gửi xác nhận cho đơn ${returnOrder.orderCode}. Không thanh toán lần hai; hãy kiểm tra lại sau ít phút.`;
  }
  const tone = state.kind === "PAID_PENDING_APPROVAL" || state.kind === "PAID" ? C.success : state.kind === "NEEDS_REVIEW" || state.kind === "error" ? C.error : C.primaryDark;

  return (
    <div role="status" aria-live="polite" style={{ position: "fixed", zIndex: 1000, left: "50%", bottom: 24, transform: "translateX(-50%)", width: "min(560px, calc(100vw - 32px))", boxSizing: "border-box", padding: 16, background: C.white, border: `1px solid ${C.border}`, borderLeft: `5px solid ${tone}`, borderRadius: 12, boxShadow: "0 12px 40px rgba(42,26,12,0.2)" }}>
      <p style={{ margin: 0, fontFamily: font, color: C.textPrimary, fontSize: 13.5, lineHeight: 1.55 }}>{message}</p>
      <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {state.kind === "error" && !user ? <button type="button" onClick={() => navigate(loginPath)} style={{ minHeight: 40, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, color: C.primary, fontFamily: font, fontWeight: 700, cursor: "pointer" }}>Đăng nhập</button> : null}
        {state.kind !== "PAID_PENDING_APPROVAL" && state.kind !== "PAID" && state.kind !== "NEEDS_REVIEW" ? <button type="button" disabled={checking} onClick={() => void checkStatus()} style={{ minHeight: 40, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, color: C.primary, fontFamily: font, fontWeight: 700, cursor: checking ? "wait" : "pointer" }}>{checking ? "Đang kiểm tra…" : "Kiểm tra lại"}</button> : null}
        <button type="button" onClick={dismiss} style={{ minHeight: 40, padding: "8px 12px", border: "none", borderRadius: 8, background: C.primary, color: C.white, fontFamily: font, fontWeight: 700, cursor: "pointer" }}>Đóng</button>
      </div>
    </div>
  );
}
