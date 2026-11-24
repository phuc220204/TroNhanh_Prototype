import { C, font, radius } from "../../shared/theme";
import { formatVnd } from "../../shared/utils/format";
import { FEE_CATEGORY_META } from "../../shared/utils/statusMaps";
import {
  groupItemsByCategory, invoiceItemDetail, invoiceItemLabel, summarizeByCategory,
  type DescribableInvoiceItem,
} from "../services/invoice-calc";

type Item = DescribableInvoiceItem & { id?: string; amount: number | string };

/**
 * Bảng khoản thu của một hóa đơn, gom theo nhóm (T41):
 * Tiền phòng → Phí dịch vụ → Thu hộ → Cộng thêm/Giảm trừ, mỗi nhóm có tổng con.
 * Hóa đơn trước T41 cũng hiển thị được (nhóm suy từ `type`).
 */
export function InvoiceItemsTable({ items, totalAmount }: { items: Item[]; totalAmount: number | string }) {
  if (items.length === 0) {
    return <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Hóa đơn chưa có khoản thu chi tiết.</p>;
  }
  const totals = summarizeByCategory(items);

  return (
    <div data-testid="invoice-items-table" style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, overflow: "hidden", fontFamily: font }}>
      {groupItemsByCategory(items).map((group) => {
        const meta = FEE_CATEGORY_META[group.category];
        return (
          <div key={group.category} data-testid={`invoice-group-${group.category}`}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: meta.bg, color: meta.color, fontSize: 13, fontWeight: 800 }}>
              <span>
                {meta.label}
                {group.category === "PassThrough" && <span style={{ fontWeight: 600 }}> · không tính doanh thu</span>}
              </span>
              <span>{formatVnd(totals[group.category])}</span>
            </div>
            {group.items.map((item, index) => {
              const detail = invoiceItemDetail(item);
              const amount = Number(item.amount);
              return (
                <div key={item.id ?? `${group.category}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 12px", borderTop: `1px solid ${C.border}` }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>{invoiceItemLabel(item)}</div>
                    {detail && <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{detail}</div>}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: amount < 0 ? C.success : C.textPrimary, whiteSpace: "nowrap" }}>{formatVnd(amount)}</div>
                </div>
              );
            })}
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderTop: `1px solid ${C.border}`, background: C.bg }}>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: C.textPrimary }}>Tổng cộng</span>
        <span data-testid="invoice-items-total" style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>{formatVnd(totalAmount)}</span>
      </div>
      {totals.PassThrough > 0 && (
        <div style={{ padding: "6px 12px 10px", background: C.bg, fontSize: 12, color: C.textSecondary }}>
          Doanh thu: <strong style={{ color: C.textPrimary }}>{formatVnd(totals.revenue)}</strong> · Thu hộ: <strong style={{ color: C.textPrimary }}>{formatVnd(totals.PassThrough)}</strong>
        </div>
      )}
    </div>
  );
}
