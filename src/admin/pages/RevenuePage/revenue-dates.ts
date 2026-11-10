import { parseISODate } from "../../../shared/utils/format";
import type { RevenueGranularity } from "../../services/admin-revenue-service";

/**
 * Tiện ích ngày cho trang Doanh thu. Mọi ngày là chuỗi "YYYY-MM-DD" theo giờ
 * máy (Admin vận hành ở Việt Nam) — RPC tự quy đổi sang Asia/Ho_Chi_Minh.
 */

/** Theo ngày tối đa ~1 năm — khớp giới hạn trong `admin_revenue_summary`. */
export const MAX_DAY_RANGE = 366;
/** Theo tháng tối đa 10 năm — khớp giới hạn trong `admin_revenue_summary`. */
export const MAX_MONTH_RANGE = 3660;

const pad2 = (value: number) => String(value).padStart(2, "0");

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Số ngày giữa hai mốc (to − from). Chuỗi hỏng ⇒ NaN. */
export function daysBetween(from: string, to: string): number {
  const start = parseISODate(from);
  const end = parseISODate(to);
  if (!start || !end) return Number.NaN;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export type RevenuePresetId = "thisMonth" | "lastMonth" | "last30Days" | "thisYear";

export interface RevenuePreset {
  id: RevenuePresetId;
  label: string;
  from: string;
  to: string;
  granularity: RevenueGranularity;
}

export function getRevenuePresets(now = new Date()): RevenuePreset[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const thirtyDaysAgo = new Date(year, month, now.getDate() - 29);
  return [
    { id: "thisMonth", label: "Tháng này", from: toIsoDate(new Date(year, month, 1)), to: toIsoDate(now), granularity: "day" },
    { id: "lastMonth", label: "Tháng trước", from: toIsoDate(new Date(year, month - 1, 1)), to: toIsoDate(new Date(year, month, 0)), granularity: "day" },
    { id: "last30Days", label: "30 ngày qua", from: toIsoDate(thirtyDaysAgo), to: toIsoDate(now), granularity: "day" },
    { id: "thisYear", label: "Năm nay", from: toIsoDate(new Date(year, 0, 1)), to: toIsoDate(now), granularity: "month" },
  ];
}

/**
 * Mọi kỳ trong khoảng, kể cả kỳ không phát sinh — để trục biểu đồ liên tục.
 * Kỳ "month" là ngày 01 của tháng, khớp `date_trunc('month', …)` ở RPC.
 */
export function enumerateBuckets(from: string, to: string, granularity: RevenueGranularity): string[] {
  const start = parseISODate(from);
  const end = parseISODate(to);
  if (!start || !end || start > end) return [];
  const buckets: string[] = [];
  const cursor = granularity === "month"
    ? new Date(start.getFullYear(), start.getMonth(), 1)
    : new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cursor <= end) {
    buckets.push(toIsoDate(cursor));
    if (granularity === "month") cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
}

/** Nhãn trục: "05/11" theo ngày, "11/2026" theo tháng. */
export function formatBucketLabel(bucket: string, granularity: RevenueGranularity): string {
  const date = parseISODate(bucket);
  if (!date) return bucket;
  return granularity === "month"
    ? `${pad2(date.getMonth() + 1)}/${date.getFullYear()}`
    : `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;
}
