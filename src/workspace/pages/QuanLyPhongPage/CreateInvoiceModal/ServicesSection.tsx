import { useState } from "react";
import { C, font, radius } from "../../../../shared/theme";
import { Button } from "../../../../shared/components/common";
import { formatVnd } from "../../../../shared/utils/format";
import { FEE_CATEGORY_META } from "../../../../shared/utils/statusMaps";
import type { InvoiceFormReading, InvoiceFormService } from "../../../services/invoice-create-service";
import { SectionCard } from "./SectionCard";

export interface ServiceSelection {
  checked: boolean;
  /** Chuỗi số người dùng gõ; khoản theo đồng hồ bỏ qua. */
  quantity: string;
}

export interface ServiceLinePreview {
  service: InvoiceFormService;
  reading: InvoiceFormReading | null;
  quantity: number;
  unitPrice: number;
  /** null = đồng hồ chưa ghi chỉ số kỳ này. */
  amount: number | null;
}

/** Xem trước một dòng dịch vụ — server tính lại y hệt trong `create_invoice_v2`. */
export function previewServiceLine(
  service: InvoiceFormService,
  selection: ServiceSelection | undefined,
  readings: Partial<Record<"Electricity" | "Water", InvoiceFormReading>>,
): ServiceLinePreview {
  if (service.quantityBasis === "Meter" && service.meterType) {
    const reading = readings[service.meterType] ?? null;
    if (!reading) return { service, reading: null, quantity: 0, unitPrice: service.unitPrice, amount: null };
    const quantity = Math.max(reading.currentReading - reading.previousReading, 0);
    return { service, reading, quantity, unitPrice: reading.unitPrice, amount: Math.round(quantity * reading.unitPrice) };
  }
  const quantity = Number(selection?.quantity) || 0;
  return { service, reading: null, quantity, unitPrice: service.unitPrice, amount: Math.round(quantity * service.unitPrice) };
}

const numberInput: React.CSSProperties = {
  width: 72, padding: "8px 10px", fontFamily: font, fontSize: 14, color: C.textPrimary,
  border: `1px solid ${C.border}`, borderRadius: radius.sm, outline: "none", textAlign: "right", background: C.white,
};

export function ServicesSection({
  services, readings, selections, onToggle, onQuantity, onRecordReading, recordingType, isReadOnly,
}: {
  services: InvoiceFormService[];
  readings: Partial<Record<"Electricity" | "Water", InvoiceFormReading>>;
  selections: Record<string, ServiceSelection>;
  onToggle: (serviceId: string, checked: boolean) => void;
  onQuantity: (serviceId: string, quantity: string) => void;
  onRecordReading: (type: "Electricity" | "Water", currentReading: number) => void;
  recordingType: "Electricity" | "Water" | null;
  isReadOnly: boolean;
}) {
  const [newReadings, setNewReadings] = useState<Record<string, string>>({});

  return (
    <SectionCard title="Dịch vụ" subtitle="Tick các khoản thu kỳ này. Đơn giá lấy theo tab Dịch vụ & phí (giá riêng của phòng nếu có).">
      {services.length === 0 ? (
        <p style={{ margin: 0, fontFamily: font, fontSize: 13, color: C.textSecondary }}>Phòng chưa áp dụng dịch vụ nào.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {services.map((service) => {
            const selection = selections[service.serviceId];
            const line = previewServiceLine(service, selection, readings);
            const meta = FEE_CATEGORY_META[service.feeCategory];
            const checked = Boolean(selection?.checked);
            const isMeter = service.quantityBasis === "Meter" && service.meterType;
            return (
              <div key={service.serviceId} data-testid={`invoice-service-${service.name}`} style={{ border: `1px solid ${checked ? C.successBorder : C.border}`, background: checked ? C.successBg : C.white, borderRadius: radius.sm, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", flex: "1 1 200px", cursor: "pointer", fontFamily: font }}>
                  <input type="checkbox" checked={checked} onChange={(e) => onToggle(service.serviceId, e.target.checked)} style={{ marginTop: 3 }} data-testid={`invoice-service-toggle-${service.name}`} />
                  <span>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.textPrimary }}>
                      {service.name}{" "}
                      <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, borderRadius: 999, padding: "1px 7px" }}>{meta.label}</span>
                    </span>
                    <span style={{ display: "block", fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                      {isMeter && line.reading
                        ? `Chỉ số ${line.reading.previousReading.toLocaleString("vi-VN")} → ${line.reading.currentReading.toLocaleString("vi-VN")} = ${line.quantity.toLocaleString("vi-VN")} ${service.unit} × ${formatVnd(line.unitPrice)}`
                        : `${formatVnd(line.unitPrice)} / ${service.unit}`}
                    </span>
                  </span>
                </label>

                {isMeter ? (
                  line.reading ? (
                    <strong style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, marginLeft: "auto" }}>{formatVnd(line.amount)}</strong>
                  ) : (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: font, fontSize: 12, color: C.warning, fontWeight: 700 }}>Chưa ghi chỉ số kỳ này</span>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        placeholder="Số mới"
                        aria-label={`Chỉ số mới ${service.name}`}
                        value={newReadings[service.serviceId] ?? ""}
                        onChange={(e) => setNewReadings((cur) => ({ ...cur, [service.serviceId]: e.target.value }))}
                        style={{ ...numberInput, width: 96 }}
                        data-testid={`invoice-reading-input-${service.meterType}`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        requiresWrite
                        disabled={isReadOnly || (newReadings[service.serviceId] ?? "") === ""}
                        loading={recordingType === service.meterType}
                        onClick={() => onRecordReading(service.meterType as "Electricity" | "Water", Number(newReadings[service.serviceId]))}
                        data-testid={`invoice-reading-save-${service.meterType}`}
                      >
                        Lưu chỉ số
                      </Button>
                    </div>
                  )
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      aria-label={`Số lượng ${service.name}`}
                      disabled={!checked}
                      value={selection?.quantity ?? ""}
                      onChange={(e) => onQuantity(service.serviceId, e.target.value)}
                      style={numberInput}
                      data-testid={`invoice-service-qty-${service.name}`}
                    />
                    <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, minWidth: 44 }}>{service.unit}</span>
                    <strong style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, minWidth: 90, textAlign: "right" }}>{formatVnd(line.amount)}</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
