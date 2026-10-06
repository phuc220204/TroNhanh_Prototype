import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Crown, TriangleAlert } from "lucide-react";
import { LandlordShell } from "../../shared/components/LandlordShell";
import { C, font, radius, shadow } from "../../shared/theme";
import { useAuth } from "../../shared/contexts/AuthContext";
import { useSubscriptionContext } from "../../shared/contexts/SubscriptionContext";
import { TRIAL_DAYS } from "../../shared/services/subscription-service";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { qk } from "../../shared/query/keys";
import { Button, EmptyState, Skeleton } from "../../shared/components/common";
import { toUserMessage } from "../../shared/services/supabase-error";
import { formatDate, formatVnd } from "../../shared/utils/format";
import {
  clearPendingSaasOrder,
  createSaasCheckout,
  getMyPaidPlanIds,
  getSaasCheckoutErrorMessage,
  getSaasOrderStatus,
  getSubscriptionPlans,
  redirectToSaasCheckout,
  type SubscriptionPlan,
} from "../../shared/services/saas-plan-service";

const STATUS_LABEL: Record<string, string> = {
  NONE: "Chưa có gói",
  TRIAL: "Đang dùng thử",
  ACTIVE: "Đang hoạt động",
  READ_ONLY: "Đã hết hạn — chỉ xem",
};

/** Kết quả khi quay lại từ payOS. URL chỉ để hiển thị — trạng thái thật hỏi server (webhook đã ghi chưa). */
function PaymentReturnNotice({ orderCode, result, onPaid, onDismiss }: {
  orderCode: number;
  result: "return" | "cancel";
  onPaid: () => void;
  onDismiss: () => void;
}) {
  const { data, isError, refetch, isFetching } = useQuery({
    queryKey: ["saasOrderStatus", orderCode],
    queryFn: () => getSaasOrderStatus(orderCode),
    // Webhook có thể về sau trình duyệt vài giây: hỏi lại tới khi có kết quả cuối.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "PENDING" || status === "LINKED" ? 4000 : false;
    },
    retry: 1,
  });

  const isPaid = data?.status === "PAID";
  useEffect(() => {
    if (isPaid) {
      clearPendingSaasOrder();
      onPaid();
    }
  }, [isPaid, onPaid]);

  let tone: "success" | "warning" | "error" = "warning";
  let message = "Đang kiểm tra thanh toán với máy chủ…";
  if (isError) {
    tone = "error";
    message = "Chưa kiểm tra được đơn thanh toán. Nếu bạn đã chuyển tiền, đừng thanh toán lần hai — thử kiểm tra lại sau ít phút.";
  } else if (isPaid) {
    tone = "success";
    message = `Đã nhận thanh toán ${formatVnd(data.amount)}. Gói của bạn đã được kích hoạt.`;
  } else if (data?.status === "NEEDS_REVIEW") {
    tone = "error";
    message = `Đã nhận tiền nhưng đơn ${orderCode} cần đối soát. Vui lòng liên hệ hỗ trợ kèm mã đơn.`;
  } else if (data) {
    message = result === "cancel"
      ? `Đơn ${orderCode} chưa được thanh toán. Nếu bạn đã chuyển khoản, hệ thống vẫn ghi nhận khi payOS xác nhận — đừng thanh toán lần hai.`
      : `Đang chờ payOS xác nhận đơn ${orderCode}…`;
  }

  const palette = {
    success: { bg: C.successBg, border: C.successBorder, color: C.success },
    warning: { bg: C.warningBg, border: C.warningBorder, color: C.textPrimary },
    error: { bg: C.errorBg, border: C.errorBorder, color: C.error },
  }[tone];

  return (
    <div role="status" data-testid="saas-payment-return" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, background: palette.bg, border: `1px solid ${palette.border}`, color: palette.color, borderRadius: radius.md, padding: "12px 16px", marginBottom: 20, fontFamily: font, fontSize: 13.5, fontWeight: 600 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {isPaid ? <CheckCircle2 size={16} /> : tone === "error" ? <TriangleAlert size={16} /> : <Clock size={16} />}
        {message}
      </span>
      <span style={{ display: "flex", gap: 6 }}>
        {(isError || (!isPaid && data)) && <Button variant="ghost" size="sm" loading={isFetching} onClick={() => void refetch()}>Kiểm tra lại</Button>}
        <Button variant="ghost" size="sm" onClick={onDismiss}>Đóng</Button>
      </span>
    </div>
  );
}

