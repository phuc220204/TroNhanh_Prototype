/**
 * Định dạng ngày, kỳ và tiền dùng chung cho toàn app — hàm thuần, có unit test.
 *
 * ⚠️ KHÔNG dùng `toISOString()` để lấy ngày: nó đổi sang UTC, Việt Nam là UTC+7
 * ⇒ trước 7h sáng ra NGÀY HÔM TRƯỚC (gia hạn "+6 tháng" từng lệch sớm 1 ngày).
 */

const pad2 = (value: number) => String(value).padStart(2, "0");

/** "YYYY-MM-DD" theo giờ của máy (giờ Việt Nam với người dùng VN). */
export function toLocalISODate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** "YYYY-MM" — kỳ hóa đơn / kỳ ghi chỉ số, theo giờ địa phương. */
export function toLocalPeriod(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

/** Cộng N ngày vào một ngày "YYYY-MM-DD", trả "YYYY-MM-DD" (không qua UTC). */
export function addDaysToISODate(isoDate: string, days: number): string {
  const base = parseISODate(isoDate);
  if (!base) return isoDate;
  base.setDate(base.getDate() + days);
  return toLocalISODate(base);
}

/** Cộng N tháng vào "YYYY-MM-DD". 31/01 + 1 tháng = 28/02 (hoặc 29/02), không tràn sang tháng 3. */
export function addMonthsToISODate(isoDate: string, months: number): string {
  const base = parseISODate(isoDate);
  if (!base) return isoDate;
  const day = base.getDate();
  base.setDate(1);
  base.setMonth(base.getMonth() + months);
  const lastDayOfMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  base.setDate(Math.min(day, lastDayOfMonth));
  return toLocalISODate(base);
}

/** Parse "YYYY-MM-DD..." thành Date giờ địa phương (không lệch múi giờ). */
export function parseISODate(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * "dd/mm/yyyy". Nhận "YYYY-MM-DD" (cột `date`) hoặc timestamp đầy đủ.
 * Không hợp lệ → "—" (không hiện chuỗi thô ra UI).
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISODate(value) : new Date(value);
  if (!dateOnly || Number.isNaN(dateOnly.getTime())) return "—";
  return `${pad2(dateOnly.getDate())}/${pad2(dateOnly.getMonth() + 1)}/${dateOnly.getFullYear()}`;
}

/** "2026-10" → "Tháng 10/2026". Không hợp lệ → trả lại nguyên chuỗi. */
export function formatPeriod(period: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period ?? "");
  if (!match) return period || "—";
  return `Tháng ${Number(match[2])}/${match[1]}`;
}

/** "5.500.000đ". Không phải số → "0đ". */
export function formatVnd(amount: number | string | null | undefined): string {
  const value = Number(amount);
  return `${(Number.isFinite(value) ? Math.round(value) : 0).toLocaleString("vi-VN")}đ`;
}

/** Dạng gọn cho KPI: "5,5 triệu đ" khi ≥ 1 triệu, ngược lại như `formatVnd`. */
export function formatVndShort(amount: number | string | null | undefined): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "0đ";
  return value >= 1_000_000
    ? `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu đ`
    : formatVnd(value);
}
