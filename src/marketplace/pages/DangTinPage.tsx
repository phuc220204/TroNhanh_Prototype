import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown,
  Upload, X, Wind, Wifi, Layers, Car, Bath, Clock,
  Refrigerator, WashingMachine, Fingerprint, ParkingCircle, PawPrint,
  Zap, Droplets, Wrench, Key, Phone, MessageSquare,
  TrendingUp, AlertCircle, Shield,
  CheckCircle, MapPin, Plus, Trash2
} from "lucide-react";
import { C, font } from "../../shared/theme";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { PublicNavbarDesktop, DemoFAB } from "../../shared/components/PublicNavbar";
import { DemoBanner } from "../../shared/components/common/DemoBanner";
import { useAuth } from "../../shared/contexts/AuthContext";
import { createListing } from "../services/listing-mutations";
import { PROPERTY_TYPES, REGIONS } from "../../shared/constants/catalog";
import { formatVND, cleanVND, appendMetadataToDescription, ListingMetadata } from "../utils/listingMetadata";
import { logError } from "../../shared/services/supabase-error";

/* ══════════════════════════════════════════
   CONSTANTS & DATA SUGGESTIONS
   ══════════════════════════════════════════ */
const STEPS = [
  "Thông tin cơ bản",
  "Tiện ích & mô tả",
  "Hình ảnh",
  "Chi phí",
];

const ROOM_TYPES = [...PROPERTY_TYPES];
const DISTRICTS = [...REGIONS];

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

const PHOTO_SLOTS = [
  "Ảnh tổng quan phòng",
  "Ảnh khu ngủ",
  "Ảnh WC / khu phụ",
  "Ảnh bếp / ban công",
  "Ảnh mặt tiền / lối vào",
];

// District Center Coordinates for Map Simulation
const DISTRICT_CENTERS: Record<string, { lat: number; lng: number }> = {
  "Quận 1": { lat: 10.7756, lng: 106.7019 },
  "Quận 3": { lat: 10.7792, lng: 106.6853 },
  "Quận 5": { lat: 10.7554, lng: 106.6622 },
  "Quận 7": { lat: 10.7960, lng: 106.7260 },
  "Quận 10": { lat: 10.7712, lng: 106.6823 },
  "Bình Thạnh": { lat: 10.8030, lng: 106.6980 },
  "Gò Vấp": { lat: 10.8388, lng: 106.6661 },
  "Tân Bình": { lat: 10.7997, lng: 106.6461 },
  "Thủ Đức": { lat: 10.8494, lng: 106.7729 },
};

// Simulated popular locations by District for quick selection
const DISTRICT_NEARBY_SUGGESTIONS: Record<string, Array<{ category: string; name: string; dist: string }>> = {
  "Quận 10": [
    { category: "shopping", name: "Vạn Hạnh Mall", dist: "500m" },
    { category: "shopping", name: "Chợ Nguyễn Tri Phương", dist: "800m" },
    { category: "edu", name: "ĐH Kinh tế TP.HCM (UEH)", dist: "600m" },
    { category: "edu", name: "ĐH Bách Khoa TP.HCM", dist: "1.2km" },
    { category: "health", name: "Bệnh viện 115", dist: "400m" },
    { category: "health", name: "Viện Tim TP.HCM", dist: "900m" },
    { category: "food", name: "Khu ẩm thực Sư Vạn Hạnh", dist: "300m" },
  ],
  "Quận 7": [
    { category: "shopping", name: "Crescent Mall", dist: "800m" },
    { category: "shopping", name: "Lotte Mart Quận 7", dist: "300m" },
    { category: "edu", name: "Đại học RMIT Việt Nam", dist: "1.2km" },
    { category: "edu", name: "Đại học Tôn Đức Thắng", dist: "900m" },
    { category: "health", name: "Bệnh viện FV", dist: "600m" },
    { category: "health", name: "Bệnh viện Tim Tâm Đức", dist: "700m" },
    { category: "food", name: "Khu Phú Mỹ Hưng Hưng Gia", dist: "1km" },
  ],
  "Bình Thạnh": [
    { category: "shopping", name: "Landmark 81", dist: "700m" },
    { category: "shopping", name: "Chợ Bà Chiểu", dist: "1.1km" },
    { category: "edu", name: "Đại học Ngoại Thương (FTU2)", dist: "900m" },
    { category: "edu", name: "Đại học HUTECH", dist: "500m" },
    { category: "health", name: "Bệnh viện Nhân dân Gia Định", dist: "1.2km" },
    { category: "food", name: "Phố ẩm thực đường D5", dist: "400m" },
  ],
};

const DEFAULT_NEARBY_SUGGESTIONS = [
  { category: "shopping", name: "Siêu thị Co.opmart", dist: "800m" },
  { category: "shopping", name: "Chợ truyền thống", dist: "400m" },
  { category: "edu", name: "Trường Tiểu học gần nhà", dist: "300m" },
  { category: "health", name: "Nhà thuốc Pharmacity", dist: "150m" },
  { category: "food", name: "Cửa hàng tiện lợi 24/7", dist: "200m" },
];

/* ══════════════════════════════════════════
   PRIMITIVES & SHARED COMPONENTS
   ══════════════════════════════════════════ */
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 7px", display: "flex", alignItems: "center", gap: 4 }}>
      {children}
      {required && <span style={{ color: C.repairing, fontSize: 13 }}>*</span>}
    </p>
  );
}

function FieldGroup({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <Label required={required}>{label}</Label>
      {children}
      {hint && !error && (
        <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "5px 0 0", lineHeight: 1.5 }}>{hint}</p>
      )}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
          <AlertCircle size={12} color={C.repairing} />
          <span style={{ fontFamily: font, fontSize: 12, color: C.repairing }}>{error}</span>
        </div>
      )}
    </div>
  );
}

