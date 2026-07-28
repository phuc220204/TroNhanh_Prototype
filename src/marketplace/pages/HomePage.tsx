import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Search, Heart, MapPin,
  Wifi, Wind, Car, Bath, Clock, Layers,
  Home, Star, Bell, User, Users, Calendar,
  SlidersHorizontal, ArrowRight,
  Shield, ShieldCheck, UserCheck, CreditCard, MessageSquare, Headphones,
  Mail, TrendingUp, Building2, Banknote, Phone,
  FileText, Facebook, Youtube, MessageCircle,
} from "lucide-react";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { C, font } from "../../shared/theme";
import { PublicNavbarDesktop, PublicNavbarMobile, DemoFAB } from "../../shared/components/PublicNavbar";
import { DemoBanner } from "../../shared/components/common/DemoBanner";
import { AppSelect } from "../../shared/components/common/AppSelect";
import { ModalShell } from "../../shared/components/common/ModalShell";
import { EmptyState, Skeleton, Button } from "../../shared/components/common";
import { logError } from "../../shared/services/supabase-error";
import { getListingImage } from "../services/listing-mappers";
import { getFeaturedListings } from "../services/listing-queries";
import { getActiveDemandPosts } from "../services/demand-queries";
import { PROPERTY_TYPES, PRICE_RANGES, TAGLINE } from "../../shared/constants/catalog";

/* Hero Search — option lists */
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

const CHIPS = ["Tất cả", ...PROPERTY_TYPES];

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
  room: { id: any; title: string; price: string; area: number | string; loc: string; amenities: string[]; badge?: string | null; img: string }; mobile?: boolean; onClick?: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
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
        <button onClick={e => { e.stopPropagation(); setSaved(v => !v); }}
          style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.92)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", transition: "all 0.15s ease" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>
          <Heart size={15} color={saved ? "#E74C3C" : C.textSecondary} fill={saved ? "#E74C3C" : "none"} strokeWidth={saved ? 0 : 2} />
        </button>
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
          {room.price} đ<span style={{ fontSize: 12, fontWeight: 400, color: C.textSecondary }}>/tháng</span>
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

type HomeModalContent = { title: string; description: string } | null;

/* ══════════════════════════════════════════
   DEMAND POST CARD
   ══════════════════════════════════════════ */
