import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Search, Heart, MapPin,
  Wifi, Wind, Car, Bath, Clock, Layers,
  Home, Star, Bell, User,
  SlidersHorizontal, ArrowRight,
  ShieldCheck, CreditCard, MessageSquare, Headphones,
  Mail, TrendingUp, Building2, Banknote,
} from "lucide-react";
import { useBreakpoint } from "../components/useBreakpoint";
import { C, font } from "../theme";
import { PublicNavbarDesktop, PublicNavbarMobile, DemoFAB } from "../components/PublicNavbar";
import { DemoBanner } from "../components/common/DemoBanner";
import { AppSelect } from "../components/common/AppSelect";

/* Hero Search — option lists (giữ tiếng Việt, dùng chung desktop + mobile) */
const LOAI_PHONG = ["Phòng trọ", "Căn hộ dịch vụ", "Căn hộ mini", "Ký túc xá", "Nhà nguyên căn", "Ở ghép"];
const GIA_THUE = ["Dưới 2 triệu", "2 – 4 triệu", "4 – 7 triệu", "Trên 7 triệu"];

/* ══════════════════════════════════════════
   MOCK DATA
══════════════════════════════════════════ */
const FEATURED_ROOMS = [
  {
    id: 1, title: "Studio Full Nội Thất gần ĐH RMIT",
    price: "5.500.000", area: 30, loc: "Quận 7",
    amenities: ["wifi", "ac", "parking"], badge: "Nổi bật",
    img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
  },
  {
    id: 2, title: "Duplex Ban Công View Đẹp, Full Nội Thất",
    price: "7.200.000", area: 45, loc: "Bình Thạnh",
    amenities: ["wifi", "ac", "bath"], badge: "Mới đăng",
    img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80",
  },
  {
    id: 3, title: "Căn Hộ Mini Full Nội Thất Thủ Đức",
    price: "4.800.000", area: 28, loc: "Thủ Đức",
    amenities: ["wifi", "ac", "parking"], badge: null,
    img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80",
  },
  {
    id: 4, title: "Phòng Master Rộng, Có Ban Công Riêng",
    price: "8.000.000", area: 38, loc: "Gò Vấp",
    amenities: ["wifi", "ac", "bath"], badge: "Nổi bật",
    img: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=600&q=80",
  },
];

const AMENITY_META: Record<string, { Icon: React.ElementType; label: string }> = {
  wifi:    { Icon: Wifi,   label: "Wifi" },
  ac:      { Icon: Wind,   label: "Máy lạnh" },
  parking: { Icon: Car,    label: "Để xe" },
  bath:    { Icon: Bath,   label: "WC riêng" },
  clock:   { Icon: Clock,  label: "Giờ tự do" },
  loft:    { Icon: Layers, label: "Gác lửng" },
};

const FEATURES = [
  {
    Icon: ShieldCheck, title: "Thông tin xác thực",
    desc: "100% tin đăng được đội ngũ kiểm duyệt kỹ lưỡng, đảm bảo hình ảnh thật, giá thật.",
  },
  {
    Icon: CreditCard, title: "Thanh toán an toàn",
    desc: "Hỗ trợ đặt cọc và thanh toán tiền điện nước trực tuyến minh bạch, có biên lai điện tử.",
  },
  {
    Icon: MessageSquare, title: "Kết nối trực tiếp",
    desc: "Hệ thống chat tích hợp giúp bạn liên hệ trực tiếp với chủ nhà không qua trung gian.",
  },
  {
    Icon: Headphones, title: "Hỗ trợ 24/7",
    desc: "Đội ngũ CSKH luôn sẵn sàng giải đáp mọi thắc mắc và hỗ trợ trong suốt quá trình thuê.",
  },
];

const CHIPS = ["Tất cả", "Phòng trọ", "Căn hộ mini", "Ký túc xá", "Nhà nguyên căn", "Ở ghép"];