function TextInput({
  placeholder, value, onChange, unit, type = "text", error, onBlur, name
}: {
  placeholder?: string; value: string; onChange: (v: string) => void;
  unit?: string; type?: string; error?: boolean; onBlur?: any; name?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1.5px solid ${error ? C.repairing : focused ? C.primary : C.border}`, borderRadius: 10, overflow: "hidden", transition: "border-color 0.15s" }}>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={e => {
          setFocused(false);
          if (onBlur) onBlur(e);
        }}
        style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", border: "none", outline: "none", background: "transparent", minWidth: 0 }}
      />
      {unit && (
        <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, padding: "0 12px", borderLeft: `1px solid ${C.border}`, flexShrink: 0, background: C.bg }}>{unit}</span>
      )}
    </div>
  );
}

function SelectInput({
  value, onChange, options, placeholder, error, onBlur, name
}: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; error?: boolean; onBlur?: any; name?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <select
        name={name}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={e => {
          setFocused(false);
          if (onBlur) onBlur(e);
        }}
        style={{ width: "100%", fontFamily: font, fontSize: 14, color: value ? C.textPrimary : C.textSecondary, padding: "11px 36px 11px 14px", background: C.white, border: `1.5px solid ${error ? C.repairing : focused ? C.primary : C.border}`, borderRadius: 10, outline: "none", appearance: "none", cursor: "pointer", transition: "border-color 0.15s" }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={15} color={C.textSecondary} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
    </div>
  );
}

function TextArea({
  placeholder, value, onChange, rows = 5, error, onBlur, name
}: { placeholder?: string; value: string; onChange: (v: string) => void; rows?: number; error?: boolean; onBlur?: any; name?: string; }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={e => {
        setFocused(false);
        if (onBlur) onBlur(e);
      }}
      style={{ width: "100%", fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", background: C.white, border: `1.5px solid ${error ? C.repairing : focused ? C.primary : C.border}`, borderRadius: 10, outline: "none", resize: "vertical", lineHeight: 1.65, transition: "border-color 0.15s", boxSizing: "border-box" }}
    />
  );
}

function PrimaryBtn({ label, onClick, icon, disabled }: { label: string; onClick?: () => void; icon?: React.ReactNode; disabled?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "12px 24px", background: disabled ? C.sand : hov ? C.primaryHover : C.primary, color: C.white, border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", transition: "background 0.13s" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {label}{icon}
    </button>
  );
}

function GhostBtn({ label, onClick, icon }: { label: string; onClick?: () => void; icon?: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 18px", background: hov ? C.cream : "transparent", color: C.textSecondary, border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "background 0.13s" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {icon}{label}
    </button>
  );
}

/* ══════════════════════════════════════════
   STEPPER & INTERMEDIARIES
   ══════════════════════════════════════════ */
function Stepper({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36 }}>
      {STEPS.map((label, i) => {
        const done    = i < step;
        const active  = i === step;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flexShrink: 0 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: done ? C.available : active ? C.primary : C.caramelSoft,
                border: `2px solid ${done ? C.available : active ? C.primary : C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
              }}>
                {done
                  ? <Check size={15} color="white" strokeWidth={2.5} />
                  : <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: active ? C.white : C.textSecondary }}>{i + 1}</span>
                }
              </div>
              <span style={{ fontFamily: font, fontSize: 12, fontWeight: active || done ? 700 : 400, color: active ? C.primary : done ? C.available : C.textSecondary, whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? C.available : C.border, margin: "0 8px", marginBottom: 22, transition: "background 0.2s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 999, background: i === step ? C.primary : i < step ? C.available : C.border, transition: "all 0.2s" }} />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   SIMULATED MAP PICKER COMPONENT
   ══════════════════════════════════════════ */
function MapPicker({
  district,
  coords,
  onChange,
}: {
  district: string;
  coords: { lat: number; lng: number; address?: string };
  onChange: (val: { lat: number; lng: number; address?: string }) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);

  // When district changes, center coords on the district
  useEffect(() => {
    const center = DISTRICT_CENTERS[district] || DISTRICT_CENTERS["Quận 7"];
    if (coords.lat === 10.7712 && coords.lng === 106.6823 && district !== "Quận 10") {
      onChange({ ...center, address: `Đường chính tại ${district}, TP. Hồ Chí Minh` });
    }
  }, [district]);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pctX = x / rect.width;
    const pctY = y / rect.height;

    const center = DISTRICT_CENTERS[district] || DISTRICT_CENTERS["Quận 7"];
    // Map percentages to small offset from district center
    const lat = center.lat + (0.5 - pctY) * 0.015;
    const lng = center.lng + (pctX - 0.5) * 0.015;

    const mockRoads = ["Lê Văn Sỹ", "Nguyễn Thị Thập", "Sư Vạn Hạnh", "Ba Tháng Hai", "Phan Văn Trị", "Điện Biên Phủ", "Lê Hồng Phong", "Huỳnh Tấn Phát", "Lâm Văn Bền", "Trần Hưng Đạo"];
    const road = mockRoads[Math.floor((pctX + pctY) * 10) % mockRoads.length];
    const num = Math.floor(pctX * 250) + 1;
    const generatedAddr = `Hẻm ${num} Đường ${road}, ${district}, TP. Hồ Chí Minh`;

    onChange({ lat, lng, address: generatedAddr });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Label>Vị trí trên bản đồ (Click để chọn vị trí chính xác)</Label>
      <div
        ref={mapRef}
        onClick={handleMapClick}
        style={{
          height: 180,
          borderRadius: 12,
          border: `1.5px solid ${C.border}`,
          background: "#ECE5D8",
          position: "relative",
          overflow: "hidden",
          cursor: "crosshair",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        {/* Draw mock street lines */}
        <div style={{ position: "absolute", top: "30%", left: 0, right: 0, height: 12, background: "white", transform: "rotate(-5deg)", opacity: 0.85 }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "40%", width: 12, background: "white", transform: "rotate(15deg)", opacity: 0.85 }} />
        <div style={{ position: "absolute", top: "70%", left: 0, right: 0, height: 8, background: "white", transform: "rotate(3deg)", opacity: 0.85 }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "75%", width: 10, background: "white", transform: "rotate(-10deg)", opacity: 0.85 }} />
        
        {/* Mock River */}
        <div style={{ position: "absolute", top: "50%", left: "-10%", width: "120%", height: 24, background: "#A9D5EC", transform: "rotate(25deg)", opacity: 0.7 }} />

        {/* Mock Parks / Green Blocks */}
        <div style={{ position: "absolute", top: 15, left: 20, width: 60, height: 40, background: "#D0E7D2", borderRadius: 8, opacity: 0.8 }} />
        <div style={{ position: "absolute", bottom: 20, right: 40, width: 80, height: 50, background: "#D0E7D2", borderRadius: 8, opacity: 0.8 }} />

        {/* Placing PIN */}
        <div style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pointerEvents: "none"
        }}>
          <div style={{
            background: C.primaryDark,
            color: "white",
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            whiteSpace: "nowrap",
            marginBottom: 4,
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            fontFamily: font
          }}>
            Vị trí phòng trọ
          </div>
          <MapPin size={26} color={C.primary} fill={C.caramelSoft} style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.25))" }} />
        </div>

        {/* Coordinates overlay indicator */}
        <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(255,255,255,0.85)", padding: "3px 8px", borderRadius: 4, fontFamily: font, fontSize: 10, color: C.textSecondary, border: "1px solid #ddd" }}>
          Tọa độ: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </div>
      </div>
      {coords.address && (
        <p style={{ fontFamily: font, fontSize: 12, color: C.primary, margin: 0, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          <Check size={12} /> Địa chỉ định vị: {coords.address}
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   SUCCESS & PAYMENT MODALS
   ══════════════════════════════════════════ */
function SuccessModal({ open, onView, onManage }: { open: boolean; onView: () => void; onManage: () => void }) {
  if (!open) return null;
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(20,10,4,0.5)", zIndex: 500, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 501, background: C.white, borderRadius: 20, padding: "36px 32px", maxWidth: 400, width: "calc(100vw - 48px)", textAlign: "center", boxShadow: "0 20px 60px rgba(20,10,4,0.25)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#E8F5E1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <CheckCircle size={30} color="#4A7A34" />
        </div>
        <h3 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: "0 0 10px" }}>
          Đăng tin thành công!
        </h3>
        <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: "0 0 28px", lineHeight: 1.65 }}>
          Tin của bạn sẽ được kiểm duyệt trước khi hiển thị. Thường trong vòng <strong style={{ color: C.textPrimary }}>2–4 giờ</strong>.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onManage}
            style={{ flex: 1, padding: "13px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>
            Về trang quản lý
          </button>
          <button onClick={onView}
            style={{ flex: 1, padding: "13px", background: C.primary, border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer" }}>
            Xem tin
          </button>
        </div>
      </div>
    </>
  );
}

function PaymentModal({ open, onConfirm, onCancel, onSkip }: { open: boolean; onConfirm: () => void; onCancel: () => void; onSkip: () => void }) {
  if (!open) return null;
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(20,10,4,0.5)", zIndex: 500, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 501, background: C.white, borderRadius: 20, padding: "28px 32px", maxWidth: 420, width: "calc(100vw - 48px)", textAlign: "center", boxShadow: "0 20px 60px rgba(20,10,4,0.25)" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FFF3E0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <TrendingUp size={24} color={C.repairing} />
        </div>
        <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>Thanh toán Đẩy tin VIP</h3>
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 20px" }}>Số tiền: <strong style={{ color: C.repairing, fontSize: 16 }}>100.000 đ</strong> (Đẩy tin nổi bật trong 7 ngày)</p>

        {/* QR Code simulation */}
        <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 16, background: C.white, display: "inline-block", marginBottom: 20 }}>
          <div style={{ width: 160, height: 160, background: "#f5f5f5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 8, margin: "0 auto", position: "relative", border: "1px solid #eee" }}>
            <div style={{ position: "absolute", top: 4, left: 4, background: "#005BAA", color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 800 }}>VietQR</div>
            <div style={{ border: "4px solid #333", width: 100, height: 100, display: "flex", flexWrap: "wrap", padding: 2 }}>
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} style={{ width: "25%", height: "25%", background: (i % 3 === 0 || i % 5 === 2) ? "#333" : "transparent" }} />
              ))}
            </div>
            <div style={{ fontFamily: font, fontSize: 10, fontWeight: 600, color: C.textSecondary, marginTop: 8 }}>TRỌ NHANH - VIP - PAY</div>
          </div>
        </div>

        <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "0 0 24px", lineHeight: 1.6 }}>
          Quét mã QR bằng ứng dụng Ngân hàng (Mobile Banking) để thanh toán. Hệ thống sẽ tự động duyệt tin VIP sau khi nhận được tiền.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onConfirm}
            style={{ width: "100%", padding: "13px", background: C.primary, border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 2px 10px rgba(138,106,69,0.3)" }}>
            Xác nhận đã chuyển khoản
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel}
              style={{ flex: 1, padding: "11px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>
              Hủy thanh toán
            </button>
            <button onClick={onSkip}
              style={{ flex: 1, padding: "11px", background: "transparent", border: `1.5px solid ${C.primary}`, borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 600, color: C.primary, cursor: "pointer" }}>
              Đăng thường (Miễn phí)
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Toast({ show, message }: { show: boolean; message: string }) {
  return (
    <div style={{ position: "fixed", bottom: 32, left: "50%", transform: `translateX(-50%) translateY(${show ? 0 : 20}px)`, opacity: show ? 1 : 0, transition: "all 0.25s", zIndex: 600, background: C.primaryDark, borderRadius: 10, padding: "12px 22px", pointerEvents: "none" }}>
      <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.cream }}>{message}</span>
    </div>
  );
}

/* ══════════════════════════════════════════
   VALIDATION SCHEMAS FOR STEPS
   ══════════════════════════════════════════ */
const step1Schema = Yup.object().shape({
  title: Yup.string().required("Vui lòng nhập tiêu đề tin"),
  roomType: Yup.string().required("Vui lòng chọn loại hình phòng"),
  address: Yup.string().required("Vui lòng nhập địa chỉ cụ thể"),
  district: Yup.string().required("Vui lòng chọn khu vực"),
  area: Yup.number()
    .typeError("Diện tích phải là số")
    .required("Vui lòng nhập diện tích")
    .positive("Diện tích phải lớn hơn 0"),
  price: Yup.string().required("Vui lòng nhập giá thuê"),
  phone: Yup.string()
    .required("Số điện thoại chưa hợp lệ")
    .matches(/^0\d{8,9}$/, "Số điện thoại chưa hợp lệ"),
  curfewType: Yup.string().oneOf(["free", "curfew"]).required(),
  curfewTime: Yup.string().when("curfewType", {
    is: "curfew",
    then: (schema) => schema.required("Vui lòng nhập chi tiết giờ giới nghiêm"),
    otherwise: (schema) => schema.optional(),
  }),
});

const step2Schema = Yup.object().shape({
  description: Yup.string().min(10, "Mô tả chi tiết nên có ít nhất 10 ký tự").required("Vui lòng viết mô tả chi tiết"),
});

const step3Schema = Yup.object().shape({
  images: Yup.array().min(3, "Vui lòng tải lên ít nhất 3 ảnh của phòng"),
});

const step4Schema = Yup.object().shape({
  electric: Yup.string().required("Vui lòng nhập tiền điện"),
  water: Yup.string().required("Vui lòng nhập tiền nước"),
});

/* ══════════════════════════════════════════
   MAIN PAGE COMPONENT
   ══════════════════════════════════════════ */
export function DangTinPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useBreakpoint();
  // `profile` được dùng ở profileName bên dưới — thiếu nó thì ReferenceError.
  const { user, profile } = useAuth();

  const prefill = (location.state as { prefill?: any } | null)?.prefill ?? {};

  const [step, setStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [isBoosted, setIsBoosted] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRoomId, setNewRoomId] = useState("");
  const profileName = profile?.full_name || "";

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  // Setup Formik unified state
  const formik = useFormik({
    initialValues: {
      title: prefill.title || "",
      roomType: prefill.roomType || "Phòng trọ",
      address: prefill.address || "",
      district: prefill.district || "Quận 7",
      area: prefill.area || "",
      price: prefill.price ? formatVND(prefill.price) : "",
      maxPeople: prefill.maxPeople || "",
      floor: prefill.floor || "",
      phone: prefill.phone || "",
      curfewType: "free" as "free" | "curfew",
      curfewTime: "",
      coords: { lat: 10.7712, lng: 106.6823, address: "" } as { lat: number; lng: number; address?: string },
      
      amenities: [] as string[],
      description: "",
      nearby: [] as Array<{ category: string; name: string; dist: string }>,
      
      images: [] as string[],
      
      electric: "",
      water: "",
      waterUnit: "person" as "person" | "cubic",
      service: "",
      deposit: "",
      other: "",
    },
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async () => {
      // Step 4 final submit
      if (isBoosted) {
        setShowPayment(true);
      } else {
        handlePostSubmit(false);
      }
    }
  });

  // Handle validating steps manually
  const next = async () => {
    formik.setErrors({});
    if (step === 0) {
      try {
        await step1Schema.validate(formik.values, { abortEarly: false });
        setStep(1);
      } catch (err: any) {
        const formikErrors: any = {};
        if (err.inner) {
          err.inner.forEach((e: any) => {
            if (e.path) formikErrors[e.path] = e.message;
          });
        }
        formik.setErrors(formikErrors);
      }
    } else if (step === 1) {
      try {
        await step2Schema.validate(formik.values, { abortEarly: false });
        setStep(2);
      } catch (err: any) {
        const formikErrors: any = {};
        if (err.inner) {
          err.inner.forEach((e: any) => {
            if (e.path) formikErrors[e.path] = e.message;
          });
        }
        formik.setErrors(formikErrors);
      }
    } else if (step === 2) {
      try {
        await step3Schema.validate(formik.values, { abortEarly: false });
        setStep(3);
      } catch (err: any) {
        showToast(err.message || "Vui lòng tải lên ít nhất 3 ảnh");
      }
    } else if (step === 3) {
      try {
        await step4Schema.validate(formik.values, { abortEarly: false });
        formik.handleSubmit();
      } catch (err: any) {
        const formikErrors: any = {};
        if (err.inner) {
          err.inner.forEach((e: any) => {
            if (e.path) formikErrors[e.path] = e.message;
          });
        }
        formik.setErrors(formikErrors);
      }
    }
  };

  const handlePostSubmit = async (activateBoost: boolean) => {
    if (!user) {
      showToast("Vui lòng đăng nhập để đăng tin");
      navigate("/dang-nhap");
      return;
    }
    setIsSubmitting(true);
    setShowPayment(false);

    try {
      const boostExpire = activateBoost
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Pack metadata to JSON block in description
      const metadata: ListingMetadata = {
        curfew: {
          type: formik.values.curfewType,
          time: formik.values.curfewTime
        },
        costs: {
          electric: formik.values.electric,
          water: formik.values.water,
          waterUnit: formik.values.waterUnit,
          service: formik.values.service,
          deposit: formik.values.deposit,
          other: formik.values.other
        },
        nearby: [
          { key: "shopping", label: "Mua sắm & Giải trí", places: formik.values.nearby.filter(n => n.category === "shopping").map(n => ({ name: n.name, dist: n.dist })) },
          { key: "edu", label: "Giáo dục", places: formik.values.nearby.filter(n => n.category === "edu").map(n => ({ name: n.name, dist: n.dist })) },
          { key: "health", label: "Y tế", places: formik.values.nearby.filter(n => n.category === "health").map(n => ({ name: n.name, dist: n.dist })) },
          { key: "food", label: "Ẩm thực", places: formik.values.nearby.filter(n => n.category === "food").map(n => ({ name: n.name, dist: n.dist })) },
        ].filter(cat => cat.places.length > 0),
        coords: formik.values.coords
      };

      const finalDescription = appendMetadataToDescription(formik.values.description, metadata);

      const amenityLabels = formik.values.amenities.map(key => {
        return AMENITIES_LIST.find(a => a.key === key)?.label || key;
      });

      const listingData = await createListing({
        sellerId: user.id,
        title: formik.values.title,
        description: finalDescription,
        propertyType: formik.values.roomType,
        price: parseFloat(cleanVND(formik.values.price)),
        area: parseFloat(formik.values.area),
        address: formik.values.address,
        district: formik.values.district,
        contactPhone: formik.values.phone,
        contactName: profileName || user.email || "Chủ trọ",
        boostExpireAt: boostExpire,
        amenities: amenityLabels,
      });

      if (listingData) {
        setNewRoomId(listingData.id);
        setSuccess(true);
      }
    } catch (err) {
      logError("DangTinPage.handleSubmit", err);
      showToast("Đã xảy ra lỗi khi lưu thông tin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const back = () => { if (step > 0) setStep(s => s - 1); };
  const saveDraft = () => { showToast("Đã lưu nháp thành công"); };

  const stepContent = () => {
    if (step === 0) return <Step1 formik={formik} isMobile={isMobile} />;
    if (step === 1) return <Step2 formik={formik} isMobile={isMobile} />;
    if (step === 2) return <Step3 formik={formik} />;
    return <Step4 formik={formik} isMobile={isMobile} isBoosted={isBoosted} onSelectBoost={setIsBoosted} />;
  };

  const actionBar = (mobile?: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: mobile ? "wrap" : undefined }}>
      <div style={{ display: "flex", gap: 8 }}>
        {step > 0 && <GhostBtn label="Quay lại" icon={<ArrowLeft size={14} />} onClick={back} />}
        <GhostBtn label="Lưu nháp" onClick={saveDraft} />
      </div>
      <PrimaryBtn
        label={step === STEPS.length - 1 ? (isSubmitting ? "Đang xử lý..." : "Đăng tin") : "Tiếp tục"}
        icon={step < STEPS.length - 1 ? <ArrowRight size={15} /> : <Check size={15} />}
        onClick={next}
        disabled={isSubmitting}
      />
    </div>
  );

  /* ── MOBILE ─────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Mobile app header */}
        <div style={{ background: C.primaryDark, height: 56, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(42,26,12,0.22)", flexShrink: 0 }}>
          <button onClick={() => step > 0 ? back() : navigate(-1)}
            style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={17} color={C.cream} />
          </button>
          <span style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: C.cream, flex: 1, textAlign: "center" }}>Đăng tin</span>
          <div style={{ width: 36 }} />
        </div>
        <DemoBanner mobile />

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Progress */}
          <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <ProgressDots step={step} total={STEPS.length} />
            <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>Bước {step + 1} / {STEPS.length}</span>
          </div>
          <div style={{ padding: "6px 16px 8px" }}>
            <p style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: 0 }}>{STEPS[step]}</p>
          </div>

          {/* Form */}
          <div style={{ padding: "8px 16px 24px" }}>
            {stepContent()}
          </div>
        </div>

        {/* Sticky bottom CTA */}
        <div style={{ background: C.white, borderTop: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", gap: 10, flexShrink: 0, boxShadow: "0 -2px 12px rgba(92,70,50,0.08)" }}>
          {step > 0 && (
            <button onClick={back}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "14px", background: "transparent", color: C.textSecondary, border: `1.5px solid ${C.border}`, borderRadius: 12, fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 50 }}>
              <ArrowLeft size={15} /> Quay lại
            </button>
          )}
          <button onClick={next} disabled={isSubmitting}
            style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "14px", background: C.primary, color: C.white, border: "none", borderRadius: 12, fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer", minHeight: 50 }}>
            {step === STEPS.length - 1 ? (isSubmitting ? <><Check size={16} /> Đang lưu...</> : <><Check size={16} /> Đăng tin</>) : <>Tiếp tục <ArrowRight size={15} /></>}
          </button>
        </div>

        <SuccessModal open={success} onView={() => navigate(`/phong/${newRoomId}`)} onManage={() => navigate("/chu-tro/tin-dang")} />
        <PaymentModal open={showPayment} onConfirm={() => handlePostSubmit(true)} onCancel={() => setShowPayment(false)} onSkip={() => handlePostSubmit(false)} />
        <Toast show={toast} message={toastMsg} />
      </div>
    );
  }

  /* ── DESKTOP ─────────────────────────────────────────── */
  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicNavbarDesktop onSearch={() => navigate("/tim-phong")} />
      <DemoBanner />

      <div style={{ flex: 1, maxWidth: 1040, margin: "0 auto", width: "100%", padding: "40px 32px 80px" }}>
        {/* Page header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: font, fontSize: 28, fontWeight: 800, color: C.textPrimary, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Đăng tin cho thuê
          </h1>
          <p style={{ fontFamily: font, fontSize: 15, color: C.textSecondary, margin: "0 0 6px" }}>
            Điền thông tin phòng để người thuê dễ tìm thấy và liên hệ với bạn.
          </p>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
            <Shield size={13} color={C.secondary} />
            Tin đăng sẽ được kiểm duyệt trước khi hiển thị.
          </p>
        </div>

        {/* Stepper */}
        <Stepper step={step} />

        {/* Form card */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, padding: "32px 36px", boxShadow: "0 2px 16px rgba(92,70,50,0.07)" }}>
          {/* Step title */}
          <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Bước {step + 1} / {STEPS.length}
              </p>
              <h2 style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
                {STEPS[step]}
              </h2>
            </div>
            
            <button type="button" onClick={() => {
              formik.setValues({
                title: "Căn hộ dịch vụ cao cấp Quận 7 full nội thất",
                roomType: "Chung cư mini",
                address: "Hẻm 125 Đường Nguyễn Thị Thập, Tân Phú, Quận 7, TP. Hồ Chí Minh",
                district: "Quận 7",
                area: "35",
                price: "5.800.000",
                maxPeople: "3",
                floor: "3",
                phone: "0987654321",
                curfewType: "curfew",
                curfewTime: "11h đêm (23:00) khóa cổng",
                coords: { lat: 10.7960, lng: 106.7260, address: "Hẻm 125 Đường Nguyễn Thị Thập, Tân Phú, Quận 7, TP. Hồ Chí Minh" },
                amenities: ["ac", "wifi", "bath", "washer", "finger"],
                description: "Căn hộ mới xây, đầy đủ tiện nghi cao cấp, giờ giấc giới nghiêm an toàn, vị trí đắc địa gần các trường đại học lớn.",
                nearby: [
                  { category: "shopping", name: "Lotte Mart Quận 7", dist: "300m" },
                  { category: "edu", name: "Đại học RMIT Việt Nam", dist: "1.2km" },
                  { category: "health", name: "Bệnh viện FV", dist: "600m" },
                  { category: "food", name: "Khu ẩm thực Phú Mỹ Hưng", dist: "1km" }
                ],
                images: [
                  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
                  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
                  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80"
                ],
                electric: "3.500",
                water: "100.000",
                waterUnit: "person",
                service: "150.000",
                deposit: "5.800.000",
                other: "Xe máy 100.000 đ/xe"
              });
              setIsBoosted(true);
            }} style={{ padding: "8px 16px", background: C.caramelSoft, border: `1.5px solid ${C.primary}`, color: C.primary, borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.1s" }}
            onMouseEnter={e => e.currentTarget.style.background = C.cream}
            onMouseLeave={e => e.currentTarget.style.background = C.caramelSoft}>
              ⚡ Điền nhanh dữ liệu mẫu
            </button>
          </div>

          {stepContent()}

          {/* Action bar */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
            {actionBar()}
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "12px 0 0", textAlign: "right" }}>
              Tin sẽ được kiểm duyệt trước khi hiển thị.
            </p>
          </div>
        </div>
      </div>

      <SuccessModal open={success} onView={() => navigate(`/phong/${newRoomId}`)} onManage={() => navigate("/chu-tro/tin-dang")} />
      <PaymentModal open={showPayment} onConfirm={() => handlePostSubmit(true)} onCancel={() => setShowPayment(false)} onSkip={() => handlePostSubmit(false)} />
      <Toast show={toast} message={toastMsg} />
      <DemoFAB />
    </div>
  );
}

