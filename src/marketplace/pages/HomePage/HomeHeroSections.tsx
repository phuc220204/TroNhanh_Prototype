import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight, Banknote, Bath, Building2, Car, Clock, FileText, Home,
  Layers, MapPin, Search, Shield, ShieldCheck, SlidersHorizontal, Star,
  UserCheck, Wifi, Wind,
} from "lucide-react";
import { useBreakpoint } from "../../../shared/components/useBreakpoint";
import { C, font } from "../../../shared/theme";
import { AppSelect } from "../../../shared/components/common/AppSelect";
import { EmptyState, Skeleton } from "../../../shared/components/common";
import { SaveListingButton } from "../../components/SaveListingButton";
import { PROPERTY_TYPES, PRICE_RANGES, TAGLINE } from "../../../shared/constants/catalog";

const LOAI_PHONG = [...PROPERTY_TYPES];
const GIA_THUE = [...PRICE_RANGES];



const AMENITY_META: Record<string, { Icon: React.ElementType; label: string }> = {
  wifi:      { Icon: Wifi,          label: "WiFi" },
  ac:        { Icon: Wind,          label: "Máy lạnh" },
  parking:   { Icon: Car,           label: "Để xe" },
  bath:      { Icon: Bath,          label: "WC riêng" },
  clock:     { Icon: Clock,         label: "Giờ tự do" },
  loft:      { Icon: Layers,        label: "Gác lửng" },
  furniture: { Icon: Home,          label: "Nội thất" },
  washer:    { Icon: Layers,        label: "Máy giặt" },
  balcony:   { Icon: Wind,          label: "Ban công" },
};

const CHIPS = ["Tất cả", ...PROPERTY_TYPES];

