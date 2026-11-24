import { C } from "../../shared/theme";

/**
 * Vùng in dùng chung (hóa đơn T41, hợp đồng T43): khi in, CHỈ phần này hiện ra
 * (trình duyệt cho "Lưu PDF").
 *
 * Ngoại lệ có chủ đích với CLAUDE.md §8.1: inline style không biểu diễn được
 * `@media print`, nên dùng MỘT thẻ <style> chọn theo data-attribute (không className).
 */
const PRINT_CSS = `
@media print {
  @page { margin: 12mm; }
  body * { visibility: hidden !important; }
  [data-print-root], [data-print-root] * { visibility: visible !important; }
  /* Lớp phủ + hộp modal đang cuộn (max-height 90vh) sẽ cắt bản in — mở bung chúng ra. */
  body *:has([data-print-root]) { position: static !important; overflow: visible !important; max-height: none !important; box-shadow: none !important; background: none !important; }
  [data-print-root] { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; background: none !important; }
  [data-print-root] article { border: none !important; max-width: none !important; }
}`;

export function PrintArea({ children, testId }: { children: React.ReactNode; testId?: string }) {
  return (
    <>
      <style>{PRINT_CSS}</style>
      <div data-testid={testId} data-print-root style={{ background: C.bg, padding: 12, borderRadius: 8 }}>
        {children}
      </div>
    </>
  );
}
