import { Printer } from "lucide-react";
import { Button, ModalShell } from "../../shared/components/common";
import { InvoiceDocument, type InvoiceDocumentData } from "./InvoiceDocument";
import { PrintArea } from "./PrintArea";

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
      {banner}
      <PrintArea testId="invoice-print-modal">
        <InvoiceDocument data={data} />
      </PrintArea>
    </ModalShell>
  );
}