/* ══════════════════════════════════════════
   PRIMITIVES
══════════════════════════════════════════ */
function Btn({
  variant = "primary", label, icon, fullWidth, size = "md", onClick,
}: {
  variant?: "primary" | "outline" | "ghost"; label: string;
  icon?: React.ReactNode; fullWidth?: boolean; size?: "sm" | "md" | "lg";
  onClick?: () => void;
}) {
  const [s, setS] = useState<"idle" | "hover" | "pressed">("idle");
  const map: Record<string, Record<string, React.CSSProperties>> = {
    primary: {
      idle:    { background: C.primary,      color: C.white, border: "none" },
      hover:   { background: C.primaryHover, color: C.white, border: "none" },
      pressed: { background: C.primaryPress, color: C.white, border: "none" },
    },
    outline: {
      idle:    { background: "transparent", color: C.primary,      border: `1.5px solid ${C.primary}` },
      hover:   { background: "#F0E7D6",     color: C.primary,      border: `1.5px solid ${C.primary}` },
      pressed: { background: "#F0E7D6",     color: C.primaryPress, border: `1.5px solid ${C.primaryPress}` },
    },
    ghost: {
      idle:    { background: "transparent", color: C.textSecondary, border: "none" },
      hover:   { background: C.cream,       color: C.primaryDark,   border: "none" },
      pressed: { background: C.border,      color: C.primaryDark,   border: "none" },
    },
  };
  const pad = size === "sm" ? "7px 16px" : size === "lg" ? "13px 26px" : "10px 22px";
  const fs  = size === "sm" ? 13 : size === "lg" ? 15 : 14;
  return (
    <button onClick={onClick}
      style={{ fontFamily: font, fontSize: fs, fontWeight: 600, borderRadius: 10, padding: pad,
        width: fullWidth ? "100%" : undefined, justifyContent: fullWidth ? "center" : undefined,
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
        transition: "background 0.12s, color 0.12s", ...map[variant][s] }}
      onMouseEnter={() => setS("hover")} onMouseLeave={() => setS("idle")}
      onMouseDown={() => setS("pressed")} onMouseUp={() => setS("hover")}
    >{icon}{label}</button>
  );
}

