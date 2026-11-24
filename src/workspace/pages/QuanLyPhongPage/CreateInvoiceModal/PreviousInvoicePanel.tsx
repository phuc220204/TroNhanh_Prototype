import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { C, font, radius } from "../../../../shared/theme";
import { Button } from "../../../../shared/components/common";
import { formatPeriod, formatVnd } from "../../../../shared/utils/format";
import { categoryOfItem, invoiceItemLabel } from "../../../services/invoice-calc";
import type { PreviousInvoice, PreviousInvoiceItem } from "../../../services/invoice-create-service";

/** Mức dùng của một dịch vụ ở kỳ đang lập (để so với kỳ trước). */
export interface CurrentUsage {
  serviceId: string;
  name: string;
  meterType: "Electricity" | "Water" | null;
  /** null = không thu kỳ này (bỏ chọn) hoặc đồng hồ chưa ghi chỉ số. */
  quantity: number | null;
  unit: string;
}

const qty = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/** Ghép dòng kỳ trước với dịch vụ kỳ này: theo `service_id`, hóa đơn cũ theo loại đồng hồ / tên. */
function findCurrent(item: PreviousInvoiceItem, current: CurrentUsage[]): CurrentUsage | undefined {
  return current.find((c) => item.service_id && c.serviceId === item.service_id)
    ?? current.find((c) => c.meterType !== null && c.meterType === item.type)
    ?? current.find((c) => c.name === invoiceItemLabel(item))
    // Hóa đơn trước T41: dòng `Service` gộp ("Phí dịch vụ cố định") ứng với dịch vụ "Phí dịch vụ" đã seed (T40).
    ?? (item.type === "Service" && !item.service_id ? current.find((c) => c.meterType === null && c.name === "Phí dịch vụ") : undefined);
}

/** "Hóa đơn tháng trước" — tổng kỳ trước + so sánh mức dùng từng dịch vụ (Kỳ trước → Đang lập). */
export function PreviousInvoicePanel({ previous, current, onViewPrint }: {
  previous: PreviousInvoice | null;
  current: CurrentUsage[];
  onViewPrint: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!previous) {
    return (
      <div data-testid="previous-invoice-panel" style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, padding: 12, fontFamily: font, fontSize: 12.5, color: C.textSecondary, background: C.white }}>
        Phòng chưa có hóa đơn kỳ trước.
      </div>
    );
  }

  const serviceItems = previous.items.filter((item) => {
    const category = categoryOfItem(item);
    return category === "Service" || category === "PassThrough";
  });

  return (
    <div data-testid="previous-invoice-panel" style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, background: C.white, fontFamily: font, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "10px 12px" }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.textPrimary }}>Hóa đơn tháng trước</div>
          <button type="button" onClick={onViewPrint} data-testid="previous-invoice-print" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: font, fontSize: 12, fontWeight: 700, color: C.primary }}>
            {formatPeriod(previous.period)} ↗
          </button>
        </div>
        <Button size="sm" variant="outline" onClick={() => setExpanded((v) => !v)} data-testid="previous-invoice-toggle">
          {expanded ? "Thu gọn" : "Xem"}
        </Button>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "8px 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.textSecondary }}>
            <span>Tổng hóa đơn</span>
            <strong style={{ color: C.textPrimary }}>{formatVnd(previous.totalAmount)}</strong>
          </div>
          {previous.paidAmount < previous.totalAmount && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.error }}>
              <span>Còn nợ</span>
              <strong>{formatVnd(previous.totalAmount - previous.paidAmount)}</strong>
            </div>
          )}
          {serviceItems.map((item, index) => {
            const now = findCurrent(item, current);
            const unit = item.unit || now?.unit || "";
            return (
              <div key={`${item.service_id ?? item.type}-${index}`} style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: C.textPrimary }}>
                  <span>{invoiceItemLabel(item)}</span>
                  <span>{formatVnd(item.amount)}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 6, marginTop: 4, padding: "6px 8px", borderRadius: radius.sm, background: C.bg, fontSize: 12 }}>
                  <span><span style={{ display: "block", fontSize: 10.5, color: C.textSecondary }}>Kỳ trước</span><strong>{qty(item.quantity)} {unit}</strong></span>
                  <ArrowRight size={14} color={C.textSecondary} />
                  <span style={{ textAlign: "right" }}>
                    <span style={{ display: "block", fontSize: 10.5, color: C.textSecondary }}>Đang lập</span>
                    <strong>{now?.quantity == null ? "—" : `${qty(now.quantity)} ${now.unit}`}</strong>
                  </span>
                </div>
              </div>
            );
          })}
          <Button size="sm" variant="ghost" onClick={onViewPrint} data-testid="previous-invoice-view-print">Xem bản in kỳ trước</Button>
        </div>
      )}
    </div>
  );
}