function PlanCard({ plan, isRenewal, isCurrent, isBuying, disabled, onBuy }: {
  plan: SubscriptionPlan;
  isRenewal: boolean;
  isCurrent: boolean;
  isBuying: boolean;
  disabled: boolean;
  onBuy: () => void;
}) {
  const price = isRenewal ? plan.renewal_price : plan.price;
  const perMonth = Math.round(price / Math.max(1, plan.duration_months));
  return (
    <div data-testid="saas-plan-card" style={{ background: C.white, border: `1.5px solid ${isCurrent ? C.primary : C.border}`, borderRadius: radius.xl, padding: 20, display: "flex", flexDirection: "column", gap: 12, boxShadow: shadow.sm, fontFamily: font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.textPrimary }}>{plan.name}</h2>
        {isCurrent && <span style={{ fontSize: 11, fontWeight: 800, color: C.primary, background: C.cream, borderRadius: radius.pill, padding: "3px 10px" }}>Gói hiện tại</span>}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 900, color: C.primary }}>{formatVnd(price)}</div>
        <div style={{ fontSize: 12.5, color: C.textSecondary }}>
          cho {plan.duration_months} tháng · ≈ {formatVnd(perMonth)}/tháng
          {isRenewal && plan.renewal_price < plan.price && <> · giá gia hạn (giá mới {formatVnd(plan.price)})</>}
        </div>
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>
        <li>Không giới hạn số khu trọ và số phòng</li>
        <li>Người ở, hợp đồng, điện nước, hóa đơn & nhắc thu tiền</li>
        <li>Mua sớm khi còn hạn: thời gian được cộng dồn</li>
      </ul>
      <Button variant={isCurrent ? "primary" : "outline"} loading={isBuying} disabled={disabled} onClick={onBuy} data-testid={`saas-plan-buy-${plan.id}`} style={{ marginTop: "auto" }}>
        {isRenewal ? "Gia hạn gói" : "Mua gói"}
      </Button>
    </div>
  );
}

