import { ORDER_STATUS_META, REVENUE_KIND_META } from "../../../shared/utils/statusMaps";
import type { RevenueTransaction } from "../../services/admin-revenue-service";

/**
 * Xuất danh sách giao dịch ra CSV để đối soát với payOS. Mở bằng Excel:
 * có BOM UTF-8 để giữ dấu tiếng Việt, và số tiền là số nguyên (không định dạng)
 * để cộng được.
 */

const HEADERS = [
  "Thời gian thanh toán",
  "Thời gian tạo đơn",
  "Mã đơn payOS",
  "Loại",
  "Người mua",
  "Email",
  "Sản phẩm",
  "Số tiền (đ)",
  "Trạng thái",
];

const pad2 = (value: number) => String(value).padStart(2, "0");

/** "dd/mm/yyyy hh:mm" theo giờ máy; trống nếu không có. */
function formatDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/**
 * Bọc ô CSV. Ô bắt đầu bằng = + - @ bị Excel hiểu là công thức (CSV injection)
 * — tên người mua/tiêu đề tin do người dùng tự nhập nên phải vô hiệu hóa.
 */
function toCell(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildRevenueCsv(rows: RevenueTransaction[]): string {
  const lines = rows.map((row) => [
    formatDateTime(row.paidAt),
    formatDateTime(row.createdAt),
    row.orderCode,
    REVENUE_KIND_META[row.kind].label,
    row.buyerName ?? "",
    row.buyerEmail ?? "",
    row.itemLabel,
    row.amount,
    row.status ? ORDER_STATUS_META[row.status].label : row.rawStatus,
  ].map(toCell).join(","));
  return `﻿${[HEADERS.map(toCell).join(","), ...lines].join("\r\n")}`;
}

export function downloadCsv(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
