import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { Button, ModalShell } from "../../../shared/components/common";
import type { Room } from "../../types/room";
import { getLatestReadingOrThrow, recordUtilityReading } from "../../services/billing-service";
import { toUserMessage } from "../../../shared/services/supabase-error";
import { qk } from "../../../shared/query/keys";
import { formatPeriod, toLocalPeriod } from "../../../shared/utils/format";

interface UtilityReadingFormProps {
  room: Room | null;
  onClose: () => void;
  onSuccess?: () => void;
  isReadOnly?: boolean;
}

type ReadingType = "Electricity" | "Water";

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

const labelStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 8, fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: radius.sm, outline: "none", boxSizing: "border-box", background: C.white, color: C.textPrimary };
const fieldErrorStyle: React.CSSProperties = { fontFamily: font, fontSize: 12, color: C.error, margin: "4px 0 0", fontWeight: 600 };
const hintStyle: React.CSSProperties = { fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "4px 0 0", lineHeight: 1.4 };

const formatNumber = (value: number) => value.toLocaleString("vi-VN");

/** Lỗi inline: chỉ số mới phải ≥ chỉ số kỳ trước (server cũng chặn — READING_LOWER_THAN_PREVIOUS). */
function getReadingError(label: string, input: string, previous: number | null): string | null {
  if (!input) return null;
  const value = Number(input);
  if (!Number.isFinite(value) || value < 0) return `${label} không hợp lệ.`;
  if (previous !== null && value < previous) {
    return `${label} mới (${formatNumber(value)}) thấp hơn chỉ số kỳ trước (${formatNumber(previous)}).`;
  }
  return null;
}

function useLatestReading(roomId: string, type: ReadingType) {
  return useQuery({
    queryKey: qk.billing.latestReading(roomId, type),
    queryFn: () => getLatestReadingOrThrow(roomId, type),
    enabled: Boolean(roomId),
  });
}

