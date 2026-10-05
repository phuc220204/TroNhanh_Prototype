import { AlertCircle, MapPin } from "lucide-react";
import { C, font } from "../../../shared/theme";
import { PROPERTY_TYPES } from "../../../shared/constants/catalog";
import { AreaSelect } from "../../../shared/components/common";
import { formatVND, cleanVND } from "../../utils/listingMetadata";
import { LocationPicker } from "./LocationPicker";
import { TITLE_HINT } from "./listing-tips";
import { useBreakpoint } from "../../../shared/components/useBreakpoint";

interface Step1BasicProps {
  formik: any;
}

export function Step1Basic({ formik }: Step1BasicProps) {
  const { values, errors, setFieldValue, setFieldError, handleBlur } = formik;
  const { isMobile } = useBreakpoint();

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
      <FieldGroup label="Tiêu đề tin đăng" htmlFor="listing-title" required error={errors.title} errorId="listing-title-error" hint={TITLE_HINT}>
        <input
          id="listing-title"
          name="title"
          placeholder="VD: Cho thuê phòng trọ cao cấp full nội thất 30m² tại Quận 7"
          value={values.title}
          onChange={(e) => setFieldValue("title", e.target.value)}
          onBlur={handleBlur}
          minLength={10}
          maxLength={120}
          required
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "listing-title-error" : "listing-title-hint"}
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
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        <FieldGroup label="Loại hình bất động sản" htmlFor="listing-room-type" required error={errors.roomType}>
          <select
            id="listing-room-type"
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

        {/* Khu vực theo mô hình hành chính 2 cấp (từ 01/07/2025 không còn cấp
            quận/huyện). Lưu MÃ để lọc, và lưu TÊN vào `district` để hiển thị —
            tên là ảnh chụp tại thời điểm đăng, mã mới là thứ tra cứu được. */}
        <FieldGroup label="Khu vực" required error={errors.wardCode || errors.district}>
          <AreaSelect
            value={{ provinceCode: values.provinceCode, wardCode: values.wardCode }}
            onChange={(a) => {
              setFieldValue("provinceCode", a.provinceCode);
              setFieldValue("wardCode", a.wardCode);
              setFieldValue("district", a.wardName ?? "");
            }}
            labels={false}
            testIdPrefix="listing-area"
          />
        </FieldGroup>
      </div>

      {/* Address */}
      <FieldGroup label="Địa chỉ cụ thể" htmlFor="listing-address" required error={errors.address} errorId="listing-address-error">
        <div style={{ position: "relative" }}>
          <MapPin size={16} color={C.textSecondary} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input
            id="listing-address"
            name="address"
            placeholder="VD: Số 123 Đường Nguyễn Hữu Thọ, Phường Tân Hưng"
            value={values.address}
            onChange={(e) => setFieldValue("address", e.target.value)}
            onBlur={handleBlur}
            minLength={5}
            maxLength={255}
            required
            aria-invalid={Boolean(errors.address)}
            aria-describedby={errors.address ? "listing-address-error" : undefined}
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

      {/* Ghim vị trí trên bản đồ — đi vào rental_listings.latitude/longitude */}
      <FieldGroup label="Ghim vị trí trên bản đồ" hint="Không bắt buộc, nhưng giúp người tìm trọ hình dung được vị trí.">
        <LocationPicker
          value={values.coords}
          address={values.address}
          onChange={(next) => setFieldValue("coords", next)}
        />
      </FieldGroup>

      {/* Area & Price */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        <FieldGroup label="Diện tích phòng" htmlFor="listing-area" required error={errors.area} errorId="listing-area-error" hint="Đơn vị: m²">
          <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1.5px solid ${errors.area ? C.repairing : C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <input
              type="number"
              id="listing-area"
              name="area"
              placeholder="VD: 30"
              value={values.area}
              onChange={(e) => setFieldValue("area", e.target.value)}
              onBlur={handleBlur}
              min={5}
              max={1000}
              required
              aria-invalid={Boolean(errors.area)}
              aria-describedby="listing-area-error listing-area-hint"
              style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", border: "none", outline: "none", background: "transparent" }}
            />
            <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, padding: "0 14px", borderLeft: `1px solid ${C.border}`, background: C.bg }}>m²</span>
          </div>
        </FieldGroup>

        <FieldGroup label="Giá thuê 1 tháng" htmlFor="listing-price" required error={errors.price} errorId="listing-price-error" hint="Đơn vị: VND/tháng">
          <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1.5px solid ${errors.price ? C.repairing : C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <input
              type="text"
              id="listing-price"
              name="price"
              placeholder="VD: 4.500.000"
              value={values.price}
              onChange={(e) => {
                const raw = e.target.value;
                if (/[-+]/.test(raw)) {
                  setFieldValue("price", raw);
                  setFieldError("price", "Giá thuê không được chứa dấu âm hoặc dấu cộng");
                  return;
                }
                const clean = cleanVND(raw);
                setFieldValue("price", clean ? formatVND(clean) : "");
              }}
              onBlur={handleBlur}
              inputMode="numeric"
              required
              maxLength={15}
              aria-invalid={Boolean(errors.price)}
              aria-describedby="listing-price-error listing-price-hint"
              style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", border: "none", outline: "none", background: "transparent" }}
            />
            <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, padding: "0 14px", borderLeft: `1px solid ${C.border}`, background: C.bg }}>VND/tháng</span>
          </div>
        </FieldGroup>
      </div>

      {/* Phone Number & Curfew */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        <FieldGroup label="Số điện thoại liên hệ" htmlFor="listing-phone" required error={errors.phone} errorId="listing-phone-error">
          <input
            id="listing-phone"
            name="phone"
            placeholder="VD: 0901234567"
            value={values.phone}
            onChange={(e) => setFieldValue("phone", e.target.value)}
            onBlur={handleBlur}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            pattern="0[0-9]{8,9}"
            minLength={9}
            maxLength={10}
            required
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "listing-phone-error" : undefined}
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
        <FieldGroup label="Giờ đóng cửa" htmlFor="listing-curfew-time" required error={errors.curfewTime} errorId="listing-curfew-error">
          <input
            id="listing-curfew-time"
            type="time"
            name="curfewTime"
            value={values.curfewTime}
            onChange={(e) => setFieldValue("curfewTime", e.target.value)}
            required
            aria-invalid={Boolean(errors.curfewTime)}
            aria-describedby={errors.curfewTime ? "listing-curfew-error" : undefined}
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

function FieldGroup({ label, htmlFor, required, error, errorId, hint, children }: {
  label: string; htmlFor?: string; required?: boolean; error?: string; errorId?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <label htmlFor={htmlFor} style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
        {label} {required && <span style={{ color: C.repairing }}>*</span>}
      </label>
      {children}
      {hint && !error && <p id={htmlFor ? `${htmlFor}-hint` : undefined} style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "4px 0 0" }}>{hint}</p>}
      {error && (
        <div id={errorId} role="alert" style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: C.repairing }}>
          <AlertCircle size={12} />
          <span style={{ fontFamily: font, fontSize: 12 }}>{error}</span>
        </div>
      )}
    </div>
  );
}
