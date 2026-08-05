import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { C, font, radius } from "../../theme";

/**
 * Bản đồ thật (Leaflet + tile OpenStreetMap, không cần API key).
 *
 * Vì sao KHÔNG dùng marker mặc định của Leaflet: nó tham chiếu file ảnh theo
 * đường dẫn tương đối, và đường dẫn đó vỡ sau khi Vite bundle. Dùng `divIcon`
 * với SVG inline vừa tránh hẳn vấn đề đó, vừa lấy màu từ `shared/theme`.
 *
 * `leaflet/dist/leaflet.css` là file CSS ngoài DUY NHẤT được import trong repo —
 * ngoại lệ có chủ ý, vì Leaflet định vị pane/tile bằng chính CSS của nó.
 */

const HCMC_CENTER: LatLng = { lat: 10.7769, lng: 106.7009 };

export interface LatLng {
  lat: number;
  lng: number;
}

function markerIcon() {
  return L.divIcon({
    html: `<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z"
            fill="${C.primary}" stroke="${C.white}" stroke-width="2"/>
      <circle cx="12" cy="12" r="4.5" fill="${C.white}"/>
    </svg>`,
    className: "",
    iconSize: [30, 40],
    iconAnchor: [15, 40],
  });
}

/** Toạ độ hợp lệ và nằm trong khoảng có nghĩa. */
export function isValidLatLng(value?: Partial<LatLng> | null): value is LatLng {
  if (!value) return false;
  const { lat, lng } = value;
  return (
    typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

interface LeafletMapProps {
  center?: Partial<LatLng> | null;
  /** Bật thì click/kéo marker để đổi toạ độ. */
  editable?: boolean;
  onChange?: (next: LatLng) => void;
  height?: number;
  zoom?: number;
  "data-testid"?: string;
}

export function LeafletMap({
  center,
  editable = false,
  onChange,
  height = 320,
  zoom = 16,
  "data-testid": testId,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // Giữ callback trong ref để handler của Leaflet luôn gọi bản mới nhất
  // mà không phải tạo lại map mỗi lần parent render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const resolved = isValidLatLng(center) ? center : HCMC_CENTER;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, { attributionControl: true, scrollWheelZoom: editable })
      .setView([resolved.lat, resolved.lng], zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    const marker = L.marker([resolved.lat, resolved.lng], {
      icon: markerIcon(),
      draggable: editable,
    }).addTo(map);

    if (editable) {
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        onChangeRef.current?.({ lat, lng });
      });
      map.on("click", (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChangeRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }

    mapRef.current = map;
    markerRef.current = marker;

    // Container thường có kích thước 0 ở frame đầu (modal/step ẩn) —
    // không gọi invalidateSize thì tile chỉ render một mảnh.
    const timer = window.setTimeout(() => map.invalidateSize(), 50);

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Cố ý chỉ chạy một lần: đồng bộ toạ độ do effect bên dưới lo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đồng bộ khi toạ độ đổi từ bên ngoài (ví dụ nút "Lấy vị trí hiện tại").
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const current = marker.getLatLng();
    if (Math.abs(current.lat - resolved.lat) < 1e-7 && Math.abs(current.lng - resolved.lng) < 1e-7) return;
    marker.setLatLng([resolved.lat, resolved.lng]);
    map.setView([resolved.lat, resolved.lng], map.getZoom());
  }, [resolved.lat, resolved.lng]);

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      style={{
        height,
        width: "100%",
        borderRadius: radius.lg,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
        fontFamily: font,
        zIndex: 0,
      }}
    />
  );
}
