import { C, font } from "../../shared/theme";
import { VietQRBlock } from "../../shared/components/common";
import { formatDate, formatVnd } from "../../shared/utils/format";
import { FEE_CATEGORY_META } from "../../shared/utils/statusMaps";
import {
  groupItemsByCategory, invoiceItemColumns, invoiceItemLabel, summarizeByCategory,
  type DescribableInvoiceItem,
} from "../services/invoice-calc";
import { getInvoiceTransferPurpose } from "../services/invoice-image";

export type InvoiceDocumentItem = DescribableInvoiceItem & { id?: string; amount: number | string };

export interface InvoiceDocumentData {
  /** true = bản nháp trong form lập hóa đơn (chưa lưu). */
  isDraft?: boolean;
  propertyName: string;
  propertyAddress?: string | null;
  roomCode: string;
  /** `YYYY-MM` */
  period: string;
  billingFrom?: string | null;
  billingTo?: string | null;
  dueDate?: string | null;
  issuedAt?: string | null;
  occupant?: { fullName: string; phoneNumber?: string | null } | null;
  items: InvoiceDocumentItem[];
  totalAmount: number;
  paidAmount?: number;
  note?: string | null;
  bankCode?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
}

const cell: React.CSSProperties = { border: `1px solid ${C.textPrimary}`, padding: "7px 10px", fontSize: 13, verticalAlign: "top" };
const moneyCell: React.CSSProperties = { ...cell, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" };

/**
 * Bản in hóa đơn (T41) — dùng chung cho xem trước khi lập, màn "Đã lập" và chi tiết hóa đơn.
 * Thuần hiển thị: không fetch, không ghi. Bảng gom theo nhóm khoản thu, mỗi nhóm có tổng con.
 */
export function InvoiceDocument({ data }: { data: InvoiceDocumentData }) {
  const [year, month] = data.period.split("-");
  const totals = summarizeByCategory(data.items);
  const paid = data.paidAmount ?? 0;
  const remaining = Math.max(0, data.totalAmount - paid);
  const range = data.billingFrom && data.billingTo ? `${formatDate(data.billingFrom)} – ${formatDate(data.billingTo)}` : null;

  return (
    <article data-testid="invoice-document" style={{ background: C.white, color: C.textPrimary, fontFamily: font, maxWidth: 760, margin: "0 auto", padding: "28px 28px 24px", border: `1px solid ${C.border}`, borderTop: `6px solid ${C.primary}`, borderRadius: 6, boxSizing: "border-box" }}>
      <header style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.primary, letterSpacing: "0.08em" }}>TRỌ NHANH</div>
        <h2 style={{ margin: "6px 0 2px", fontSize: 22, fontWeight: 800 }}>HÓA ĐƠN TIỀN PHÒNG</h2>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.textSecondary }}>T.{Number(month)} – {year}</div>
        {data.isDraft && (
          <div data-testid="invoice-document-draft" style={{ display: "inline-block", marginTop: 8, padding: "3px 12px", borderRadius: 999, background: C.warningBg, color: C.warning, fontSize: 12, fontWeight: 800 }}>
            Bản xem trước — chưa lưu
          </div>
        )}
        <div style={{ marginTop: 8, fontSize: 13.5, fontWeight: 700 }}>{data.propertyName}</div>
        {data.propertyAddress && <div style={{ fontSize: 12.5, color: C.textSecondary }}>{data.propertyAddress}</div>}
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "4px 16px", fontSize: 13, marginBottom: 14 }}>
        <div>Người ở: <strong>{data.occupant?.fullName || "—"}</strong></div>
        <div>Số điện thoại: <strong>{data.occupant?.phoneNumber || "—"}</strong></div>
        <div>Phòng: <strong>{data.roomCode}</strong></div>
        <div>Hạn thanh toán: <strong>{data.dueDate ? formatDate(data.dueDate) : "—"}</strong></div>
        {range && <div>Tính tiền: <strong>{range}</strong></div>}
        {data.issuedAt && <div>Ngày lập: <strong>{formatDate(data.issuedAt)}</strong></div>}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr>
              {["Hạng mục", "Đơn giá", "Mức sử dụng", "Số tiền"].map((h, i) => (
                <th key={h} style={{ ...cell, fontWeight: 800, textAlign: i === 3 ? "right" : "left", background: C.bg }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupItemsByCategory(data.items).map((group) => {
              const meta = FEE_CATEGORY_META[group.category];
              const showGroupRow = group.category !== "Rent";
              return [
                showGroupRow && (
                  <tr key={`${group.category}-head`} data-testid={`invoice-document-group-${group.category}`}>
                    <td colSpan={3} style={{ ...cell, background: meta.bg, color: meta.color, fontWeight: 800 }}>
                      Tổng {meta.label.toLowerCase()}{group.category === "PassThrough" ? " (không tính doanh thu)" : ""}
                    </td>
                    <td style={{ ...moneyCell, background: meta.bg, color: meta.color }}>{formatVnd(totals[group.category])}</td>
                  </tr>
                ),
                ...group.items.map((item, index) => {
                  const columns = invoiceItemColumns(item);
                  const amount = Number(item.amount);
                  return (
                    <tr key={item.id ?? `${group.category}-${index}`}>
                      <td style={{ ...cell, fontWeight: 700 }}>{invoiceItemLabel(item)}</td>
                      <td style={cell}>{columns.unitPriceText}</td>
                      <td style={cell}>{columns.usageText}</td>
                      <td style={{ ...moneyCell, color: amount < 0 ? C.success : C.textPrimary }}>{formatVnd(amount)}</td>
                    </tr>
                  );
                }),
              ];
            })}
            <tr>
              <td colSpan={3} style={{ ...cell, fontWeight: 800 }}>Tổng tiền</td>
              <td data-testid="invoice-document-total" style={{ ...moneyCell, fontSize: 15 }}>{formatVnd(data.totalAmount)}</td>
            </tr>
            {paid > 0 && (
              <tr>
                <td colSpan={3} style={cell}>Đã thu</td>
                <td style={{ ...moneyCell, color: C.success }}>{formatVnd(paid)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3} style={{ ...cell, fontWeight: 800, background: C.errorBg }}>Còn lại</td>
              <td style={{ ...moneyCell, fontSize: 15, color: C.error, background: C.errorBg }}>{formatVnd(remaining)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {totals.PassThrough > 0 && (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: C.textSecondary }}>
          Trong đó tiền thu hộ bên thứ 3: {formatVnd(totals.PassThrough)}.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, textAlign: "center", margin: "20px 0 8px", fontSize: 13 }}>
        <div><strong>Người đại diện thu</strong><div style={{ color: C.textSecondary, marginTop: 4 }}>{data.accountName || data.propertyName}</div></div>
        <div><strong>Người ở</strong><div style={{ color: C.textSecondary, marginTop: 4 }}>{data.occupant?.fullName || ""}</div></div>
      </div>

      <div style={{ fontSize: 13, marginTop: 12 }}>
        <strong>Ghi chú:</strong>
        {data.dueDate && <div>* Vui lòng thanh toán trước <strong>{formatDate(data.dueDate)}</strong></div>}
        {data.note && <div style={{ whiteSpace: "pre-wrap" }}>{data.note}</div>}
      </div>

      {remaining > 0 && (
        <div style={{ borderTop: `1px dashed ${C.border}`, marginTop: 16, paddingTop: 14 }}>
          <VietQRBlock
            bankCode={data.bankCode}
            accountNumber={data.accountNumber}
            accountName={data.accountName}
            amount={remaining}
            purpose={getInvoiceTransferPurpose(data.roomCode, data.period)}
            size={150}
          />
        </div>
      )}
    </article>
  );
}
