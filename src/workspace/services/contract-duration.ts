import { addMonthsClamped, formatProration } from "./invoice-calc.ts";

/**
 * Thời hạn hợp đồng in trên bản hợp đồng (T43): "12 tháng", "6 tháng 15 ngày".
 * Đếm tháng đủ từ ngày bắt đầu (cộng tháng kiểu Postgres), phần còn lại là ngày.
 */
export function contractDuration(startIso: string, endIso: string): string {
  if (!startIso || !endIso || endIso <= startIso) return "0 ngày";
  let months = 0;
  while (months < 600 && addMonthsClamped(startIso, months + 1) <= endIso) months += 1;
  const anchor = Date.parse(`${addMonthsClamped(startIso, months)}T00:00:00Z`);
  const days = Math.round((Date.parse(`${endIso}T00:00:00Z`) - anchor) / 86_400_000);
  return formatProration({ months, days });
}
