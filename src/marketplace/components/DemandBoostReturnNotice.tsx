import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "../../shared/components/common";
import { C, font } from "../../shared/theme";
import { toUserMessage } from "../../shared/services/supabase-error";
import {
  clearPendingDemandBoostOrder,
  getDemandBoostOrderStatus,
  getPendingDemandBoostOrder,
  type DemandBoostOrderStatus,
} from "../services/demand-boost-service";

type NoticeState = { kind: "loading" | "error" | DemandBoostOrderStatus; message?: string; amount?: number };

/**
 * Đọc query của ROUTER (sau `#`): payOS trả về `/tai-khoan/tin-nhu-cau?demandBoost=…`
 * và `path-to-hash-redirect` chuyển nó thành `/#/tai-khoan/tin-nhu-cau?demandBoost=…`.
 */
function getReturnOrder(search: string) {
  const params = new URLSearchParams(search);
  const result = params.get("demandBoost");
  if (result !== "return" && result !== "cancel") return null;
  const fromUrl = Number(params.get("orderCode"));
  const orderCode = Number.isSafeInteger(fromUrl) && fromUrl > 0 ? fromUrl : getPendingDemandBoostOrder();
  return { result, orderCode };
}

export function DemandBoostReturnNotice({ onPaid }: { onPaid: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const returnOrder = useMemo(() => getReturnOrder(location.search), [location.search]);
  const [state, setState] = useState<NoticeState>({ kind: "loading" });
  // Ref để trang cha không phải memo hóa callback — tránh vòng kiểm tra lặp.
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  const checkStatus = useCallback(async () => {
    if (!returnOrder?.orderCode) {
      setState({ kind: "error", message: "Không tìm thấy mã đơn để kiểm tra. Nếu đã chuyển tiền, hãy liên hệ hỗ trợ." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const order = await getDemandBoostOrderStatus(returnOrder.orderCode);
      if (order.status === "PAID") {
        clearPendingDemandBoostOrder();
        onPaidRef.current();
      }
      setState({ kind: order.status, amount: order.amount });
    } catch (err) {
      setState({ kind: "error", message: toUserMessage(err) });
    }
  }, [returnOrder]);

  useEffect(() => {
    if (returnOrder) void checkStatus();
  }, [checkStatus, returnOrder]);

  if (!returnOrder) return null;

  const dismiss = () => {
    clearPendingDemandBoostOrder();
    navigate({ pathname: location.pathname, search: "" }, { replace: true });
  };

  const code = returnOrder.orderCode;
  const amountText = state.amount ? ` · ${new Intl.NumberFormat("vi-VN").format(state.amount)} đ` : "";
  let message = state.message ?? "";
  if (state.kind === "loading") message = "Đang kiểm tra trạng thái đơn với máy chủ…";
  if (state.kind === "PAID") message = `Đã nhận thanh toán đơn ${code}${amountText}. Tin nhu cầu của bạn đang được đẩy lên đầu.`;
  if (state.kind === "CANCELLED") message = `Đơn ${code} đã hết hạn hoặc được thay bằng đơn mới và chưa ghi nhận thanh toán. Nếu đã chuyển tiền qua link cũ, hãy kiểm tra lại sau ít phút.`;
  if (state.kind === "PENDING" || state.kind === "LINKED") {
    message = returnOrder.result === "cancel"
      ? `Đơn ${code} chưa được thanh toán. Nếu bạn đã chuyển tiền, hãy kiểm tra lại sau ít phút; đừng thanh toán lần hai.`
      : `payOS chưa gửi xác nhận cho đơn ${code}. Đừng thanh toán lần hai; hãy kiểm tra lại sau ít phút.`;
  }
  const tone = state.kind === "PAID" ? C.success : state.kind === "error" ? C.error : C.primaryDark;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="demand-boost-return-notice"
      style={{ marginBottom: 20, padding: 16, background: C.white, border: `1px solid ${C.border}`, borderLeft: `5px solid ${tone}`, borderRadius: 12 }}
    >
      <p style={{ margin: 0, fontFamily: font, color: C.textPrimary, fontSize: 13.5, lineHeight: 1.55 }}>{message}</p>
      <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {state.kind !== "PAID" ? (
          <Button variant="outline" size="sm" loading={state.kind === "loading"} onClick={() => void checkStatus()}>Kiểm tra lại</Button>
        ) : null}
        <Button size="sm" onClick={dismiss}>Đóng</Button>
      </div>
    </div>
  );
}
