import { Plus, Trash2 } from "lucide-react";
import { C, font, radius } from "../../../../shared/theme";
import { Button, MoneyInput } from "../../../../shared/components/common";
import { SectionCard } from "./SectionCard";

export interface AdjustmentRow {
  id: string;
  reason: string;
  /** 1 = cộng thêm · -1 = giảm trừ. */
  sign: 1 | -1;
  /** Chuỗi chữ số (MoneyInput). */
  amount: string;
}

/** Số tiền có dấu của một dòng; 0 khi chưa nhập. */
export const signedAdjustment = (row: AdjustmentRow): number => row.sign * (Number(row.amount) || 0);

// Không có gợi ý nào liên quan tiền cọc: cộng thêm/giảm trừ không dùng cho cọc.
const REASON_SUGGESTIONS = ["Giảm ngày Tết", "Giảm sinh nhật", "Phạt trễ hạn", "Sửa chữa do khách"];

export function AdjustmentsSection({ rows, onChange }: {
  rows: AdjustmentRow[];
  onChange: (rows: AdjustmentRow[]) => void;
}) {
  const update = (id: string, patch: Partial<AdjustmentRow>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const add = (reason = "") =>
    onChange([...rows, { id: `${Date.now()}-${rows.length}`, reason, sign: -1, amount: "" }]);

  return (
    <SectionCard title="Cộng thêm / Giảm trừ" subtitle="Ví dụ giảm ngày Tết, phạt trễ hạn… Không dùng cho tiền cọc." testId="invoice-adjustments-section">
      {rows.map((row) => (
        <div key={row.id} style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1.4fr) minmax(0, 1fr) auto", gap: 8, alignItems: "center" }}>
          <div role="radiogroup" aria-label="Loại điều chỉnh" style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: radius.sm, overflow: "hidden" }}>
            {([[1, "+"], [-1, "−"]] as const).map(([sign, label]) => (
              <button
                key={sign}
                type="button"
                role="radio"
                aria-checked={row.sign === sign}
                aria-label={sign === 1 ? "Cộng thêm" : "Giảm trừ"}
                onClick={() => update(row.id, { sign })}
                style={{ width: 34, height: 40, border: "none", cursor: "pointer", fontFamily: font, fontSize: 16, fontWeight: 800, background: row.sign === sign ? (sign === 1 ? C.warningBg : C.successBg) : C.white, color: row.sign === sign ? (sign === 1 ? C.warning : C.success) : C.textSecondary }}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={row.reason}
            maxLength={120}
            placeholder="Lý do *"
            aria-label="Lý do điều chỉnh"
            onChange={(e) => update(row.id, { reason: e.target.value })}
            style={{ padding: "10px 12px", fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1px solid ${row.reason.trim() ? C.border : C.warningBorder}`, borderRadius: radius.sm, outline: "none", minWidth: 0 }}
            data-testid="invoice-adjustment-reason"
          />
          <MoneyInput value={row.amount} onChange={(amount) => update(row.id, { amount })} placeholder="0" data-testid="invoice-adjustment-amount" />
          <button type="button" aria-label="Xóa dòng" onClick={() => onChange(rows.filter((r) => r.id !== row.id))} style={{ border: "none", background: "transparent", cursor: "pointer", color: C.textSecondary, padding: 6 }}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={() => add()} data-testid="invoice-adjustment-add">
          Thêm dòng
        </Button>
        {rows.length === 0 && REASON_SUGGESTIONS.map((reason) => (
          <button key={reason} type="button" onClick={() => add(reason)} style={{ padding: "4px 10px", borderRadius: 999, border: `1px dashed ${C.border}`, background: C.white, fontFamily: font, fontSize: 12, color: C.textSecondary, cursor: "pointer" }}>
            {reason}
          </button>
        ))}
      </div>
    </SectionCard>
  );
}
