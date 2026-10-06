import { useState, useEffect, useCallback } from "react";
import { C, font } from "../../../shared/theme";
import { ModalShell } from "../../../shared/components/common/ModalShell";
import { Skeleton } from "../../../shared/components/common";
import { logError, toUserMessage } from "../../../shared/services/supabase-error";
import { useCanWrite, useWriteBlockReason } from "../../../shared/contexts/SubscriptionContext";
import { formatPeriod, formatVnd, toLocalPeriod } from "../../../shared/utils/format";
import { recordUtilityReading } from "../../services/billing-service";
import { getPreviousReadingsOrThrow, type PreviousReadings } from "../../services/billing-service";
import { PrimaryBtn, GhostBtn } from "./atoms";

/**
 * Ghi nhanh chỉ số điện + nước cho một phòng.
 *
 * BR-015: modal TỰ đọc `useCanWrite()` thay vì nhận prop `isReadOnly`. Trước
 * đây trạng thái khóa được truyền xuống bằng prop — nghĩa là chỗ nào quên
 * truyền thì modal mở khóa, và không có gì báo. Tự đọc thì không thể quên.
 *
 * Danh sách phòng nhận từ dashboard (đã tải bằng bản `OrThrow`, có màn lỗi riêng)
 * thay vì tự fetch lại bằng `getRoomsByProperty` — hàm đó nuốt lỗi và trả `[]`,
 * làm "đọc lỗi" trông y như "khu chưa có phòng".
 *
 * Đơn giá chỉ để XEM TRƯỚC; `unit_price` thật do RPC `record_utility_reading`
 * derive server-side (§6.1). Chưa cấu hình đơn giá thì KHÔNG bịa số để xem trước.
 */

type ModalProperty = { id: string; name: string; electricity_unit_price?: number | null; water_unit_price?: number | null };
type ModalRoom = { id: string; property_id: string; room_code?: string | null; electricity_price?: number | null; water_price?: number | null };

type PreviousState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; readings: PreviousReadings };

