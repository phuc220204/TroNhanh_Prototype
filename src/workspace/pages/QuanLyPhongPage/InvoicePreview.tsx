import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { Button, ModalShell, Skeleton, VietQRBlock } from "../../../shared/components/common";
import type { Room, Property } from "../../types/room";
import { createInvoiceWithItems, getInvoiceDraftSources } from "../../services/billing-service";
import {
  buildInvoiceDraft,
  buildInvoiceItems,
  formatUtilityBreakdown,
  type InvoiceDraft,
  type UtilityLine,
} from "../../services/invoice-draft";
import { toUserMessage } from "../../../shared/services/supabase-error";
import { qk } from "../../../shared/query/keys";
import { addDaysToISODate, formatPeriod, formatVnd, toLocalISODate, toLocalPeriod } from "../../../shared/utils/format";

interface InvoicePreviewProps {
  room: Room | null;
  property: Property | null;
  onClose: () => void;
  onSuccess?: () => void;
  isReadOnly?: boolean;
}

interface AmountInputs {
  rent: string;
  electricity: string;
  water: string;
  service: string;
}

const EMPTY_AMOUNTS: AmountInputs = { rent: "", electricity: "", water: "", service: "" };

const labelStyle: React.CSSProperties = { display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: radius.sm, outline: "none", boxSizing: "border-box", background: C.white, color: C.textPrimary };
const hintStyle: React.CSSProperties = { fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "4px 0 0", lineHeight: 1.4 };
const warnHintStyle: React.CSSProperties = { ...hintStyle, color: C.warning, fontWeight: 600 };

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;
const toAmount = (value: string) => Math.max(0, Number(value) || 0);

function Notice({ tone, children, testId }: { tone: "error" | "warning"; children: React.ReactNode; testId?: string }) {
  const isError = tone === "error";
  const Icon = isError ? AlertCircle : AlertTriangle;
  return (
    <div
      data-testid={testId}
      role={isError ? "alert" : "status"}
      style={{
        background: isError ? C.errorBg : C.warningBg,
        border: `1px solid ${isError ? C.errorBorder : C.warningBorder}`,
        color: isError ? C.error : C.textPrimary,
        padding: "10px 14px", borderRadius: radius.sm, fontSize: 13, fontFamily: font,
        display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.45,
      }}
    >
      <Icon size={16} color={isError ? C.error : C.warning} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function AmountField({ label, value, onChange, hint, warning, testId }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  warning?: string;
  testId: string;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        <input type="number" min={0} inputMode="numeric" data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, marginTop: 4, fontWeight: 400 }} />
      </label>
      {warning && <p style={warnHintStyle}>{warning}</p>}
      {hint && <p style={hintStyle}>{hint}</p>}
    </div>
  );
}

function utilityHint(line: UtilityLine): { hint?: string; warning?: string } {
  if (!line.hasReading) return { warning: "Chưa ghi chỉ số kỳ này" };
  const breakdown = formatUtilityBreakdown(line);
  return line.unitPrice > 0 ? { hint: breakdown } : { hint: breakdown, warning: "Chưa cấu hình đơn giá" };
}

