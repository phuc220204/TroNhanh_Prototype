import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown,
  Upload, X, Wind, Wifi, Layers, Car, Bath, Clock,
  Refrigerator, WashingMachine, Fingerprint, ParkingCircle, PawPrint,
  Zap, Droplets, Wrench, Key, Phone, MessageSquare,
  TrendingUp, AlertCircle, Shield,
  CheckCircle,
} from "lucide-react";
import { C, font } from "../theme";
import { useBreakpoint } from "../components/useBreakpoint";
import { PublicNavbarDesktop, DemoFAB } from "../components/PublicNavbar";
import { DemoBanner } from "../components/common/DemoBanner";

/* ══════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════ */
const STEPS = [
  "Thông tin cơ bản",
  "Tiện ích & mô tả",
  "Hình ảnh",
  "Chi phí",
];

const ROOM_TYPES = [
  "Phòng trọ",
  "Căn hộ mini",
  "Căn hộ dịch vụ",
  "Ký túc xá",
  "Nhà nguyên căn",
  "Ở ghép",
];

const DISTRICTS = ["Quận 7", "Bình Thạnh", "Thủ Đức", "Gò Vấp", "Quận 10"];

const ROOM_STATUS = [
  { value: "empty",  label: "Còn trống",  color: "#4A7A34", bg: "#E8F5E1" },
  { value: "soon",   label: "Sắp trống",  color: C.repairing, bg: "#FDF0E4" },
  { value: "repair", label: "Đang sửa",   color: C.textSecondary, bg: C.caramelSoft },
];

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

/* ══════════════════════════════════════════
   PRIMITIVES
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
  placeholder, value, onChange, unit, type = "text", error,
}: {
  placeholder?: string; value: string; onChange: (v: string) => void;
  unit?: string; type?: string; error?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1.5px solid ${error ? C.repairing : focused ? C.primary : C.border}`, borderRadius: 10, overflow: "hidden", transition: "border-color 0.15s" }}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", border: "none", outline: "none", background: "transparent", minWidth: 0 }}
      />
      {unit && (
        <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, padding: "0 12px", borderLeft: `1px solid ${C.border}`, flexShrink: 0 }}>{unit}</span>
      )}
    </div>
  );
}

function SelectInput({
  value, onChange, options, placeholder,
}: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ width: "100%", fontFamily: font, fontSize: 14, color: value ? C.textPrimary : C.textSecondary, padding: "11px 36px 11px 14px", background: C.white, border: `1.5px solid ${focused ? C.primary : C.border}`, borderRadius: 10, outline: "none", appearance: "none", cursor: "pointer", transition: "border-color 0.15s" }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={15} color={C.textSecondary} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
    </div>
  );
}

function TextArea({
  placeholder, value, onChange, rows = 5,
}: { placeholder?: string; value: string; onChange: (v: string) => void; rows?: number }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ width: "100%", fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "11px 14px", background: C.white, border: `1.5px solid ${focused ? C.primary : C.border}`, borderRadius: 10, outline: "none", resize: "vertical", lineHeight: 1.65, transition: "border-color 0.15s", boxSizing: "border-box" }}
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

function OutlineBtn({ label, onClick, icon }: { label: string; onClick?: () => void; icon?: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "12px 22px", background: hov ? C.caramelSoft : "transparent", color: C.primary, border: `1.5px solid ${C.primary}`, borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "background 0.13s" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {icon}{label}
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
   DESKTOP STEPPER
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

/* ══════════════════════════════════════════
   MOBILE PROGRESS DOTS
══════════════════════════════════════════ */
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
   STEP 1 — THÔNG TIN CƠ BẢN