function DemandPostCard({
  post, kind, onMessage, onView,
}: {
  post: any; kind: "RoomWanted" | "RoommateWanted";
  onMessage?: () => void; onView?: () => void;
}) {
  const isWanted = kind === "RoomWanted";
  return (
    <article
      style={{
        background: `linear-gradient(160deg, ${C.white} 0%, #FBF8F1 100%)`,
        border: `1px solid ${C.border}`, borderRadius: 16, padding: 18,
        boxShadow: "0 3px 14px rgba(92,70,50,0.05)",
        display: "flex", flexDirection: "column", minWidth: 0,
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(92,70,50,0.09)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 3px 14px rgba(92,70,50,0.05)";
      }}
    >
      {/* User Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${C.primary}, ${C.sand})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: font, fontSize: 12, fontWeight: 800, color: C.white }}>
            {post.initials || "ND"}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: 0, lineHeight: 1.35 }}>
            {post.name || "Khách thuê"}
          </p>
          <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: "2px 0 0" }}>
            Người thuê
          </p>
        </div>
        <span style={{
          fontFamily: font, fontSize: 10.5, fontWeight: 700,
          color: isWanted ? C.primaryDark : C.secondary,
          background: isWanted ? C.caramelSoft : "#F0E7D6",
          borderRadius: 999, padding: "4px 9px", whiteSpace: "nowrap",
          border: `1px solid ${isWanted ? "rgba(138,106,69,0.2)" : "rgba(210,199,183,0.3)"}`,
        }}>
          {isWanted ? "Tìm phòng" : "Ở ghép"}
        </span>
      </div>

      {/* Post Title */}
      <h3 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary, margin: "0 0 12px", lineHeight: 1.45, minHeight: 44 }}>
        {post.title}
      </h3>

      {/* Structured Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
          <MapPin size={13} color={C.secondary} strokeWidth={1.9} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, lineHeight: 1.45 }}>
            {isWanted ? post.locations : post.location}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
          <Banknote size={13} color={C.secondary} strokeWidth={1.9} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.primary, lineHeight: 1.45 }}>
            {isWanted ? post.budget : post.price}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
          {isWanted ? (
            <>
              <Building2 size={13} color={C.secondary} strokeWidth={1.9} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, lineHeight: 1.45 }}>{post.roomType}</span>
            </>
          ) : (
            <>
              <Users size={13} color={C.secondary} strokeWidth={1.9} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, lineHeight: 1.45 }}>{post.needed}</span>
            </>
          )}
        </div>
      </div>

      {/* Chips/Tags */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, marginTop: "auto" }}>
        {(isWanted ? post.amenities : post.requirements).slice(0, 3).map((item: string) => (
          <span key={item} style={{ fontFamily: font, fontSize: 10, fontWeight: 600, color: C.textSecondary, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 8px" }}>
            {item}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={onMessage}
          style={{ flex: 1, minWidth: 0, minHeight: 38, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", background: C.primary, color: C.white, border: "none", borderRadius: 10, fontFamily: font, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "background 0.12s" }}
          onMouseEnter={e => (e.currentTarget.style.background = C.primaryHover)}
          onMouseLeave={e => (e.currentTarget.style.background = C.primary)}>
          <MessageSquare size={13} /> Nhắn tin
        </button>
        <button type="button" onClick={onView}
          style={{ flex: 1, minWidth: 0, minHeight: 38, padding: "8px", background: "transparent", color: C.primary, border: `1.5px solid ${C.primary}`, borderRadius: 10, fontFamily: font, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "background 0.12s" }}
          onMouseEnter={e => (e.currentTarget.style.background = C.caramelSoft)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          Xem chi tiết
        </button>
      </div>
    </article>
  );
}

/* ══════════════════════════════════════════
   MARKETPLACE SECTIONS
   ══════════════════════════════════════════ */
function MarketplaceSections({
  roomWants, roommateWants, mobile, tablet, onInfo,
}: { roomWants: any[]; roommateWants: any[]; mobile?: boolean; tablet?: boolean; onInfo: (content: HomeModalContent) => void }) {
  const [activeTab, setActiveTab] = useState<"RoomWanted" | "RoommateWanted">("RoomWanted");

  // Landing chỉ là khối GIỚI THIỆU: hiển thị đúng 1 hàng, xem đầy đủ thì bấm
  // "Xem tất cả nhu cầu". Trước đây render toàn bộ danh sách (24 + 16 card) làm
  // trang chủ dài lê thê và lấn át các khối bên dưới.
  const PREVIEW_LIMIT = 4;

  const cols = mobile ? 1 : tablet ? 2 : PREVIEW_LIMIT;
  const fullList = activeTab === "RoomWanted" ? roomWants : roommateWants;
  const list = fullList.slice(0, PREVIEW_LIMIT);

  return (
    <section style={{ background: C.caramelSoft, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "48px 16px" : "64px 32px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: mobile ? "flex-start" : "flex-end", flexDirection: mobile ? "column" : "row", gap: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left" }}>
            <Home size={28} color={C.primary} style={{ flexShrink: 0, marginTop: 4 }} />
            <div>
              <h2 style={{ fontFamily: font, fontSize: mobile ? 22 : 30, fontWeight: 900, color: C.textPrimary, margin: 0 }}>
                Nhu cầu khách thuê & Ở ghép
              </h2>
              <p style={{ fontFamily: font, fontSize: mobile ? 13 : 15, color: C.textSecondary, margin: "4px 0 0", lineHeight: 1.5 }}>
                Tìm kiếm khách thuê đang tìm phòng hoặc các tin tìm người ở ghép cùng chia sẻ chi phí.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => onInfo({ title: "Danh sách nhu cầu", description: "Danh sách đầy đủ nhu cầu tìm phòng và ở ghép đang được hoàn thiện cho phiên bản V1." })}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, minHeight: 44, padding: "0 4px", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            Xem tất cả nhu cầu →
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "rgba(138,106,69,0.06)", padding: 4, borderRadius: 12, width: mobile ? "100%" : "fit-content" }}>
          <button
            onClick={() => setActiveTab("RoomWanted")}
            style={{
              flex: mobile ? 1 : "none", padding: "10px 20px",
              fontFamily: font, fontSize: 13.5, fontWeight: 700,
              color: activeTab === "RoomWanted" ? C.primary : C.textSecondary,
              background: activeTab === "RoomWanted" ? C.white : "transparent",
              border: "none", borderRadius: 10, cursor: "pointer",
              boxShadow: activeTab === "RoomWanted" ? "0 2px 8px rgba(92,70,50,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Khách tìm phòng ({roomWants.length})
          </button>
          <button
            onClick={() => setActiveTab("RoommateWanted")}
            style={{
              flex: mobile ? 1 : "none", padding: "10px 20px",
              fontFamily: font, fontSize: 13.5, fontWeight: 700,
              color: activeTab === "RoommateWanted" ? C.primary : C.textSecondary,
              background: activeTab === "RoommateWanted" ? C.white : "transparent",
              border: "none", borderRadius: 10, cursor: "pointer",
              boxShadow: activeTab === "RoommateWanted" ? "0 2px 8px rgba(92,70,50,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Tìm bạn ở ghép ({roommateWants.length})
          </button>
        </div>

        {/* Grid */}
        {list.length === 0 ? (
          <EmptyState
            title={activeTab === "RoomWanted" ? "Chưa có nhu cầu tìm phòng nào" : "Chưa có nhu cầu tìm bạn ở ghép nào"}
            description="Hiện chưa có tin đăng nhu cầu nào thuộc danh mục này."
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: mobile ? 14 : 16 }}>
            {list.map(post => (
              <DemandPostCard
                key={post.id}
                post={post}
                kind={activeTab}
                onMessage={() => onInfo({ title: `[Nhắn tin — UI only, V1]`, description: `Bạn đang kết nối với ${post.name}. Tính năng nhắn tin thời gian thực giữa chủ trọ và khách thuê đang được tích hợp.` })}
                onView={() => onInfo({
                  title: post.title,
                  description: activeTab === "RoomWanted"
                    ? `${post.name} đang tìm ${post.roomType.toLowerCase()} tại ${post.locations}, ngân sách ${post.budget}.`
                    : `${post.name} tìm bạn ở ghép tại ${post.location}, giá ${post.price}. Yêu cầu: ${post.requirements.join(", ")}.`
                })}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   POSTING CTA SECTION
   ══════════════════════════════════════════ */
function PostingCTASection({
  mobile, onRenterPost, onLandlordPost,
}: { mobile?: boolean; onRenterPost?: () => void; onLandlordPost?: () => void }) {
  const cards = [
    {
      Icon: Search, title: "Tôi đang tìm phòng",
      description: "Đăng nhu cầu tìm phòng hoặc tìm bạn ở ghép để chủ nhà và các thành viên khác chủ động liên hệ.",
      button: "Đăng tin tìm phòng", onClick: onRenterPost, primary: true,
    },
    {
      Icon: Building2, title: "Tôi có phòng cho thuê",
      description: "Đăng phòng trống, quản lý danh sách phòng, xuất hóa đơn điện nước và kết nối nhanh chóng với khách hàng.",
      button: "Đăng tin cho thuê", onClick: onLandlordPost, primary: false,
    },
  ];

  return (
    <section style={{ background: C.white, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "52px 16px" : "72px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: mobile ? 24 : 32 }}>
          <h2 style={{ fontFamily: font, fontSize: mobile ? 22 : 30, fontWeight: 900, color: C.textPrimary, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Bạn muốn đăng tin?</h2>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Chọn nhu cầu phù hợp để bắt đầu kết nối trên Trọ Nhanh.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 14 : 20, maxWidth: 920, margin: "0 auto" }}>
          {cards.map(({ Icon, title, description, button, onClick, primary }) => (
            <div key={title} style={{
              background: primary ? "#FBF8F1" : C.white,
              border: `1.5px solid ${C.border}`, borderRadius: 20,
              padding: mobile ? "24px" : "32px",
              display: "flex", flexDirection: "column", gap: 20, textAlign: "left",
            }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: primary ? C.primary : C.cream, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={22} color={primary ? C.white : C.primary} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: "0 0 7px" }}>{title}</h3>
                <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 20px", lineHeight: 1.65 }}>{description}</p>
                <button type="button" onClick={onClick}
                  style={{
                    minHeight: 44, padding: "11px 22px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: primary ? C.primary : "transparent",
                    color: primary ? C.white : C.primary,
                    border: primary ? "none" : `1.5px solid ${C.primary}`,
                    borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                    transition: "background 0.15s",
                    boxShadow: primary ? "0 2px 8px rgba(138,74,32,0.2)" : "none",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = primary ? C.primaryHover : "rgba(138,74,32,0.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = primary ? C.primary : "transparent"; }}
                >
                  {button} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   MODALS
   ══════════════════════════════════════════ */
function InfoModal({ content, onClose }: { content: HomeModalContent; onClose: () => void }) {
  if (!content) return null;
  return (
    <ModalShell
      title={content.title}
      onClose={onClose}
      footer={<Btn label="Đã hiểu" onClick={onClose} />}
    >
      <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>{content.description}</p>
      <div style={{ padding: "12px 14px", background: C.caramelSoft, border: `1px solid ${C.border}`, borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 8 }}>
        <MessageSquare size={15} color={C.primary} style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>Đây là tương tác placeholder của bản Demo Prototype.</span>
      </div>
    </ModalShell>
  );
}

function PostTypeModal({ onClose, onSelect }: { onClose: () => void; onSelect: (type: string) => void }) {
  return (
    <ModalShell
      title="Chọn loại tin muốn đăng"
      onClose={onClose}
      footer={<Btn variant="ghost" label="Đóng" onClick={onClose} />}
    >
      <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, lineHeight: 1.65, margin: 0 }}>Người thuê có thể đăng nhu cầu tìm phòng hoặc tìm người phù hợp để ở ghép.</p>
      {[
        { Icon: Search, title: "Đăng nhu cầu tìm phòng", desc: "Cho chủ trọ biết khu vực, ngân sách và loại phòng bạn cần." },
        { Icon: Users, title: "Đăng tin tìm người ở ghép", desc: "Tìm người phù hợp để cùng chia sẻ phòng và chi phí thuê." },
      ].map(({ Icon, title, desc }) => (
        <button type="button" key={title} onClick={() => onSelect(title)}
          style={{ width: "100%", minHeight: 72, display: "flex", alignItems: "center", gap: 12, padding: "14px", textAlign: "left", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={18} color={C.primary} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: "0 0 3px" }}>{title}</p>
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>{desc}</p>
          </div>
          <ArrowRight size={16} color={C.secondary} style={{ flexShrink: 0 }} />
        </button>
      ))}
    </ModalShell>
  );
}

/* ══════════════════════════════════════════
   HERO SEARCH BOX
   ══════════════════════════════════════════ */
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
              placeholder={placeholder}
              options={(options ?? []).map(o => ({ label: o, value: o }))}
              onChange={onChange}
            />
          ) : (
            <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
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
    navigate(`/search?loc=${encodeURIComponent(loc)}&type=${encodeURIComponent(type)}&price=${encodeURIComponent(price)}`);
    if (onSearch) onSearch();
  };

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
              <AppSelect value={type} placeholder="Tất cả loại phòng" options={LOAI_PHONG.map(o => ({ label: o, value: o }))} onChange={setType} />
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <p style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: C.textSecondary, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Giá thuê</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Banknote size={15} color={C.secondary} />
            <div style={{ flex: 1 }}>
              <AppSelect value={price} placeholder="Tất cả mức giá" options={GIA_THUE.map(o => ({ label: o, value: o }))} onChange={setPrice} />
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
      <SearchField label="Vị trí" icon={<MapPin size={15} color={C.secondary} />} placeholder="Quận 7, TP.HCM" value={loc} onChange={setLoc} />
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
function HeroSection({ onSearch, isMobile }: { onSearch?: () => void; isMobile?: boolean }) {
  const STATS = [
    { value: "50.000+", label: "Phòng đang đăng", Icon: Building2 },
    { value: "10.000+", label: "Chủ nhà uy tín", Icon: UserCheck },
    { value: "< 5 phút", label: "Phản hồi trung bình", Icon: Clock },
    { value: "100%",     label: "Tin đăng xác thực", Icon: ShieldCheck },
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
          Kết nối hàng chục nghìn chủ nhà và người thuê mỗi ngày. Trọ Nhanh giúp bạn tìm phòng phù hợp chỉ trong vài phút.
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
            Kết nối hàng chục nghìn chủ nhà và người thuê mỗi ngày. Trọ Nhanh giúp bạn tìm phòng phù hợp chỉ trong vài phút.
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
              <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textPrimary, margin: "0 0 1px" }}>Thông tin xác thực</p>
              <p style={{ fontFamily: font, fontSize: 10.5, color: C.textSecondary, margin: 0 }}>Kiểm duyệt kỹ lưỡng</p>
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
function QuickFilterChips({ onSearch, mobile }: { onSearch?: () => void; mobile?: boolean }) {
  const [active, setActive] = useState("Tất cả");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", marginBottom: mobile ? 20 : 24, overflowX: "auto", paddingBottom: 4 }} className="tn-scroll-x">
      {CHIPS.map(chip => {
        const isActive = active === chip;
        return (
          <button key={chip}
            onClick={() => { setActive(chip); if (chip !== "Tất cả") onSearch?.(); }}
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
function FeaturedRoomsSection({
  rooms, onRoomClick, onSearch, onViewAll, cols,
}: { rooms: any[]; onRoomClick?: (id: string) => void; onSearch?: () => void; onViewAll?: () => void; cols: number }) {
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
      {rooms.length === 0 ? (
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
function WhyUsSection({ mobile }: { mobile?: boolean }) {
  return (
    <section style={{ background: C.caramelSoft, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "52px 20px" : "80px 32px", display: "flex", flexDirection: mobile ? "column" : "row", gap: mobile ? 40 : 64, alignItems: mobile ? "flex-start" : "center" }}>
        {/* Left text */}
        <div style={{ flex: mobile ? "none" : "0 0 340px", textAlign: "left" }}>
          <p style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: C.secondary, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            LÝ DO CHỌN TRỌ NHANH
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
            <div key={title} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 22px 24px", textAlign: "left" }}>
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
function LandlordCTA({ mobile, onPost }: { mobile?: boolean; onPost?: () => void }) {
  return (
    <section style={{
      background: C.white,
      padding: mobile ? "40px 16px" : "48px 32px",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        background: `linear-gradient(135deg, #3E240E 0%, ${C.primaryDark} 50%, #4A2E14 100%)`,
        borderRadius: 24, padding: mobile ? "36px 24px" : "48px 60px",
        display: "flex", flexDirection: mobile ? "column" : "row",
        alignItems: "center", justifyContent: "space-between", gap: 32,
        position: "relative", overflow: "hidden",
        boxShadow: "0 12px 30px rgba(47,27,14,0.2)"
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: -40, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 20, textAlign: "left", flex: 1 }}>
          {!mobile && (
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Home size={28} color={C.secondary} />
            </div>
          )}
          <div>
            <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: "rgba(232,222,201,0.6)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Dành cho chủ nhà
            </p>
            <h2 style={{ fontFamily: font, fontSize: mobile ? 22 : 28, fontWeight: 900, color: C.cream, margin: "0 0 8px", lineHeight: 1.25, letterSpacing: "-0.02em" }}>
              Bạn có phòng cho thuê?
            </h2>
            <p style={{ fontFamily: font, fontSize: mobile ? 13.5 : 14.5, color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.6, maxWidth: 580 }}>
              Tham gia cùng hàng ngàn chủ nhà khác để tiếp cận lượng khách hàng tiềm năng thông qua nền tảng này.
            </p>
          </div>
        </div>

        <button onClick={onPost} style={{
          padding: "14px 30px", background: C.white, color: C.primary,
          border: "none", borderRadius: 12, fontFamily: font, fontSize: 14.5, fontWeight: 700,
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
          boxShadow: "0 4px 10px rgba(0,0,0,0.15)", transition: "all 0.2s ease", zIndex: 2, whiteSpace: "nowrap"
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)"; }}>
          Đăng tin miễn phí ngay
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   SITE FOOTER (Light background, matching third image mockup)
   ══════════════════════════════════════════ */
function SiteFooter({ mobile }: { mobile?: boolean }) {
  const cols = mobile ? 1 : 4;
  return (
    <footer style={{ background: "#FAF7F2", borderTop: `1.5px solid ${C.border}`, padding: mobile ? "48px 16px 32px" : "64px 32px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: mobile ? 36 : 48, marginBottom: 48, textAlign: "left" }}>
          {/* Col 1: Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <Home size={22} color={C.primary} />
              <span style={{ fontFamily: font, fontSize: 22, fontWeight: 900, color: C.textPrimary, display: "block" }}>Trọ Nhanh</span>
            </div>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, lineHeight: 1.75, margin: "0 0 20px", maxWidth: 260 }}>
              Nền tảng tìm kiếm và quản lý phòng trọ tại Việt Nam. Mang lại giải pháp an toàn và hiệu quả cho sinh viên và người lao động.
            </p>
            {/* Social media icons */}
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { Icon: Facebook, link: "https://facebook.com" },
                { Icon: MessageCircle, link: "https://zalo.me" },
                { Icon: Youtube, link: "https://youtube.com" }
              ].map(({ Icon, link }, i) => (
                <a key={i} href={link} target="_blank" rel="noreferrer"
                  style={{
                    width: 32, height: 32, borderRadius: "50%", background: C.white,
                    border: `1px solid ${C.border}`, display: "flex", alignItems: "center",
                    justifyContent: "center", cursor: "pointer", color: C.textSecondary,
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.primary; e.currentTarget.style.borderColor = C.primary; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.borderColor = C.border; }}
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Khám phá */}
          <div>
            <p style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: C.textPrimary, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Khám phá</p>
            {["Tìm phòng trọ", "Căn hộ dịch vụ", "Nhà nguyên căn", "Văn phòng cho thuê"].map(l => (
              <p key={l} style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 10px", cursor: "pointer", transition: "color 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.color = C.primary)}
                onMouseLeave={e => (e.currentTarget.style.color = C.textSecondary)}>{l}</p>
            ))}
          </div>

          {/* Col 3: Hỗ trợ */}
          <div>
            <p style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: C.textPrimary, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Hỗ trợ</p>
            {["Trung tâm trợ giúp", "Quy định đăng tin", "Chính sách bảo mật", "Giải quyết khiếu nại"].map(l => (
              <p key={l} style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 10px", cursor: "pointer", transition: "color 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.color = C.primary)}
                onMouseLeave={e => (e.currentTarget.style.color = C.textSecondary)}>{l}</p>
            ))}
          </div>

          {/* Col 4: Liên hệ */}
          <div>
            <p style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: C.textPrimary, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Liên hệ</p>
            {[
              { Icon: Mail,       text: "tronhanh2026@gmail.com" },
              { Icon: Phone,      text: "1900 123 456" },
              { Icon: MapPin,     text: "Tầng 12, Tòa nhà Bitexco, Quận 1, TP. Hồ Chí Minh" },
            ].map(({ Icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                <Icon size={14} color={C.secondary} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, lineHeight: 1.55 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>
            © 2024 Trọ Nhanh Platform. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            {["Điều khoản sử dụng", "Chính sách Cookie"].map(t => (
              <span key={t} style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.color = C.primary)}
                onMouseLeave={e => (e.currentTarget.style.color = C.textSecondary)}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════
   BOTTOM TAB BAR (Mobile)
   ══════════════════════════════════════════ */
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
  const onSearch = () => navigate("/tim-phong");
  const onRoomClick = (id: string) => navigate(`/phong/${id}`);
  const onViewAll = () => navigate("/tat-ca-phong");
  const onLandlordPost = () => navigate("/chu-tro/dang-tin");
  const { isMobile, isTablet } = useBreakpoint();
  const [infoModal, setInfoModal] = useState<HomeModalContent>(null);
  const [postTypeModal, setPostTypeModal] = useState(false);

  const [dbRooms, setDbRooms] = useState<any[]>([]);
  const [dbRoomWants, setDbRoomWants] = useState<any[]>([]);
  const [dbRoommateWants, setDbRoommateWants] = useState<any[]>([]);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        // Fetch active listings via service layer
        const featuredCards = await getFeaturedListings(4);
        if (featuredCards && featuredCards.length > 0) {
          const formatted = featuredCards.map(l => ({
            id: l.id,
            title: l.title,
            price: l.priceNum.toLocaleString("vi-VN"),
            area: l.area,
            loc: l.loc,
            amenities: ["wifi", "ac"],
            badge: l.badge || "Mới đăng",
            img: l.img,
          }));
          setDbRooms(formatted);
        }

        // Fetch demand posts via service layer
        const demandData = await getActiveDemandPosts();

        if (demandData && demandData.length > 0) {
          const roomWants = demandData
            .filter(d => d.kind === "RoomWanted")
            .map(d => ({
              id: d.id,
              initials: "ND",
              name: "Khách tìm trọ",
              title: `Tìm phòng tại ${(d.desired_districts || []).join(", ")}`,
              locations: (d.desired_districts || []).join(", "),
              budget: `${(d.price_min / 1000000).toFixed(1)} – ${(d.price_max / 1000000).toFixed(1)} triệu/tháng`,
              roomType: "Phòng trọ / Căn hộ",
              moveIn: "Dọn vào trong tháng",
              amenities: ["Wifi", "WC riêng", "Tự do"],
            }));

          const roommateWants = demandData
            .filter(d => d.kind === "RoommateWanted")
            .map(d => ({
              id: d.id,
              title: `Tìm bạn ở ghép tại ${(d.desired_districts || []).join(", ")}`,
              location: `${(d.desired_districts || []).join(", ")}, TP.HCM`,
              price: `${(d.price_min / 1000000).toFixed(1)} – ${(d.price_max / 1000000).toFixed(1)} triệu/người`,
              needed: "Cần 1 người",
              requirements: ["Sạch sẽ", "Gọn gàng", "Vui vẻ"],
            }));

          setDbRoomWants(roomWants);
          setDbRoommateWants(roommateWants);
        }
      } catch (err) {
        logError("HomePage.loadHomeData", err);
      }
    };
    loadHomeData();
  }, []);

  const rooms = dbRooms;
  const roomWants = dbRoomWants;
  const roommateWants = dbRoommateWants;

  const selectRenterPostType = (type: string) => {
    setPostTypeModal(false);
    setInfoModal({
      title: "[Demand Posts — đang phát triển]",
      description: `Biểu mẫu cho "${type}" đang được thiết kế và phát triển. Tính năng này sẽ ra mắt trong phiên bản V1.`,
    });
  };

  /* ── MOBILE ─────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <PublicNavbarMobile onSearch={onSearch} />
        <DemoBanner mobile />

        <div style={{ flex: 1, overflowY: "auto" }}>
          <HeroSection onSearch={onSearch} isMobile />

          <div style={{ padding: "40px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: "0 0 3px" }}>Phòng mới đăng tải</h2>
                <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0 }}>Được cập nhật gần đây</p>
              </div>
              <button onClick={onViewAll} style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.primary, background: "none", border: "none", cursor: "pointer" }}>
                Xem tất cả →
              </button>
            </div>
            <QuickFilterChips onSearch={onSearch} mobile />
            {rooms.length === 0 ? (
              <EmptyState
                title="Chưa có tin đăng phòng trọ nào"
                description="Hiện chưa có tin đăng phòng trọ công khai nào trên hệ thống."
                action={<Button variant="primary" onClick={onLandlordPost}>Đăng tin ngay</Button>}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {rooms.map(r => <RoomCard key={r.id} room={r} mobile onClick={() => onRoomClick(r.id)} />)}
              </div>
            )}
          </div>

          <MarketplaceSections roomWants={roomWants} roommateWants={roommateWants} mobile onInfo={setInfoModal} />
          <WhyUsSection mobile />
          <PostingCTASection mobile onRenterPost={() => setPostTypeModal(true)} onLandlordPost={onLandlordPost} />
          <LandlordCTA mobile onPost={onLandlordPost} />
          <SiteFooter mobile />
        </div>

        <BottomTabBar active={0} />
        <DemoFAB />
        <InfoModal content={infoModal} onClose={() => setInfoModal(null)} />
        {postTypeModal && <PostTypeModal onClose={() => setPostTypeModal(false)} onSelect={selectRenterPostType} />}
      </div>
    );
  }

  /* ── DESKTOP / TABLET ──────────────────────────── */
  const gridCols = isTablet ? 2 : 4;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* MARKER-MAKE-KIT-INVOKED */}
      {isTablet ? <PublicNavbarMobile onSearch={onSearch} /> : <PublicNavbarDesktop onSearch={onSearch} />}
      <DemoBanner />

      <main style={{ flex: 1 }}>
        <HeroSection onSearch={onSearch} />
        <FeaturedRoomsSection rooms={rooms} onRoomClick={onRoomClick} onSearch={onSearch} onViewAll={onViewAll} cols={gridCols} />
        <MarketplaceSections roomWants={roomWants} roommateWants={roommateWants} tablet={isTablet} onInfo={setInfoModal} />
        <WhyUsSection />
        <PostingCTASection onRenterPost={() => setPostTypeModal(true)} onLandlordPost={onLandlordPost} />
        <LandlordCTA onPost={onLandlordPost} />
      </main>

      <SiteFooter />
      <DemoFAB />
      <InfoModal content={infoModal} onClose={() => setInfoModal(null)} />
      {postTypeModal && <PostTypeModal onClose={() => setPostTypeModal(false)} onSelect={selectRenterPostType} />}
    </div>
  );
}
