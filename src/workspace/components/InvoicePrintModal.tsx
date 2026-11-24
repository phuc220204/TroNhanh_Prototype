import { Printer } from "lucide-react";
import { C } from "../../shared/theme";
import { Button, ModalShell } from "../../shared/components/common";
import { InvoiceDocument, type InvoiceDocumentData } from "./InvoiceDocument";

/**
 * In: chỉ phần `[data-print-root]` được hiện khi in (trình duyệt cho "Lưu PDF").
 * Ngoại lệ có chủ đích với CLAUDE.md §8.1: inline style không biểu diễn được
 * `@media print`, nên dùng MỘT thẻ <style> chọn theo data-attribute (không className).
 * Hợp đồng in (T43) dùng lại cùng cơ chế.
 */
const PRINT_CSS = `
@media print {
  @page { margin: 12mm; }
  body * { visibility: hidden !important; }
  [data-print-root], [data-print-root] * { visibility: visible !important; }
  /* Lớp phủ + hộp modal đang cuộn (max-height 90vh) sẽ cắt bản in — mở bung chúng ra. */
  body *:has([data-print-root]) { position: static !important; overflow: visible !important; max-height: none !important; box-shadow: none !important; background: none !important; }
  [data-print-root] { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
  [data-print-root] article { border: none !important; max-width: none !important; }
}`;

/** Xem trước / in hóa đơn — bản nháp khi đang lập hoặc hóa đơn đã lưu. */
export function InvoicePrintModal({ data, onClose, closeLabel = "Đóng", extraActions, banner }: {
  data: InvoiceDocumentData;
  onClose: () => void;
  closeLabel?: string;
  /** Ví dụ nút "Xuất ảnh" với hóa đơn đã lưu. */
  extraActions?: React.ReactNode;
  /** Thông báo phía trên bản in (không in ra). */
  banner?: React.ReactNode;
}) {
  return (
    <ModalShell
      title={data.isDraft ? "Xem trước hóa đơn" : `Bản in hóa đơn · Phòng ${data.roomCode}`}
      size="xl"
      onClose={onClose}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} data-testid="invoice-print-close">{closeLabel}</Button>
          {extraActions}
          <Button variant="primary" icon={<Printer size={16} />} onClick={() => window.print()} data-testid="invoice-print-btn">
            In / Lưu PDF
          </Button>
        </>
      )}
    >
      <style>{PRINT_CSS}</style>
      {banner}
      <div data-testid="invoice-print-modal" data-print-root style={{ background: C.bg, padding: 12, borderRadius: 8 }}>
        <InvoiceDocument data={data} />
      </div>
    </ModalShell>
  );
}
