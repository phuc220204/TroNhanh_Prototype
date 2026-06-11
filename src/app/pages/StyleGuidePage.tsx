import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Heart, MapPin, Wifi, Wind, Car, Bath, Clock, Layers, PawPrint,
  Home, Search, Bell, User, Phone, MessageCircle,
  SlidersHorizontal, ChevronRight, Star, X, ArrowLeft,
  Shield, Settings, PlusCircle,
} from "lucide-react";
import { StyleSection } from "../components/StyleSection";

/* ══════════════════════════════════════════
   DESIGN TOKENS  (single source of truth)
══════════════════════════════════════════ */
const C = {
  primary:        "#8A6A45",
  primaryHover:   "#73572F",
  primaryPress:   "#5C4632",
  primaryDark:    "#5C4632",
  secondary:      "#B08D63",
  secondaryHover: "#9A784F",
  secondaryPress: "#836237",
  sand:           "#C2A982",
  cream:          "#E8DEC9",
  bg:             "#F5EFE4",
  textPrimary:    "#3E2E1E",
  textSecondary:  "#7A6A55",
  border:         "#DDD0BC",
  white:          "#FFFFFF",
  available:      "#6B8E5A",
  rented:         "#9B8C78",
  repairing:      "#C07B4A",
  error:          "#B5503C",
  warning:        "#C8861A",
};
const font = "'Be Vietnam Pro', Inter, system-ui, sans-serif";

/* ── helpers ── */
const row = (style: React.CSSProperties = {}): React.CSSProperties => ({
  display: "flex", alignItems: "center", ...style,
});
const col = (style: React.CSSProperties = {}): React.CSSProperties => ({
  display: "flex", flexDirection: "column", ...style,
});

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: C.textSecondary,
      textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
      {children}
    </span>
  );
}

/* ══════════════════════════════════════════
   BUTTON (interactive, shared across guide)
══════════════════════════════════════════ */
type BtnVariant = "primary" | "secondary" | "outline" | "ghost";

function Btn({
  variant = "primary", label, icon, fullWidth, size = "md", disabled, onClick,
}: {
  variant?: BtnVariant; label: string; icon?: React.ReactNode;
  fullWidth?: boolean; size?: "sm" | "md" | "lg"; disabled?: boolean; onClick?: () => void;
}) {
  const [s, setS] = useState<"idle" | "hover" | "pressed">("idle");
  const map: Record<BtnVariant, Record<string, React.CSSProperties>> = {
    primary: {
      idle:     { background: C.primary,        color: C.white, border: "none" },
      hover:    { background: C.primaryHover,   color: C.white, border: "none" },
      pressed:  { background: C.primaryPress,   color: C.white, border: "none" },
      disabled: { background: "#D8C9B2",        color: "#A8987F", border: "none" },
    },
    secondary: {
      idle:     { background: C.secondary,      color: C.white, border: "none" },
      hover:    { background: C.secondaryHover, color: C.white, border: "none" },
      pressed:  { background: C.secondaryPress, color: C.white, border: "none" },
      disabled: { background: "#E0D4BF",        color: "#C0B09A", border: "none" },
    },
    outline: {
      idle:     { background: "transparent",    color: C.primary,      border: `1.5px solid ${C.primary}` },
      hover:    { background: "#F0E7D6",         color: C.primary,      border: `1.5px solid ${C.primary}` },
      pressed:  { background: "#F0E7D6",         color: C.primaryPress, border: `1.5px solid ${C.primaryPress}` },
      disabled: { background: "transparent",    color: "#C0B09A",      border: `1.5px solid #D8C9B2` },
    },
    ghost: {
      idle:     { background: "transparent",    color: C.textSecondary, border: "none" },
      hover:    { background: C.cream,          color: C.primaryDark,   border: "none" },
      pressed:  { background: C.border,         color: C.primaryDark,   border: "none" },
      disabled: { background: "transparent",    color: "#C0B09A",       border: "none" },
    },
  };
  const pad = size === "sm" ? "7px 16px" : size === "lg" ? "14px 28px" : "10px 22px";
  const fs  = size === "sm" ? 13 : size === "lg" ? 16 : 14;
  const key = disabled ? "disabled" : s;
  return (
    <button
      disabled={disabled} onClick={onClick}
      style={{ fontFamily: font, fontSize: fs, fontWeight: 600, borderRadius: 10, padding: pad,
        width: fullWidth ? "100%" : undefined, justifyContent: fullWidth ? "center" : undefined,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center", gap: 6,
        transition: "background 0.12s, color 0.12s", ...map[variant][key],
      }}
      onMouseEnter={() => !disabled && setS("hover")}
      onMouseLeave={() => !disabled && setS("idle")}
      onMouseDown={() => !disabled && setS("pressed")}
      onMouseUp={() => !disabled && setS("hover")}
    >{icon}{label}</button>
  );
}

