import { formatDate } from "../../utils/format";

const DAY_MS = 86_400_000;
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Số ngày lịch giữa hôm nay và `iso` (0 = hôm nay, 1 = hôm qua). */
function daysAgo(iso: string, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(new Date(iso))) / DAY_MS);
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

/** Dòng phân cách trong khung chat: "Hôm nay" · "Hôm qua" · "05/10/2026". */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const days = daysAgo(iso, now);
  if (days === 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  return formatDate(iso);
}

/** Thời gian ở danh sách hội thoại: giờ nếu hôm nay, thứ nếu trong tuần, còn lại ngày/tháng. */
export function formatConversationTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const days = daysAgo(iso, now);
  if (days === 0) return formatClock(iso);
  if (days === 1) return "Hôm qua";
  if (days < 7) return WEEKDAYS[new Date(iso).getDay()] ?? "";
  return formatDate(iso).slice(0, 5);
}

export function isSameDay(a: string, b: string): boolean {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}