/* ══════════════════════════════════════════
   STEP 1 — THÔNG TIN CƠ BẢN
   ══════════════════════════════════════════ */
function Step1({ formik, isMobile }: { formik: any; isMobile?: boolean }) {
  const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <FieldGroup label="Tiêu đề tin" required error={formik.errors.title}>
        <TextInput
          name="title"
          placeholder="VD: Phòng trọ có gác lửng gần ĐH Hutech"
          value={formik.values.title}
          onChange={v => formik.setFieldValue("title", v)}
          onBlur={formik.handleBlur}
          error={!!formik.errors.title}
        />
      </FieldGroup>

      <FieldGroup label="Loại hình" required>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          {ROOM_TYPES.map(t => {
            const sel = formik.values.roomType === t;
            return (
              <button key={t} type="button" onClick={() => formik.setFieldValue("roomType", t)}
                style={{ fontFamily: font, fontSize: 13, fontWeight: sel ? 700 : 400, padding: isMobile ? "10px 16px" : "8px 16px", minHeight: isMobile ? 40 : undefined, borderRadius: 999, border: `1.5px solid ${sel ? C.primary : C.border}`, background: sel ? C.caramelSoft : C.white, color: sel ? C.primary : C.textSecondary, cursor: "pointer", transition: "all 0.14s" }}>
                {t}
              </button>
            );
          })}
        </div>
      </FieldGroup>

      <div style={twoCol}>
        <FieldGroup label="Khu vực" required>
          <SelectInput
            name="district"
            value={formik.values.district}
            onChange={v => formik.setFieldValue("district", v)}
            options={DISTRICTS}
            placeholder="Chọn quận/huyện"
            onBlur={formik.handleBlur}
            error={!!formik.errors.district}
          />
        </FieldGroup>
        <FieldGroup label="Diện tích" required error={formik.errors.area}>
          <TextInput
            name="area"
            placeholder="25"
            value={formik.values.area}
            onChange={v => formik.setFieldValue("area", v)}
            unit="m²"
            onBlur={formik.handleBlur}
            error={!!formik.errors.area}
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Địa chỉ cụ thể" required error={formik.errors.address}>
        <TextInput
          name="address"
          placeholder="Số nhà, tên đường, phường/xã"
          value={formik.values.address}
          onChange={v => formik.setFieldValue("address", v)}
          onBlur={formik.handleBlur}
          error={!!formik.errors.address}
        />
      </FieldGroup>

      {/* Simulated map location picker */}
      <MapPicker
        district={formik.values.district}
        coords={formik.values.coords}
        onChange={val => {
          formik.setFieldValue("coords", val);
          if (val.address) {
            formik.setFieldValue("address", val.address);
          }
        }}
      />

      <div style={twoCol}>
        <FieldGroup label="Giá thuê" required error={formik.errors.price}>
          <TextInput
            name="price"
            placeholder="3.200.000"
            value={formik.values.price}
            onChange={v => formik.setFieldValue("price", formatVND(v))}
            unit="đ/tháng"
            onBlur={formik.handleBlur}
            error={!!formik.errors.price}
          />
        </FieldGroup>
        <FieldGroup label="Số người tối đa">
          <TextInput
            name="maxPeople"
            placeholder="2"
            value={formik.values.maxPeople}
            onChange={v => formik.setFieldValue("maxPeople", v)}
            unit="người"
          />
        </FieldGroup>
      </div>

      <div style={twoCol}>
        <FieldGroup label="Tầng">
          <TextInput
            name="floor"
            placeholder="2"
            value={formik.values.floor}
            onChange={v => formik.setFieldValue("floor", v)}
          />
        </FieldGroup>

        <FieldGroup label="Giờ giấc ra vào" required>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                formik.setFieldValue("curfewType", "free");
                formik.setFieldValue("curfewTime", "");
              }}
              style={{
                flex: 1,
                fontFamily: font,
                fontSize: 13.5,
                fontWeight: formik.values.curfewType === "free" ? 700 : 500,
                padding: "10px 14px",
                borderRadius: 10,
                border: `1.5px solid ${formik.values.curfewType === "free" ? C.primary : C.border}`,
                background: formik.values.curfewType === "free" ? C.caramelSoft : C.white,
                color: formik.values.curfewType === "free" ? C.primary : C.textPrimary,
                cursor: "pointer",
                minHeight: 42
              }}
            >
              Tự do
            </button>
            <button
              type="button"
              onClick={() => formik.setFieldValue("curfewType", "curfew")}
              style={{
                flex: 1,
                fontFamily: font,
                fontSize: 13.5,
                fontWeight: formik.values.curfewType === "curfew" ? 700 : 500,
                padding: "10px 14px",
                borderRadius: 10,
                border: `1.5px solid ${formik.values.curfewType === "curfew" ? C.primary : C.border}`,
                background: formik.values.curfewType === "curfew" ? C.caramelSoft : C.white,
                color: formik.values.curfewType === "curfew" ? C.primary : C.textPrimary,
                cursor: "pointer",
                minHeight: 42
              }}
            >
              Có giờ giới nghiêm
            </button>
          </div>
        </FieldGroup>
      </div>

      {formik.values.curfewType === "curfew" && (
        <FieldGroup label="Chi tiết giờ giới nghiêm" required error={formik.errors.curfewTime}>
          <TextInput
            name="curfewTime"
            placeholder="VD: 11h đêm (23:00) khóa cửa"
            value={formik.values.curfewTime}
            onChange={v => formik.setFieldValue("curfewTime", v)}
            onBlur={formik.handleBlur}
            error={!!formik.errors.curfewTime}
          />
        </FieldGroup>
      )}

      {/* Contact info box */}
      <div style={{ background: C.caramelSoft, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 7 }}>
          <Phone size={14} color={C.primary} /> Thông tin liên hệ chủ trọ
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FieldGroup label="Số điện thoại liên hệ" required error={formik.errors.phone}>
            <TextInput
              name="phone"
              placeholder="09xx xxx xxx"
              value={formik.values.phone}
              onChange={v => formik.setFieldValue("phone", v)}
              type="tel"
              onBlur={formik.handleBlur}
              error={!!formik.errors.phone}
            />
          </FieldGroup>
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "flex-start", gap: 7 }}>
          <Shield size={13} color={C.secondary} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.55 }}>
            Người thuê có thể nhắn tin cho bạn trực tiếp trên Trọ Nhanh. Số điện thoại dùng để liên hệ nhanh khi cần.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   STEP 2 — TIỆN ÍCH & MÔ TẢ & TIỆN ÍCH XUNG QUANH
   ══════════════════════════════════════════ */
