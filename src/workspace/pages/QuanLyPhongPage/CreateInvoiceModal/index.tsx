import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Eye } from "lucide-react";
import { C, font, radius } from "../../../../shared/theme";
import { Button, HelpLink, ModalShell, Skeleton } from "../../../../shared/components/common";
import { useBreakpoint } from "../../../../shared/components/useBreakpoint";
import { qk } from "../../../../shared/query/keys";
import { toUserMessage } from "../../../../shared/services/supabase-error";
import { addDaysToISODate, formatVnd, toLocalISODate, toLocalPeriod } from "../../../../shared/utils/format";
import type { Property, Room } from "../../../types/room";
import { recordUtilityReading } from "../../../services/billing-service";
import {
  buildDraftInvoiceItems, computeRentAmount, defaultBillingRange, summarizeByCategory, type DraftServiceLine,
} from "../../../services/invoice-calc";
import {
  createInvoiceV2, getCreatedInvoice, getInvoiceFormSources, type CreatedInvoice,
} from "../../../services/invoice-create-service";
import { AdjustmentsSection, signedAdjustment, type AdjustmentRow } from "./AdjustmentsSection";
import { CreatedInvoiceView } from "./CreatedInvoiceView";
import { RentSection } from "./RentSection";
import { SectionCard } from "./SectionCard";
import { ServicesSection, previewServiceLine, type ServiceSelection } from "./ServicesSection";
import { SummaryPanel } from "./SummaryPanel";
import { PreviousInvoicePanel, type CurrentUsage } from "./PreviousInvoicePanel";
import { InvoicePrintModal } from "../../../components/InvoicePrintModal";
import type { InvoiceDocumentData } from "../../../components/InvoiceDocument";

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;
const fieldStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: radius.sm, outline: "none", boxSizing: "border-box", background: C.white };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary };

function Banner({ tone, children, testId }: { tone: "error" | "warning"; children: React.ReactNode; testId?: string }) {
  const isError = tone === "error";
  return (
    <div role={isError ? "alert" : "status"} data-testid={testId} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 14px", borderRadius: radius.sm, fontFamily: font, fontSize: 13, lineHeight: 1.45, background: isError ? C.errorBg : C.warningBg, border: `1px solid ${isError ? C.errorBorder : C.warningBorder}`, color: isError ? C.error : C.textPrimary }}>
      <AlertTriangle size={16} color={isError ? C.error : C.warning} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>{children}</div>
    </div>
  );
}

/**
 * Lập hóa đơn v2 (T41): tiền phòng theo ngày · dịch vụ tick chọn · cộng thêm/giảm trừ · ghi chú,
 * khung "Tạm tính" tách Tiền phòng / Phí dịch vụ / Thu hộ / Điều chỉnh.
 * Mọi con số ở đây là XEM TRƯỚC — RPC `create_invoice_v2` tính lại ở server.
 */