export function RoomCard({ room, mobile, onClick }: {
  room: { id: any; title: string; price: string; area: number | string; loc: string; amenities: string[]; badge?: string | null; img: string }; mobile?: boolean; onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} role="link" tabIndex={0} aria-label={`Xem tin ${room.title}`}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick?.(); } }}
      data-testid="listing-card"
      data-listing-id={room.id}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: C.white, border: `1.5px solid ${hov ? C.secondary : C.border}`,
        borderRadius: 16, overflow: "hidden",
        boxShadow: hov ? "0 12px 30px rgba(92,70,50,0.12)" : "0 2px 12px rgba(92,70,50,0.05)",
        transform: hov ? "translateY(-4px)" : "none",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", cursor: "pointer",
        display: "flex", flexDirection: mobile ? "row" : "column",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0, width: mobile ? 140 : "100%", overflow: "hidden" }}>
        <img src={room.img} alt={room.title}
          style={{ width: "100%", height: mobile ? 140 : 190, objectFit: "cover", display: "block", transition: "transform 0.4s ease-in-out", transform: hov ? "scale(1.06)" : "none" }} />
        <SaveListingButton listingId={room.id} overlay size={15} />
        <span style={{ position: "absolute", top: 12, left: 12, background: C.available, color: "#fff", fontFamily: font, fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: "4px 10px", boxShadow: "0 2px 6px rgba(79,122,74,0.2)" }}>Còn trống</span>
        {room.badge && (
          <span style={{ position: "absolute", bottom: 12, left: 12, background: C.primary, color: "#fff", fontFamily: font, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 3, boxShadow: "0 2px 6px rgba(138,74,32,0.2)" }}>
            <Star size={9} fill="#fff" strokeWidth={0} />
            {room.badge}
          </span>
        )}
      </div>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1, minWidth: 0, textAlign: "left" }}>
        <p style={{ fontFamily: font, fontSize: 14.5, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {room.title}
        </p>
        <p style={{ fontFamily: font, fontSize: 19, fontWeight: 800, color: C.primary, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
          {room.price}<span style={{ fontSize: 12, fontWeight: 400, color: C.textSecondary }}>/tháng</span>
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 14 }}>
          <MapPin size={12} color={C.textSecondary} />
          <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, fontWeight: 500 }}>{room.area} m² · {room.loc}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
          {room.amenities.slice(0, 3).map(a => {
            const m = AMENITY_META[a]; if (!m) return null;
            const { Icon, label } = m;
            return (
              <div key={a} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(201,155,101,0.06)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 8px" }}>
                <Icon size={11} color={C.primary} strokeWidth={2.2} />
                <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, fontWeight: 600 }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SearchField({
  label, icon, placeholder, isSelect, options, value, onChange, noBorderRight,
}: {
  label: string; icon: React.ReactNode; placeholder: string;
  isSelect?: boolean; options?: string[]; value: string;
  onChange: (v: string) => void; noBorderRight?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1,
        minWidth: 0,
        padding: "10px 14px",
        borderRight: noBorderRight ? "none" : `1px solid ${C.border}`,
        background: hov ? "rgba(201,155,101,0.04)" : "transparent",
        transition: "background 0.15s ease",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <p style={{ fontFamily: font, fontSize: 10, fontWeight: 800, color: C.textSecondary, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        {icon}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isSelect ? (
            <AppSelect
              value={value}
              ariaLabel={label}
              placeholder={placeholder}
              options={(options ?? []).map(o => ({ label: o, value: o }))}
              onChange={onChange}
            />
          ) : (
            <input aria-label={label} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
              style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontFamily: font, fontSize: 14.5, color: C.textPrimary, padding: 0 }} />
          )}
        </div>
      </div>
    </div>
  );
}

function HeroSearchBox({ onSearch, isMobile }: { onSearch?: () => void; isMobile?: boolean }) {
  const navigate = useNavigate();
  const [loc, setLoc] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (loc.trim()) params.set("loc", loc.trim());
    if (type) params.set("type", type);
    if (price) params.set("price", price);
    const query = params.toString();
    navigate(`/tim-phong${query ? `?${query}` : ""}`);
  };

  if (isMobile) {
    return (
      <div style={{ background: C.white, borderRadius: 16, boxShadow: "0 6px 28px rgba(92,70,50,0.12)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: C.textSecondary, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Vị trí</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={15} color={C.secondary} />
            <input aria-label="Vị trí cần tìm" value={loc} onChange={e => setLoc(e.target.value)} placeholder="Nhập khu vực"
               style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: font, fontSize: 15, color: C.textPrimary }} />
          </div>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: C.textSecondary, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Loại phòng</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Building2 size={15} color={C.secondary} />
            <div style={{ flex: 1 }}>
              <AppSelect value={type} ariaLabel="Loại phòng" placeholder="Tất cả loại phòng" options={LOAI_PHONG.map(o => ({ label: o, value: o }))} onChange={setType} />
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <p style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: C.textSecondary, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Giá thuê</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Banknote size={15} color={C.secondary} />
            <div style={{ flex: 1 }}>
              <AppSelect value={price} ariaLabel="Giá thuê" placeholder="Tất cả mức giá" options={GIA_THUE.map(o => ({ label: o, value: o }))} onChange={setPrice} />
            </div>
          </div>
        </div>
        <div style={{ padding: "12px" }}>
          <button onClick={handleSearch}
            style={{ width: "100%", padding: "14px", background: C.primary, color: C.white, border: "none", borderRadius: 12, fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(138,106,69,0.3)", transition: "all 0.2s ease-in-out" }}
            onMouseEnter={e => { e.currentTarget.style.background = C.primaryHover; e.currentTarget.style.boxShadow = "0 6px 20px rgba(138,106,69,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.boxShadow = "0 4px 14px rgba(138,106,69,0.3)"; }}
          >
            <Search size={18} /> Tìm kiếm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: 66, background: C.white, borderRadius: 16, border: `1px solid ${C.border}`,
      boxShadow: "0 8px 30px rgba(92,70,50,0.06)", display: "flex", alignItems: "stretch", overflow: "hidden"
    }}>
      <SearchField label="Vị trí" icon={<MapPin size={15} color={C.secondary} />} placeholder="Nhập khu vực" value={loc} onChange={setLoc} />
      <SearchField label="Loại phòng" icon={<Building2 size={15} color={C.secondary} />} placeholder="Tất cả loại phòng" isSelect options={LOAI_PHONG} value={type} onChange={setType} />
      <SearchField label="Khoảng giá" icon={<Banknote size={15} color={C.secondary} />} placeholder="Tất cả mức giá" isSelect options={GIA_THUE} value={price} onChange={setPrice} noBorderRight />
      <div style={{ padding: "8px 10px 8px 4px", display: "flex", alignItems: "center", flexShrink: 0 }}>
        <button onClick={handleSearch}
          style={{
            padding: "0 22px", background: C.primary, color: C.white, border: "none", borderRadius: 12,
            fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap", height: "100%",
            boxShadow: "0 4px 14px rgba(138,106,69,0.25)", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", outline: "none"
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.primaryHover; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(138,106,69,0.35)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(138,106,69,0.25)"; }}
        >
          <Search size={16} strokeWidth={2.5} /> Tìm kiếm
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   HERO SECTION
   ══════════════════════════════════════════ */
export function HeroSection({ onSearch, isMobile }: { onSearch?: () => void; isMobile?: boolean }) {
  /**
   * Bốn ô này trước đây là "50.000+ phòng đang đăng", "10.000+ chủ nhà uy tín",
   * "< 5 phút phản hồi", "100% tin đăng xác thực" — bốn con số bịa, đặt ngay dòng
   * đầu trang chủ. Trên hệ thống mới triển khai (0 tin đăng) thì đó là nói dối
   * trắng trợn, và không có cách nào đo được ba con số sau kể cả khi có dữ liệu.
   *
   * Thay bằng bốn điều ĐÚNG SỰ THẬT và không cần con số nào:
   *   • Đăng tin cho thuê miễn phí — PRD: "Tin đăng (Miễn phí) · luôn mở"
   *   • Chuyển khoản qua VietQR ngay trên hóa đơn
   *   • Nền tảng không giữ tiền thuê, không thu phí trung gian (AS-002)
   *   • Nhắn tin trực tiếp với chủ nhà, không qua trung gian
   */
  const STATS = [
    { value: "Miễn phí", label: "Đăng tin cho thuê", Icon: Building2 },
    { value: "VietQR", label: "Thanh toán trên hóa đơn", Icon: ShieldCheck },
    { value: "0đ", label: "Phí trung gian", Icon: UserCheck },
    { value: "Trực tiếp", label: "Nhắn tin với chủ nhà", Icon: Clock },
  ];

  if (isMobile) {
    return (
      <section style={{
        background: "linear-gradient(155deg, #EDE0C8 0%, #F5EFE4 55%, #EDE8DC 100%)",
        padding: "40px 16px 44px", textAlign: "center",
      }}>
        {/* Trust badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(138,74,32,0.06)", border: "1.5px solid rgba(138,74,32,0.12)", borderRadius: 999, padding: "5px 14px", marginBottom: 20 }}>
          <Shield size={12} color={C.primary} />
          <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: "0.02em" }}>
            {TAGLINE}
          </span>
        </div>

        <h1 style={{ fontFamily: font, fontSize: 26, fontWeight: 900, color: C.textPrimary, margin: "0 0 16px", lineHeight: 1.25, letterSpacing: "-0.02em" }}>
          Tìm không gian <span style={{ color: C.primary }}>sống lý tưởng</span>,<br />nhanh chóng & an tâm
        </h1>

        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 28px", lineHeight: 1.6 }}>
          Nơi chủ nhà và người thuê gặp nhau trực tiếp. Xem giá, chi phí điện nước và liên hệ chủ nhà ngay trên tin đăng — không qua trung gian.
        </p>

        <div style={{ marginBottom: 28 }}>
          <HeroSearchBox onSearch={onSearch} isMobile />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {STATS.map(({ value, label, Icon }) => (
            <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 2px 8px rgba(92,70,50,0.04)" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                <Icon size={14} color={C.primary} />
              </div>
              <p style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.primary, margin: "0 0 2px" }}>{value}</p>
              <p style={{ fontFamily: font, fontSize: 10, color: C.textSecondary, margin: 0, fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  /* Desktop Hero */
  return (
    <section style={{
      background: "linear-gradient(155deg, #EDE0C8 0%, #F5EFE4 55%, #EDE8DC 100%)",
      padding: "72px 32px 80px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 54, alignItems: "center" }}>

        {/* Left column */}
        <div style={{ textAlign: "left" }}>
          {/* Trust badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(138,74,32,0.06)", border: "1.5px solid rgba(138,74,32,0.12)", borderRadius: 999, padding: "6px 14px", marginBottom: 20 }}>
            <Shield size={12} color={C.primary} style={{ flexShrink: 0 }} />
            <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.primary, letterSpacing: "0.02em" }}>
              {TAGLINE}
            </span>
          </div>

          <h1 style={{ fontFamily: font, fontSize: 44, fontWeight: 900, color: C.textPrimary, margin: "0 0 20px", lineHeight: 1.18, letterSpacing: "-0.02em" }}>
            Tìm không gian <span style={{ color: C.primary }}>sống lý tưởng</span>,<br />nhanh chóng & an tâm
          </h1>

          <p style={{ fontFamily: font, fontSize: 15.5, color: C.textSecondary, margin: "0 0 36px", lineHeight: 1.7, maxWidth: 540 }}>
            Nơi chủ nhà và người thuê gặp nhau trực tiếp. Xem giá, chi phí điện nước và liên hệ chủ nhà ngay trên tin đăng — không qua trung gian.
          </p>

          <div style={{ marginBottom: 40, width: "100%", maxWidth: 680 }}>
            <HeroSearchBox onSearch={onSearch} />
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {STATS.map(({ value, label, Icon }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.white, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
                  <Icon size={16} color={C.primary} />
                </div>
                <div>
                  <p style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: "0 0 1px" }}>{value}</p>
                  <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: 0, fontWeight: 600 }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — visual composition */}
        <div style={{ position: "relative", width: "100%", height: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Decorative dot grid */}
          <div style={{ position: "absolute", top: 10, right: 10, width: 140, height: 100, opacity: 0.2, backgroundImage: `radial-gradient(${C.primary} 2px, transparent 2px)`, backgroundSize: "12px 12px" }} />

          {/* Main Large Image */}
          <div style={{ width: "65%", height: "85%", borderRadius: 24, overflow: "hidden", position: "absolute", left: 0, top: "5%", boxShadow: "0 12px 32px rgba(92,70,50,0.12)", border: `4px solid ${C.white}` }}>
            <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80" alt="Phòng chính" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          {/* Stacked Small Image 1 (Top Right) */}
          <div style={{ width: "40%", height: "45%", borderRadius: 16, overflow: "hidden", position: "absolute", right: 0, top: "0%", boxShadow: "0 8px 24px rgba(92,70,50,0.12)", border: `4px solid ${C.white}`, zIndex: 2 }}>
            <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&q=80" alt="Phòng phụ 1" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          {/* Stacked Small Image 2 (Bottom Right) */}
          <div style={{ width: "40%", height: "45%", borderRadius: 16, overflow: "hidden", position: "absolute", right: "5%", bottom: "5%", boxShadow: "0 8px 24px rgba(92,70,50,0.12)", border: `4px solid ${C.white}`, zIndex: 2 }}>
            <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&q=80" alt="Phòng phụ 2" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          {/* Trust Badge Pop-up Card Overlay */}
          <div style={{
            position: "absolute", left: "8%", bottom: "15%", zIndex: 3,
            background: C.white, border: `1px solid ${C.border}`, borderRadius: 16,
            padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 8px 20px rgba(92,70,50,0.12)",
          }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(79,122,74,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={16} color={C.available} />
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textPrimary, margin: "0 0 1px" }}>Chi phí minh bạch</p>
              <p style={{ fontFamily: font, fontSize: 10.5, color: C.textSecondary, margin: 0 }}>Hiển thị từ dữ liệu chủ tin cung cấp</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   QUICK FILTER CHIPS
   ══════════════════════════════════════════ */
export function QuickFilterChips({ onSearch, mobile }: { onSearch?: () => void; mobile?: boolean }) {
  const navigate = useNavigate();
  const [active, setActive] = useState("Tất cả");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", marginBottom: mobile ? 20 : 24, overflowX: "auto", paddingBottom: 4 }} className="tn-scroll-x">
      {CHIPS.map(chip => {
        const isActive = active === chip;
        return (
          <button key={chip}
            onClick={() => {
              setActive(chip);
              navigate(chip === "Tất cả" ? "/tim-phong" : `/tim-phong?type=${encodeURIComponent(chip)}`);
            }}
            style={{
              flexShrink: 0, padding: "8px 18px", borderRadius: 999, cursor: "pointer",
              fontFamily: font, fontSize: 13, fontWeight: isActive ? 700 : 500,
              border: `1px solid ${isActive ? C.primary : C.border}`,
              background: isActive ? C.primary : C.white,
              color: isActive ? C.white : C.textSecondary,
              transition: "all 0.15s ease", whiteSpace: "nowrap",
            }}>
            {chip}
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════
   FEATURED ROOMS SECTION
   ══════════════════════════════════════════ */
export function FeaturedRoomsSection({
  rooms, loading, onRoomClick, onSearch, onViewAll, cols,
}: { rooms: any[]; loading: boolean; onRoomClick?: (id: string) => void; onSearch?: () => void; onViewAll?: () => void; cols: number }) {
  const { isMobile } = useBreakpoint();
  return (
    <section style={{ padding: isMobile ? "40px 16px" : "60px 32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Section header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left" }}>
          <FileText size={28} color={C.primary} style={{ flexShrink: 0, marginTop: 4 }} />
          <div>
            <h2 style={{ fontFamily: font, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.textPrimary, margin: 0, letterSpacing: "-0.015em" }}>
              Phòng mới đăng tải
            </h2>
            <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "4px 0 0" }}>
              Khám phá những phòng trọ mới nhất được cập nhật mỗi ngày.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "space-between" : "flex-end" }}>
          <button onClick={onViewAll ?? onSearch}
            style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: font, fontSize: 14, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            Xem tất cả <ArrowRight size={15} />
          </button>

          <button onClick={onSearch}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.white, fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s ease", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.secondary; e.currentTarget.style.background = C.cream; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.white; }}>
            <SlidersHorizontal size={13} color={C.textSecondary} />
            Bộ lọc nâng cao
          </button>
        </div>
      </div>

      <QuickFilterChips onSearch={onSearch} mobile={isMobile} />

      {/* Cards grid */}
      {loading ? (
        <div data-testid="home-listings-loading" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 20 }}>
          {Array.from({ length: cols }).map((_, index) => <Skeleton key={index} variant="card" />)}
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState
          title="Chưa có tin đăng phòng trọ nào"
          description="Hiện chưa có tin đăng phòng trọ công khai nào trên hệ thống."
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 20 }}>
          {rooms.map(r => <RoomCard key={r.id} room={r} onClick={() => onRoomClick?.(r.id)} />)}
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════
   WHY TRỌ NHANH
   ══════════════════════════════════════════ */