export function InvoicePreview({ room, property, onClose, onSuccess, isReadOnly }: InvoicePreviewProps) {
  const roomId = room?.id ?? "";
  const [period, setPeriod] = useState(() => toLocalPeriod());
  const [dueDate, setDueDate] = useState(() => addDaysToISODate(toLocalISODate(), 5));
  const [amounts, setAmounts] = useState<AmountInputs>(EMPTY_AMOUNTS);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isValidPeriod = PERIOD_PATTERN.test(period);
  // Key nằm dưới `qk.billing.all`: ghi chỉ số / tạo hóa đơn ở nơi khác tự làm mới nháp.
  const draftQuery = useQuery({
    queryKey: qk.billing.invoiceDraft(roomId, period),
    queryFn: async (): Promise<InvoiceDraft> => buildInvoiceDraft(await getInvoiceDraftSources(roomId, period), period),
    enabled: Boolean(roomId) && isValidPeriod,
    staleTime: 0,
  });
  const loadedDraft = draftQuery.data;

  // Đổi kỳ = dựng lại nháp từ đầu; số chủ trọ sửa tay chỉ áp cho kỳ đang xem.
  useEffect(() => {
    if (!loadedDraft) return;
    setAmounts({
      rent: loadedDraft.rent === null ? "" : String(loadedDraft.rent),
      electricity: String(loadedDraft.electricity.amount),
      water: String(loadedDraft.water.amount),
      service: loadedDraft.serviceFee === null ? "" : String(loadedDraft.serviceFee),
    });
  }, [loadedDraft]);

  // Guard SAU mọi hook (Rules of Hooks).
  if (!room) return null;

  // Nháp phải khớp kỳ đang chọn (kỳ bị xóa trống thì không tải lại → không được gửi).
  const draft = loadedDraft && loadedDraft.period === period ? loadedDraft : null;
  const hasContract = Boolean(draft?.contractId);
  const finalAmounts = {
    rent: toAmount(amounts.rent),
    electricity: toAmount(amounts.electricity),
    water: toAmount(amounts.water),
    service: toAmount(amounts.service),
  };
  const totalCalc = finalAmounts.rent + finalAmounts.electricity + finalAmounts.water + finalAmounts.service;
  const isMissingReading = Boolean(draft && (!draft.electricity.hasReading || !draft.water.hasReading));
  const canSubmit = Boolean(draft && hasContract) && !loading && !isReadOnly;

  const setAmount = (key: keyof AmountInputs) => (value: string) => setAmounts((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (isReadOnly || !draft || !draft.contractId) return;
    if (!dueDate) {
      setErrorMsg("Vui lòng chọn hạn thanh toán.");
      return;
    }
    if (finalAmounts.rent <= 0) {
      setErrorMsg("Tiền nhà phải lớn hơn 0.");
      return;
    }
    try {
      setLoading(true);
      setErrorMsg("");
      await createInvoiceWithItems({
        roomId: room.id,
        contractId: draft.contractId,
        period,
        dueDate,
        items: buildInvoiceItems(draft, finalAmounts),
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      // INVOICE_PERIOD_EXISTS → "Kỳ này đã có hóa đơn."
      setErrorMsg(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>Hủy</Button>
      <Button
        variant="primary"
        requiresWrite
        disabled={!canSubmit}
        loading={loading}
        onClick={() => void handleSubmit()}
        data-testid="create-invoice-btn"
      >
        {loading ? "Đang tạo..." : "Xác nhận tạo hóa đơn"}
      </Button>
    </>
  );

  return (
    <ModalShell title={`Tạo hóa đơn - Phòng ${room.code}`} onClose={onClose} footer={footer}>
      {errorMsg && <Notice tone="error" testId="invoice-form-error">{errorMsg}</Notice>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <label style={labelStyle}>
            Kỳ hóa đơn
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ ...inputStyle, marginTop: 4, fontWeight: 400 }} />
          </label>
          <label style={labelStyle}>
            Hạn thanh toán
            <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ ...inputStyle, marginTop: 4, fontWeight: 400 }} />
          </label>
        </div>

        {!isValidPeriod && <Notice tone="warning">Vui lòng chọn kỳ hóa đơn.</Notice>}

        {isValidPeriod && draftQuery.isPending && <Skeleton variant="row" count={4} data-testid="invoice-draft-loading" />}

        {isValidPeriod && draftQuery.isError && (
          <Notice tone="error" testId="invoice-draft-error">
            <p style={{ margin: "0 0 8px" }}>Không tải được dữ liệu để lập hóa đơn. {toUserMessage(draftQuery.error)}</p>
            <Button size="sm" variant="outline" onClick={() => void draftQuery.refetch()}>Thử lại</Button>
          </Notice>
        )}

        {draft && !hasContract && (
          <Notice tone="warning" testId="invoice-no-contract">
            <strong>Phòng chưa có hợp đồng đang hiệu lực.</strong> Hãy thêm người ở và hợp đồng cho phòng này trước khi tạo hóa đơn.
          </Notice>
        )}

        {draft && hasContract && (
          <>
            {isMissingReading && (
              <Notice tone="warning" testId="invoice-missing-reading">
                {formatPeriod(period)} chưa ghi đủ chỉ số điện nước. Nên ghi chỉ số trước để hóa đơn tính đúng, hoặc tự nhập số tiền bên dưới.
              </Notice>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <AmountField label="Tiền nhà (VND)" value={amounts.rent} onChange={setAmount("rent")} hint="Theo hợp đồng đang hiệu lực" testId="invoice-rent-input" />
              <AmountField label="Tiền điện (VND)" value={amounts.electricity} onChange={setAmount("electricity")} {...utilityHint(draft.electricity)} testId="invoice-elec-input" />
              <AmountField label="Tiền nước (VND)" value={amounts.water} onChange={setAmount("water")} {...utilityHint(draft.water)} testId="invoice-water-input" />
              <AmountField
                label="Phí dịch vụ (VND)"
                value={amounts.service}
                onChange={setAmount("service")}
                warning={draft.serviceFee === null ? "Chưa cấu hình" : undefined}
                hint={draft.serviceFee === null ? undefined : "Theo giá phòng / khu trọ"}
                testId="invoice-service-input"
              />
            </div>

            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: radius.md, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>Tổng cộng hóa đơn</span>
              <span data-testid="invoice-total" style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.primary }}>{formatVnd(totalCalc)}</span>
            </div>

            {/* AS-002 — người ở chuyển khoản thẳng cho chủ trọ. Số tiền trên mã QR
                bám theo tổng đang tính. Thiếu STK thì VietQRBlock tự báo chưa cấu hình. */}
            {totalCalc > 0 && (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                <p style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textSecondary, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "center" }}>
                  Mã VietQR của hóa đơn
                </p>
                <VietQRBlock
                  bankCode={property?.bank_name}
                  accountNumber={property?.bank_account_number}
                  accountName={property?.bank_account_name}
                  amount={totalCalc}
                  purpose={`Tien phong ${room.code} ky ${period}`}
                  size={170}
                />
              </div>
            )}
          </>
        )}
      </form>
    </ModalShell>
  );
}