export function UtilityReadingForm({ room, onClose, onSuccess, isReadOnly }: UtilityReadingFormProps) {
  const roomId = room?.id ?? "";
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(() => toLocalPeriod());
  const [elecValue, setElecValue] = useState("");
  const [waterValue, setWaterValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const elecQuery = useLatestReading(roomId, "Electricity");
  const waterQuery = useLatestReading(roomId, "Water");

  // Guard SAU mọi hook (Rules of Hooks).
  if (!room) return null;

  const isLoadingPrevious = elecQuery.isPending || waterQuery.isPending || elecQuery.isFetching || waterQuery.isFetching;
  const isPreviousError = elecQuery.isError || waterQuery.isError;
  const lastElec = elecQuery.data ? elecQuery.data.current_reading : null;
  const lastWater = waterQuery.data ? waterQuery.data.current_reading : null;

  const elecError = getReadingError("Chỉ số điện", elecValue, lastElec);
  const waterError = getReadingError("Chỉ số nước", waterValue, lastWater);
  const isPeriodValid = PERIOD_PATTERN.test(period);
  // Không biết mốc kỳ trước thì không cho lưu: lưu mù dễ ghi sai mà không hay.
  const isSaveBlocked = loading || isLoadingPrevious || isPreviousError || Boolean(isReadOnly);

  const retryPrevious = () => {
    void elecQuery.refetch();
    void waterQuery.refetch();
  };

  const handleSubmit = async () => {
    if (isSaveBlocked) return;
    if (!isPeriodValid) {
      setErrorMsg("Vui lòng chọn kỳ ghi chỉ số.");
      return;
    }
    if (!elecValue && !waterValue) {
      setErrorMsg("Vui lòng nhập ít nhất chỉ số điện hoặc chỉ số nước.");
      return;
    }
    if (elecError || waterError) {
      setErrorMsg([elecError, waterError].filter(Boolean).join(" "));
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      if (elecValue) await recordUtilityReading(room.id, "Electricity", period, Number(elecValue));
      if (waterValue) await recordUtilityReading(room.id, "Water", period, Number(waterValue));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.billing.latestReading(room.id, "Electricity") }),
        queryClient.invalidateQueries({ queryKey: qk.billing.latestReading(room.id, "Water") }),
      ]);
      onSuccess?.();
      onClose();
    } catch (err) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const renderPreviousHint = (last: { period: string; current_reading: number } | null | undefined) => {
    if (isLoadingPrevious || isPreviousError) return null;
    if (!last) return <p style={hintStyle}>Chưa có chỉ số kỳ trước — tính từ 0.</p>;
    if (last.period === period) {
      return <p style={hintStyle}>{formatPeriod(period)} đã ghi {formatNumber(last.current_reading)}; lưu lại sẽ ghi đè.</p>;
    }
    return null;
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>Hủy</Button>
      <Button
        variant="primary"
        requiresWrite
        disabled={isSaveBlocked}
        loading={loading}
        onClick={() => void handleSubmit()}
        data-testid="utility-save-btn"
      >
        {loading ? "Đang lưu..." : "Lưu chỉ số"}
      </Button>
    </>
  );

  return (
    <ModalShell title={`Ghi chỉ số điện nước - Phòng ${room.code}`} onClose={onClose} footer={footer}>
      {errorMsg && (
        <div data-testid="utility-form-error" role="alert" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error, padding: "10px 14px", borderRadius: radius.sm, fontSize: 13, fontFamily: font, display: "flex", alignItems: "flex-start", gap: 6, lineHeight: 1.45 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          {errorMsg}
        </div>
      )}

      {isPreviousError && (
        <div data-testid="utility-previous-error" role="alert" style={{ background: C.warningBg, border: `1px solid ${C.warningBorder}`, color: C.textPrimary, padding: "10px 14px", borderRadius: radius.sm, fontSize: 13, fontFamily: font, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span>Không tải được chỉ số kỳ trước. Thử lại trước khi lưu để tránh ghi sai.</span>
          <Button size="sm" variant="outline" onClick={retryPrevious}>Thử lại</Button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div>
          <label htmlFor="utility-period" style={labelStyle}>Kỳ ghi chỉ số</label>
          <input
            id="utility-period"
            type="month"
            data-testid="utility-period-input"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="utility-elec" style={labelStyle}>
            <span>Chỉ số điện mới (kWh)</span>
            {lastElec !== null && <span style={{ color: C.textSecondary, fontWeight: 400 }}>Cũ: {formatNumber(lastElec)}</span>}
          </label>
          <input
            id="utility-elec"
            type="number"
            min={0}
            inputMode="decimal"
            data-testid="utility-elec-input"
            placeholder={lastElec !== null ? `≥ ${lastElec}` : "Nhập chỉ số điện"}
            value={elecValue}
            onChange={(e) => setElecValue(e.target.value)}
            aria-invalid={Boolean(elecError)}
            style={{ ...inputStyle, borderColor: elecError ? C.error : C.border }}
          />
          {elecError ? <p data-testid="utility-elec-error" style={fieldErrorStyle}>{elecError}</p> : renderPreviousHint(elecQuery.data)}
        </div>

        <div>
          <label htmlFor="utility-water" style={labelStyle}>
            <span>Chỉ số nước mới (m³)</span>
            {lastWater !== null && <span style={{ color: C.textSecondary, fontWeight: 400 }}>Cũ: {formatNumber(lastWater)}</span>}
          </label>
          <input
            id="utility-water"
            type="number"
            min={0}
            inputMode="decimal"
            data-testid="utility-water-input"
            placeholder={lastWater !== null ? `≥ ${lastWater}` : "Nhập chỉ số nước"}
            value={waterValue}
            onChange={(e) => setWaterValue(e.target.value)}
            aria-invalid={Boolean(waterError)}
            style={{ ...inputStyle, borderColor: waterError ? C.error : C.border }}
          />
          {waterError ? <p data-testid="utility-water-error" style={fieldErrorStyle}>{waterError}</p> : renderPreviousHint(waterQuery.data)}
        </div>
      </form>
    </ModalShell>
  );
}