/* ── Frozen state swatch for comparison table ── */
function BtnSwatch({
  variant, state, label,
}: { variant: BtnVariant; state: "default" | "hover" | "pressed" | "disabled"; label: string }) {
  const map: Record<BtnVariant, Record<string, React.CSSProperties>> = {
    primary: {
      default:  { background: C.primary,       color: C.white, border: "none" },
      hover:    { background: C.primaryHover,  color: C.white, border: "none" },
      pressed:  { background: C.primaryPress,  color: C.white, border: "none" },
      disabled: { background: "#D8C9B2",       color: "#A8987F", border: "none" },
    },
    secondary: {
      default:  { background: C.secondary,       color: C.white, border: "none" },
      hover:    { background: C.secondaryHover,  color: C.white, border: "none" },
      pressed:  { background: C.secondaryPress,  color: C.white, border: "none" },
      disabled: { background: "#E0D4BF",         color: "#C0B09A", border: "none" },
    },
    outline: {
      default:  { background: "transparent", color: C.primary,      border: `1.5px solid ${C.primary}` },
      hover:    { background: "#F0E7D6",     color: C.primary,      border: `1.5px solid ${C.primary}` },
      pressed:  { background: "#F0E7D6",     color: C.primaryPress, border: `1.5px solid ${C.primaryPress}` },
      disabled: { background: "transparent", color: "#C0B09A",      border: `1.5px solid #D8C9B2` },
    },
    ghost: {
      default:  { background: "transparent", color: C.textSecondary, border: "none" },
      hover:    { background: C.cream,       color: C.primaryDark,   border: "none" },
      pressed:  { background: C.border,      color: C.primaryDark,   border: "none" },
      disabled: { background: "transparent", color: "#C0B09A",       border: "none" },
    },
  };
  const stateLabel: Record<string, string> = {
    default: "Mặc định", hover: "Hover", pressed: "Nhấn", disabled: "Vô hiệu",
  };
  return (
    <div style={col({ alignItems: "center", gap: 6 })}>
      <button disabled={state === "disabled"}
        style={{ fontFamily: font, fontSize: 13, fontWeight: 600, borderRadius: 10,
          padding: "9px 18px", cursor: "default",
          display: "inline-flex", alignItems: "center",
          ...map[variant][state],
        }}
      >{label}</button>
      <span style={{ fontFamily: font, fontSize: 10, color: C.textSecondary }}>{stateLabel[state]}</span>
      {variant === "primary" && (
        <span style={{ fontFamily: font, fontSize: 9, color: C.sand }}>
          {state === "default" ? "#8A6A45" : state === "hover" ? "#73572F" : state === "pressed" ? "#5C4632" : "#D8C9B2"}
        </span>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   SECTION 1 — COLOR PALETTE
══════════════════════════════════════════ */
const PALETTE = [
  { hex: C.primary,        name: "Primary",        vi: "Nâu cát đậm",  usage: "Nút CTA, giá tiền, brand trên nền sáng" },
  { hex: C.primaryDark,    name: "Primary Dark",   vi: "Espresso",      usage: "Top nav, footer, nền tối nhấn mạnh" },
  { hex: C.secondary,      name: "Secondary",      vi: "Nâu vừa",       usage: "Nút phụ, icon active, viền nhấn" },
  { hex: C.sand,           name: "Sand",           vi: "Cát đậm",       usage: "Badge, fill phụ, icon inactive" },
  { hex: C.cream,          name: "Cream",          vi: "Kem",           usage: "Nền thẻ, nền phụ, brand trên nav tối" },
  { hex: C.bg,             name: "Background",     vi: "Kem sáng",      usage: "Nền chính trang" },
  { hex: C.textPrimary,    name: "Text Primary",   vi: "Nâu đậm",       usage: "Chữ chính (WCAG AA trên cream)" },
  { hex: C.textSecondary,  name: "Text Secondary", vi: "Nâu xám",       usage: "Caption, chữ phụ" },
  { hex: C.border,         name: "Border",         vi: "Viền cát",      usage: "Viền thẻ, đường kẻ" },
  { hex: C.white,          name: "White",          vi: "Trắng",         usage: "Chữ trên nền tối, nền input" },
];
const STATUS_COLORS = [
  { hex: C.available, label: "Trống",    desc: "Phòng còn trống (#6B8E5A)" },
  { hex: C.rented,    label: "Đã thuê", desc: "Đã có người thuê (#9B8C78)" },
  { hex: C.repairing, label: "Đang sửa",desc: "Đang bảo trì (#C07B4A)" },
  { hex: C.error,     label: "Lỗi",     desc: "Form error (#B5503C)" },
  { hex: C.warning,   label: "Cảnh báo",desc: "Warning (#C8861A)" },
];

function ColorSwatch({ hex, name, vi, usage }: typeof PALETTE[0]) {
  const light = ["#F5EFE4", "#E8DEC9", "#FFFFFF", "#DDD0BC", "#C2A982"].includes(hex);
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, background: C.white }}>
      <div style={{ height: 72, background: hex, display: "flex", alignItems: "flex-end", padding: "6px 10px" }}>
        <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: light ? C.textPrimary : "#fff", opacity: 0.8 }}>{hex}</span>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{name}</p>
        <p style={{ fontFamily: font, fontSize: 11, color: C.secondary, margin: "2px 0 4px" }}>{vi}</p>
        <p style={{ fontFamily: font, fontSize: 10, color: C.textSecondary, margin: 0, lineHeight: 1.4 }}>{usage}</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SECTION 2 — TYPOGRAPHY
══════════════════════════════════════════ */
const TYPE_SCALE = [
  { name: "H1",          size: 34, weight: 700, lh: 1.2,  color: C.textPrimary,  sample: "Tìm đúng phòng. Quản đúng cách." },
  { name: "H2",          size: 24, weight: 600, lh: 1.3,  color: C.textPrimary,  sample: "Phòng nổi bật tại TP. HCM" },
  { name: "H3",          size: 18, weight: 600, lh: 1.4,  color: C.textPrimary,  sample: "Tiện ích phòng trọ" },
  { name: "Body",        size: 15, weight: 400, lh: 1.6,  color: C.textPrimary,  sample: "Phòng trọ & căn hộ dịch vụ — tìm nhanh, minh bạch, an toàn." },
  { name: "Caption",     size: 13, weight: 400, lh: 1.5,  color: C.textSecondary,sample: "Cập nhật lần cuối: hôm nay 09:41" },
  { name: "Label",       size: 13, weight: 600, lh: 1.4,  color: C.textPrimary,  sample: "Khoảng giá thuê" },
  { name: "Price Large", size: 28, weight: 700, lh: 1.15, color: C.primary,      sample: "3.200.000 đ/tháng" },
];

/* ══════════════════════════════════════════
   SECTION 3 — SPACING & LAYOUT
══════════════════════════════════════════ */
const SPACINGS  = [4, 8, 12, 16, 24, 32];
const RADII = [
  { label: "sm / 8px",  r: 8,   w: 64, h: 48 },
  { label: "md / 12px", r: 12,  w: 64, h: 48 },
  { label: "lg / 14px", r: 14,  w: 64, h: 48 },
  { label: "pill",      r: 999, w: 80, h: 36 },
  { label: "circle",    r: 999, w: 48, h: 48 },
];

/* ══════════════════════════════════════════
   SECTION 4 — ICONOGRAPHY
══════════════════════════════════════════ */
const ICONS = [
  { Icon: Home,             label: "Trang chủ" },
  { Icon: Search,           label: "Tìm kiếm" },
  { Icon: MapPin,           label: "Vị trí" },
  { Icon: Heart,            label: "Yêu thích" },
  { Icon: Wifi,             label: "Wifi" },
  { Icon: Wind,             label: "Máy lạnh" },
  { Icon: Car,              label: "Để xe" },
  { Icon: Bath,             label: "WC riêng" },
  { Icon: Clock,            label: "Giờ tự do" },
  { Icon: Layers,           label: "Gác lửng" },
  { Icon: PawPrint,         label: "Thú cưng" },
  { Icon: Bell,             label: "Thông báo" },
  { Icon: User,             label: "Tài khoản" },
  { Icon: Phone,            label: "Gọi điện" },
  { Icon: MessageCircle,    label: "Zalo/Chat" },
  { Icon: SlidersHorizontal,label: "Bộ lọc" },
  { Icon: Settings,         label: "Cài đặt" },
  { Icon: PlusCircle,       label: "Đăng tin" },
  { Icon: Shield,           label: "An toàn" },
  { Icon: Star,             label: "Nổi bật" },
];

/* ══════════════════════════════════════════
   SECTION 5 — CORE COMPONENTS
══════════════════════════════════════════ */

/* Room card sample data */
const SAMPLE_ROOMS = [
  { title: "Phòng trọ cao cấp, full nội thất, gần ĐH Bách Khoa", price: "3.200.000", area: 25, loc: "Quận 10", status: "available", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=480&q=80" },
  { title: "Căn hộ dịch vụ ban công đẹp, thang máy, 1PN", price: "6.500.000", area: 38, loc: "Bình Thạnh", status: "rented", img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=480&q=80" },
  { title: "Phòng gác lửng thoáng mát, WC riêng, giờ tự do", price: "2.400.000", area: 22, loc: "Quận 12", status: "repairing", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=480&q=80" },
];

const STATUS_META: Record<string, { label: string; color: string }> = {
  available: { label: "Trống",    color: C.available },
  rented:    { label: "Đã thuê", color: C.rented },
  repairing: { label: "Đang sửa",color: C.repairing },
};

function RoomCard({ room }: { room: typeof SAMPLE_ROOMS[0] }) {
  const [saved, setSaved] = useState(false);
  const s = STATUS_META[room.status];
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14,
      overflow: "hidden", boxShadow: "0 2px 10px rgba(92,70,50,0.08)" }}>
      <div style={{ position: "relative" }}>
        <img src={room.img} alt={room.title}
          style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
        <button onClick={() => setSaved(v => !v)}
          style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.92)",
            border: "none", borderRadius: 999, width: 34, height: 34,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            boxShadow: "0 1px 6px rgba(0,0,0,0.1)" }}>
          <Heart size={16} color={saved ? C.repairing : C.secondary} fill={saved ? C.repairing : "none"} strokeWidth={2} />
        </button>
        <span style={{ position: "absolute", top: 10, left: 10, background: s.color, color: "#fff",
          fontFamily: font, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 10px" }}>
          {s.label}
        </span>
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary,
          margin: "0 0 5px", lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {room.title}
        </p>
        <p style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: C.primary, margin: "0 0 4px" }}>
          {room.price} đ<span style={{ fontSize: 12, fontWeight: 400, color: C.textSecondary }}>/tháng</span>
        </p>
        <div style={row({ gap: 4, marginBottom: 10 })}>
          <MapPin size={12} color={C.textSecondary} />
          <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>{room.area} m² · {room.loc}</span>
        </div>
        <div style={row({ gap: 12 })}>
          {[{ I: Wifi, l: "Wifi" }, { I: Wind, l: "Máy lạnh" }, { I: Car, l: "Để xe" }].map(({ I, l }) => (
            <div key={l} style={row({ gap: 3 })}>
              <I size={12} color={C.secondary} />
              <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Owner Contact Card */
function OwnerContactCard() {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20,
      boxShadow: "0 2px 10px rgba(92,70,50,0.08)", maxWidth: 320 }}>
      <div style={row({ gap: 12, marginBottom: 16, padding: "10px 12px", background: C.bg, borderRadius: 10 })}>
        <div style={{ width: 44, height: 44, borderRadius: 999, background: C.sand,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <User size={20} color={C.primaryDark} />
        </div>
        <div>
          <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: 0 }}>Chủ trọ</p>
          <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "2px 0 0" }}>Anh Minh</p>
          <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "1px 0 0" }}>Phản hồi nhanh · Online</p>
        </div>
      </div>
      <div style={col({ gap: 10 })}>
        <Btn variant="primary" label="Gửi tin nhắn" icon={<MessageCircle size={15} />} fullWidth />
        <Btn variant="outline" label="Gọi 0912 345 678" icon={<Phone size={15} />} fullWidth />
      </div>
      <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, textAlign: "center", margin: "10px 0 0" }}>
        Nhắn tin trong nền tảng hoặc gọi điện trực tiếp
      </p>
    </div>
  );
}

