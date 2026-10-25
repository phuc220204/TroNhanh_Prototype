import { C, font, radius, shadow } from "../theme";
import { formatVnd } from "../utils/format";
import type { SubscriptionPlan } from "../services/saas-plan-service";
import { Button } from "./common";

/**
 * Thẻ một gói Quản lý vận hành. Dùng ở /chu-tro/goi-dich-vu (mua/gia hạn) và
 * /bang-gia (công khai, chưa cần đăng nhập).
 */
export function PlanCard({ plan, isRenewal = false, isCurrent = false, isBuying = false, disabled = false, onBuy, ctaLabel }: {
  plan: SubscriptionPlan;
  isRenewal?: boolean;
  isCurrent?: boolean;
  isBuying?: boolean;
  disabled?: boolean;
  onBuy: () => void;
  /** Ghi đè nhãn nút (trang bảng giá công khai: "Bắt đầu"). */
  ctaLabel?: string;
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
        {ctaLabel ?? (isRenewal ? "Gia hạn gói" : "Mua gói")}
      </Button>
    </div>
  );
}
