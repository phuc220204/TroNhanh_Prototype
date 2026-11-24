import { useMemo, useState } from "react";
import { C, font, radius } from "../../../../shared/theme";
import { Button, Field, ModalShell, MoneyInput } from "../../../../shared/components/common";
import { FEE_CATEGORY_META, QUANTITY_BASIS_META } from "../../../../shared/utils/statusMaps";
import type {
  FeeCategory, MeterType, PropertyService, PropertyServiceInput, QuantityBasis,
} from "../../../services/property-services-service";
import type { Room } from "../../../types/room";
import { ChoiceCard, SectionTitle } from "./ChoiceCard";
import { RoomPicker } from "./RoomPicker";

const UNIT_PRESETS = ["kWh", "m³", "Người", "Tháng", "Phòng", "Xe"];
const METER_UNIT: Record<MeterType, string> = { Electricity: "kWh", Water: "m³" };

interface ServiceFormModalProps {
  propertyId: string;
  rooms: Room[];
  /** `null` = tạo mới. */
  service: PropertyService | null;
  /** Dịch vụ theo đồng hồ đã có của khu (mỗi loại tối đa 1). */
  usedMeterTypes: MeterType[];
  submitting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onSubmit: (input: PropertyServiceInput) => void;
}

/**
 * Tạo / sửa một dịch vụ của khu. Server (`upsert_property_service`) kiểm lại
 * mọi ràng buộc — các nhánh kiểm ở đây chỉ để báo lỗi sớm.
 */