const inputStyle = {
  fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`,
  borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none", boxSizing: "border-box" as const,
};
const labelStyle = { fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary };

/** Đơn giá > 0 mới coi là đã cấu hình; ưu tiên giá riêng của phòng như RPC. */
function pickUnitPrice(roomPrice: unknown, propertyPrice: unknown): number | null {
  for (const candidate of [roomPrice, propertyPrice]) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

/** "" → null (chưa nhập); không phải số hữu hạn ≥ 0 → NaN (nhập sai). */
function parseReading(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : Number.NaN;
}

export function UtilityModal({ onClose, properties, rooms, onSaved }: {
  onClose: () => void;
  properties: ModalProperty[];
  rooms: ModalRoom[];
  /** Gọi sau khi lưu thành công — parent đóng modal, báo thành công và tải lại. */
  onSaved: () => void;
}) {
  const canWrite = useCanWrite();
  const blockReason = useWriteBlockReason();

  const [propId, setPropId] = useState(properties[0]?.id ?? "");
  const propertyRooms = rooms.filter(r => r.property_id === propId);
  const [roomId, setRoomId] = useState(propertyRooms[0]?.id ?? "");
  const [electric, setElectric] = useState("");
  const [water, setWater] = useState("");
  const [saving, setSaving] = useState(false);
  const [previous, setPrevious] = useState<PreviousState>({ kind: "idle" });
  const [formError, setFormError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const period = toLocalPeriod();
  const selectedProp = properties.find(p => p.id === propId);
  const selectedRoom = rooms.find(r => r.id === roomId);
  const elecPrice = pickUnitPrice(selectedRoom?.electricity_price, selectedProp?.electricity_unit_price);
  const waterPrice = pickUnitPrice(selectedRoom?.water_price, selectedProp?.water_unit_price);

  const handlePropertyChange = (nextPropId: string) => {
    setPropId(nextPropId);
    setRoomId(rooms.find(r => r.property_id === nextPropId)?.id ?? "");
  };

  // Đổi phòng ⇒ xóa số đã gõ (số của phòng trước không được lưu nhầm sang phòng
  // này) và tải lại chỉ số cũ. `isStale` bỏ qua kết quả về muộn của phòng trước.
  useEffect(() => {
    setElectric("");
    setWater("");
    setFormError("");
    if (!roomId) {
      setPrevious({ kind: "idle" });
      return;
    }
    let isStale = false;
    setPrevious({ kind: "loading" });
    const loadPrevious = async () => {
      try {
        const readings = await getPreviousReadingsOrThrow(roomId);
        if (!isStale) setPrevious({ kind: "ready", readings });
      } catch (e) {
        logError("ChuTroDashboardPage.UtilityModal.loadPrevious", e);
        if (!isStale) setPrevious({ kind: "error" });
      }
    };
    void loadPrevious();
    return () => { isStale = true; };
  }, [roomId, reloadToken]);

  const retryPrevious = useCallback(() => setReloadToken(t => t + 1), []);

  const readings = previous.kind === "ready" ? previous.readings : null;
  const elecValue = parseReading(electric);
  const waterValue = parseReading(water);

  const fieldError = (value: number | null, previousValue: number | undefined): string => {
    if (value === null) return "";
    if (Number.isNaN(value)) return "Vui lòng nhập số hợp lệ (không âm).";
    if (previousValue !== undefined && value < previousValue) {
      return `Chỉ số mới phải ≥ chỉ số cũ (${previousValue.toLocaleString("vi-VN")}).`;
    }
    return "";
  };
  const elecError = fieldError(elecValue, readings?.electricity);
  const waterError = fieldError(waterValue, readings?.water);

  const canSave = canWrite && !saving && !!roomId && readings !== null
    && elecValue !== null && waterValue !== null && !elecError && !waterError;

  const handleSave = async () => {
    if (!canSave || elecValue === null || waterValue === null) return;
    setFormError("");
    try {
      setSaving(true);
      await recordUtilityReading(roomId, "Electricity", period, elecValue);
      await recordUtilityReading(roomId, "Water", period, waterValue);
      onSaved();
    } catch (err: unknown) {
      logError("ChuTroDashboardPage.UtilityModal.handleSave", err);
      setFormError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const renderPreview = (value: number | null, previousValue: number, unitPrice: number | null, unit: string, hasError: boolean) => {
    if (value === null || hasError) return null;
    const usage = value - previousValue;
    return (
      <p style={{ fontFamily: font, fontSize: 11.5, color: C.primary, margin: "4px 0 0", fontWeight: 600 }}>
        Tiêu thụ: {usage.toLocaleString("vi-VN")} {unit}
        {unitPrice !== null ? ` × ${formatVnd(unitPrice)} = ${formatVnd(usage * unitPrice)}` : ""}
      </p>
    );
  };

  const renderReadingField = (opts: {
    label: string; unit: string; value: string; onChange: (v: string) => void; error: string;
    parsed: number | null; previousValue: number; unitPrice: number | null; testId: string;
  }) => (
    <div style={{ flex: "1 1 200px", minWidth: 0 }}>
      <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "0 0 6px" }}>
        {opts.label} cũ: <strong>{opts.previousValue.toLocaleString("vi-VN")} {opts.unit}</strong>
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelStyle}>{opts.label} mới *</span>
        <input
          inputMode="numeric"
          data-testid={opts.testId}
          value={opts.value}
          onChange={e => opts.onChange(e.target.value)}
          placeholder={`VD: ${opts.previousValue + 10}`}
          aria-invalid={opts.error ? true : undefined}
          style={{ ...inputStyle, borderColor: opts.error ? C.error : C.border }}
        />
      </label>
      {opts.error
        ? <p role="alert" style={{ fontFamily: font, fontSize: 11.5, color: C.error, margin: "4px 0 0", fontWeight: 600 }}>{opts.error}</p>
        : renderPreview(opts.parsed, opts.previousValue, opts.unitPrice, opts.unit, false)}
      <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: "4px 0 0" }}>
        Đơn giá: {opts.unitPrice !== null ? `${formatVnd(opts.unitPrice)}/${opts.unit}` : "Chưa cấu hình đơn giá"}
      </p>
    </div>
  );

  return (
    <ModalShell title="Ghi điện nước nhanh" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn disabled={!canSave} requiresWrite onClick={handleSave} data-testid="utility-save-btn">{saving ? "Đang lưu..." : "Lưu chỉ số"}</PrimaryBtn></>}>
      {!canWrite && (
        <div data-testid="utility-readonly-banner" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.repairing, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          {blockReason}
        </div>
      )}
      {formError && (
        <div data-testid="utility-form-error" role="alert" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {formError}
        </div>
      )}
      <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: "0 0 12px" }}>
        Kỳ ghi chỉ số: <strong style={{ color: C.textPrimary }}>{formatPeriod(period)}</strong>
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={labelStyle}>Chọn khu trọ *</span>
          <select value={propId} onChange={e => handlePropertyChange(e.target.value)} style={inputStyle}>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={labelStyle}>Chọn phòng *</span>
          <select value={roomId} onChange={e => setRoomId(e.target.value)} disabled={propertyRooms.length === 0} style={inputStyle}>
            {propertyRooms.length === 0 && <option value="">Khu này chưa có phòng nào</option>}
            {propertyRooms.map(r => <option key={r.id} value={r.id}>{r.room_code || "Phòng chưa đặt mã"}</option>)}
          </select>
        </label>
      </div>

      {roomId && previous.kind === "loading" && (
        <Skeleton variant="text" count={2} label="Đang tải chỉ số cũ" style={{ margin: "0 0 16px" }} />
      )}

      {roomId && previous.kind === "error" && (
        <div role="alert" data-testid="utility-previous-error" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontFamily: font, fontSize: 13, color: C.error, fontWeight: 600 }}>Chưa tải được chỉ số cũ của phòng này, nên tạm chưa thể lưu.</span>
          <GhostBtn small onClick={retryPrevious}>Thử lại</GhostBtn>
        </div>
      )}

      {roomId && readings && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          {renderReadingField({
            label: "Chỉ số điện", unit: "kWh", value: electric, onChange: setElectric, error: elecError,
            parsed: elecValue, previousValue: readings.electricity, unitPrice: elecPrice, testId: "utility-elec-input",
          })}
          {renderReadingField({
            label: "Chỉ số nước", unit: "m³", value: water, onChange: setWater, error: waterError,
            parsed: waterValue, previousValue: readings.water, unitPrice: waterPrice, testId: "utility-water-input",
          })}
        </div>
      )}
    </ModalShell>
  );
}
