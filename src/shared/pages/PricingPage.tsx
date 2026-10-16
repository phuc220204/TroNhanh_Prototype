import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Gift, ShieldCheck, TriangleAlert } from "lucide-react";
import { C, font, radius, space } from "../theme";
import { useBreakpoint } from "../components/useBreakpoint";
import { PublicNavbar } from "../components/PublicNavbar";
import { PlanCard } from "../components/PlanCard";
import { Button, EmptyState, Skeleton } from "../components/common";
import { useAuth } from "../contexts/AuthContext";
import { qk } from "../query/keys";
import { toUserMessage } from "../services/supabase-error";
import { getSubscriptionPlans } from "../services/saas-plan-service";
import { TRIAL_DAYS } from "../services/subscription-service";
import { withAuthRedirect } from "../utils/auth-redirect";

const PLANS_PATH = "/chu-tro/goi-dich-vu";

const FACTS: { Icon: typeof Gift; title: string; text: string }[] = [
  { Icon: Gift, title: `Dùng thử ${TRIAL_DAYS} ngày`, text: "Đầy đủ tính năng, không cần thẻ hay chuyển khoản trước." },
  { Icon: ShieldCheck, title: "Hết hạn không mất dữ liệu", text: "Khu trọ, hợp đồng, hóa đơn vẫn xem được; gia hạn là sửa tiếp." },
  { Icon: BadgeCheck, title: "Đăng tin luôn miễn phí", text: "Gói chỉ dành cho phần quản lý vận hành. Đăng và quản lý tin cho thuê không tốn phí." },
];

/**
 * /bang-gia — bảng giá gói Quản lý vận hành, xem được khi chưa đăng nhập.
 * Mua thật vẫn ở /chu-tro/goi-dich-vu (cần đăng nhập, giá lấy server-side).
 */
export function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const plansQuery = useQuery({ queryKey: qk.saasPlans.list, queryFn: getSubscriptionPlans, staleTime: 5 * 60 * 1000 });
  // Gói giá 0 là gói dùng thử — kích hoạt bằng nút dùng thử, không bán.
  const plans = (plansQuery.data ?? []).filter((plan) => plan.price > 0);

  const goToPlans = () => navigate(user ? PLANS_PATH : withAuthRedirect("/dang-nhap", PLANS_PATH));

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: font }}>
      <PublicNavbar onSearch={() => navigate("/tim-phong")} />

      <main data-testid="pricing-page" style={{ flex: 1, width: "100%", maxWidth: 1080, margin: "0 auto", padding: isMobile ? `${space[6]}px ${space[4]}px ${space[10]}px` : `${space[10]}px ${space[8]}px 64px`, boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", maxWidth: 640, margin: `0 auto ${space[8]}px` }}>
          <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: C.secondary, margin: `0 0 ${space[2]}px` }}>Dành cho chủ trọ</p>
          <h1 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 900, color: C.textPrimary, margin: `0 0 ${space[3]}px`, lineHeight: 1.25 }}>
            Bảng giá gói Quản lý vận hành
          </h1>
          <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>
            Quản lý khu trọ, phòng, người ở, hợp đồng, chỉ số điện nước và hóa đơn kèm mã VietQR trên một chỗ.
            Tiền thuê chuyển thẳng vào tài khoản của bạn — Trọ Nhanh không giữ tiền.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: space[3], marginBottom: space[8] }}>
          {FACTS.map(({ Icon, title, text }) => (
            <div key={title} style={{ display: "flex", gap: space[3], background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: space[4] }}>
              <Icon size={22} color={C.primary} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>{title}</p>
                <p style={{ fontSize: 13, color: C.textSecondary, margin: 0, lineHeight: 1.55 }}>{text}</p>
              </div>
            </div>
          ))}
        </div>

        {plansQuery.isPending ? (
          <Skeleton variant="card" count={2} />
        ) : plansQuery.isError ? (
          <EmptyState
            icon={TriangleAlert}
            title="Chưa tải được bảng giá"
            description={toUserMessage(plansQuery.error)}
            action={<Button variant="outline" onClick={() => void plansQuery.refetch()}>Thử lại</Button>}
          />
        ) : plans.length === 0 ? (
          <EmptyState title="Chưa có gói nào đang bán" description="Vui lòng quay lại sau." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))", gap: space[4] }}>
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onBuy={goToPlans} ctaLabel={user ? "Chọn gói này" : "Đăng nhập để mua"} />
            ))}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: space[8] }}>
          <Button size="lg" onClick={goToPlans} data-testid="pricing-trial-cta">
            Dùng thử miễn phí {TRIAL_DAYS} ngày
          </Button>
          <p style={{ fontSize: 12.5, color: C.textSecondary, margin: `${space[3]}px 0 0` }}>
            Giá đã gồm phí dịch vụ của Trọ Nhanh, thanh toán qua payOS. Xem{" "}
            <a href="#/chinh-sach-hoan-tien" style={{ color: C.primary, fontWeight: 600 }}>chính sách hoàn tiền</a>.
          </p>
        </div>
      </main>
    </div>
  );
}

export default PricingPage;