export function ServiceFormModal({
  propertyId, rooms, service, usedMeterTypes, submitting, errorMessage, onCancel, onSubmit,
}: ServiceFormModalProps) {
  const [name, setName] = useState(service?.name ?? "");
  const [unit, setUnit] = useState(service?.unit ?? "Tháng");
  const [feeCategory, setFeeCategory] = useState<FeeCategory>(service?.feeCategory ?? "Service");
  const [basis, setBasis] = useState<QuantityBasis>(service?.quantityBasis ?? "Fixed");
  const [meterType, setMeterType] = useState<MeterType | null>(service?.meterType ?? null);
  const [price, setPrice] = useState(service ? String(service.unitPrice) : "");
  const [applyToNewRooms, setApplyToNewRooms] = useState(service?.applyToNewRooms ?? true);
  const [roomIds, setRoomIds] = useState<string[]>(
    () => (service ? service.rooms.map((r) => r.roomId) : rooms.map((r) => r.id)),
  );

  // Loại đồng hồ còn trống (đang sửa thì tính cả loại của chính nó).
  const availableMeters = useMemo(
    () => (["Electricity", "Water"] as MeterType[]).filter((m) => m === service?.meterType || !usedMeterTypes.includes(m)),
    [service?.meterType, usedMeterTypes],
  );

  const chooseBasis = (next: QuantityBasis) => {
    setBasis(next);
    if (next === "Meter") {
      const meter = meterType && availableMeters.includes(meterType) ? meterType : availableMeters[0] ?? null;
      setMeterType(meter);
      if (meter) setUnit(METER_UNIT[meter]);
    } else {
      setMeterType(null);
      if (next === "PerOccupant") setUnit("Người");
    }
  };

  const nameMissing = name.trim() === "";
  const unitMissing = unit.trim() === "";
  const priceMissing = price === "";
  const meterMissing = basis === "Meter" && !meterType;
  const canSubmit = !nameMissing && !unitMissing && !priceMissing && !meterMissing;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      id: service?.id ?? null,
      propertyId,
      name: name.trim(),
      unit: unit.trim(),
      feeCategory,
      quantityBasis: basis,
      meterType: basis === "Meter" ? meterType : null,
      unitPrice: Number(price),
      applyToNewRooms,
      roomIds,
    });
  };

  return (
    <ModalShell
      title={service ? `Sửa dịch vụ · ${service.name}` : "Thêm dịch vụ"}
      size="lg"
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Đóng</Button>
          <Button variant="primary" requiresWrite loading={submitting} disabled={!canSubmit} onClick={submit} data-testid="service-form-submit">
            {service ? "Lưu dịch vụ" : "Thêm dịch vụ"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {errorMessage && (
          <div role="alert" data-testid="service-form-error" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error, borderRadius: radius.sm, padding: "10px 14px", fontFamily: font, fontSize: 13, fontWeight: 600 }}>
            {errorMessage}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 12 }}>
          <Field label="Tên dịch vụ *" value={name} onChange={setName} placeholder="VD: Tiền wifi, Tiền rác, Phí quản lý" data-testid="service-name-input" />
          <Field label="Đơn vị *" value={unit} onChange={setUnit} placeholder="Tháng" data-testid="service-unit-input" />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -8 }}>
          {UNIT_PRESETS.map((preset) => (
            <button key={preset} type="button" onClick={() => setUnit(preset)} style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${unit === preset ? C.primary : C.border}`, background: unit === preset ? C.cream : C.white, color: C.textPrimary, fontFamily: font, fontSize: 12, cursor: "pointer" }}>
              {preset}
            </button>
          ))}
        </div>

        <div>
          <SectionTitle title="Loại khoản thu" subtitle="Tách doanh thu của bạn với tiền thu hộ bên thứ 3 khi kê khai. Trọ Nhanh không tư vấn thuế." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            {(["Service", "PassThrough"] as FeeCategory[]).map((key) => (
              <ChoiceCard
                key={key}
                selected={feeCategory === key}
                onSelect={() => setFeeCategory(key)}
                title={FEE_CATEGORY_META[key].label}
                description={key === "Service"
                  ? "Doanh thu của bạn: wifi bạn lắp, phí quản lý, dọn vệ sinh…"
                  : "Thu giúp bên thứ 3, không phải doanh thu: rác, giữ xe bãi ngoài, điện/nước thu đúng giá gốc."}
                data-testid={`service-category-${key}`}
              />
            ))}
          </div>
        </div>

        <div>
          <SectionTitle title="Cách tính" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {(["Fixed", "PerOccupant", "Meter"] as QuantityBasis[]).map((key) => (
              <ChoiceCard
                key={key}
                selected={basis === key}
                disabled={key === "Meter" && availableMeters.length === 0}
                onSelect={() => chooseBasis(key)}
                title={QUANTITY_BASIS_META[key].label}
                description={key === "Meter" && availableMeters.length === 0
                  ? "Khu đã có dịch vụ đồng hồ điện và nước."
                  : QUANTITY_BASIS_META[key].description}
                data-testid={`service-basis-${key}`}
              />
            ))}
          </div>
          {basis === "Meter" && (
            <div role="radiogroup" aria-label="Loại đồng hồ" style={{ display: "flex", gap: 16, marginTop: 10, fontFamily: font, fontSize: 13.5, color: C.textPrimary }}>
              {availableMeters.map((m) => (
                <label key={m} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="radio" name="meter-type" checked={meterType === m} onChange={() => { setMeterType(m); setUnit(METER_UNIT[m]); }} data-testid={`service-meter-${m}`} />
                  {m === "Electricity" ? "Đồng hồ điện" : "Đồng hồ nước"}
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionTitle title="Đơn giá *" />
          <MoneyInput value={price} onChange={setPrice} suffix={`đ / ${unit.trim() || "đơn vị"}`} placeholder="0" data-testid="service-price-input" />
        </div>

        <div>
          <SectionTitle title="Áp dụng cho phòng" subtitle="Bỏ chọn phòng không dùng dịch vụ này (ví dụ phòng tự lắp wifi)." />
          <RoomPicker rooms={rooms} selectedIds={roomIds} onChange={setRoomIds} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontFamily: font, fontSize: 13, color: C.textPrimary, cursor: "pointer" }}>
            <input type="checkbox" checked={applyToNewRooms} onChange={(e) => setApplyToNewRooms(e.target.checked)} data-testid="service-apply-new-rooms" />
            Tự áp dụng cho phòng tạo sau này
          </label>
        </div>
      </div>
    </ModalShell>
  );
}
