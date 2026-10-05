import { AlertCircle, Lightbulb } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { AMENITY_OPTIONS } from "../../../shared/constants/amenities";
import { NearbyPlacesInput, type NearbyEntry } from "./NearbyPlacesInput";
import { DESCRIPTION_PLACEHOLDER, DESCRIPTION_TIPS } from "./listing-tips";

const DESCRIPTION_MAX_LENGTH = 5000;

interface Step2AmenitiesProps {
  formik: any;
}

export function Step2Amenities({ formik }: Step2AmenitiesProps) {
  const { values, errors, setFieldValue, handleBlur } = formik;
  const descriptionLength = String(values.description ?? "").length;

  const toggleAmenity = (key: string) => {
    const current: string[] = values.amenities || [];
    if (current.includes(key)) {
      setFieldValue("amenities", current.filter((k) => k !== key));
    } else {
      setFieldValue("amenities", [...current, key]);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>
          Tiện ích & Mô tả chi tiết
        </h2>
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: 0 }}>
          Chọn các tiện ích sẵn có và viết nội dung mô tả chi tiết phòng trọ của bạn.
        </p>
      </div>

      {/* Amenities Grid */}
      <div>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 10px" }}>
          Tiện ích nổi bật phòng trọ
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          {AMENITY_OPTIONS.map((item) => {
            const Icon = item.Icon;
            const active = (values.amenities || []).includes(item.key);
            return (
              <button
                type="button"
                key={item.key}
                onClick={() => toggleAmenity(item.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: `1.5px solid ${active ? C.primary : C.border}`,
                  background: active ? C.caramelSoft : C.white,
                  color: active ? C.primary : C.textPrimary,
                  fontFamily: font,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <Icon size={16} color={active ? C.primary : C.textSecondary} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Description Textarea */}
      <div>
        <label htmlFor="listing-description" style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
          Mô tả chi tiết tin đăng <span style={{ color: C.repairing }}>*</span>
        </label>
        <div
          data-testid="listing-description-tips"
          style={{ margin: "0 0 10px", padding: 14, borderRadius: radius.md, background: C.cream, color: C.textSecondary, font: `13px/1.55 ${font}` }}
        >
          <p style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 6px", fontWeight: 700, color: C.textPrimary }}>
            <Lightbulb size={14} color={C.primary} /> Gợi ý viết mô tả thu hút
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {DESCRIPTION_TIPS.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
        </div>
        <textarea
          id="listing-description"
          name="description"
          data-testid="listing-description-input"
          rows={8}
          placeholder={DESCRIPTION_PLACEHOLDER}
          value={values.description}
          onChange={(e) => setFieldValue("description", e.target.value)}
          onBlur={handleBlur}
          minLength={10}
          maxLength={DESCRIPTION_MAX_LENGTH}
          required
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "listing-description-error" : "listing-description-hint"}
          style={{
            width: "100%",
            fontFamily: font,
            fontSize: 14,
            color: C.textPrimary,
            padding: "12px 14px",
            background: C.white,
            border: `1.5px solid ${errors.description ? C.repairing : C.border}`,
            borderRadius: 12,
            outline: "none",
            boxSizing: "border-box",
            lineHeight: 1.5,
          }}
        />
        {!errors.description && (
          <div id="listing-description-hint" style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 4, fontFamily: font, fontSize: 12, color: C.textSecondary }}>
            <span>Mô tả càng cụ thể, người tìm trọ càng dễ quyết định liên hệ.</span>
            <span data-testid="listing-description-counter" style={{ flexShrink: 0 }}>
              {descriptionLength.toLocaleString("vi-VN")} / {DESCRIPTION_MAX_LENGTH.toLocaleString("vi-VN")}
            </span>
          </div>
        )}
        {errors.description && (
          <div id="listing-description-error" role="alert" style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: C.repairing }}>
            <AlertCircle size={12} />
            <span style={{ fontFamily: font, fontSize: 12 }}>{errors.description}</span>
          </div>
        )}
      </div>

      {/* Tiện ích xung quanh — đi vào metadata.nearby */}
      <div>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 4px" }}>
          Vị trí & Tiện ích xung quanh
        </p>
        <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: "0 0 10px" }}>
          Trường học, chợ, bệnh viện, quán ăn gần phòng. Người tìm trọ sẽ thấy đúng những gì bạn nhập ở đây.
        </p>
        <NearbyPlacesInput
          value={(values.nearby || []) as NearbyEntry[]}
          onChange={(next) => setFieldValue("nearby", next)}
        />
      </div>
    </div>
  );
}
