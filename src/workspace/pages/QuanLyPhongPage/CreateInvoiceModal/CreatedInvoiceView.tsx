import { CheckCircle2 } from "lucide-react";
import { C, font, radius } from "../../../../shared/theme";
import { formatPeriod, formatVnd } from "../../../../shared/utils/format";
import type { Property, Room } from "../../../types/room";
import type { CreatedInvoice, InvoiceOccupant } from "../../../services/invoice-create-service";
import { toInvoiceImageLines, type InvoiceImageData } from "../../../services/invoice-image";
import { ExportInvoiceImageButton } from "../../../components/ExportInvoiceImageButton";
import { InvoicePrintModal } from "../../../components/InvoicePrintModal";

/**
 * Sau khi lập: bản in của hóa đơn với đúng số SERVER đã tính,
 * kèm "In / Lưu PDF" và "Xuất ảnh" (gửi người ở qua Zalo/Messenger).
 */
export function CreatedInvoiceView({ invoice, room, property, occupant, onClose }: {
  invoice: CreatedInvoice;
  room: Room;
  property: Property | null;
  occupant: InvoiceOccupant | null;
  onClose: () => void;
}) {
  const imageData: InvoiceImageData = {
    propertyName: property?.name ?? "",
    roomCode: room.code,
    period: invoice.period,
    dueDate: invoice.dueDate,
    issuedAt: invoice.createdAt,
    lines: toInvoiceImageLines(invoice.items),
    billingFrom: invoice.billingFrom,
    billingTo: invoice.billingTo,
    note: invoice.note,
    totalAmount: invoice.totalAmount,
    paidAmount: 0,
    bankCode: property?.bank_name,
    accountNumber: property?.bank_account_number,
    accountName: property?.bank_account_name,
  };

  return (
    <InvoicePrintModal
      onClose={onClose}
      extraActions={<ExportInvoiceImageButton data={imageData} variant="outline" />}
      banner={(
        <div data-testid="invoice-created" role="status" style={{ display: "flex", alignItems: "flex-start", gap: 12, background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: radius.md, padding: "12px 16px", fontFamily: font, marginBottom: 12 }}>
          <CheckCircle2 size={22} color={C.success} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
              Đã lập hóa đơn {formatPeriod(invoice.period)} · {formatVnd(invoice.totalAmount)}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
              In / lưu PDF, hoặc xuất ảnh (kèm mã VietQR) để gửi người ở qua Zalo, Messenger.
            </p>
          </div>
        </div>
      )}
      data={{
        propertyName: property?.name ?? "",
        propertyAddress: property?.address,
        roomCode: room.code,
        period: invoice.period,
        billingFrom: invoice.billingFrom,
        billingTo: invoice.billingTo,
        dueDate: invoice.dueDate,
        issuedAt: invoice.createdAt,
        occupant,
        items: invoice.items,
        totalAmount: invoice.totalAmount,
        note: invoice.note,
        bankCode: property?.bank_name,
        accountNumber: property?.bank_account_number,
        accountName: property?.bank_account_name,
      }}
    />
  );
}
