import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { C, font, radius } from "../../shared/theme";
import { useAuth } from "../../shared/contexts/AuthContext";
import { qk } from "../../shared/query/keys";
import { Button, ModalShell } from "../../shared/components/common";
import { toUserMessage } from "../../shared/services/supabase-error";
import { formatVnd, formatPeriod, parseISODate, toLocalISODate } from "../../shared/utils/format";
import { recordPayment } from "../services/billing-service";

export type PaymentMethod = "Cash" | "BankTransfer";

export interface RecordPaymentResult {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  /** Trạng thái hóa đơn mới do server trả về (`Paid` / `PartiallyPaid` / …). */
  newStatus: string;
}

export interface RecordPaymentModalProps {
  invoiceId: string;
  /** Số tiền còn thiếu — trần của số tiền được ghi nhận. */
  remainingAmount: number;
  roomCode?: string | null;
  period?: string | null;
  onClose: () => void;
  onRecorded: (result: RecordPaymentResult) => void;
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "BankTransfer", label: "Chuyển khoản" },
  { value: "Cash", label: "Tiền mặt" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: font,
  fontSize: 15,
  color: C.textPrimary,
  padding: "10px 12px",
  background: C.white,
  border: `1.5px solid ${C.border}`,
  borderRadius: radius.md,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: font,
  fontSize: 13,
  fontWeight: 700,
  color: C.textPrimary,
  marginBottom: 6,
};

/** "1.500.000" / "1500000đ" → 1500000. Rỗng / không có chữ số → null. */
function parseAmountInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

/**
 * Ghi nhận một lần thu tiền cho hóa đơn: chọn số tiền (mặc định = số còn thiếu,
 * thu ít hơn ⇒ hóa đơn "Thu một phần"), hình thức và ngày thu.
 * AS-002: nền tảng không giữ tiền — đây chỉ là chủ trọ tự ghi lại việc đã thu.
 */
export function RecordPaymentModal({
  invoiceId,
  remainingAmount,
  roomCode,
  period,
  onClose,
  onRecorded,
}: RecordPaymentModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = toLocalISODate();

  const [amountText, setAmountText] = useState(remainingAmount.toLocaleString("vi-VN"));
  const [method, setMethod] = useState<PaymentMethod>("BankTransfer");
  const [paidDate, setPaidDate] = useState(today);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const amount = parseAmountInput(amountText);
  const isPartial = amount !== null && amount > 0 && amount < remainingAmount;

  let validationError: string | null = null;
  if (amount === null || amount < 1) validationError = "Vui lòng nhập số tiền đã thu.";
  else if (amount > remainingAmount) validationError = `Số tiền không được vượt quá số còn thiếu (${formatVnd(remainingAmount)}).`;
  else if (!parseISODate(paidDate)) validationError = "Vui lòng chọn ngày thu.";
  else if (paidDate > today) validationError = "Ngày thu không được sau hôm nay.";

  const handleSubmit = async () => {
    if (validationError || amount === null || isSubmitting) return;
    const localDate = parseISODate(paidDate);
    if (!localDate) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Giữa trưa giờ địa phương ⇒ đổi sang UTC vẫn đúng ngày đã chọn.
      const paidAt = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 12).toISOString();
      const newStatus = await recordPayment(invoiceId, amount, method, paidAt);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.billing.all }),
        queryClient.invalidateQueries({ queryKey: qk.dashboard.summary(user?.id) }),
      ]);
      onRecorded({ invoiceId, amount, method, newStatus });
    } catch (err) {
      setSubmitError(toUserMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleSuffix = roomCode ? ` - Phòng ${roomCode}` : "";

  return (
    <ModalShell
      title={`Ghi nhận đã thu${titleSuffix}`}
      onClose={() => { if (!isSubmitting) onClose(); }}
      footer={
        <>
          <Button variant="outline" disabled={isSubmitting} onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            requiresWrite
            data-testid="confirm-record-payment"
            disabled={!!validationError}
            loading={isSubmitting}
            onClick={handleSubmit}
          >
            Xác nhận đã thu
          </Button>
        </>
      }
    >
      <div data-testid="record-payment-modal" style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: font }}>
        <div style={{ background: C.bg, borderRadius: radius.md, padding: "10px 12px", fontSize: 13, color: C.textSecondary }}>
          {period ? `${formatPeriod(period)} · ` : ""}Còn thiếu{" "}
          <strong style={{ color: C.primary, fontSize: 14 }}>{formatVnd(remainingAmount)}</strong>
        </div>

        <div>
          <label htmlFor="record-payment-amount" style={labelStyle}>Số tiền đã thu (đ)</label>
          <input
            id="record-payment-amount"
            data-testid="record-payment-amount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={amountText}
            onChange={(e) => {
              const parsed = parseAmountInput(e.target.value);
              setAmountText(parsed === null ? "" : parsed.toLocaleString("vi-VN"));
            }}
            style={inputStyle}
          />
          {isPartial && amount !== null && (
            <p style={{ margin: "6px 0 0", fontSize: 12.5, color: C.warning, lineHeight: 1.5 }}>
              Thu ít hơn số còn thiếu ⇒ hóa đơn chuyển sang "Thu một phần", còn lại{" "}
              {formatVnd(remainingAmount - amount)} để thu sau.
            </p>
          )}
        </div>

        <div>
          <span style={labelStyle}>Hình thức</span>
          <div role="radiogroup" aria-label="Hình thức thanh toán" style={{ display: "flex", gap: 8 }}>
            {METHOD_OPTIONS.map((option) => {
              const isSelected = method === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-testid={`record-payment-method-${option.value}`}
                  onClick={() => setMethod(option.value)}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    fontFamily: font,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    borderRadius: radius.md,
                    color: isSelected ? C.white : C.textPrimary,
                    background: isSelected ? C.primary : C.white,
                    border: `1.5px solid ${isSelected ? C.primary : C.border}`,
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="record-payment-date" style={labelStyle}>Ngày thu</label>
          <input
            id="record-payment-date"
            data-testid="record-payment-date"
            type="date"
            max={today}
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {validationError && (
          <p data-testid="record-payment-validation" style={{ margin: 0, fontSize: 13, color: C.error }}>{validationError}</p>
        )}

        {submitError && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: radius.md,
              background: C.errorBg,
              border: `1px solid ${C.errorBorder}`,
              color: C.error,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {submitError}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

export default RecordPaymentModal;
