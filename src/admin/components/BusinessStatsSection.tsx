import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CircleDollarSign, Hourglass, ReceiptText, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, Skeleton } from "../../shared/components/common";
import { C, font, radius, space } from "../../shared/theme";
import { qk } from "../../shared/query/keys";
import { useAuth } from "../../shared/contexts/AuthContext";
import { toUserMessage } from "../../shared/services/supabase-error";
import { formatVnd } from "../../shared/utils/format";
import { getBusinessStats } from "../services/admin-business-service";

interface BusinessStatsSectionProps {
  columns: string;
  isMobile: boolean;
}

interface StatCard {
  key: string;
  label: string;
  value: string;
  detail: string;
  Icon: LucideIcon;
  accent: string;
  needsAttention?: boolean;
}

const numberFormat = new Intl.NumberFormat("vi-VN");

/**
 * "Kinh doanh" trên Tổng quan quản trị: gói đang chạy, doanh thu payOS tháng
 * này, đơn cần đối soát. Chỉ Admin — `admin_business_stats()` tự chặn FORBIDDEN;
 * kiểm vai trò ở đây chỉ để Moderator không thấy khối lỗi.
 */
export function BusinessStatsSection({ columns, isMobile }: BusinessStatsSectionProps) {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("Admin");
  const statsQuery = useQuery({
    queryKey: qk.admin.businessStats,
    queryFn: getBusinessStats,
    enabled: isAdmin,
  });

  if (!isAdmin) return null;

  const stats = statsQuery.data;
  const revenue = stats ? stats.saas_revenue + stats.boost_revenue + stats.demand_boost_revenue : 0;
  const monthLabel = new Intl.DateTimeFormat("vi-VN", { month: "2-digit", year: "numeric" }).format(new Date());

  const cards: StatCard[] = stats ? [
    { key: "active", label: "Gói đang hoạt động", value: numberFormat.format(stats.active_subscriptions), detail: "Gói Quản lý vận hành ACTIVE còn hạn", Icon: BadgeCheck, accent: C.available },
    { key: "trial", label: "Đang dùng thử", value: numberFormat.format(stats.trial_subscriptions), detail: "Gói TRIAL còn hạn", Icon: Hourglass, accent: C.secondary },
    {
      key: "revenue",
      label: `Doanh thu payOS tháng ${monthLabel}`,
      value: formatVnd(revenue),
      detail: `Gói ${formatVnd(stats.saas_revenue)} · Boost ${formatVnd(stats.boost_revenue)} · Tin nhu cầu ${formatVnd(stats.demand_boost_revenue)}`,
      Icon: CircleDollarSign,
      accent: C.primary,
    },
    {
      key: "needs-review",
      label: "Đơn cần đối soát",
      value: numberFormat.format(stats.needs_review_orders),
      detail: stats.needs_review_orders > 0 ? "Đã nhận tiền nhưng chưa khớp đơn — kiểm tra trên payOS" : "Không có đơn NEEDS_REVIEW",
      Icon: ReceiptText,
      accent: C.warning,
      needsAttention: stats.needs_review_orders > 0,
    },
  ] : [];

  return (
    <section aria-labelledby="admin-business-heading" data-testid="admin-business-stats" style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
      <div>
        <h2 id="admin-business-heading" style={{ fontFamily: font, fontSize: 18, lineHeight: 1.35, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
          Kinh doanh
        </h2>
        <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: `${space[1]}px 0 0` }}>
          Chỉ tính đơn payOS đã thanh toán (PAID) trong tháng này, theo giờ Việt Nam.
        </p>
      </div>

      {statsQuery.isPending ? (
        <Skeleton variant="card" count={4} />
      ) : statsQuery.isError ? (
        <div role="alert" data-testid="admin-business-stats-error" style={{ display: "flex", alignItems: "center", gap: space[2], background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, fontFamily: font, fontSize: 13 }}>
          <TriangleAlert size={16} aria-hidden="true" /> {toUserMessage(statsQuery.error)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: columns, gap: space[4] }}>
          {cards.map(({ key, label, value, detail, Icon, accent, needsAttention }) => (
            <Card key={key} padding={space[5]} data-testid={`admin-business-${key}`} style={{ height: "100%", boxSizing: "border-box", borderColor: needsAttention ? C.secondary : C.border }}>
              <div style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: radius.md, background: needsAttention ? C.cream : C.bg, color: accent }}>
                <Icon size={20} aria-hidden="true" />
              </div>
              <div style={{ marginTop: space[5], fontFamily: font, fontSize: 12.5, fontWeight: 600, color: C.textSecondary }}>{label}</div>
              <div style={{ marginTop: space[1], fontFamily: font, fontSize: isMobile ? 26 : 28, lineHeight: 1.15, fontWeight: 800, color: C.textPrimary, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>
                {value}
              </div>
              <div style={{ marginTop: space[3], fontFamily: font, fontSize: 11, lineHeight: 1.45, color: needsAttention ? C.primary : C.textSecondary }}>{detail}</div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