export function CreateInvoiceModal({ room, property, onClose, onSuccess, isReadOnly }: {
  room: Room | null;
  property: Property | null;
  onClose: () => void;
  onSuccess?: () => void;
  isReadOnly?: boolean;
}) {
  const queryClient = useQueryClient();
  const { isMobile } = useBreakpoint();
  const roomId = room?.id ?? "";
  const [period, setPeriod] = useState(() => toLocalPeriod());
  const [dueDate, setDueDate] = useState(() => addDaysToISODate(toLocalISODate(), 5));
  const [billingFrom, setBillingFrom] = useState(() => defaultBillingRange(toLocalPeriod()).from);
  const [billingTo, setBillingTo] = useState(() => defaultBillingRange(toLocalPeriod()).to);
  const [selections, setSelections] = useState<Record<string, ServiceSelection>>({});
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recordingType, setRecordingType] = useState<"Electricity" | "Water" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [created, setCreated] = useState<CreatedInvoice | null>(null);
  /** Đang xem bản in: nháp kỳ này hoặc hóa đơn kỳ trước. Hiện THAY form (không chồng 2 modal). */
  const [printView, setPrintView] = useState<"draft" | "previous" | null>(null);

  const isValidPeriod = PERIOD_PATTERN.test(period);
  const sourcesQuery = useQuery({
    queryKey: qk.billing.invoiceDraft(roomId, period),
    queryFn: () => getInvoiceFormSources(roomId, period),
    enabled: Boolean(roomId) && isValidPeriod,
    staleTime: 0,
  });
  const sources = sourcesQuery.data;

  // Khởi tạo lựa chọn dịch vụ khi dữ liệu về: tick hết, số lượng mặc định.
  // Giữ lựa chọn đã có (ghi chỉ số xong refetch không được xóa số người vừa sửa).
  useEffect(() => {
    if (!sources) return;
    setSelections((current) => {
      const next: Record<string, ServiceSelection> = {};
      for (const service of sources.services) {
        next[service.serviceId] = current[service.serviceId] ?? {
          checked: true,
          quantity: service.quantityBasis === "PerOccupant"
            ? String(sources.occupantCount)
            // Chưa khai xe nào thì để 1 cho chủ trọ tự sửa, không mặc định 0 (sẽ chặn lập).
            : service.quantityBasis === "PerVehicle" ? String(Math.max(sources.vehicleCount, 1)) : "1",
        };
      }
      return next;
    });
  }, [sources]);

  const changePeriod = (value: string) => {
    setPeriod(value);
    if (PERIOD_PATTERN.test(value)) {
      const range = defaultBillingRange(value);
      setBillingFrom(range.from);
      setBillingTo(range.to);
    }
  };

  const preview = useMemo(() => {
    if (!sources?.contract) return null;
    const lines: { fee_category: string; amount: number }[] = [
      { fee_category: "Rent", amount: computeRentAmount(sources.contract.rentPrice, billingFrom, billingTo) },
    ];
    const missingMeters: string[] = [];
    const draftServices: DraftServiceLine[] = [];
    const usage: CurrentUsage[] = [];
    for (const service of sources.services) {
      const selection = selections[service.serviceId];
      const line = previewServiceLine(service, selection, sources.readings);
      const isBilled = Boolean(selection?.checked) && line.amount !== null;
      usage.push({ serviceId: service.serviceId, name: service.name, meterType: service.meterType, unit: service.unit, quantity: isBilled ? line.quantity : null });
      if (!selection?.checked) continue;
      if (line.amount === null) {
        missingMeters.push(service.name);
        continue;
      }
      lines.push({ fee_category: service.feeCategory, amount: line.amount });
      draftServices.push({
        serviceId: service.serviceId, name: service.name, unit: service.unit, feeCategory: service.feeCategory,
        meterType: service.meterType, quantity: line.quantity, unitPrice: line.unitPrice, amount: line.amount,
        reading: line.reading,
      });
    }
    for (const row of adjustments) lines.push({ fee_category: "Adjustment", amount: signedAdjustment(row) });
    return { totals: summarizeByCategory(lines), missingMeters, draftServices, usage };
  }, [sources, selections, adjustments, billingFrom, billingTo]);

  if (!room) return null;
  if (created) return <CreatedInvoiceView invoice={created} room={room} property={property} occupant={sources?.occupant ?? null} onClose={onClose} />;

  const documentBase = {
    propertyName: property?.name ?? "",
    propertyAddress: property?.address,
    roomCode: room.code,
    occupant: sources?.occupant ?? null,
    bankCode: property?.bank_name,
    accountNumber: property?.bank_account_number,
    accountName: property?.bank_account_name,
  };
  if (printView === "previous" && sources?.previousInvoice) {
    const prev = sources.previousInvoice;
    return (
      <InvoicePrintModal
        closeLabel="Quay lại lập hóa đơn"
        onClose={() => setPrintView(null)}
        data={{ ...documentBase, period: prev.period, billingFrom: prev.billingFrom, billingTo: prev.billingTo, dueDate: prev.dueDate, issuedAt: prev.createdAt, items: prev.items, totalAmount: prev.totalAmount, paidAmount: prev.paidAmount, note: prev.note }}
      />
    );
  }
  if (printView === "draft" && sources?.contract && preview) {
    const draft: InvoiceDocumentData = {
      ...documentBase,
      isDraft: true,
      period,
      billingFrom,
      billingTo,
      dueDate,
      items: buildDraftInvoiceItems({
        rentPrice: sources.contract.rentPrice,
        billingFrom,
        billingTo,
        services: preview.draftServices,
        adjustments: adjustments.map((row) => ({ reason: row.reason, amount: signedAdjustment(row) })),
      }),
      totalAmount: preview.totals.total,
      note,
    };
    return <InvoicePrintModal data={draft} closeLabel="Quay lại chỉnh sửa" onClose={() => setPrintView(null)} />;
  }

  const invalidQuantity = sources?.services.some((s) => s.quantityBasis !== "Meter" && selections[s.serviceId]?.checked && !(Number(selections[s.serviceId]?.quantity) > 0)) ?? false;
  const invalidAdjustment = adjustments.some((row) => !row.reason.trim() || !(Number(row.amount) > 0));
  const invalidRange = !billingFrom || !billingTo || billingFrom > billingTo;
  const blockers = [
    !sources?.contract && "Phòng chưa có hợp đồng đang hiệu lực.",
    invalidRange && "Khoảng ngày tính tiền chưa hợp lệ.",
    preview && preview.missingMeters.length > 0 && `Chưa ghi chỉ số kỳ này: ${preview.missingMeters.join(", ")} — ghi chỉ số hoặc bỏ chọn.`,
    invalidQuantity && "Số lượng dịch vụ đã chọn phải lớn hơn 0.",
    invalidAdjustment && "Mỗi dòng cộng thêm / giảm trừ cần lý do và số tiền.",
    preview && preview.totals.total < 0 && "Tổng hóa đơn đang âm.",
    !dueDate && "Chưa chọn hạn thanh toán.",
  ].filter((item): item is string => typeof item === "string");
  const canSubmit = Boolean(sources && preview) && blockers.length === 0 && !submitting && !isReadOnly;

  const recordReading = async (type: "Electricity" | "Water", currentReading: number) => {
    setErrorMsg("");
    setRecordingType(type);
    try {
      await recordUtilityReading(roomId, type, period, currentReading);
      await queryClient.invalidateQueries({ queryKey: qk.billing.all });
    } catch (err) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setRecordingType(null);
    }
  };

  const submit = async () => {
    if (!canSubmit || !sources) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const invoiceId = await createInvoiceV2({
        roomId,
        period,
        dueDate,
        billingFrom,
        billingTo,
        services: sources.services
          .filter((s) => selections[s.serviceId]?.checked)
          .map((s) => ({ serviceId: s.serviceId, quantity: s.quantityBasis === "Meter" ? 1 : Number(selections[s.serviceId]?.quantity) })),
        adjustments: adjustments.map((row) => ({ reason: row.reason, amount: signedAdjustment(row) })),
        note,
      });
      await queryClient.invalidateQueries({ queryKey: qk.billing.all });
      onSuccess?.();
      setCreated(await getCreatedInvoice(invoiceId));
    } catch (err) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>Đóng</Button>
      <Button variant="outline" icon={<Eye size={16} />} disabled={!sources?.contract || !preview || invalidRange} onClick={() => setPrintView("draft")} data-testid="invoice-preview-btn">
        Xem trước
      </Button>
      <Button variant="primary" requiresWrite disabled={!canSubmit} loading={submitting} onClick={() => void submit()} data-testid="create-invoice-btn">
        {submitting ? "Đang lập..." : `Lập hóa đơn${preview ? ` · ${formatVnd(preview.totals.total)}` : ""}`}
      </Button>
    </>
  );

  return (
    <ModalShell title={`Lập hóa đơn · Phòng ${room.code}`} size="xl" onClose={onClose} footer={footer}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -6 }}>
          <HelpLink anchor="lap-hoa-don" label="Hướng dẫn lập hóa đơn (mở tab mới)" text="Hướng dẫn lập hóa đơn" data-testid="invoice-help-link" />
        </div>
        {errorMsg && <Banner tone="error" testId="invoice-form-error">{errorMsg}</Banner>}
        {sources && sources.outstandingDebt > 0 && (
          <Banner tone="warning" testId="invoice-debt-banner">
            Phòng còn nợ <strong style={{ color: C.error }}>{formatVnd(sources.outstandingDebt)}</strong> từ hóa đơn trước. Bạn vẫn có thể lập hóa đơn kỳ này.
          </Banner>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 300px", gap: 14, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionCard title="Kỳ hóa đơn">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <label style={labelStyle}>
                  Tháng lập phiếu *
                  <input type="month" value={period} onChange={(e) => changePeriod(e.target.value)} style={fieldStyle} data-testid="invoice-period" />
                </label>
                <label style={labelStyle}>
                  Hạn đóng tiền *
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={fieldStyle} data-testid="invoice-due-date" />
                </label>
              </div>
            </SectionCard>

            {!isValidPeriod && <Banner tone="warning">Vui lòng chọn tháng lập phiếu.</Banner>}
            {isValidPeriod && sourcesQuery.isPending && <Skeleton variant="row" count={5} label="Đang tải dữ liệu lập hóa đơn" />}
            {sourcesQuery.isError && (
              <Banner tone="error" testId="invoice-draft-error">
                Không tải được dữ liệu để lập hóa đơn. {toUserMessage(sourcesQuery.error)}{" "}
                <Button size="sm" variant="outline" onClick={() => void sourcesQuery.refetch()}>Thử lại</Button>
              </Banner>
            )}
            {sources && !sources.contract && (
              <Banner tone="warning" testId="invoice-no-contract">
                <strong>Phòng chưa có hợp đồng đang hiệu lực.</strong> Hãy thêm người ở và hợp đồng trước khi lập hóa đơn.
              </Banner>
            )}

            {sources?.contract && (
              <>
                <RentSection
                  rentPrice={sources.contract.rentPrice}
                  contractStart={sources.contract.startDate}
                  billingFrom={billingFrom}
                  billingTo={billingTo}
                  onChangeFrom={setBillingFrom}
                  onChangeTo={setBillingTo}
                />
                <ServicesSection
                  services={sources.services}
                  readings={sources.readings}
                  selections={selections}
                  onToggle={(id, checked) => setSelections((cur) => ({ ...cur, [id]: { quantity: cur[id]?.quantity ?? "1", checked } }))}
                  onQuantity={(id, quantity) => setSelections((cur) => ({ ...cur, [id]: { checked: cur[id]?.checked ?? true, quantity } }))}
                  onRecordReading={(type, value) => void recordReading(type, value)}
                  recordingType={recordingType}
                  isReadOnly={Boolean(isReadOnly)}
                />
                <AdjustmentsSection rows={adjustments} onChange={setAdjustments} />
                <SectionCard title="Ghi chú" subtitle="In trên hóa đơn gửi người ở.">
                  <textarea
                    value={note}
                    maxLength={255}
                    rows={3}
                    placeholder="Ghi chú hóa đơn"
                    onChange={(e) => setNote(e.target.value)}
                    style={{ ...fieldStyle, resize: "vertical" }}
                    data-testid="invoice-note"
                  />
                  <div style={{ textAlign: "right", fontFamily: font, fontSize: 11.5, color: C.textSecondary }}>{note.length}/255</div>
                </SectionCard>
              </>
            )}
          </div>

          {preview && (
            <div style={isMobile ? undefined : { position: "sticky", top: 0 }}>
              <SummaryPanel totals={preview.totals} period={period} billingFrom={billingFrom} billingTo={billingTo} dueDate={dueDate} />
              <div style={{ marginTop: 12 }}>
                <PreviousInvoicePanel previous={sources?.previousInvoice ?? null} current={preview.usage} onViewPrint={() => setPrintView("previous")} />
              </div>
              {blockers.length > 0 && (
                <ul data-testid="invoice-blockers" style={{ margin: "10px 0 0", paddingLeft: 18, fontFamily: font, fontSize: 12.5, color: C.warning, lineHeight: 1.5 }}>
                  {blockers.map((b) => <li key={b}>{b}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
