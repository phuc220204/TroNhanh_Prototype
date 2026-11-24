import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, TriangleAlert } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { Badge, Button, ModalShell, VietQRBlock } from "../../../shared/components/common";
import { formatDate, formatPeriod, formatVnd } from "../../../shared/utils/format";
import { getPaidAmount, getRemainingAmount, type InvoiceItem } from "../../services/billing-service";
import { CollectionLogSection } from "../../components/CollectionLogSection";
import { ExportInvoiceImageButton } from "../../components/ExportInvoiceImageButton";
import { getInvoiceTransferPurpose, toInvoiceImageLines, type InvoiceImageData } from "../../services/invoice-image";
import { toDisplayStatusKey } from "./invoice-display";
import { InvoiceItemsTable } from "../../components/InvoiceItemsTable";
import { InvoicePrintModal } from "../../components/InvoicePrintModal";
import { getInvoiceOccupant } from "../../services/invoice-create-service";
import { qk } from "../../../shared/query/keys";

export interface InvoiceProperty {
  address?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
}

interface InvoiceDetailModalProps {
  invoice: InvoiceItem;
  property: InvoiceProperty | null;
  isPropertiesError: boolean;
  actionMessage: { type: "success" | "error"; text: string } | null;
  onClose: () => void;
  onRecordPayment: () => void;
}

const fieldLabel: React.CSSProperties = { fontSize: 12, color: C.textSecondary };

