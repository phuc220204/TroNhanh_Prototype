import { Card } from "../../../shared/components/common";
import { C, font, radius, space } from "../../../shared/theme";
import { formatVnd, formatVndShort } from "../../../shared/utils/format";
import { REVENUE_KIND_META, REVENUE_KINDS, type RevenueKind } from "../../../shared/utils/statusMaps";
import type { RevenueGranularity, RevenueSummaryRow } from "../../services/admin-revenue-service";
import { enumerateBuckets, formatBucketLabel } from "./revenue-dates";

interface RevenueChartProps {
  rows: RevenueSummaryRow[];
  from: string;
  to: string;
  granularity: RevenueGranularity;
  isMobile: boolean;
}

const HEIGHT = 240;
const PADDING = { top: 12, right: 8, bottom: 28, left: 72 };
const GRID_LINES = 4;

/** Trục Y tròn số: 1/2/5 × 10^n đủ chứa giá trị lớn nhất. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((m) => m * magnitude >= value) ?? 10;
  return step * magnitude;
}

/** Cột chồng doanh thu theo kỳ × loại. SVG inline — repo không có thư viện biểu đồ. */
export function RevenueChart({ rows, from, to, granularity, isMobile }: RevenueChartProps) {
  // viewBox hẹp hơn trên mobile để chữ trục không bị thu nhỏ quá mức.
  const width = isMobile ? 360 : 760;
  const left = isMobile ? 56 : PADDING.left;
  const plotWidth = width - left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const buckets = enumerateBuckets(from, to, granularity);
  const amountByBucket = new Map<string, Record<RevenueKind, number>>(
    buckets.map((bucket) => [bucket, { Saas: 0, ListingBoost: 0, DemandBoost: 0 }]),
  );
  for (const row of rows) {
    const entry = amountByBucket.get(row.bucket);
    if (entry) entry[row.kind] += row.amount;
  }
  const totals = buckets.map((bucket) => REVENUE_KINDS.reduce((sum, kind) => sum + amountByBucket.get(bucket)![kind], 0));
  const yMax = niceMax(Math.max(0, ...totals));

  const slot = buckets.length > 0 ? plotWidth / buckets.length : plotWidth;
  const barWidth = Math.max(2, Math.min(32, slot * 0.7));
  const maxLabels = isMobile ? 6 : 12;
  const labelEvery = Math.max(1, Math.ceil(buckets.length / maxLabels));
  const yOf = (amount: number) => PADDING.top + plotHeight - (amount / yMax) * plotHeight;
  const axisFontSize = isMobile ? 10 : 11;

  return (
    <Card padding={space[5]} data-testid="revenue-chart">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3], flexWrap: "wrap", marginBottom: space[3] }}>
        <h2 style={{ margin: 0, fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary }}>
          Doanh thu theo {granularity === "month" ? "tháng" : "ngày"}
        </h2>
        <div style={{ display: "flex", gap: space[3], flexWrap: "wrap" }}>
          {REVENUE_KINDS.map((kind) => (
            <span key={kind} style={{ display: "inline-flex", alignItems: "center", gap: space[1], fontFamily: font, fontSize: 12, color: C.textSecondary }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: radius.sm / 4, background: REVENUE_KIND_META[kind].color }} />
              {REVENUE_KIND_META[kind].label}
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={`Biểu đồ doanh thu theo ${granularity === "month" ? "tháng" : "ngày"}, cao nhất ${formatVnd(Math.max(0, ...totals))}`}
        style={{ width: "100%", height: "auto", display: "block", fontFamily: font }}
      >
        {Array.from({ length: GRID_LINES + 1 }, (_, index) => {
          const amount = (yMax / GRID_LINES) * index;
          const y = yOf(amount);
          return (
            <g key={index}>
              <line x1={left} x2={width - PADDING.right} y1={y} y2={y} stroke={C.border} strokeWidth={1} />
              <text x={left - 6} y={y + 4} textAnchor="end" fontSize={axisFontSize} fill={C.textSecondary}>
                {formatVndShort(amount)}
              </text>
            </g>
          );
        })}

        {buckets.map((bucket, index) => {
          const x = left + slot * index + (slot - barWidth) / 2;
          let stackTop = 0;
          const breakdown = REVENUE_KINDS
            .map((kind) => `${REVENUE_KIND_META[kind].label}: ${formatVnd(amountByBucket.get(bucket)![kind])}`)
            .join("\n");
          return (
            <g key={bucket}>
              <title>{`${formatBucketLabel(bucket, granularity)} — ${formatVnd(totals[index])}\n${breakdown}`}</title>
              {/* Vùng trong suốt cả cột để hover được cả kỳ không có doanh thu. */}
              <rect x={left + slot * index} y={PADDING.top} width={slot} height={plotHeight} fill="transparent" />
              {REVENUE_KINDS.map((kind) => {
                const amount = amountByBucket.get(bucket)![kind];
                if (amount <= 0) return null;
                const yTop = yOf(stackTop + amount);
                const yBottom = yOf(stackTop);
                stackTop += amount;
                return <rect key={kind} x={x} y={yTop} width={barWidth} height={Math.max(1, yBottom - yTop)} fill={REVENUE_KIND_META[kind].color} />;
              })}
              {index % labelEvery === 0 && (
                <text x={left + slot * index + slot / 2} y={HEIGHT - 8} textAnchor="middle" fontSize={axisFontSize} fill={C.textSecondary}>
                  {formatBucketLabel(bucket, granularity)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </Card>
  );
}