function Step2({ formik, isMobile }: { formik: any; isMobile?: boolean }) {
  const [customName, setCustomName] = useState("");
  const [customDist, setCustomDist] = useState("300m");
  const [customCat, setCustomCat] = useState("shopping");

  const toggleAmenity = (key: string) => {
    const isSelected = formik.values.amenities.includes(key);
    const nextVal = isSelected
      ? formik.values.amenities.filter((k: string) => k !== key)
      : [...formik.values.amenities, key];
    formik.setFieldValue("amenities", nextVal);
  };

  const getSuggestedNearby = () => {
    const list = DISTRICT_NEARBY_SUGGESTIONS[formik.values.district] || DEFAULT_NEARBY_SUGGESTIONS;
    return list;
  };

  const toggleNearbyPlace = (place: { category: string; name: string; dist: string }) => {
    const exists = formik.values.nearby.some(
      (n: any) => n.name.toLowerCase() === place.name.toLowerCase()
    );
    if (exists) {
      const filtered = formik.values.nearby.filter(
        (n: any) => n.name.toLowerCase() !== place.name.toLowerCase()
      );
      formik.setFieldValue("nearby", filtered);
    } else {
      formik.setFieldValue("nearby", [...formik.values.nearby, place]);
    }
  };

  const addCustomNearby = () => {
    if (!customName.trim()) return;
    const exists = formik.values.nearby.some(
      (n: any) => n.name.toLowerCase() === customName.trim().toLowerCase()
    );
    if (!exists) {
      formik.setFieldValue("nearby", [
        ...formik.values.nearby,
        { category: customCat, name: customName.trim(), dist: customDist.trim() }
      ]);
    }
    setCustomName("");
    setCustomDist("300m");
  };

  const removeNearbyPlace = (name: string) => {
    formik.setFieldValue(
      "nearby",
      formik.values.nearby.filter((n: any) => n.name.toLowerCase() !== name.toLowerCase())
    );
  };

  const currentSuggested = getSuggestedNearby();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <FieldGroup label="Tiện ích phòng">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 2 }}>
          {AMENITIES_LIST.map(({ key, Icon, label }) => {
            const sel = formik.values.amenities.includes(key);
            return (
              <button key={key} type="button" onClick={() => toggleAmenity(key)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: isMobile ? "10px 15px" : "8px 15px", minHeight: isMobile ? 40 : undefined, borderRadius: 999, border: `1.5px solid ${sel ? C.primary : C.border}`, background: sel ? C.caramelSoft : C.white, color: sel ? C.primary : C.textSecondary, fontFamily: font, fontSize: 13, fontWeight: sel ? 700 : 400, cursor: "pointer", transition: "all 0.14s" }}>
                <Icon size={13} strokeWidth={1.8} />
                {label}
              </button>
            );
          })}
        </div>
      </FieldGroup>

      {/* Vị trí & Tiện ích xung quanh */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px" }}>
        <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
          <MapPin size={16} color={C.primary} /> Vị trí & Tiện ích xung quanh phòng
        </p>

        {/* Suggestion tags */}
        <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: "0 0 8px" }}>Gợi ý địa điểm nổi bật tại {formik.values.district}:</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {currentSuggested.map(place => {
            const isAdded = formik.values.nearby.some((n: any) => n.name.toLowerCase() === place.name.toLowerCase());
            return (
              <button
                key={place.name}
                type="button"
                onClick={() => toggleNearbyPlace(place)}
                style={{
                  fontFamily: font,
                  fontSize: 12,
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: `1px solid ${isAdded ? C.primary : C.border}`,
                  background: isAdded ? C.caramelSoft : C.white,
                  color: isAdded ? C.primary : C.textSecondary,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.12s"
                }}
              >
                {isAdded ? <Check size={11} /> : <Plus size={11} />}
                {place.name} ({place.dist})
              </button>
            );
          })}
        </div>

        {/* Added places list */}
        {formik.values.nearby.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18, background: C.white, borderRadius: 10, padding: 12, border: `1px solid ${C.border}` }}>
            <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textPrimary, margin: "0 0 4px" }}>Địa điểm đã chọn ({formik.values.nearby.length})</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {formik.values.nearby.map((n: any) => (
                <span
                  key={n.name}
                  style={{
                    fontFamily: font,
                    fontSize: 12,
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    padding: "4px 8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: C.textPrimary
                  }}
                >
                  <span style={{ fontSize: 10, background: C.caramelSoft, color: C.primary, padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>
                    {n.category === "shopping" ? "Mua sắm" : n.category === "edu" ? "Học tập" : n.category === "health" ? "Y tế" : "Ẩm thực"}
                  </span>
                  <strong>{n.name}</strong> ({n.dist})
                  <Trash2 size={12} color={C.repairing} style={{ cursor: "pointer" }} onClick={() => removeNearbyPlace(n.name)} />
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Form add custom place */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1.5fr auto", gap: 8, alignItems: "flex-end" }}>
          <div>
            <label style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, display: "block", marginBottom: 4 }}>Tên địa điểm tự nhập</label>
            <TextInput placeholder="VD: Đại học Nguyễn Tất Thành" value={customName} onChange={setCustomName} />
          </div>
          <div>
            <label style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, display: "block", marginBottom: 4 }}>Khoảng cách</label>
            <TextInput placeholder="300m" value={customDist} onChange={setCustomDist} />
          </div>
          <div>
            <label style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, display: "block", marginBottom: 4 }}>Danh mục</label>
            <SelectInput
              value={customCat}
              onChange={setCustomCat}
              options={["shopping", "edu", "health", "food"]}
              placeholder=""
            />
          </div>
          <button
            type="button"
            onClick={addCustomNearby}
            style={{
              height: 42,
              background: C.primary,
              border: "none",
              borderRadius: 10,
              padding: "0 16px",
              color: "white",
              fontFamily: font,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4
            }}
          >
            <Plus size={14} /> Thêm
          </button>
        </div>
      </div>

      <FieldGroup label="Mô tả chi tiết" required error={formik.errors.description}>
        <TextArea
          name="description"
          placeholder="Mô tả tình trạng phòng, nội thất, khu vực xung quanh, đối tượng phù hợp..."
          value={formik.values.description}
          onChange={v => formik.setFieldValue("description", v)}
          onBlur={formik.handleBlur}
          error={!!formik.errors.description}
          rows={6}
        />
        <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "5px 0 0", textAlign: "right" }}>
          {formik.values.description.length} ký tự (tối thiểu 10 ký tự)
        </p>
      </FieldGroup>

      {/* Suggestion box */}
      <div style={{ background: "#FFF8ED", border: `1px solid #E8D5AA`, borderRadius: 12, padding: "16px 18px" }}>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: "#8A6230", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
          💡 Gợi ý viết mô tả tốt
        </p>
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0, lineHeight: 1.7 }}>
          Nên nêu rõ phòng phù hợp với <strong style={{ color: C.textPrimary }}>sinh viên, người đi làm hay cặp đôi</strong>; có gần trường học, chợ, siêu thị, trạm xe buýt không; nội thất gồm những gì.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   STEP 3 — HÌNH ẢNH
   ══════════════════════════════════════════ */
