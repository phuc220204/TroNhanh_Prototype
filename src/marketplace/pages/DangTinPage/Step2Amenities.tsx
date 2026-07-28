import { Wind, Wifi, Layers, Car, Bath, Clock, Refrigerator, WashingMachine, Fingerprint, ParkingCircle, PawPrint, AlertCircle } from "lucide-react";
import { C, font } from "../../../shared/theme";

const AMENITIES_LIST = [
  { key: "ac",      Icon: Wind,          label: "Máy lạnh" },
  { key: "wifi",    Icon: Wifi,          label: "Wifi" },
  { key: "loft",    Icon: Layers,        label: "Gác lửng" },
  { key: "parking", Icon: Car,           label: "Chỗ để xe" },
  { key: "bath",    Icon: Bath,          label: "WC riêng" },
  { key: "free",    Icon: Clock,         label: "Giờ giấc tự do" },
  { key: "fridge",  Icon: Refrigerator,  label: "Tủ lạnh" },
  { key: "washer",  Icon: WashingMachine,label: "Máy giặt riêng" },
  { key: "finger",  Icon: Fingerprint,   label: "Khóa vân tay" },
  { key: "garage",  Icon: ParkingCircle, label: "Hầm để xe" },
  { key: "pet",     Icon: PawPrint,      label: "Cho nuôi thú cưng" },
];

interface Step2AmenitiesProps {
  formik: any;
}

export function Step2Amenities({ formik }: Step2AmenitiesProps) {
  const { values, errors, setFieldValue, handleBlur } = formik;

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
          {AMENITIES_LIST.map((item) => {
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
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
          Mô tả chi tiết tin đăng <span style={{ color: C.repairing }}>*</span>
        </p>
        <textarea
          name="description"
          rows={6}
          placeholder="Mô tả vị trí phòng, nội thất, tiện ích xung quanh, đối tượng phù hợp (sinh viên, người đi làm)..."
          value={values.description}
          onChange={(e) => setFieldValue("description", e.target.value)}
          onBlur={handleBlur}
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
        {errors.description && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: C.repairing }}>
            <AlertCircle size={12} />
            <span style={{ fontFamily: font, fontSize: 12 }}>{errors.description}</span>
          </div>
        )}
      </div>
    </div>
  );
}