/* Stat Card */
function StatCard() {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28,
      boxShadow: "0 2px 10px rgba(92,70,50,0.08)", minWidth: 220 }}>
      <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary,
        margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Số phòng trống
      </p>
      <div style={row({ alignItems: "baseline", gap: 8 })}>
        <span style={{ fontFamily: font, fontSize: 52, fontWeight: 800, color: C.primary, lineHeight: 1 }}>3</span>
        <span style={{ fontFamily: font, fontSize: 16, color: C.textSecondary }}>/ 8 phòng</span>
      </div>
      <div style={{ marginTop: 16, background: C.bg, borderRadius: 8, height: 8, overflow: "hidden" }}>
        <div style={{ width: "37.5%", height: "100%", background: C.primary, borderRadius: 8 }} />
      </div>
      <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "8px 0 0" }}>
        37.5% số phòng đang trống
      </p>
    </div>
  );
}

/* Form components showcase */
function FormShowcase() {
  const [checked1, setChecked1] = useState(true);
  const [checked2, setChecked2] = useState(true);
  const [checked3, setChecked3] = useState(false);
  const [radio, setRadio] = useState(1);
  const [chips, setChips] = useState(["Máy lạnh", "Wifi"]);
  const toggleChip = (c: string) => setChips(v => v.includes(c) ? v.filter(x => x !== c) : [...v, c]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 24 }}>
      {/* Text input */}
      <div>
        <Tag>Input — Bình thường</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 6px" }}>Tiêu đề tin</p>
        <input style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "9px 12px",
          fontFamily: font, fontSize: 14, color: C.textPrimary, background: C.white, outline: "none", boxSizing: "border-box" }}
          placeholder="Nhập tiêu đề bài đăng..." />
      </div>
      {/* Input error */}
      <div>
        <Tag>Input — Lỗi</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 6px" }}>
          Địa chỉ <span style={{ color: C.error }}>*</span>
        </p>
        <input defaultValue="123 đường" style={{ width: "100%", border: `1.5px solid ${C.error}`, borderRadius: 10,
          padding: "9px 12px", fontFamily: font, fontSize: 14, color: C.textPrimary, background: C.white,
          outline: "none", boxSizing: "border-box" }} />
        <p style={{ fontFamily: font, fontSize: 12, color: C.error, margin: "4px 0 0" }}>Địa chỉ không hợp lệ</p>
      </div>
      {/* Select */}
      <div>
        <Tag>Select</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 6px" }}>Khu vực</p>
        <select style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "9px 12px",
          fontFamily: font, fontSize: 14, color: C.textPrimary, background: C.white, outline: "none", boxSizing: "border-box" }}>
          <option>Chọn quận / huyện</option>
          <option>Quận 1</option><option>Quận 10</option><option>Bình Thạnh</option>
        </select>
      </div>
      {/* Textarea */}
      <div>
        <Tag>Textarea</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 6px" }}>Mô tả chi tiết</p>
        <textarea rows={3} placeholder="Mô tả phòng trọ của bạn..."
          style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "9px 12px",
            fontFamily: font, fontSize: 14, color: C.textPrimary, background: C.white, outline: "none",
            boxSizing: "border-box", resize: "vertical" }} />
      </div>
      {/* Range */}
      <div>
        <Tag>Range Slider</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 6px" }}>
          Khoảng giá: <span style={{ color: C.primary }}>1M – 5M đ</span>
        </p>
        <input type="range" min={0} max={10} defaultValue={5} style={{ width: "100%", accentColor: C.primary }} />
        <div style={row({ justifyContent: "space-between" })}>
          <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>1.000.000 đ</span>
          <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>10.000.000 đ</span>
        </div>
      </div>
      {/* Checkbox */}
      <div>
        <Tag>Checkbox</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 8px" }}>Tiện ích</p>
        <div style={col({ gap: 8 })}>
          {[{ l: "Máy lạnh", v: checked1, s: setChecked1 }, { l: "Wifi", v: checked2, s: setChecked2 }, { l: "Gác lửng", v: checked3, s: setChecked3 }].map(({ l, v, s }) => (
            <label key={l} onClick={() => s(!v)} style={row({ gap: 8, cursor: "pointer" })}>
              <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${v ? C.primary : C.border}`,
                background: v ? C.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {v && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontFamily: font, fontSize: 13, color: C.textPrimary }}>{l}</span>
            </label>
          ))}
        </div>
      </div>
      {/* Radio */}
      <div>
        <Tag>Radio</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 8px" }}>Loại hình</p>
        <div style={col({ gap: 8 })}>
          {["Tất cả", "Phòng trọ", "Căn hộ dịch vụ"].map((o, i) => (
            <label key={o} onClick={() => setRadio(i)} style={row({ gap: 8, cursor: "pointer" })}>
              <div style={{ width: 18, height: 18, borderRadius: 999, border: `2px solid ${radio === i ? C.primary : C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {radio === i && <div style={{ width: 8, height: 8, borderRadius: 999, background: C.primary }} />}
              </div>
              <span style={{ fontFamily: font, fontSize: 13, color: C.textPrimary }}>{o}</span>
            </label>
          ))}
        </div>
      </div>
      {/* Chips */}
      <div>
        <Tag>Chip Multi-select</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 8px" }}>Tiện ích</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["Máy lạnh", "Wifi", "WC riêng", "Để xe"].map(c => {
            const active = chips.includes(c);
            return (
              <button key={c} onClick={() => toggleChip(c)}
                style={{ fontFamily: font, fontSize: 12, fontWeight: active ? 700 : 500,
                  padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                  border: `1.5px solid ${active ? C.primary : C.border}`,
                  background: active ? "#F0E7D6" : C.white,
                  color: active ? C.primaryPress : C.textPrimary,
                  display: "inline-flex", alignItems: "center", gap: 4 }}>
                {active && <span style={{ fontSize: 10, fontWeight: 900 }}>✓</span>}
                {c}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SECTION 6 — NAVIGATION
══════════════════════════════════════════ */
function TopNavbarDemo() {
  return (
    <div style={{ background: C.primaryDark, height: 64, display: "flex", alignItems: "center",
      padding: "0 28px", gap: 36, borderRadius: 12, boxShadow: "0 2px 12px rgba(42,26,12,0.2)" }}>
      <span style={{ fontFamily: font, fontSize: 21, fontWeight: 800, color: C.cream, letterSpacing: "-0.02em", flexShrink: 0 }}>
        Trọ Nhanh
      </span>
      <div style={{ flex: 1 }} />
      {["Tìm phòng", "Đăng tin", "Hỗ trợ"].map(t => (
        <span key={t} style={{ fontFamily: font, fontSize: 14, fontWeight: 500,
          color: "rgba(232,222,201,0.8)", cursor: "pointer", whiteSpace: "nowrap" }}>{t}</span>
      ))}
      <Btn variant="primary" label="Đăng nhập" size="sm" />
    </div>
  );
}

function BottomTabBarDemo() {
  const [active, setActive] = useState(0);
  const tabs = [
    { Icon: Home, label: "Trang chủ" }, { Icon: Search, label: "Tìm phòng" },
    { Icon: Bell, label: "Thông báo" }, { Icon: User, label: "Tài khoản" },
  ];
  return (
    <div style={{ background: C.white, borderTop: `1px solid ${C.border}`, display: "flex",
      borderRadius: "0 0 14px 14px", padding: "6px 0" }}>
      {tabs.map(({ Icon, label }, i) => (
        <button key={label} onClick={() => setActive(i)}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
          <Icon size={22} color={active === i ? C.primary : "#9B8C78"} strokeWidth={active === i ? 2.5 : 1.8} />
          <span style={{ fontFamily: font, fontSize: 10, fontWeight: active === i ? 700 : 400,
            color: active === i ? C.primary : "#9B8C78" }}>{label}</span>
          {active === i && <div style={{ width: 4, height: 4, borderRadius: 999, background: C.primary }} />}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   SECTION 7 — OVERLAYS
══════════════════════════════════════════ */
function BottomSheetDemo() {
  const [chips, setChips] = useState<string[]>([]);
  const toggle = (c: string) => setChips(v => v.includes(c) ? v.filter(x => x !== c) : [...v, c]);
  return (
    <div style={{ background: C.white, borderRadius: "16px 16px 0 0", padding: "0 20px 20px",
      border: `1px solid ${C.border}`, boxShadow: "0 -4px 24px rgba(92,70,50,0.12)" }}>
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, marginBottom: 16 }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: C.sand }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: C.textPrimary }}>Bộ lọc tìm kiếm</span>
        <button style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color={C.textSecondary} /></button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 8px" }}>Khoảng giá</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["1–3 triệu", "3–5 triệu", "5–8 triệu", "> 8 triệu"].map(r => (
            <span key={r} style={{ fontFamily: font, fontSize: 12, padding: "5px 12px",
              border: `1.5px solid ${C.border}`, borderRadius: 999, color: C.textPrimary, cursor: "pointer" }}>{r}</span>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 8px" }}>Tiện ích</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["Máy lạnh", "Wifi", "WC riêng", "Chỗ để xe"].map(a => (
            <button key={a} onClick={() => toggle(a)}
              style={{ fontFamily: font, fontSize: 12, padding: "5px 12px",
                background: chips.includes(a) ? "#F0E7D6" : C.cream,
                border: `1.5px solid ${chips.includes(a) ? C.primary : C.border}`,
                borderRadius: 999, color: chips.includes(a) ? C.primaryPress : C.textPrimary, cursor: "pointer" }}>
              {a}
            </button>
          ))}
        </div>
      </div>
      <div style={row({ gap: 10 })}>
        <Btn variant="outline" label="Xóa lọc" fullWidth />
        <Btn variant="primary" label="Xem kết quả" fullWidth />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   STYLE GUIDE PAGE
══════════════════════════════════════════ */
export function StyleGuidePage() {
  const navigate = useNavigate();
  const onBack = () => navigate(-1);
  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: font }}>

      {/* Demo Banner */}
      <div style={{ background: C.cream, borderBottom: `1px solid ${C.border}`, height: 34,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: font, fontSize: 12, color: C.primaryDark, fontWeight: 500 }}>
          Đây là sản phẩm demo để lấy feedback, tối ưu nhất khi xem trên giao diện web.
        </span>
      </div>

      {/* Header */}
      <div style={{ background: C.primaryDark, padding: "28px 0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
          <button onClick={onBack} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 8, padding: "6px 14px", cursor: "pointer",
              fontFamily: font, fontSize: 13, fontWeight: 600, color: C.cream, marginBottom: 16,
            }}>
              <ArrowLeft size={13} /> Trang chủ
            </button>
          <div style={row({ gap: 14, flexWrap: "wrap" })}>
            <span style={{ fontFamily: font, fontSize: 26, fontWeight: 800, color: C.cream }}>Trọ Nhanh</span>
            <span style={{ fontFamily: font, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Design System · v2.0 · Style Guide</span>
          </div>
          <p style={{ fontFamily: font, fontSize: 14, color: "rgba(255,255,255,0.55)", margin: "8px 0 20px" }}>
            Hệ thống thiết kế — tông màu cát ấm, thân thiện &amp; đáng tin cậy.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["1. Màu sắc","2. Chữ","3. Khoảng cách","4. Biểu tượng","5. Components","6. Navigation","7. Overlays"].map(n => (
              <a key={n} href={`#sec-${n[0]}`}
                style={{ fontFamily: font, fontSize: 11, color: "rgba(255,255,255,0.6)",
                  padding: "4px 12px", border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 999, textDecoration: "none", whiteSpace: "nowrap" }}>{n}</a>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 32px 80px" }}>

        {/* ── 1. COLOR PALETTE ── */}
        <StyleSection title="1 · Bảng Màu Sắc" id="sec-1">
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 20px" }}>
            Tất cả cặp text/nền đảm bảo WCAG AA (≥ 4.5:1). Brand trên nav tối dùng cream — không dùng primary.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
            {PALETTE.map(p => <ColorSwatch key={p.hex} {...p} />)}
          </div>
          <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: "0 0 12px" }}>
            Màu trạng thái &amp; ngữ nghĩa
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {STATUS_COLORS.map(s => (
              <div key={s.hex} style={row({ gap: 10, background: C.white, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "10px 14px", minWidth: 200 })}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: s.hex, flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{s.label}</p>
                  <p style={{ fontFamily: font, fontSize: 10, color: C.textSecondary, margin: "2px 0 0" }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </StyleSection>

        {/* ── 2. TYPOGRAPHY ── */}
        <StyleSection title="2 · Chữ / Typography" id="sec-2">
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 20px" }}>
            Font: <strong>Be Vietnam Pro</strong> — đầy đủ dấu tiếng Việt. Fallback: Inter, system-ui, sans-serif.
          </p>
          <div style={col({ gap: 0 })}>
            {TYPE_SCALE.map(t => (
              <div key={t.name} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 16,
                alignItems: "start", borderBottom: `1px solid ${C.border}`, padding: "16px 0" }}>
                <div>
                  <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: 0 }}>{t.name}</p>
                  <p style={{ fontFamily: font, fontSize: 10, color: C.sand, margin: "3px 0 0" }}>{t.size} · w{t.weight} · lh{t.lh}</p>
                </div>
                <p style={{ fontFamily: font, fontSize: t.size, fontWeight: t.weight, color: t.color, lineHeight: t.lh, margin: 0 }}>
                  {t.sample}
                </p>
              </div>
            ))}
          </div>
        </StyleSection>

        {/* ── 3. SPACING & LAYOUT ── */}
        <StyleSection title="3 · Khoảng Cách &amp; Bố Cục" id="sec-3">
          <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 12px" }}>
            Spacing scale (8px base)
          </p>
          <div style={row({ flexWrap: "wrap", gap: 24, alignItems: "flex-end", marginBottom: 32 })}>
            {SPACINGS.map(s => (
              <div key={s} style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", height: 40, marginBottom: 4 }}>
                  <div style={{ width: s, height: s, background: C.primary, borderRadius: 3 }} />
                </div>
                <span style={{ fontFamily: font, fontSize: 10, color: C.textSecondary }}>{s}px</span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 12px" }}>
            Corner radius scale
          </p>
          <div style={row({ flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 32 })}>
            {RADII.map(r => (
              <div key={r.label} style={{ textAlign: "center" }}>
                <div style={{ width: r.w, height: r.h, borderRadius: r.r, background: C.cream, border: `1.5px solid ${C.border}` }} />
                <span style={{ fontFamily: font, fontSize: 10, color: C.textSecondary, display: "block", marginTop: 6 }}>{r.label}</span>
              </div>
            ))}
          </div>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 10px" }}>Responsive grid</p>
            {[
              { label: "Desktop ≥ 1024px", desc: "Top navbar + 4-col room grid + left sidebar filters" },
              { label: "Tablet 768–1023px", desc: "2-col room grid, sidebar collapses" },
              { label: "Mobile < 768px",    desc: "Bottom tab bar + 1-col list + bottom-sheet filters + sticky CTA" },
            ].map(g => (
              <div key={g.label} style={row({ gap: 12, padding: "9px 14px", background: C.bg, borderRadius: 8, marginBottom: 6 })}>
                <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary, minWidth: 170, flexShrink: 0 }}>{g.label}</span>
                <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>{g.desc}</span>
              </div>
            ))}
          </div>
        </StyleSection>

        {/* ── 4. ICONOGRAPHY ── */}
        <StyleSection title="4 · Biểu Tượng / Iconography" id="sec-4">
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 16px" }}>
            Phong cách duy nhất: <strong>outline</strong> · Lucide React · strokeWidth 1.8–2.
            Kích thước: 16px (inline), 20px (action), 22px (tab bar).
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {ICONS.map(({ Icon, label }) => (
              <div key={label} style={col({ alignItems: "center", gap: 6, width: 64 })}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: C.cream,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={20} color={C.primary} strokeWidth={1.8} />
                </div>
                <span style={{ fontFamily: font, fontSize: 9, color: C.textSecondary, textAlign: "center", lineHeight: 1.3 }}>{label}</span>
              </div>
            ))}
          </div>
        </StyleSection>

        {/* ── 5. CORE COMPONENTS ── */}
        <StyleSection title="5 · Components" id="sec-5">

          {/* 5a. Buttons — interactive */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>5a · Buttons — tương tác thật</p>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 16px" }}>
              Di chuột / nhấn để thấy thay đổi màu. Mỗi trạng thái tối hơn rõ ràng.
            </p>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={row({ gap: 12, flexWrap: "wrap" })}>
                <Btn variant="primary"   label="Nút chính" />
                <Btn variant="secondary" label="Nút phụ" />
                <Btn variant="outline"   label="Outline" />
                <Btn variant="ghost"     label="Ghost" />
                <Btn variant="primary"   label="Vô hiệu" disabled />
              </div>
            </div>

            {/* Frozen state comparison */}
            <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 12px" }}>
              So sánh trạng thái — mỗi bước tối hơn rõ ràng
            </p>
            {(["primary","secondary","outline","ghost"] as BtnVariant[]).map(v => {
              const titles: Record<BtnVariant, string> = {
                primary:   "Primary · #8A6A45 → #73572F → #5C4632",
                secondary: "Secondary · #B08D63 → #9A784F → #836237",
                outline:   "Outline · transparent → #F0E7D6 fill → border #5C4632",
                ghost:     "Ghost · transparent → cream fill → border",
              };
              return (
                <div key={v} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 10 }}>
                  <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary,
                    textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>{titles[v]}</p>
                  <div style={row({ gap: 20, flexWrap: "wrap" })}>
                    {(["default","hover","pressed","disabled"] as const).map(s => (
                      <BtnSwatch key={s} variant={v} state={s} label={
                        s === "default" ? "Mặc định" : s === "hover" ? "Hover" : s === "pressed" ? "Nhấn" : "Vô hiệu"
                      } />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5b. Form components */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 16px" }}>
              5b · Form Components
            </p>
            <FormShowcase />
          </div>

          {/* 5c. Cards & surfaces */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 16px" }}>
              5c · Card / Surface
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {[
                { bg: C.white,  label: "White — thẻ nội dung chính", hex: "#FFFFFF" },
                { bg: C.cream,  label: "Cream — nền thẻ phụ", hex: "#E8DEC9" },
                { bg: C.bg,     label: "Background — nền trang", hex: "#F5EFE4" },
              ].map(s => (
                <div key={s.hex} style={{ padding: 20, borderRadius: 12, border: `1px solid ${C.border}`,
                  background: s.bg, minWidth: 200, boxShadow: "0 2px 8px rgba(92,70,50,0.06)" }}>
                  <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 4px" }}>{s.label}</p>
                  <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: 0 }}>{s.hex}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 5d. Room Card */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
              5d · Room Card (Thẻ phòng)
            </p>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 16px" }}>
              Thumbnail · Status chip · Giá màu primary · Diện tích & khu vực · 3 amenity icons · Heart save toggle
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {SAMPLE_ROOMS.map(r => <RoomCard key={r.title} room={r} />)}
            </div>
          </div>

          {/* 5e. Status Chips */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 12px" }}>
              5e · Status Chip
            </p>
            <div style={row({ gap: 10, flexWrap: "wrap" })}>
              {[
                { label: "Trống",    bg: C.available },
                { label: "Đã thuê", bg: C.rented },
                { label: "Đang sửa",bg: C.repairing },
              ].map(c => (
                <span key={c.label} style={{ fontFamily: font, fontSize: 12, fontWeight: 700,
                  padding: "5px 14px", borderRadius: 999, background: c.bg, color: "#fff" }}>{c.label}</span>
              ))}
            </div>
          </div>

          {/* 5f. Owner Contact Card */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
              5f · Owner Contact Card (Liên hệ chủ trọ)
            </p>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 16px" }}>
              Dùng trên màn chi tiết phòng. Người thuê nhắn tin trong nền tảng hoặc gọi điện — <strong>không có đặt lịch trong app</strong>.
            </p>
            <OwnerContactCard />
          </div>

          {/* 5g. Stat Card large */}
          <div>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
              5g · Stat Card lớn (Dashboard chủ trọ)
            </p>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 16px" }}>
              "Số phòng trống" là thông tin chính — luôn hiển thị. Tổng phòng &amp; số khách là toggle mặc định TẮT.
            </p>
            <div style={row({ flexWrap: "wrap", gap: 16 })}>
              <StatCard />
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, minWidth: 260 }}>
                <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 14px" }}>
                  Tùy chọn hiển thị
                </p>
                {["Hiển thị Tổng số phòng","Hiển thị Số khách đang ở"].map(t => (
                  <div key={t} style={row({ justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` })}>
                    <span style={{ fontFamily: font, fontSize: 13, color: C.textPrimary }}>{t}</span>
                    <div style={{ width: 40, height: 22, borderRadius: 999, background: C.border, position: "relative" }}>
                      <div style={{ width: 16, height: 16, borderRadius: 999, background: "#fff", position: "absolute", top: 3, left: 3 }} />
                    </div>
                  </div>
                ))}
                <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: "10px 0 0" }}>
                  Mặc định TẮT — chủ trọ tự bật mới thấy.
                </p>
              </div>
            </div>
          </div>
        </StyleSection>

        {/* ── 6. NAVIGATION ── */}
        <StyleSection title="6 · Navigation" id="sec-6">
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 6px" }}>
              Top Navbar (Web) — Brand "Trọ Nhanh" dùng cream #E8DEC9 trên nền espresso #5C4632
            </p>
            <p style={{ fontFamily: font, fontSize: 12, color: C.error, margin: "0 0 12px" }}>
              ⚠ KHÔNG dùng #8A6A45 cho brand ở đây — màu đó bị chìm vào nền tối.
            </p>
            <TopNavbarDemo />
          </div>

          <div>
            <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 12px" }}>
              Bottom Tab Bar (Mobile) — active #8A6A45, inactive #9B8C78
            </p>
            <div style={{ maxWidth: 390, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", background: C.bg }}>
              <div style={{ height: 80, background: C.cream, display: "flex", alignItems: "center",
                justifyContent: "center" }}>
                <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>Nội dung màn hình</span>
              </div>
              <BottomTabBarDemo />
            </div>
          </div>
        </StyleSection>

        {/* ── 7. OVERLAYS ── */}
        <StyleSection title="7 · Overlays" id="sec-7">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 28 }}>
            <div>
              <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 12px" }}>
                Bottom Sheet (Mobile filter)
              </p>
              <div style={{ background: C.bg, borderRadius: 14, overflow: "hidden", paddingTop: 60,
                border: `1px solid ${C.border}`, maxWidth: 390 }}>
                <BottomSheetDemo />
              </div>
            </div>
            <div>
              <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 12px" }}>
                Demo Banner — xuất hiện trên mọi trang
              </p>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ background: C.cream, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: font, fontSize: 12, color: C.primaryDark, fontWeight: 500 }}>
                    Đây là sản phẩm demo để lấy feedback, tối ưu nhất khi xem trên giao diện web.
                  </span>
                </div>
                <div style={{ padding: 16, background: C.white }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1, height: 40, background: C.bg, borderRadius: 8 }} />
                    <div style={{ flex: 2, height: 40, background: C.bg, borderRadius: 8 }} />
                    <div style={{ flex: 1, height: 40, background: C.bg, borderRadius: 8 }} />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 12px" }}>
                  Modal (Web) — xác nhận &amp; form
                </p>
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24,
                  boxShadow: "0 8px 40px rgba(92,70,50,0.14)" }}>
                  <div style={row({ justifyContent: "space-between", marginBottom: 20 })}>
                    <span style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: C.textPrimary }}>Xác nhận</span>
                    <button style={{ background: "none", border: "none", cursor: "pointer" }}>
                      <X size={18} color={C.textSecondary} />
                    </button>
                  </div>
                  <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: "0 0 20px", lineHeight: 1.6 }}>
                    Bạn có chắc muốn tiếp tục không?
                  </p>
                  <div style={row({ gap: 10 })}>
                    <Btn variant="ghost" label="Hủy" fullWidth />
                    <Btn variant="primary" label="Xác nhận" fullWidth />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </StyleSection>

      </div>

      {/* Footer */}
      <div style={{ background: C.primaryDark, padding: "22px 32px", textAlign: "center" }}>
        <span style={{ fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
          Trọ Nhanh Design System · v2.0 · Sản phẩm demo — chỉ dùng để thu thập feedback
        </span>
      </div>
    </div>
  );
}
