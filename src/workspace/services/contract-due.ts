import { getDaysUntilDue } from "./invoice-due.ts";

/**
 * Phân loại ngày kết thúc hợp đồng — hàm thuần, không chạm Supabase.
 *
 * Chưa có job nào chuyển hợp đồng `Active` quá `end_date` sang `Expired`, nên
 * hợp đồng đã hết hạn vẫn nằm ở `Active` và phòng vẫn "Đang thuê". Màn hình phải
 * tự tính từ `end_date` để nhắc chủ trọ gia hạn hoặc kết thúc.
 */

/** Nhắc hợp đồng sắp hết hạn trong vòng N ngày (tính cả hôm nay). */
export const CONTRACT_EXPIRING_SOON_DAYS = 30;

export type ContractEndState = "expired" | "expiringSoon";

export interface ContractEndInfo {
  state: ContractEndState;
  /** 0 = hết hạn hôm nay, âm = đã quá hạn. */
  daysUntilEnd: number;
}

/** Chỉ xét hợp đồng `Active`: hợp đồng đã chấm dứt/hết hạn thì không còn việc gì để nhắc. */
export function classifyContractEnd(
  endDate: string | null | undefined,
  status: string | null | undefined,
  today: Date,
  windowDays: number = CONTRACT_EXPIRING_SOON_DAYS,
): ContractEndInfo | null {
  if (status !== "Active" || !endDate) return null;
  const daysUntilEnd = getDaysUntilDue(endDate, today);
  if (daysUntilEnd === null) return null;
  if (daysUntilEnd < 0) return { state: "expired", daysUntilEnd };
  if (daysUntilEnd <= windowDays) return { state: "expiringSoon", daysUntilEnd };
  return null;
}

/** "Quá hạn 5 ngày" · "Hết hạn hôm nay" · "Còn 12 ngày". */
export function formatContractEndLabel(daysUntilEnd: number): string {
  if (daysUntilEnd < 0) return `Quá hạn ${Math.abs(daysUntilEnd)} ngày`;
  if (daysUntilEnd === 0) return "Hết hạn hôm nay";
  return `Còn ${daysUntilEnd} ngày`;
}