function Step3({ formik }: { formik: any }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files).map(f => URL.createObjectURL(f));
    formik.setFieldValue("images", [...formik.values.images, ...urls]);
  };

  const remove = (i: number) => {
    formik.setFieldValue(
      "images",
      formik.values.images.filter((_: string, idx: number) => idx !== i)
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? C.primary : C.border}`, borderRadius: 14, background: dragging ? C.caramelSoft : C.white, padding: "36px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", transition: "all 0.15s" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Upload size={22} color={C.primary} />
        </div>
        <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Kéo thả hoặc chọn ảnh phòng</p>
        <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0 }}>Tối thiểu 3 ảnh · JPG, PNG · Tối đa 10MB mỗi ảnh</p>
        <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => addFiles(e.target.files)} />
      </div>

      {/* Preview grid */}
      {formik.values.images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {formik.values.images.map((src: string, i: number) => (
            <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "4/3" }}>
              <img src={src} alt={`Ảnh ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <button type="button" onClick={() => remove(i)}
                style={{ position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={13} color="white" />
              </button>
              {i === 0 && (
                <div style={{ position: "absolute", bottom: 6, left: 6, background: C.primary, borderRadius: 5, padding: "2px 8px" }}>
                  <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: "white" }}>Ảnh bìa</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Suggested slots */}
      <div style={{ background: C.caramelSoft, border: `1px solid ${C.border}`, borderRadius: 12, padding: "15px 18px" }}>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 10px" }}>Gợi ý loại ảnh nên có</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {PHOTO_SLOTS.map(slot => (
            <div key={slot} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${C.border}`, background: C.white, flexShrink: 0 }} />
              <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>{slot}</span>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "12px 0 0", lineHeight: 1.6 }}>
          Ảnh nên rõ sáng, chụp ngang, không che góc phòng. Ảnh thật giúp tin đăng đáng tin hơn.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   STEP 4 — CHI PHÍ
   ══════════════════════════════════════════ */
function Step4({
  formik, isMobile, isBoosted, onSelectBoost,
}: { formik: any; isMobile?: boolean; isBoosted: boolean; onSelectBoost: (b: boolean) => void }) {
  
  const formattedRent = formik.values.price ? `${formik.values.price} đ/tháng` : "—";
  const formattedElectric = formik.values.electric ? `${formik.values.electric} đ/kWh` : "—";
  
  const getWaterSuffix = () => {
    return formik.values.waterUnit === "person" ? "đ/người" : "đ/m³";
  };
  const formattedWater = formik.values.water ? `${formik.values.water} ${getWaterSuffix()}` : "—";
  
  const formattedService = formik.values.service ? `${formik.values.service} đ/tháng` : "—";
  const formattedDeposit = formik.values.deposit ? `${formik.values.deposit} đ` : "—";

  const costRows = [
    { label: "Giá thuê phòng", value: formattedRent },
    { label: "Tiền điện",      value: formattedElectric },
    { label: "Tiền nước",      value: formattedWater },
    { label: "Phí dịch vụ",    value: formattedService },
    { label: "Tiền đặt cọc",   value: formattedDeposit },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        <FieldGroup label="Tiền điện (ví dụ: 3.500)" required error={formik.errors.electric}>
          <TextInput
            name="electric"
            placeholder="3.500"
            value={formik.values.electric}
            onChange={v => formik.setFieldValue("electric", formatVND(v))}
            unit="đ/kWh"
            onBlur={formik.handleBlur}
            error={!!formik.errors.electric}
          />
        </FieldGroup>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <Label required>Tiền nước</Label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => formik.setFieldValue("waterUnit", "person")}
              style={{
                flex: 1,
                fontFamily: font,
                fontSize: 12.5,
                fontWeight: formik.values.waterUnit === "person" ? 700 : 500,
                padding: "8px 12px",
                borderRadius: 8,
                border: `1.5px solid ${formik.values.waterUnit === "person" ? C.primary : C.border}`,
                background: formik.values.waterUnit === "person" ? C.caramelSoft : C.white,
                color: formik.values.waterUnit === "person" ? C.primary : C.textPrimary,
                cursor: "pointer"
              }}
            >
              Theo đầu người
            </button>
            <button
              type="button"
              onClick={() => formik.setFieldValue("waterUnit", "cubic")}
              style={{
                flex: 1,
                fontFamily: font,
                fontSize: 12.5,
                fontWeight: formik.values.waterUnit === "cubic" ? 700 : 500,
                padding: "8px 12px",
                borderRadius: 8,
                border: `1.5px solid ${formik.values.waterUnit === "cubic" ? C.primary : C.border}`,
                background: formik.values.waterUnit === "cubic" ? C.caramelSoft : C.white,
                color: formik.values.waterUnit === "cubic" ? C.primary : C.textPrimary,
                cursor: "pointer"
              }}
            >
              Theo số khối (m³)
            </button>
          </div>
          <TextInput
            name="water"
            placeholder={formik.values.waterUnit === "person" ? "100.000" : "20.000"}
            value={formik.values.water}
            onChange={v => formik.setFieldValue("water", formatVND(v))}
            unit={getWaterSuffix()}
            onBlur={formik.handleBlur}
            error={!!formik.errors.water}
          />
          {formik.errors.water && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
              <AlertCircle size={12} color={C.repairing} />
              <span style={{ fontFamily: font, fontSize: 12, color: C.repairing }}>{formik.errors.water}</span>
            </div>
          )}
        </div>

        <FieldGroup label="Phí dịch vụ khác (nếu có)">
          <TextInput
            name="service"
            placeholder="150.000"
            value={formik.values.service}
            onChange={v => formik.setFieldValue("service", formatVND(v))}
            unit="đ/tháng"
          />
        </FieldGroup>

        <FieldGroup label="Tiền đặt cọc (thông thường 1 tháng tiền phòng)">
          <TextInput
            name="deposit"
            placeholder="3.200.000"
            value={formik.values.deposit}
            onChange={v => formik.setFieldValue("deposit", formatVND(v))}
            unit="đ"
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Chi phí khác (ví dụ: Phí gửi xe, phí rác...)">
        <TextInput
          name="other"
          placeholder="VD: Xe máy 100.000đ/xe, rác 20.000đ/phòng"
          value={formik.values.other}
          onChange={v => formik.setFieldValue("other", v)}
        />
      </FieldGroup>

      {/* Summary card */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(135deg, ${C.primaryDark} 0%, ${C.primary} 100%)`, padding: "14px 20px" }}>
          <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.cream, margin: 0 }}>Tóm tắt chi phí</p>
        </div>
        <div style={{ padding: "4px 0" }}>
          {costRows.map(({ label, value }, i) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 20px", background: i === 0 ? C.caramelSoft : undefined, borderBottom: i < costRows.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, fontWeight: i === 0 ? 600 : 400 }}>{label}</span>
              <span style={{ fontFamily: font, fontSize: i === 0 ? 15 : 13, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? C.primary : C.textPrimary }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upsell / Boost package choices */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
        <Label>Gói tin đăng</Label>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          {/* Free option */}
          <div 
            onClick={() => onSelectBoost(false)}
            style={{ 
              border: `2px solid ${!isBoosted ? C.primary : C.border}`,
              borderRadius: 14, padding: "18px 20px", cursor: "pointer", background: C.white,
              display: "flex", flexDirection: "column", gap: 6, position: "relative",
              transition: "all 0.15s"
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Gói Thường</p>
              <span style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary }}>Miễn phí</span>
            </div>
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Hiển thị tiêu chuẩn trên hệ thống, không ưu tiên đẩy tin.
            </p>
          </div>

          {/* VIP option */}
          <div 
            onClick={() => onSelectBoost(true)}
            style={{ 
              border: `2px solid ${isBoosted ? C.repairing : C.border}`,
              borderRadius: 14, padding: "18px 20px", cursor: "pointer", background: isBoosted ? "#FEF6EC" : C.white,
              display: "flex", flexDirection: "column", gap: 6, position: "relative",
              transition: "all 0.15s"
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <p style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Đẩy tin VIP</p>
                <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: C.white, background: C.repairing, borderRadius: 4, padding: "1px 6px" }}>★ HOT</span>
              </div>
              <span style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.repairing }}>100.000 đ</span>
            </div>
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Tin được ưu tiên hiển thị đầu trang kết quả trong 7 ngày.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
