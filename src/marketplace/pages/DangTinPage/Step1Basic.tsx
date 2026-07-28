import { useState } from "react";
import { ChevronDown, AlertCircle, MapPin } from "lucide-react";
import { C, font } from "../../../shared/theme";
import { PROPERTY_TYPES, REGIONS } from "../../../shared/constants/catalog";
import { formatVND, cleanVND } from "../../utils/listingMetadata";

interface Step1BasicProps {
  formik: any;
}

export function Step1Basic({ formik }: Step1BasicProps) {
  const { values, errors, setFieldValue, setFieldError, handleBlur } = formik;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>
          Thông tin cơ bản tin đăng
        </h2>
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: 0 }}>
          Cung cấp tiêu đề, loại hình, địa chỉ và giá phòng rõ ràng để thu hút người tìm trọ.
        </p>
      </div>

      {/* Title */}
      <FieldGroup label="Tiêu đề tin đăng" required error={errors.title}>
        <input
          name="title"
          placeholder="VD: Cho thuê phòng trọ cao cấp full nội thất 30m² tại Quận 7"
          value={values.title}
          onChange={(e) => setFieldValue("title", e.target.value)}
          onBlur={handleBlur}
          style={{
            width: "100%",
            fontFamily: font,
            fontSize: 14,
            color: C.textPrimary,
            padding: "11px 14px",
            background: C.white,
            border: `1.5px solid ${errors.title ? C.repairing : C.border}`,
            borderRadius: 10,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </FieldGroup>

      {/* Property Type & District */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <FieldGroup label="Loại hình bất động sản" required error={errors.roomType}>
          <select
            name="roomType"
            value={values.roomType}
            onChange={(e) => setFieldValue("roomType", e.target.value)}
            style={{
              width: "100%",
              fontFamily: font,
              fontSize: 14,
              color: C.textPrimary,
              padding: "11px 14px",
              background: C.white,
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              outline: "none",
            }}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </FieldGroup>

        <FieldGroup label="Khu vực quận/huyện" required error={errors.district}>
          <select
            name="district"
            value={values.district}
            onChange={(e) => setFieldValue("district", e.target.value)}
            style={{
              width: "100%",
              fontFamily: font,
              fontSize: 14,
              color: C.textPrimary,
              padding: "11px 14px",
              background: C.white,
              border: `1.5px solid ${errors.district ? C.repairing : C.border}`,
              borderRadius: 10,
              outline: "none",
            }}
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </FieldGroup>
      </div>

      {/* Address */}
      <FieldGroup label="Địa chỉ cụ thể" required error={errors.address}>
        <div style={{ position: "relative" }}>
          <MapPin size={16} color={C.textSecondary} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input
            name="address"
            placeholder="VD: Số 123 Đường Nguyễn Hữu Thọ, Phường Tân Hưng"
            value={values.address}
            onChange={(e) => setFieldValue("address", e.target.value)}
            onBlur={handleBlur}
            style={{
              width: "100%",
              fontFamily: font,
              fontSize: 14,
              color: C.textPrimary,
              padding: "11px 14px 11px 40px",
              background: C.white,
              border: `1.5px solid ${errors.address ? C.repairing : C.border}`,
              borderRadius: 10,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </FieldGroup>

      {/* Area & Price */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <FieldGroup label="Diện tích phòng" required error={errors.area} hint="Đơn vị: m²">
          <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1.5px solid ${errors.area ? C.repairing : C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <input
              type="number"
              name="area"
              placeholder="VD: 30"
              value={values.area}
              onChange={(e) => setFieldValue("area", e.target.value)}
              onBlur={handleBlur}
              style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", border: "none", outline: "none", background: "transparent" }}
            />
            <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, padding: "0 14px", borderLeft: `1px solid ${C.border}`, background: C.bg }}>m²</span>
          </div>
        </FieldGroup>

        <FieldGroup label="Giá thuê 1 tháng" required error={errors.price} hint="Đơn vị: VND/tháng">
          <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1.5px solid ${errors.price ? C.repairing : C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <input
              type="text"
              name="price"
              placeholder="VD: 4.500.000"
              value={values.price}
              onChange={(e) => {
                const clean = cleanVND(e.target.value);
                setFieldValue("price", clean ? formatVND(clean) : "");
              }}
              onBlur={handleBlur}
              style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", border: "none", outline: "none", background: "transparent" }}
            />
            <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, padding: "0 14px", borderLeft: `1px solid ${C.border}`, background: C.bg }}>VND/tháng</span>
          </div>
        </FieldGroup>
      </div>

      {/* Phone Number & Curfew */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <FieldGroup label="Số điện thoại liên hệ" required error={errors.phone}>
          <input
            name="phone"
            placeholder="VD: 0901234567"
            value={values.phone}
            onChange={(e) => setFieldValue("phone", e.target.value)}
            onBlur={handleBlur}
            style={{
              width: "100%",
              fontFamily: font,
              fontSize: 14,
              color: C.textPrimary,
              padding: "11px 14px",
              background: C.white,
              border: `1.5px solid ${errors.phone ? C.repairing : C.border}`,
              borderRadius: 10,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </FieldGroup>

        <FieldGroup label="Giờ giấc ra vào" required>
          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13.5, fontFamily: font }}>
              <input
                type="radio"
                name="curfewType"
                value="free"
                checked={values.curfewType === "free"}
                onChange={() => setFieldValue("curfewType", "free")}
              />
              Tự do 24/7
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13.5, fontFamily: font }}>
              <input
                type="radio"
                name="curfewType"
                value="curfew"
                checked={values.curfewType === "curfew"}
                onChange={() => setFieldValue("curfewType", "curfew")}
              />
              Có giờ giới nghiêm
            </label>
          </div>
        </FieldGroup>
      </div>

      {values.curfewType === "curfew" && (
        <FieldGroup label="Chi tiết giờ giới nghiêm" required error={errors.curfewTime}>
          <input
            name="curfewTime"
            placeholder="VD: Đóng cửa lúc 23:00 hàng đêm"
            value={values.curfewTime}
            onChange={(e) => setFieldValue("curfewTime", e.target.value)}
            style={{
              width: "100%",
              fontFamily: font,
              fontSize: 14,
              color: C.textPrimary,
              padding: "11px 14px",
              background: C.white,
              border: `1.5px solid ${errors.curfewTime ? C.repairing : C.border}`,
              borderRadius: 10,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </FieldGroup>
      )}
    </div>
  );
}

function FieldGroup({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
        {label} {required && <span style={{ color: C.repairing }}>*</span>}
      </p>
      {children}
      {hint && !error && <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "4px 0 0" }}>{hint}</p>}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: C.repairing }}>
          <AlertCircle size={12} />
          <span style={{ fontFamily: font, fontSize: 12 }}>{error}</span>
        </div>
      )}
    </div>
  );
}
