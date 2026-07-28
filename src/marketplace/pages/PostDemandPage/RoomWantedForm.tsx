import { PROPERTY_TYPES, AMENITIES } from "../../../shared/constants/catalog";
import { C, font } from "../../../shared/theme";

interface RoomWantedFormProps {
  propertyType: string;
  setPropertyType: (v: string) => void;
  minArea: string;
  setMinArea: (v: string) => void;
  moveInDate: string;
  setMoveInDate: (v: string) => void;
  occupantCount: string;
  setOccupantCount: (v: string) => void;
  selectedAmenities: string[];
  setSelectedAmenities: React.Dispatch<React.SetStateAction<string[]>>;
}

export function RoomWantedForm({
  propertyType,
  setPropertyType,
  minArea,
  setMinArea,
  moveInDate,
  setMoveInDate,
  occupantCount,
  setOccupantCount,
  selectedAmenities,
  setSelectedAmenities,
}: RoomWantedFormProps) {
  const toggleAmenity = (a: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(a) ? prev.filter((item) => item !== a) : [...prev, a]
    );
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
            Loại hình
          </label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            style={{ width: "100%", padding: "11px 14px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 10, outline: "none", boxSizing: "border-box" }}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
            Diện tích tối thiểu (m²)
          </label>
          <input
            type="number"
            value={minArea}
            onChange={(e) => setMinArea(e.target.value)}
            style={{ width: "100%", padding: "11px 14px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 10, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
            Ngày dọn vào dự kiến
          </label>
          <input
            type="date"
            value={moveInDate}
            onChange={(e) => setMoveInDate(e.target.value)}
            style={{ width: "100%", padding: "11px 14px", fontFamily: font, fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 10, outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
          Tiện ích mong muốn
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {AMENITIES.map((a) => {
            const active = selectedAmenities.includes(a);
            return (
              <button
                type="button"
                key={a}
                onClick={() => toggleAmenity(a)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: `1px solid ${active ? C.primary : C.border}`,
                  background: active ? C.caramelSoft : C.white,
                  color: active ? C.primary : C.textPrimary,
                  fontFamily: font,
                  fontSize: 12.5,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {a}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
