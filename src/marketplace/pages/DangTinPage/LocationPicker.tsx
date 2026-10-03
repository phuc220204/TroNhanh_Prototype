import { useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { C, font, radius, space } from "../../../shared/theme";
import { LeafletMap, isValidLatLng, type LatLng } from "../../../shared/components/common/LeafletMap";

interface LocationPickerProps {
  value: { lat: number; lng: number; address?: string } | null;
  address: string;
  onChange: (next: { lat: number; lng: number; address?: string } | null) => void;
}

/**
 * Chọn toạ độ cho tin đăng: click hoặc kéo marker trên bản đồ thật.
 * Toạ độ đi vào `rental_listings.latitude/longitude` (cột đã có sẵn trong RPC).
 */
export function LocationPicker({ value, address, onChange }: LocationPickerProps) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const set = (next: LatLng) => onChange({
    lat: next.lat,
    lng: next.lng,
    address: address.trim(),
  });

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Trình duyệt không hỗ trợ định vị. Bạn hãy bấm trực tiếp lên bản đồ.");
      return;
    }
    setGeoError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setGeoError("Không lấy được vị trí. Bạn hãy bấm trực tiếp lên bản đồ.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const hasPin = isValidLatLng(value);
  const addressChangedAfterPin = hasPin
    && Boolean(value.address)
    && value.address.trim() !== address.trim();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: space[3], flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <MapPin size={13} />
          {hasPin
            ? `Đã ghim: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
            : "Chưa ghim vị trí — bấm lên bản đồ để chọn"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap" }}>
          {hasPin && (
            <button
              type="button"
              onClick={() => onChange(null)}
              data-testid="clear-listing-pin-btn"
              style={{
                fontFamily: font, fontSize: 12.5, fontWeight: 700,
                color: C.textSecondary, background: C.white,
                border: `1px solid ${C.border}`, borderRadius: radius.pill,
                padding: `${space[2]}px ${space[3]}px`, cursor: "pointer",
              }}
            >
              Bỏ ghim
            </button>
          )}
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            data-testid="use-my-location-btn"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: font, fontSize: 12.5, fontWeight: 700,
              color: C.primary, background: C.cream,
              border: `1px solid ${C.border}`, borderRadius: radius.pill,
              padding: `${space[2]}px ${space[3]}px`,
              cursor: locating ? "wait" : "pointer",
            }}
          >
            <Crosshair size={13} />
            {locating ? "Đang định vị..." : "Lấy vị trí hiện tại"}
          </button>
        </div>
      </div>

      <LeafletMap
        center={value}
        editable
        showMarker={hasPin}
        onChange={set}
        height={280}
        data-testid="listing-location-picker"
      />

      {geoError && (
        <span role="alert" style={{ fontFamily: font, fontSize: 12, color: C.error }}>{geoError}</span>
      )}
      {addressChangedAfterPin && (
        <span role="status" style={{ fontFamily: font, fontSize: 12, color: C.repairing }}>
          Địa chỉ đã thay đổi sau lần ghim gần nhất. Hãy bấm lại lên bản đồ để xác nhận vị trí mới.
        </span>
      )}
      <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>
        Bấm lên bản đồ hoặc kéo ghim để chỉnh đúng vị trí phòng. Người tìm trọ sẽ thấy ghim này ở trang chi tiết.
      </span>
    </div>
  );
}