══════════════════════════════════════════ */
function Step1({
  data, onChange, errors, isMobile,
}: {
  data: Step1Data;
  onChange: (d: Partial<Step1Data>) => void;
  errors: Partial<Record<keyof Step1Data, string>>;
  isMobile?: boolean;
}) {
  /* Mobile: stack 1 cột để field không bị chen / cắt nội dung. */
  const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <FieldGroup label="Tiêu đề tin" required error={errors.title}>
        <TextInput placeholder='VD: Phòng trọ có gác lửng gần ĐH Hutech' value={data.title} onChange={v => onChange({ title: v })} error={!!errors.title} />
      </FieldGroup>

      <FieldGroup label="Loại hình" required>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          {ROOM_TYPES.map(t => {
            const sel = data.roomType === t;
            return (
              <button key={t} onClick={() => onChange({ roomType: t })}
                style={{ fontFamily: font, fontSize: 13, fontWeight: sel ? 700 : 400, padding: isMobile ? "10px 16px" : "8px 16px", minHeight: isMobile ? 40 : undefined, borderRadius: 999, border: `1.5px solid ${sel ? C.primary : C.border}`, background: sel ? C.caramelSoft : C.white, color: sel ? C.primary : C.textSecondary, cursor: "pointer", transition: "all 0.14s" }}>
                {t}
              </button>
            );
          })}
        </div>
      </FieldGroup>

      <FieldGroup label="Địa chỉ" required error={errors.address}>
        <TextInput placeholder="Số nhà, tên đường, phường/xã, quận/huyện" value={data.address} onChange={v => onChange({ address: v })} error={!!errors.address} />
      </FieldGroup>

      <div style={twoCol}>
        <FieldGroup label="Khu vực" required>
          <SelectInput value={data.district} onChange={v => onChange({ district: v })} options={DISTRICTS} placeholder="Chọn quận/huyện" />
        </FieldGroup>
        <FieldGroup label="Diện tích" required error={errors.area}>
          <TextInput placeholder="25" value={data.area} onChange={v => onChange({ area: v })} unit="m²" error={!!errors.area} />
        </FieldGroup>
      </div>

      <div style={twoCol}>
        <FieldGroup label="Giá thuê" required error={errors.price}>
          <TextInput placeholder="3.200.000" value={data.price} onChange={v => onChange({ price: v })} unit="đ/tháng" error={!!errors.price} />
        </FieldGroup>
        <FieldGroup label="Số người tối đa">
          <TextInput placeholder="2" value={data.maxPeople} onChange={v => onChange({ maxPeople: v })} unit="người" />
        </FieldGroup>
      </div>

      <div style={twoCol}>
        <FieldGroup label="Tầng">
          <TextInput placeholder="2" value={data.floor} onChange={v => onChange({ floor: v })} />
        </FieldGroup>
        <FieldGroup label="Trạng thái phòng">
          <div style={{ display: "flex", gap: 8 }}>
            {ROOM_STATUS.map(s => {
              const sel = data.status === s.value;
              return (
                <button key={s.value} onClick={() => onChange({ status: s.value })}
                  style={{ flex: 1, fontFamily: font, fontSize: 12, fontWeight: sel ? 700 : 500, padding: "10px 8px", minHeight: isMobile ? 44 : undefined, borderRadius: 9, border: `1.5px solid ${sel ? s.color : C.border}`, background: sel ? s.bg : C.white, color: sel ? s.color : C.textSecondary, cursor: "pointer", transition: "all 0.14s" }}>
                  {s.label}
                </button>
              );
            })}
          </div>
        </FieldGroup>
      </div>

      {/* Contact */}
      <div style={{ background: C.caramelSoft, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 7 }}>
          <Phone size={14} color={C.primary} /> Thông tin liên hệ chủ trọ
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FieldGroup label="Số điện thoại liên hệ" required error={errors.phone}>
            <TextInput placeholder="09xx xxx xxx" value={data.phone} onChange={v => onChange({ phone: v })} type="tel" error={!!errors.phone} />
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
   STEP 2 — TIỆN ÍCH & MÔ TẢ
══════════════════════════════════════════ */
function Step2({
  data, onChange, isMobile,
}: { data: Step2Data; onChange: (d: Partial<Step2Data>) => void; isMobile?: boolean }) {
  const toggle = (key: string) => {
    const next = data.amenities.includes(key)
      ? data.amenities.filter(k => k !== key)
      : [...data.amenities, key];
    onChange({ amenities: next });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <FieldGroup label="Tiện ích phòng">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 2 }}>
          {AMENITIES_LIST.map(({ key, Icon, label }) => {
            const sel = data.amenities.includes(key);
            return (
              <button key={key} onClick={() => toggle(key)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: isMobile ? "10px 15px" : "8px 15px", minHeight: isMobile ? 40 : undefined, borderRadius: 999, border: `1.5px solid ${sel ? C.primary : C.border}`, background: sel ? C.caramelSoft : C.white, color: sel ? C.primary : C.textSecondary, fontFamily: font, fontSize: 13, fontWeight: sel ? 700 : 400, cursor: "pointer", transition: "all 0.14s" }}>
                <Icon size={13} strokeWidth={1.8} />
                {label}
              </button>
            );
          })}
        </div>
      </FieldGroup>

      <FieldGroup label="Mô tả chi tiết">
        <TextArea
          placeholder="Mô tả tình trạng phòng, nội thất, khu vực xung quanh, đối tượng phù hợp..."
          value={data.description}
          onChange={v => onChange({ description: v })}
          rows={6}
        />
        <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "5px 0 0", textAlign: "right" }}>
          {data.description.length} ký tự
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
function Step3({
  data, onChange, error,
}: { data: Step3Data; onChange: (d: Partial<Step3Data>) => void; error?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files).map(f => URL.createObjectURL(f));
    onChange({ images: [...data.images, ...urls] });
  };

  const remove = (i: number) => {
    onChange({ images: data.images.filter((_, idx) => idx !== i) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? C.primary : error ? C.repairing : C.border}`, borderRadius: 14, background: dragging ? C.caramelSoft : C.white, padding: "36px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", transition: "all 0.15s" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Upload size={22} color={C.primary} />
        </div>
        <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Kéo thả hoặc chọn ảnh phòng</p>
        <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0 }}>Tối thiểu 3 ảnh · JPG, PNG · Tối đa 10MB mỗi ảnh</p>
        <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => addFiles(e.target.files)} />
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <AlertCircle size={13} color={C.repairing} />
          <span style={{ fontFamily: font, fontSize: 12, color: C.repairing }}>{error}</span>
        </div>
      )}

      {/* Preview grid */}
      {data.images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {data.images.map((src, i) => (
            <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "4/3" }}>
              <img src={src} alt={`Ảnh ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <button onClick={() => remove(i)}
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
  data, onChange, price, isMobile,
}: { data: Step4Data; onChange: (d: Partial<Step4Data>) => void; price: string; isMobile?: boolean }) {
  const costRows = [
    { label: "Giá thuê",    value: price ? `${price} đ/tháng` : "—" },
    { label: "Điện",        value: data.electric || "—" },
    { label: "Nước",        value: data.water    || "—" },
    { label: "Dịch vụ",     value: data.service  || "—" },
    { label: "Cọc",         value: data.deposit  || "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        <FieldGroup label="Tiền điện" hint="VD: 3.500 đ/kWh">
          <TextInput placeholder="3.500 đ/kWh" value={data.electric} onChange={v => onChange({ electric: v })} />
        </FieldGroup>
        <FieldGroup label="Tiền nước" hint="VD: 100.000 đ/người">
          <TextInput placeholder="100.000 đ/người" value={data.water} onChange={v => onChange({ water: v })} />
        </FieldGroup>
        <FieldGroup label="Phí dịch vụ" hint="VD: 150.000 đ/tháng">
          <TextInput placeholder="150.000 đ/tháng" value={data.service} onChange={v => onChange({ service: v })} />
        </FieldGroup>
        <FieldGroup label="Tiền cọc" hint="VD: 1 tháng">
          <TextInput placeholder="1 tháng" value={data.deposit} onChange={v => onChange({ deposit: v })} />
        </FieldGroup>
      </div>

      <FieldGroup label="Chi phí khác (nếu có)">
        <TextInput placeholder="VD: Phí rác 20.000 đ/tháng" value={data.other} onChange={v => onChange({ other: v })} />
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

      {/* Upsell card */}
      <div style={{ background: "#FEF6EC", border: `1.5px solid ${C.repairing}`, borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FDE4CA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <TrendingUp size={18} color={C.repairing} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <p style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Đẩy tin nổi bật</p>
            <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.repairing, background: "#FDE4CA", borderRadius: 999, padding: "2px 9px" }}>Trả phí</span>
          </div>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 12px", lineHeight: 1.55 }}>
            Tin được ưu tiên hiển thị đầu kết quả tìm kiếm, tiếp cận nhiều người thuê hơn.
          </p>
          <button style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.repairing, background: "transparent", border: `1.5px solid ${C.repairing}`, borderRadius: 8, padding: "7px 16px", cursor: "pointer" }}>
            Tìm hiểu thêm
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SUCCESS MODAL
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

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function Toast({ show, message }: { show: boolean; message: string }) {
  return (
    <div style={{ position: "fixed", bottom: 32, left: "50%", transform: `translateX(-50%) translateY(${show ? 0 : 20}px)`, opacity: show ? 1 : 0, transition: "all 0.25s", zIndex: 600, background: C.primaryDark, borderRadius: 10, padding: "12px 22px", pointerEvents: "none" }}>
      <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.cream }}>{message}</span>
    </div>
  );
}