function RoomCard({ room, mobile, onClick }: {
  room: typeof FEATURED_ROOMS[0]; mobile?: boolean; onClick?: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: C.white, border: `1px solid ${hov ? C.sand : C.border}`,
        borderRadius: 14, overflow: "hidden",
        boxShadow: hov ? "0 8px 24px rgba(92,70,50,0.14)" : "0 2px 10px rgba(92,70,50,0.07)",
        transform: hov ? "translateY(-3px)" : "none",
        transition: "all 0.2s", cursor: "pointer",
        display: "flex", flexDirection: mobile ? "row" : "column",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0, width: mobile ? 136 : "100%" }}>
        <img src={room.img} alt={room.title}
          style={{ width: "100%", height: mobile ? 136 : 188, objectFit: "cover", display: "block" }} />
        <button onClick={e => { e.stopPropagation(); setSaved(v => !v); }}
          style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.92)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 6px rgba(0,0,0,0.12)" }}>
          <Heart size={16} color={saved ? C.repairing : C.secondary} fill={saved ? C.repairing : "none"} strokeWidth={2} />
        </button>
        <span style={{ position: "absolute", top: 10, left: 10, background: C.available, color: "#fff", fontFamily: font, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 10px" }}>Còn trống</span>
        {room.badge && (
          <span style={{ position: "absolute", bottom: 10, left: 10, background: room.badge === "Nổi bật" ? C.primary : C.repairing, color: "#fff", fontFamily: font, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 3 }}>
            {room.badge === "Nổi bật" && <Star size={9} fill="#fff" strokeWidth={0} />}
            {room.badge}
          </span>
        )}
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 6px", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {room.title}
        </p>
        <p style={{ fontFamily: font, fontSize: 19, fontWeight: 800, color: C.primary, margin: "0 0 5px", letterSpacing: "-0.01em" }}>
          {room.price} đ<span style={{ fontSize: 12, fontWeight: 400, color: C.textSecondary }}>/tháng</span>
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
          <MapPin size={12} color={C.textSecondary} />
          <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>{room.area} m² · {room.loc}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
          {room.amenities.slice(0, 3).map(a => {
            const m = AMENITY_META[a]; if (!m) return null;
            const { Icon, label } = m;
            return (
              <div key={a} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Icon size={12} color={C.secondary} strokeWidth={2} />
                <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════
   DESKTOP — HERO + SEARCH BOX
══════════════════════════════════════════ */
function SearchField({
  label, icon, placeholder, isSelect, options, value, onChange, noBorderRight,
}: {
  label: string; icon: React.ReactNode; placeholder: string;
  isSelect?: boolean; options?: string[]; value: string;
  onChange: (v: string) => void; noBorderRight?: boolean;
}) {
  return (
    <div style={{ flex: 1, padding: "12px 18px", borderRight: noBorderRight ? "none" : `1px solid ${C.border}` }}>
      <p style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: C.textSecondary, margin: "0 0 5px", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        {isSelect ? (
          <div style={{ flex: 1 }}>
            <AppSelect
              value={value}
              placeholder={placeholder}
              options={(options ?? []).map(o => ({ label: o, value: o }))}
              onChange={onChange}
            />
          </div>
        ) : (
          <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: font, fontSize: 15, color: C.textPrimary, padding: 0 }} />
        )}
      </div>
    </div>
  );
}

function HeroSearchBox({ onSearch, isMobile }: { onSearch?: () => void; isMobile?: boolean }) {
  const [loc, setLoc] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState("");

  if (isMobile) {
    return (
      <div style={{ background: C.white, borderRadius: 16, boxShadow: "0 6px 28px rgba(92,70,50,0.12)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: C.textSecondary, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Vị trí</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={15} color={C.secondary} />
            <input value={loc} onChange={e => setLoc(e.target.value)} placeholder="Quận 7, TP.HCM"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: font, fontSize: 15, color: C.textPrimary }} />
          </div>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: C.textSecondary, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Loại phòng</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Building2 size={15} color={C.secondary} />
            <div style={{ flex: 1 }}>
              <AppSelect
                value={type}
                placeholder="Căn hộ dịch vụ"
                options={LOAI_PHONG.map(o => ({ label: o, value: o }))}
                onChange={setType}
              />
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <p style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: C.textSecondary, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Giá thuê</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Banknote size={15} color={C.secondary} />
            <div style={{ flex: 1 }}>
              <AppSelect
                value={price}
                placeholder="3tr – 7tr/tháng"
                options={GIA_THUE.map(o => ({ label: o, value: o }))}
                onChange={setPrice}
              />
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 12px 12px" }}>
          <button onClick={onSearch}
            style={{ width: "100%", padding: "14px", background: C.primary, color: C.white, border: "none", borderRadius: 12, fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Search size={18} />
            Tìm kiếm ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.white, borderRadius: 16, boxShadow: "0 8px 40px rgba(92,70,50,0.14)", display: "flex", alignItems: "stretch", overflow: "hidden" }}>
      <SearchField label="Vị trí" icon={<MapPin size={15} color={C.secondary} />} placeholder="Quận 7, TP.HCM" value={loc} onChange={setLoc} />
      <SearchField label="Loại phòng" icon={<Building2 size={15} color={C.secondary} />} placeholder="Căn hộ dịch vụ" isSelect
        options={LOAI_PHONG}
        value={type} onChange={setType} />
      <SearchField label="Giá thuê" icon={<Banknote size={15} color={C.secondary} />} placeholder="3tr – 7tr/tháng" isSelect
        options={GIA_THUE}
        value={price} onChange={setPrice} noBorderRight />
      <div style={{ padding: "8px", display: "flex", alignItems: "center", flexShrink: 0 }}>
        <button onClick={onSearch}
          style={{ padding: "14px 24px", background: C.primary, color: C.white, border: "none", borderRadius: 12, fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", height: "100%", boxShadow: `0 4px 14px rgba(138,106,69,0.35)`, transition: "background 0.12s" }}
          onMouseEnter={e => (e.currentTarget.style.background = C.primaryHover)}
          onMouseLeave={e => (e.currentTarget.style.background = C.primary)}>
          <Search size={17} />
          Tìm kiếm ngay
        </button>
      </div>
    </div>
  );
}

function HeroSection({ onSearch, isMobile }: { onSearch?: () => void; isMobile?: boolean }) {
  return (
    <section style={{
      background: "linear-gradient(155deg, #EDE0C8 0%, #F5EFE4 55%, #EDE8DC 100%)",
      padding: isMobile ? "48px 20px 52px" : "88px 32px 72px",
      textAlign: "center",
    }}>
      {/* Tagline */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.white, border: `1px solid ${C.border}`, borderRadius: 999, padding: "5px 16px", marginBottom: 24 }}>
        <TrendingUp size={13} color={C.secondary} />
        <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: C.secondary }}>
          Nền tảng tìm phòng #1 tại Việt Nam
        </span>
      </div>

      {/* H1 */}
      <h1 style={{ fontFamily: font, fontSize: isMobile ? 30 : 52, fontWeight: 900, color: C.textPrimary, margin: "0 0 18px", lineHeight: 1.15, letterSpacing: "-0.025em", maxWidth: isMobile ? "100%" : 700, marginLeft: "auto", marginRight: "auto" }}>
        Tìm kiếm không gian{" "}
        <span style={{ color: C.primary }}>sống lý tưởng</span>{" "}
        của bạn
      </h1>

      {/* Subtext */}
      <p style={{ fontFamily: font, fontSize: isMobile ? 14 : 18, color: C.textSecondary, margin: "0 0 40px", lineHeight: 1.65, maxWidth: isMobile ? "100%" : 560, marginLeft: "auto", marginRight: "auto" }}>
        Nền tảng kết nối người thuê và chủ nhà minh bạch, nhanh chóng và an toàn nhất hiện nay với hơn 50.000+ phòng trọ chất lượng.
      </p>

      {/* Search box */}
      <div style={{ maxWidth: isMobile ? "100%" : 860, margin: "0 auto 36px" }}>
        <HeroSearchBox onSearch={onSearch} isMobile={isMobile} />
      </div>

      {/* Stats */}
      <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 20 : 48, flexWrap: "wrap" }}>
        {[
          { value: "50.000+", label: "Phòng đang đăng" },
          { value: "10.000+", label: "Chủ nhà uy tín" },
          { value: "5 phút",  label: "Phản hồi trung bình" },
        ].map(({ value, label }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <p style={{ fontFamily: font, fontSize: isMobile ? 20 : 26, fontWeight: 800, color: C.primary, margin: "0 0 2px" }}>{value}</p>
            <p style={{ fontFamily: font, fontSize: isMobile ? 11 : 13, color: C.textSecondary, margin: 0 }}>{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   QUICK FILTER CHIPS
══════════════════════════════════════════ */
function QuickFilterChips({
  onSearch, mobile,
}: { onSearch?: () => void; mobile?: boolean }) {
  const [active, setActive] = useState("Tất cả");

  return (
    <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: mobile ? "10px 0" : "12px 32px" }}>
      <div style={{
        maxWidth: mobile ? "100%" : 1200, margin: "0 auto",
        display: "flex", alignItems: "center", gap: 8,
        overflowX: mobile ? "auto" : "visible",
        padding: mobile ? "0 16px" : 0,
        scrollbarWidth: "none",
      }}>
        {CHIPS.map(chip => {
          const isActive = active === chip;
          return (
            <button key={chip}
              onClick={() => { setActive(chip); if (chip !== "Tất cả") onSearch?.(); }}
              style={{
                flexShrink: 0, padding: mobile ? "9px 18px" : "7px 18px", minHeight: mobile ? 40 : undefined,
                borderRadius: 999, cursor: "pointer",
                fontFamily: font, fontSize: 13, fontWeight: isActive ? 600 : 400,
                border: `1.5px solid ${isActive ? C.primary : C.border}`,
                background: isActive ? C.primary : "transparent",
                color: isActive ? C.white : C.textSecondary,
                transition: "all 0.12s", whiteSpace: "nowrap",
              }}>
              {chip}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button onClick={onSearch}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: mobile ? "9px 16px" : "7px 16px", minHeight: mobile ? 40 : undefined, border: `1.5px solid ${C.border}`, borderRadius: 999, background: "transparent", fontFamily: font, fontSize: 13, color: C.textSecondary, cursor: "pointer", whiteSpace: "nowrap" }}>
          <SlidersHorizontal size={13} />
          Bộ lọc nâng cao
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   FEATURED ROOMS SECTION
══════════════════════════════════════════ */
function FeaturedRoomsSection({
  onRoomClick, onSearch, onViewAll, cols,
}: { onRoomClick?: () => void; onSearch?: () => void; onViewAll?: () => void; cols: number }) {
  return (
    <section style={{ padding: "60px 32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Section header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: font, fontSize: 26, fontWeight: 800, color: C.textPrimary, margin: "0 0 5px", letterSpacing: "-0.015em" }}>
            Phòng mới đăng tải
          </h2>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>
            Được cập nhật 5 phút trước
          </p>
        </div>
        <button onClick={onViewAll ?? onSearch}
          style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: font, fontSize: 14, fontWeight: 600, color: C.primary, background: "none", border: "none", cursor: "pointer" }}>
          Xem tất cả <ArrowRight size={15} />
        </button>
      </div>

      {/* Cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 20 }}>
        {FEATURED_ROOMS.map(r => <RoomCard key={r.id} room={r} onClick={onRoomClick} />)}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   WHY TRỌ NHANH
══════════════════════════════════════════ */
function WhyUsSection({ mobile }: { mobile?: boolean }) {
  return (
    <section style={{ background: C.caramelSoft, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "52px 20px" : "80px 32px", display: "flex", flexDirection: mobile ? "column" : "row", gap: mobile ? 40 : 64, alignItems: mobile ? "flex-start" : "center" }}>
        {/* Left text */}
        <div style={{ flex: mobile ? "none" : "0 0 340px" }}>
          <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.secondary, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Lý do chọn chúng tôi
          </p>
          <h2 style={{ fontFamily: font, fontSize: mobile ? 24 : 32, fontWeight: 900, color: C.textPrimary, margin: "0 0 16px", lineHeight: 1.25, letterSpacing: "-0.02em" }}>
            Tại sao nên chọn{" "}
            <span style={{ color: C.primary }}>Trọ Nhanh?</span>
          </h2>
          <p style={{ fontFamily: font, fontSize: 15, color: C.textSecondary, margin: "0 0 28px", lineHeight: 1.7 }}>
            Chúng tôi tối ưu hóa quy trình tìm phòng, giúp bạn tiết kiệm thời gian và công sức.
          </p>
          <Btn variant="outline" label="Tìm hiểu thêm" icon={<ArrowRight size={15} />} />
        </div>

        {/* Right 2×2 feature grid */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          {FEATURES.map(({ Icon, title, desc }) => (
            <div key={title} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 22px 24px" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Icon size={20} color={C.primary} strokeWidth={1.8} />
              </div>
              <h4 style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px" }}>{title}</h4>
              <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0, lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   LANDLORD CTA BANNER
══════════════════════════════════════════ */
function LandlordCTA({ mobile }: { mobile?: boolean }) {
  return (
    <section style={{
      background: `linear-gradient(135deg, #3E240E 0%, ${C.primaryDark} 50%, #4A2E14 100%)`,
      padding: mobile ? "60px 20px" : "80px 32px",
      textAlign: "center", position: "relative", overflow: "hidden",
    }}>
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -40, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

      <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
        <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: "rgba(232,222,201,0.6)", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Dành cho chủ nhà
        </p>
        <h2 style={{ fontFamily: font, fontSize: mobile ? 26 : 40, fontWeight: 900, color: C.cream, margin: "0 0 16px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
          Bạn có phòng cho thuê?
        </h2>
        <p style={{ fontFamily: font, fontSize: mobile ? 14 : 16, color: "rgba(232,222,201,0.75)", margin: "0 0 36px", lineHeight: 1.7 }}>
          Tham gia cùng hàng ngàn chủ nhà khác để tiếp cận lượng khách hàng tiềm năng thông qua nền tảng này.
        </p>
        <button style={{
          padding: "14px 32px", background: C.cream, color: C.primaryDark,
          border: "none", borderRadius: 12, fontFamily: font, fontSize: 15, fontWeight: 700,
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)", transition: "transform 0.15s",
        }}
          onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "none")}>
          Đăng tin miễn phí ngay
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   SITE FOOTER
══════════════════════════════════════════ */
function SiteFooter({ mobile }: { mobile?: boolean }) {
  const cols = mobile ? 1 : 4;
  return (
    <footer style={{ background: C.primaryDark, padding: mobile ? "48px 20px 32px" : "64px 32px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: mobile ? 36 : 48, marginBottom: 48 }}>
          {/* Col 1: Brand */}
          <div>
            <span style={{ fontFamily: font, fontSize: 22, fontWeight: 900, color: C.cream, display: "block", marginBottom: 14 }}>Trọ Nhanh</span>
            <p style={{ fontFamily: font, fontSize: 13, color: "rgba(232,222,201,0.55)", lineHeight: 1.75, margin: 0, maxWidth: 260 }}>
              Nền tảng tìm kiếm và quản lý phòng trọ tại Việt Nam. Mang lại giải pháp an toàn và hiệu quả cho sinh viên và người lao động.
            </p>
          </div>

          {/* Col 2: Khám phá */}
          <div>
            <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.cream, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Khám phá</p>
            {["Tìm phòng trọ", "Căn hộ dịch vụ", "Nhà nguyên căn", "Văn phòng cho thuê"].map(l => (
              <p key={l} style={{ fontFamily: font, fontSize: 13, color: "rgba(232,222,201,0.5)", margin: "0 0 10px", cursor: "pointer", transition: "color 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.color = C.cream)}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(232,222,201,0.5)")}>{l}</p>
            ))}
          </div>

          {/* Col 3: Hỗ trợ */}
          <div>
            <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.cream, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Hỗ trợ</p>
            {["Trung tâm trợ giúp", "Quy định đăng tin", "Chính sách bảo mật", "Giải quyết khiếu nại"].map(l => (
              <p key={l} style={{ fontFamily: font, fontSize: 13, color: "rgba(232,222,201,0.5)", margin: "0 0 10px", cursor: "pointer", transition: "color 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.color = C.cream)}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(232,222,201,0.5)")}>{l}</p>
            ))}
          </div>

          {/* Col 4: Liên hệ */}
          <div>
            <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.cream, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Liên hệ</p>
            {[
              { Icon: Mail,    text: "contact@tronhanh.vn" },
              { Icon: TrendingUp, text: "1900 123 456" },
              { Icon: MapPin,  text: "Tầng 12, Tòa nhà Bitexco, Quận 1, TP. Hồ Chí Minh" },
            ].map(({ Icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                <Icon size={14} color="rgba(232,222,201,0.45)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontFamily: font, fontSize: 13, color: "rgba(232,222,201,0.5)", lineHeight: 1.55 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontFamily: font, fontSize: 12, color: "rgba(232,222,201,0.3)" }}>
            © 2024 Trọ Nhanh Platform. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            {["Điều khoản sử dụng", "Chính sách Cookie"].map(t => (
              <span key={t} style={{ fontFamily: font, fontSize: 12, color: "rgba(232,222,201,0.3)", cursor: "pointer" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function BottomTabBar({ active }: { active: number }) {
  const navigate = useNavigate();
  const tabs: { icon: typeof Home; label: string; to?: string }[] = [
    { icon: Home,   label: "Trang chủ", to: "/" },
    { icon: Search, label: "Tìm phòng", to: "/search" },
    { icon: Bell,   label: "Thông báo" },
    { icon: User,   label: "Tài khoản" },
  ];
  return (
    <nav style={{ background: C.white, borderTop: `1px solid ${C.border}`, height: 60, display: "flex", position: "sticky", bottom: 0, zIndex: 100, boxShadow: "0 -2px 12px rgba(92,70,50,0.08)" }}>
      {tabs.map(({ icon: Icon, label, to }, i) => {
        const isActive = active === i;
        return (
          <button key={label} onClick={to ? () => navigate(to) : undefined} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "none", border: "none", cursor: "pointer" }}>
            <Icon size={22} color={isActive ? C.primary : "#9B8C78"} strokeWidth={isActive ? 2.5 : 1.8} />
            <span style={{ fontFamily: font, fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? C.primary : "#9B8C78" }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ══════════════════════════════════════════
   HOME PAGE — MAIN EXPORT
══════════════════════════════════════════ */
export function HomePage() {
  const navigate = useNavigate();
  const onSearch = () => navigate("/search");
  const onRoomClick = () => navigate("/room/1");
  const onViewAll = () => navigate("/listings");
  const { isMobile, isTablet } = useBreakpoint();

  /* ── MOBILE ─────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <PublicNavbarMobile onSearch={onSearch} />
        <DemoBanner mobile />

        <div style={{ flex: 1, overflowY: "auto" }}>
          <HeroSection onSearch={onSearch} isMobile />
          <QuickFilterChips onSearch={onSearch} mobile />

          <div style={{ padding: "40px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: "0 0 3px" }}>Phòng mới đăng tải</h2>
                <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0 }}>Được cập nhật 5 phút trước</p>
              </div>
              <button onClick={onViewAll} style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.primary, background: "none", border: "none", cursor: "pointer" }}>
                Xem tất cả →
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {FEATURED_ROOMS.map(r => <RoomCard key={r.id} room={r} mobile onClick={onRoomClick} />)}
            </div>
          </div>

          <WhyUsSection mobile />
          <LandlordCTA mobile />
          <SiteFooter mobile />
        </div>

        <BottomTabBar active={0} />
        <DemoFAB />
      </div>
    );
  }

  /* ── DESKTOP / TABLET ──────────────────────────── */
  const gridCols = isTablet ? 2 : 4;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* MARKER-MAKE-KIT-INVOKED */}
      <PublicNavbarDesktop onSearch={onSearch} />
      <DemoBanner />

      <main style={{ flex: 1 }}>
        <HeroSection onSearch={onSearch} />
        <QuickFilterChips onSearch={onSearch} />
        <FeaturedRoomsSection onRoomClick={onRoomClick} onSearch={onSearch} onViewAll={onViewAll} cols={gridCols} />
        <WhyUsSection />
        <LandlordCTA />
      </main>

      <SiteFooter />
      <DemoFAB />
    </div>
  );
}
