import { AlertCircle } from "lucide-react";
import { C, font } from "../../../shared/theme";

interface Step4CostsProps {
  formik: any;
}

export function Step4Costs({ formik }: Step4CostsProps) {
  const { values, errors, setFieldValue, handleBlur } = formik;

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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Electricity */}
        <div>
          <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
            Tiền điện <span style={{ color: C.repairing }}>*</span>
          </p>
          <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1.5px solid ${errors.electric ? C.repairing : C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <input
              type="text"
              name="electric"
              placeholder="VD: 3.500"
              value={values.electric}
              onChange={(e) => setFieldValue("electric", e.target.value)}
              onBlur={handleBlur}
              style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", border: "none", outline: "none" }}
            />
            <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, padding: "0 12px", borderLeft: `1px solid ${C.border}`, background: C.bg }}>VND/kWh</span>
          </div>
          {errors.electric && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: C.repairing }}>
              <AlertCircle size={12} />
              <span style={{ fontFamily: font, fontSize: 12 }}>{errors.electric}</span>
            </div>
          )}
        </div>

        {/* Water */}
        <div>
          <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
            Tiền nước <span style={{ color: C.repairing }}>*</span>
          </p>
          <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1.5px solid ${errors.water ? C.repairing : C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <input
              type="text"
              name="water"
              placeholder="VD: 100.000 hoặc 18.000"
              value={values.water}
              onChange={(e) => setFieldValue("water", e.target.value)}
              onBlur={handleBlur}
              style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", border: "none", outline: "none" }}
            />
            <select
              value={values.waterUnit}
              onChange={(e) => setFieldValue("waterUnit", e.target.value)}
              style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, padding: "0 8px", borderLeft: `1px solid ${C.border}`, background: C.bg, border: "none", outline: "none", height: "100%", cursor: "pointer" }}
            >
              <option value="person">VND/người</option>
              <option value="cubic">VND/m³</option>
            </select>
          </div>
          {errors.water && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: C.repairing }}>
              <AlertCircle size={12} />
              <span style={{ fontFamily: font, fontSize: 12 }}>{errors.water}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Service Fee */}
        <div>
          <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
            Phí dịch vụ (Quản lý, rác, wifi...)
          </p>
          <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <input
              type="text"
              name="service"
              placeholder="VD: 150.000"
              value={values.service}
              onChange={(e) => setFieldValue("service", e.target.value)}
              style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", border: "none", outline: "none" }}
            />
            <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, padding: "0 12px", borderLeft: `1px solid ${C.border}`, background: C.bg }}>VND/tháng</span>
          </div>
        </div>

        {/* Deposit */}
        <div>
          <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
            Tiền đặt cọc phòng
          </p>
          <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <input
              type="text"
              name="deposit"
              placeholder="VD: 1 tháng tiền phòng"
              value={values.deposit}
              onChange={(e) => setFieldValue("deposit", e.target.value)}
              style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", border: "none", outline: "none" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
