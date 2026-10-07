/** StyleGuide (chỉ bản dev): hằng số bảng màu/chữ/khoảng cách + atom hiển thị. */
import { useState } from "react";
import { Heart, MapPin, Wifi, Wind, Car, Bath, Clock, Layers, PawPrint, Home, Search, Bell, User, Phone, MessageCircle, SlidersHorizontal, Star, Shield, Settings, PlusCircle } from "lucide-react";
import { C, font } from "../../../shared/theme";
import { Badge } from "../../../shared/components/common";

/* ── helpers ── */
export const row = (style: React.CSSProperties = {}): React.CSSProperties => ({
  display: "flex", alignItems: "center", ...style,
});
export const col = (style: React.CSSProperties = {}): React.CSSProperties => ({
  display: "flex", flexDirection: "column", ...style,
});

export function Tag({ children }: { children: React.ReactNode }) {
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
export type BtnVariant = "primary" | "secondary" | "outline" | "ghost";

export function Btn({
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
export function BtnSwatch({
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
export const PALETTE = [
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
export const STATUS_COLORS = [
  { hex: C.available, label: "Trống",    desc: "Phòng còn trống (#6B8E5A)" },
  { hex: C.rented,    label: "Đã thuê", desc: "Đã có người thuê (#9B8C78)" },
  { hex: C.repairing, label: "Đã ẩn",   desc: "Phòng đã ẩn (#C07B4A)" },
  { hex: C.error,     label: "Lỗi",     desc: "Form error (#B5503C)" },
  { hex: C.warning,   label: "Cảnh báo",desc: "Warning (#C8861A)" },
];

export function ColorSwatch({ hex, name, vi, usage }: typeof PALETTE[0]) {
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
export const TYPE_SCALE = [
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
export const SPACINGS  = [4, 8, 12, 16, 24, 32];
export const RADII = [
  { label: "sm / 8px",  r: 8,   w: 64, h: 48 },
  { label: "md / 12px", r: 12,  w: 64, h: 48 },
  { label: "lg / 14px", r: 14,  w: 64, h: 48 },
  { label: "pill",      r: 999, w: 80, h: 36 },
  { label: "circle",    r: 999, w: 48, h: 48 },
];

/* ══════════════════════════════════════════
   SECTION 4 — ICONOGRAPHY
══════════════════════════════════════════ */
export const ICONS = [
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
