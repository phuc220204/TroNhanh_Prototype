import { AlertCircle } from "lucide-react";
import { C, font } from "../../../shared/theme";
import { cleanVND, formatVND } from "../../utils/listingMetadata";
import { useBreakpoint } from "../../../shared/components/useBreakpoint";

interface Step4CostsProps {
  formik: any;
  legacyDepositText: string;
  legacyDepositCleared: boolean;
  onToggleLegacyDeposit: () => void;
}

export function Step4Costs({ formik, legacyDepositText, legacyDepositCleared, onToggleLegacyDeposit }: Step4CostsProps) {
  const { values, errors, setFieldValue, handleBlur } = formik;
  const { isMobile } = useBreakpoint();

  const setVndValue = (field: "electric" | "water" | "service" | "deposit", raw: string) => {
    if (/[-+]/.test(raw)) {
      setFieldValue(field, raw);
      return;
    }
    const cleaned = cleanVND(raw);
    setFieldValue(field, cleaned ? formatVND(cleaned) : "");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>
          Chi phí sinh hoạt & Đặt cọc
        </h2>
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: 0 }}>
          Minh bạch các khoản phí điện, nước và dịch vụ để tạo niềm tin với khách thuê trọ.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        {/* Electricity */}
        <div>
          <label htmlFor="listing-electric" style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
            Tiền điện <span style={{ color: C.repairing }}>*</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1.5px solid ${errors.electric ? C.repairing : C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <input
              type="text"
              id="listing-electric"
              name="electric"
              placeholder="VD: 3.500"
              value={values.electric}
              onChange={(e) => setVndValue("electric", e.target.value)}
              onBlur={handleBlur}
              inputMode="numeric"
              required
              aria-invalid={Boolean(errors.electric)}
              aria-describedby={errors.electric ? "listing-electric-error" : undefined}
              style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", border: "none", outline: "none" }}
            />
            <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, padding: "0 12px", borderLeft: `1px solid ${C.border}`, background: C.bg }}>VND/kWh</span>
          </div>
          {errors.electric && (
            <div id="listing-electric-error" role="alert" style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: C.repairing }}>
              <AlertCircle size={12} />
              <span style={{ fontFamily: font, fontSize: 12 }}>{errors.electric}</span>
            </div>
          )}
        </div>

        {/* Water */}
        <div>
          <label htmlFor="listing-water" style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
            Tiền nước <span style={{ color: C.repairing }}>*</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1.5px solid ${errors.water ? C.repairing : C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <input
              type="text"
              id="listing-water"
              name="water"
              placeholder="VD: 100.000 hoặc 18.000"
              value={values.water}
              onChange={(e) => setVndValue("water", e.target.value)}
              onBlur={handleBlur}
              inputMode="numeric"
              required
              aria-invalid={Boolean(errors.water)}
              aria-describedby={errors.water ? "listing-water-error" : undefined}
              style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", border: "none", outline: "none" }}
            />
            <select
              aria-label="Đơn vị tiền nước"
              value={values.waterUnit}
              onChange={(e) => setFieldValue("waterUnit", e.target.value)}
              style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, padding: "0 8px", borderLeft: `1px solid ${C.border}`, background: C.bg, border: "none", outline: "none", height: "100%", cursor: "pointer" }}
            >
              <option value="person">VND/người</option>
              <option value="cubic">VND/m³</option>
            </select>
          </div>
          {errors.water && (
            <div id="listing-water-error" role="alert" style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: C.repairing }}>
              <AlertCircle size={12} />
              <span style={{ fontFamily: font, fontSize: 12 }}>{errors.water}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        {/* Service Fee */}
        <div>
          <label htmlFor="listing-service" style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
            Phí dịch vụ (Quản lý, rác, wifi...)
          </label>
          <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <input
              type="text"
              id="listing-service"
              name="service"
              placeholder="VD: 150.000"
              value={values.service}
              onChange={(e) => setVndValue("service", e.target.value)}
              onBlur={handleBlur}
              inputMode="numeric"
              aria-invalid={Boolean(errors.service)}
              aria-describedby={errors.service ? "listing-service-error" : undefined}
              style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", border: "none", outline: "none" }}
            />
            <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, padding: "0 12px", borderLeft: `1px solid ${C.border}`, background: C.bg }}>VND/tháng</span>
          </div>
          {errors.service && <div id="listing-service-error" role="alert" style={{ marginTop: 4, color: C.repairing, fontFamily: font, fontSize: 12 }}>{errors.service}</div>}
        </div>

        {/* Deposit */}
        <div>
          <label htmlFor="listing-deposit" style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
            Tiền đặt cọc phòng (VND)
          </label>
          <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <input
              type="text"
              id="listing-deposit"
              name="deposit"
              placeholder="VD: 4.500.000"
              value={values.deposit}
              onChange={(e) => setVndValue("deposit", e.target.value)}
              onBlur={handleBlur}
              inputMode="numeric"
              aria-invalid={Boolean(errors.deposit)}
              aria-describedby={errors.deposit ? "listing-deposit-error" : undefined}
              style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", border: "none", outline: "none" }}
            />
          </div>
          {errors.deposit && <div id="listing-deposit-error" role="alert" style={{ marginTop: 4, color: C.repairing, fontFamily: font, fontSize: 12 }}>{errors.deposit}</div>}
          {legacyDepositText && !values.deposit && (
            <div style={{ marginTop: 8, fontFamily: font, fontSize: 12.5, color: C.textSecondary, lineHeight: 1.5 }}>
              <span role="status">
                {legacyDepositCleared
                  ? "Điều kiện đặt cọc cũ sẽ được xóa khi bạn lưu tin."
                  : `Điều kiện đặt cọc cũ đang được giữ: ${legacyDepositText}`}
              </span>{" "}
              <button
                type="button"
                onClick={onToggleLegacyDeposit}
                data-testid="toggle-legacy-deposit-btn"
                style={{ border: "none", background: "none", color: C.primary, fontFamily: font, fontSize: 12.5, fontWeight: 700, textDecoration: "underline", cursor: "pointer", padding: 0 }}
              >
                {legacyDepositCleared ? "Hoàn tác" : "Xóa điều kiện cũ"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