/* ══════════════════════════════════════════
   FORM STATE TYPES
══════════════════════════════════════════ */
interface Step1Data {
  title: string; roomType: string; address: string; district: string;
  area: string; price: string; maxPeople: string; floor: string; status: string;
  phone: string;
}
interface Step2Data { amenities: string[]; description: string; }
interface Step3Data { images: string[]; }
interface Step4Data { electric: string; water: string; service: string; deposit: string; other: string; }

const initStep1: Step1Data = { title: "", roomType: "Phòng trọ", address: "", district: "", area: "", price: "", maxPeople: "", floor: "", status: "empty", phone: "" };
const initStep2: Step2Data = { amenities: [], description: "" };
const initStep3: Step3Data = { images: [] };
const initStep4: Step4Data = { electric: "", water: "", service: "", deposit: "", other: "" };

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export function DangTinPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useBreakpoint();

  const prefill = (location.state as { prefill?: Partial<Step1Data> } | null)?.prefill ?? {};

  const [step,    setStep]    = useState(0);
  const [step1,   setStep1]   = useState<Step1Data>({ ...initStep1, ...prefill });
  const [step2,   setStep2]   = useState<Step2Data>(initStep2);
  const [step3,   setStep3]   = useState<Step3Data>(initStep3);
  const [step4,   setStep4]   = useState<Step4Data>(initStep4);
  const [errors,  setErrors]  = useState<Partial<Record<keyof Step1Data, string>>>({});
  const [imgErr,  setImgErr]  = useState("");
  const [success, setSuccess] = useState(false);
  const [toast,   setToast]   = useState(false);

  const showToast = (msg: string) => {
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  const validateStep1 = () => {
    const e: Partial<Record<keyof Step1Data, string>> = {};
    if (!step1.title.trim())   e.title   = "Vui lòng nhập tiêu đề tin";
    if (!step1.address.trim()) e.address = "Vui lòng nhập địa chỉ";
    if (!step1.area.trim())    e.area    = "Vui lòng nhập diện tích";
    if (!step1.price.trim())   e.price   = "Vui lòng nhập giá thuê";
    if (!step1.phone.trim())   e.phone   = "Số điện thoại chưa hợp lệ";
    else if (!/^0\d{8,9}$/.test(step1.phone.replace(/\s/g, ""))) e.phone = "Số điện thoại chưa hợp lệ";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    if (step3.images.length < 3) {
      setImgErr("Vui lòng tải ít nhất 3 ảnh");
      return false;
    }
    setImgErr("");
    return true;
  };

  const next = () => {
    if (step === 0 && !validateStep1()) return;
    if (step === 2 && !validateStep3()) return;
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else setSuccess(true);
  };

  const back = () => { if (step > 0) setStep(s => s - 1); };

  const saveDraft = () => { showToast("Đã lưu nháp"); };

  const stepContent = () => {
    if (step === 0) return <Step1 data={step1} onChange={d => setStep1(p => ({ ...p, ...d }))} errors={errors} isMobile={isMobile} />;
    if (step === 1) return <Step2 data={step2} onChange={d => setStep2(p => ({ ...p, ...d }))} isMobile={isMobile} />;
    if (step === 2) return <Step3 data={step3} onChange={d => setStep3(p => ({ ...p, ...d }))} error={imgErr} />;
    return <Step4 data={step4} onChange={d => setStep4(p => ({ ...p, ...d }))} price={step1.price} isMobile={isMobile} />;
  };

  const actionBar = (mobile?: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: mobile ? "wrap" : undefined }}>
      <div style={{ display: "flex", gap: 8 }}>
        {step > 0 && <GhostBtn label="Quay lại" icon={<ArrowLeft size={14} />} onClick={back} />}
        <GhostBtn label="Lưu nháp" onClick={saveDraft} />
      </div>
      <PrimaryBtn
        label={step === STEPS.length - 1 ? "Đăng tin" : "Tiếp tục"}
        icon={step < STEPS.length - 1 ? <ArrowRight size={15} /> : <Check size={15} />}
        onClick={next}
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
          <button onClick={next}
            style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "14px", background: C.primary, color: C.white, border: "none", borderRadius: 12, fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer", minHeight: 50 }}>
            {step === STEPS.length - 1 ? <><Check size={16} /> Đăng tin</> : <>Tiếp tục <ArrowRight size={15} /></>}
          </button>
        </div>

        <SuccessModal open={success} onView={() => navigate("/room/1")} onManage={() => navigate("/chu-tro/quan-ly")} />
        <Toast show={toast} message="Đã lưu nháp" />
      </div>
    );
  }

  /* ── DESKTOP ─────────────────────────────────────────── */
  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicNavbarDesktop onSearch={() => navigate("/search")} />
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
          <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Bước {step + 1} / {STEPS.length}
            </p>
            <h2 style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
              {STEPS[step]}
            </h2>
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

      <SuccessModal open={success} onView={() => navigate("/room/1")} onManage={() => navigate("/chu-tro/quan-ly")} />
      <Toast show={toast} message="Đã lưu nháp" />
      <DemoFAB />
    </div>
  );
}