export function InvoiceDetailModal({ invoice, property, isPropertiesError, actionMessage, onClose, onRecordPayment }: InvoiceDetailModalProps) {
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const contractId = invoice.contract_id ?? "";
  // Chỉ tải khi mở bản in: tên + SĐT người ở in trên hóa đơn.
  const occupantQuery = useQuery({
    queryKey: qk.billing.invoiceOccupant(contractId),
    queryFn: () => getInvoiceOccupant(contractId),
    enabled: isPrintOpen && contractId !== "",
  });
  const paidAmount = getPaidAmount(invoice);
  const remainingAmount = getRemainingAmount(invoice);
  // Ảnh hóa đơn gửi người ở — QR trên ảnh theo số CÒN THIẾU, như khối VietQR bên dưới.
  const imageData: InvoiceImageData = {
    propertyName: invoice.rooms?.properties?.name || "",
    roomCode: invoice.rooms?.room_code ?? "",
    period: invoice.period,
    dueDate: invoice.due_date ?? null,
    issuedAt: invoice.created_at,
    lines: toInvoiceImageLines(invoice.invoice_items ?? []),
    billingFrom: invoice.billing_from,
    billingTo: invoice.billing_to,
    note: invoice.note,
    totalAmount: Number(invoice.total_amount || 0),
    paidAmount,
    bankCode: property?.bank_name,
    accountNumber: property?.bank_account_number,
    accountName: property?.bank_account_name,
  };

  if (isPrintOpen) {
    return (
      <InvoicePrintModal
        closeLabel="Quay lại chi tiết"
        onClose={() => setIsPrintOpen(false)}
        extraActions={<ExportInvoiceImageButton data={imageData} variant="outline" />}
        data={{
          propertyName: imageData.propertyName,
          propertyAddress: property?.address,
          roomCode: imageData.roomCode,
          period: invoice.period,
          billingFrom: invoice.billing_from,
          billingTo: invoice.billing_to,
          dueDate: invoice.due_date ?? null,
          issuedAt: invoice.created_at,
          occupant: occupantQuery.data ?? null,
          items: invoice.invoice_items ?? [],
          totalAmount: Number(invoice.total_amount || 0),
          paidAmount,
          note: invoice.note,
          bankCode: property?.bank_name,
          accountNumber: property?.bank_account_number,
          accountName: property?.bank_account_name,
        }}
      />
    );
  }

  return (
    <ModalShell
      title={`Chi tiết hóa đơn - Phòng ${invoice.rooms?.room_code ?? ""}`}
      onClose={onClose}
      footer={
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <Badge kind="invoice" status={toDisplayStatusKey(invoice)} />
          <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
            <Button variant="outline" onClick={onClose}>Đóng</Button>
            <Button
              variant="primary"
              requiresWrite
              data-testid="mark-paid-btn"
              disabled={remainingAmount <= 0}
              onClick={onRecordPayment}
            >
              {remainingAmount <= 0 ? "Đã thanh toán đủ" : "Ghi nhận đã thu"}
            </Button>
          </div>
        </div>
      }
    >
      <div data-testid="invoice-detail-modal" style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: font }}>
        {actionMessage && (
          <div
            role={actionMessage.type === "error" ? "alert" : "status"}
            style={{
              padding: "10px 14px",
              borderRadius: radius.md,
              background: actionMessage.type === "success" ? C.successBg : C.errorBg,
              border: `1px solid ${actionMessage.type === "success" ? C.successBorder : C.errorBorder}`,
              color: actionMessage.type === "success" ? C.success : C.error,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {actionMessage.text}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: C.bg, padding: 12, borderRadius: radius.md }}>
          <div>
            <div style={fieldLabel}>Khu trọ</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{invoice.rooms?.properties?.name || "—"}</div>
          </div>
          <div>
            <div style={fieldLabel}>Kỳ thanh toán</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{formatPeriod(invoice.period)}</div>
            {invoice.billing_from && invoice.billing_to && (
              <div style={{ fontSize: 11.5, color: C.textSecondary }}>{formatDate(invoice.billing_from)} – {formatDate(invoice.billing_to)}</div>
            )}
          </div>
          <div>
            <div style={fieldLabel}>Tổng tiền</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>{formatVnd(invoice.total_amount)}</div>
          </div>
          <div>
            <div style={fieldLabel}>Hạn thanh toán</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{invoice.due_date ? formatDate(invoice.due_date) : "—"}</div>
          </div>
          {paidAmount > 0 && (
            <>
              <div>
                <div style={fieldLabel}>Đã thu</div>
                <div data-testid="invoice-paid-amount" style={{ fontSize: 14, fontWeight: 700, color: C.success }}>{formatVnd(paidAmount)}</div>
              </div>
              <div>
                <div style={fieldLabel}>Còn thiếu</div>
                <div data-testid="invoice-remaining-amount" style={{ fontSize: 14, fontWeight: 700, color: remainingAmount > 0 ? C.error : C.success }}>
                  {formatVnd(remainingAmount)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer đã chật (trạng thái + Đóng + Ghi nhận) ⇒ lối gửi hóa đơn đặt ngay dưới phần tóm tắt. */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", border: `1px solid ${C.border}`, borderRadius: radius.md, padding: "10px 12px" }}>
          <span style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.45, flex: "1 1 180px" }}>
            In / lưu PDF, hoặc gửi ảnh hóa đơn kèm mã VietQR cho người ở qua Zalo, Messenger.
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="outline" icon={<Printer size={15} />} onClick={() => setIsPrintOpen(true)} data-testid="invoice-detail-print-btn">
              Xem bản in
            </Button>
            <ExportInvoiceImageButton data={imageData} />
          </div>
        </div>

        <CollectionLogSection invoiceId={invoice.id} isSettled={remainingAmount <= 0} />

        {/* Đã thu đủ thì không còn gì để quét. */}
        {remainingAmount > 0 && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: C.textPrimary }}>Mã VietQR thanh toán</h4>
            {isPropertiesError && (
              <div
                data-testid="vietqr-property-error"
                style={{ display: "flex", alignItems: "center", gap: 8, background: C.warningBg, border: `1px solid ${C.warningBorder}`, borderRadius: radius.md, padding: "8px 12px", marginBottom: 10, fontSize: 12.5, color: C.textPrimary }}
              >
                <TriangleAlert size={14} color={C.warning} style={{ flexShrink: 0 }} />
                Không tải được thông tin tài khoản ngân hàng của khu trọ, nên chưa tạo được mã QR. Hãy tải lại trang.
              </div>
            )}
            {/* Số tiền trên QR là số CÒN THIẾU — hóa đơn đã thu một phần mà quét ra tổng gốc thì người ở chuyển thừa. */}
            <VietQRBlock
              bankCode={property?.bank_name}
              accountNumber={property?.bank_account_number}
              accountName={property?.bank_account_name}
              amount={remainingAmount}
              purpose={getInvoiceTransferPurpose(invoice.rooms?.room_code ?? "", invoice.period)}
            />
          </div>
        )}

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: C.textPrimary }}>
            Chi tiết khoản thu ({invoice.invoice_items?.length || 0})
          </h4>
          <InvoiceItemsTable items={invoice.invoice_items ?? []} totalAmount={invoice.total_amount} />
          {invoice.note && (
            <p data-testid="invoice-detail-note" style={{ margin: "10px 0 0", fontSize: 13, color: C.textSecondary }}>
              <strong style={{ color: C.textPrimary }}>Ghi chú:</strong> {invoice.note}
            </p>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