/** /chu-tro/goi-dich-vu — mua / gia hạn gói quản lý vận hành qua payOS. Không bị khóa khi chưa có gói. */
export function SubscriptionPlansPage() {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const { status, plan: currentPlan, expireDate, refresh, activateTrial, isLoading: isSubscriptionLoading } = useSubscriptionContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [buyingPlanId, setBuyingPlanId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isActivatingTrial, setIsActivatingTrial] = useState(false);

  const plansQuery = useQuery({ queryKey: qk.saasPlans.list, queryFn: getSubscriptionPlans, staleTime: 5 * 60 * 1000 });
  const paidQuery = useQuery({ queryKey: qk.saasPlans.paidPlanIds(user?.id), queryFn: getMyPaidPlanIds, enabled: Boolean(user?.id) });

  const returnResult = searchParams.get("saas");
  const returnOrderCode = Number(searchParams.get("orderCode"));
  const hasReturn = (returnResult === "return" || returnResult === "cancel") && Number.isSafeInteger(returnOrderCode) && returnOrderCode > 0;
  const dismissReturn = () => setSearchParams((params) => {
    params.delete("saas");
    params.delete("orderCode");
    return params;
  }, { replace: true });

  const paidPlanIds = paidQuery.data ?? [];
  // Gói giá 0 là gói dùng thử — kích hoạt bằng nút dùng thử, không bán qua payOS.
  const plans = (plansQuery.data ?? []).filter((p) => p.price > 0);

  const handleBuy = async (planId: string) => {
    setBuyingPlanId(planId);
    setCheckoutError(null);
    try {
      redirectToSaasCheckout(await createSaasCheckout(planId));
    } catch (err) {
      setCheckoutError(getSaasCheckoutErrorMessage(err));
      setBuyingPlanId(null);
    }
  };

  const handleTrial = async () => {
    setIsActivatingTrial(true);
    setCheckoutError(null);
    try {
      await activateTrial();
    } catch (err) {
      setCheckoutError(toUserMessage(err));
    } finally {
      setIsActivatingTrial(false);
    }
  };

  return (
    <LandlordShell active="plans" mobileTitle="Gói dịch vụ">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "16px 16px 24px" : "28px 32px", fontFamily: font }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>Gói Quản lý vận hành</h1>
        <p style={{ fontSize: 13.5, color: C.textSecondary, margin: "0 0 20px" }}>
          Thanh toán qua payOS (chuyển khoản/QR). Gói kích hoạt ngay khi payOS xác nhận.
        </p>

        {hasReturn && (
          <PaymentReturnNotice orderCode={returnOrderCode} result={returnResult as "return" | "cancel"} onPaid={refresh} onDismiss={dismissReturn} />
        )}

        <div data-testid="saas-current-plan" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: C.cream, borderRadius: radius.lg, padding: "14px 18px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Crown size={20} color={C.primary} />
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: C.textPrimary }}>
                {isSubscriptionLoading ? <Skeleton variant="text" label="Đang tải gói hiện tại" style={{ width: 160 }} /> : STATUS_LABEL[status] ?? status}
                {currentPlan?.name && status !== "NONE" ? ` · ${currentPlan.name}` : ""}
              </div>
              {expireDate && status !== "NONE" && (
                <div style={{ fontSize: 12.5, color: C.textSecondary }}>
                  {status === "READ_ONLY" ? "Hết hạn ngày" : "Hiệu lực đến"} {formatDate(expireDate)} · dữ liệu luôn được giữ nguyên
                </div>
              )}
            </div>
          </div>
          {status === "NONE" && (
            <Button variant="outline" loading={isActivatingTrial} onClick={() => void handleTrial()} data-testid="saas-start-trial-btn">
              Dùng thử miễn phí {TRIAL_DAYS} ngày
            </Button>
          )}
        </div>

        {checkoutError && (
          <div role="alert" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error, borderRadius: radius.md, padding: "10px 14px", marginBottom: 16, fontSize: 13.5, fontWeight: 600 }}>
            {checkoutError}
          </div>
        )}

        {plansQuery.isPending ? (
          <Skeleton variant="card" count={2} />
        ) : plansQuery.isError ? (
          <div role="alert" style={{ textAlign: "center", padding: 32, background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl }}>
            <p style={{ color: C.error, fontWeight: 600, margin: "0 0 12px" }}>{toUserMessage(plansQuery.error)}</p>
            <Button variant="outline" onClick={() => void plansQuery.refetch()}>Thử lại</Button>
          </div>
        ) : plans.length === 0 ? (
          <EmptyState title="Chưa có gói nào đang bán" description="Vui lòng quay lại sau hoặc liên hệ hỗ trợ." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isRenewal={paidPlanIds.includes(plan.id)}
                isCurrent={status !== "NONE" && currentPlan?.id === plan.id && status !== "TRIAL"}
                isBuying={buyingPlanId === plan.id}
                disabled={buyingPlanId !== null || paidQuery.isPending}
                onBuy={() => void handleBuy(plan.id)}
              />
            ))}
          </div>
        )}
      </div>
    </LandlordShell>
  );
}

export default SubscriptionPlansPage;
