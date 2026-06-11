import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Heart, Share2, MapPin, Users, Building2,
  Wifi, Wind, Car, Bath, Clock, Layers,
  Zap, Droplets, Wrench, Key,
  Phone, MessageSquare,
  ChevronLeft, ChevronRight, X,
  User,
  Shield, AlertTriangle,
  ShoppingBag, GraduationCap, HeartPulse, UtensilsCrossed,
  Fingerprint, ParkingCircle, WashingMachine, Refrigerator,
} from "lucide-react";
import { C, font } from "../theme";
import { useBreakpoint } from "../components/useBreakpoint";
import { PublicNavbarDesktop, DemoFAB } from "../components/PublicNavbar";
import { DemoBanner } from "../components/common/DemoBanner";

/* ══════════════════════════════════════════
   ROOM DATA
══════════════════════════════════════════ */
const IMAGES = [
  "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&q=85",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80",
  "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800&q=80",
  "https://images.unsplash.com/photo-1489171078254-c3365d6e359f?w=800&q=80",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
];

const AMENITIES: Array<{ key: string; Icon: React.ElementType; label: string }> = [
  { key: "ac",      Icon: Wind,          label: "Máy lạnh" },
  { key: "wifi",    Icon: Wifi,          label: "Wifi tốc độ cao" },
  { key: "washer",  Icon: WashingMachine,label: "Máy giặt riêng" },
  { key: "fridge",  Icon: Refrigerator,  label: "Tủ lạnh" },
  { key: "key",     Icon: Fingerprint,   label: "Khóa vân tay" },
  { key: "parking", Icon: ParkingCircle, label: "Hầm để xe" },
];

const COSTS: Array<{ Icon: React.ElementType; label: string; value: string }> = [
  { Icon: Zap,      label: "Điện",      value: "3.500 đ/kWh" },
  { Icon: Droplets, label: "Nước",      value: "100.000 đ/người" },
  { Icon: Wrench,   label: "Dịch vụ",   value: "150.000 đ/tháng" },
  { Icon: Key,      label: "Đặt cọc",   value: "1 tháng tiền thuê" },
];

const NEARBY_CATEGORIES = [
  {
    key: "shopping",
    Icon: ShoppingBag,
    label: "Mua sắm & Giải trí",
    places: [
      { name: "Vạn Hạnh Mall", dist: "500m" },
      { name: "Chợ Nguyễn Tri Phương", dist: "800m" },
      { name: "Big C Miền Đông", dist: "1.2km" },
    ],
  },
  {
    key: "edu",
    Icon: GraduationCap,
    label: "Giáo dục",
    places: [
      { name: "ĐH Kinh tế TP.HCM", dist: "600m" },
      { name: "ĐH Bách Khoa", dist: "1.2km" },
    ],
  },
  {
    key: "health",
    Icon: HeartPulse,
    label: "Y tế",
    places: [
      { name: "Bệnh viện 115", dist: "400m" },
      { name: "Viện Tim TP.HCM", dist: "900m" },
    ],
  },
  {
    key: "food",
    Icon: UtensilsCrossed,
    label: "Ẩm thực",
    places: [
      { name: "Khu ăn uống Sư Vạn Hạnh", dist: "300m" },
      { name: "Quán cafe văn phòng", dist: "200m" },
      { name: "Cửa hàng tiện lợi 24/7", dist: "150m" },
    ],
  },
];

const SIMILAR_ROOMS = [
  {
    id: 2,
    img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
    title: "Studio Full Nội Thất Quận 10",
    area: "30 m²",
    district: "Quận 10",
    price: "4.500.000 đ",
    tags: ["Máy lạnh", "Wifi", "Giờ tự do"],
  },
  {
    id: 3,
    img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80",
    title: "Phòng Có Ban Công Bình Thạnh",
    area: "28 m²",
    district: "Bình Thạnh",
    price: "3.500.000 đ",
    tags: ["WC riêng", "Wifi", "Để xe"],
  },
  {
    id: 4,
    img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80",
    title: "Căn Hộ Mini Gần ĐH RMIT",
    area: "35 m²",
    district: "Quận 7",
    price: "5.200.000 đ",
    tags: ["Máy lạnh", "Tủ lạnh", "Khóa vân tay"],
  },
];

/* ══════════════════════════════════════════
   PRIMITIVES
══════════════════════════════════════════ */
function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ paddingBottom: 28, marginBottom: last ? 0 : 28, borderBottom: last ? "none" : `1px solid ${C.border}` }}>
      <h3 style={{ fontFamily: font, fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: "0 0 16px" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════
   GALLERY LIGHTBOX
══════════════════════════════════════════ */
function GalleryLightbox({
  open, images, initialIndex, onClose,
}: { open: boolean; images: string[]; initialIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initialIndex);

  useEffect(() => {
    if (!open) return;
    setIdx(initialIndex);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx(i => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, initialIndex, images.length, onClose]);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(20,10,4,0.94)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <X size={22} color="white" />
      </button>
      <div style={{ position: "absolute", top: 22, left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,0.12)", borderRadius: 999, padding: "5px 14px" }}>
        <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: "white" }}>{idx + 1} / {images.length} ảnh</span>
      </div>
      <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
        style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.3 : 1 }}>
        <ChevronLeft size={26} color="white" />
      </button>
      <img src={images[idx]} alt={`Ảnh ${idx + 1}`}
        style={{ maxWidth: "calc(100vw - 160px)", maxHeight: "calc(100vh - 120px)", objectFit: "contain", borderRadius: 10 }} />
      <button onClick={() => setIdx(i => Math.min(images.length - 1, i + 1))} disabled={idx === images.length - 1}
        style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center", cursor: idx === images.length - 1 ? "not-allowed" : "pointer", opacity: idx === images.length - 1 ? 0.3 : 1 }}>
        <ChevronRight size={26} color="white" />
      </button>
      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
        {images.map((img, i) => (
          <button key={i} onClick={() => setIdx(i)}
            style={{ width: i === idx ? 56 : 44, height: i === idx ? 42 : 34, padding: 0, border: `2px solid ${i === idx ? C.cream : "transparent"}`, borderRadius: 6, overflow: "hidden", cursor: "pointer", transition: "all 0.15s", flexShrink: 0 }}>
            <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   DESKTOP — IMAGE GALLERY
══════════════════════════════════════════ */
function ImageGallery({
  images, saved, onSave, onOpen,
}: { images: string[]; saved: boolean; onSave: () => void; onOpen: (idx: number) => void }) {
  const [mainIdx, setMainIdx] = useState(0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", height: 460, gap: 8, borderRadius: 16, overflow: "hidden", marginBottom: 32 }}>
      {/* Main image */}
      <div style={{ position: "relative", cursor: "pointer" }} onClick={() => onOpen(mainIdx)}>
        <img src={images[mainIdx]} alt="Ảnh chính"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", top: 14, left: 14, background: "rgba(0,0,0,0.42)", borderRadius: 999, padding: "5px 13px" }}>
          <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: "white" }}>{mainIdx + 1}/{images.length} ảnh</span>
        </div>
        <button onClick={e => { e.stopPropagation(); onSave(); }}
          style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.92)", border: "none", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
          <Heart size={18} color={saved ? "#E05C5C" : C.secondary} fill={saved ? "#E05C5C" : "none"} strokeWidth={2} />
        </button>
        <button onClick={e => e.stopPropagation()}
          style={{ position: "absolute", bottom: 14, right: 14, background: "rgba(255,255,255,0.92)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
          <Share2 size={15} color={C.textSecondary} />
        </button>
        <button onClick={e => { e.stopPropagation(); onOpen(0); }}
          style={{ position: "absolute", bottom: 14, left: 14, background: "rgba(0,0,0,0.42)", border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontFamily: font, fontSize: 12, color: "white" }}>Xem tất cả ảnh</span>
        </button>
      </div>

      {/* 2×2 thumbnails */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 8 }}>
        {[1, 2, 3, 4].map(i => {
          const isLast = i === 4;
          return (
            <div key={i} style={{ position: "relative", cursor: "pointer", overflow: "hidden" }}
              onClick={() => { setMainIdx(i); if (isLast) onOpen(i); }}>
              <img src={images[i]} alt={`Ảnh ${i + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              />
              {isLast && images.length > 5 && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(20,10,4,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <span style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: "white" }}>+{images.length - 4}</span>
                  <span style={{ fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.85)" }}>ảnh nữa</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════
   CONTENT BLOCKS — LEFT COLUMN
══════════════════════════════════════════ */
function TitleBlock() {
  return (
    <div style={{ paddingBottom: 24, marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        {["Tìm phòng", "Bình Thạnh", "Chi tiết phòng"].map((crumb, i, arr) => (
          <span key={crumb} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: font, fontSize: 12, color: i === arr.length - 1 ? C.textPrimary : C.textSecondary, fontWeight: i === arr.length - 1 ? 600 : 400, cursor: i < arr.length - 1 ? "pointer" : "default" }}>
              {crumb}
            </span>
            {i < arr.length - 1 && <span style={{ fontFamily: font, fontSize: 12, color: C.border }}>/</span>}
          </span>
        ))}
      </div>
      <h1 style={{ fontFamily: font, fontSize: 26, fontWeight: 800, color: C.textPrimary, margin: "0 0 10px", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
        Phòng trọ có gác lửng gần ĐH Hutech
      </h1>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <MapPin size={14} color={C.secondary} />
          <span style={{ fontFamily: font, fontSize: 14, color: C.textSecondary }}>Đường Phan Văn Trị, Bình Thạnh, TP. Hồ Chí Minh</span>
        </div>
        <span style={{ background: "#E8F5E1", color: "#4A7A34", fontFamily: font, fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "3px 12px" }}>
          ● Trống
        </span>
        <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>Đăng 2 ngày trước</span>
      </div>
    </div>
  );
}

function DescriptionSection() {
  const [expanded, setExpanded] = useState(false);
  return (
    <Section title="Thông tin mô tả">
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px" }}>
        <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, lineHeight: 1.8, margin: "0 0 14px" }}>
          Phòng trọ có gác lửng thoáng mát, phù hợp sinh viên hoặc người đi làm. Khu vực an ninh, yên tĩnh, gần trường học, chợ và các tiện ích thiết yếu. Chủ trọ thân thiện, hỗ trợ nhiệt tình trong suốt quá trình thuê.
        </p>
        {expanded && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {[
              "Diện tích: 25m², thiết kế có gác lửng tối ưu không gian.",
              "Nội thất: Giường nệm, tủ quần áo, bàn làm việc, máy lạnh, máy giặt riêng.",
              "Khu vực bếp nhỏ được trang bị bếp điện và kệ đựng đồ.",
              "Nhà vệ sinh riêng, nóng lạnh đầy đủ.",
            ].map((pt, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.secondary, flexShrink: 0, marginTop: 8 }} />
                <span style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>{pt}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setExpanded(v => !v)}
          style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.primary, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          {expanded ? "Rút gọn ▲" : "Xem thêm ▼"}
        </button>
      </div>
    </Section>
  );
}

function QuickStats() {
  const stats = [
    { Icon: Building2, label: "Diện tích", value: "25 m²" },
    { Icon: Users,     label: "Tối đa",    value: "2 người" },
    { Icon: Layers,    label: "Tầng",      value: "Tầng 2" },
    { Icon: Key,       label: "Đặt cọc",   value: "1 tháng" },
  ];
  return (
    <Section title="Thông tin cơ bản">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {stats.map(({ Icon, label, value }) => (
          <div key={label} style={{ background: C.caramelSoft, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <Icon size={20} color={C.primary} strokeWidth={1.8} style={{ display: "block", margin: "0 auto 8px" }} />
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 2px" }}>{value}</p>
            <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: 0 }}>{label}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function AmenitiesGrid() {
  return (
    <Section title="Tiện ích căn hộ">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {AMENITIES.map(({ key, Icon, label }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={16} color={C.primary} strokeWidth={1.8} />
            </div>
            <span style={{ fontFamily: font, fontSize: 13, fontWeight: 500, color: C.textPrimary }}>{label}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function CostTable() {
  return (
    <Section title="Chi phí hàng tháng">
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        {COSTS.map(({ Icon, label, value }, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", padding: "13px 16px", background: i % 2 === 0 ? C.white : C.caramelSoft, borderBottom: i < COSTS.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <Icon size={15} color={C.secondary} strokeWidth={1.8} />
              <span style={{ fontFamily: font, fontSize: 14, color: C.textSecondary }}>{label}</span>
            </div>
            <span style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{value}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function NearbySection() {
  return (
    <Section title="Vị trí & Tiện ích xung quanh">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        {NEARBY_CATEGORIES.map(({ key, Icon, label, places }) => (
          <div key={key} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={15} color={C.primary} strokeWidth={1.8} />
              </div>
              <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{label}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {places.map(({ name, dist }) => (
                <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>{name}</span>
                  <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: C.secondary, background: C.caramelSoft, borderRadius: 999, padding: "2px 9px", flexShrink: 0, marginLeft: 8 }}>{dist}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Map placeholder */}
      <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, height: 200, background: `linear-gradient(135deg, ${C.cream} 0%, #ddd5c0 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.white, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MapPin size={20} color={C.primary} />
        </div>
        <span style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textSecondary }}>Đường Phan Văn Trị, Bình Thạnh</span>
        <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, opacity: 0.7 }}>Bản đồ · Google Maps</span>
      </div>
    </Section>
  );
}

function SimilarRooms() {
  return (
    <Section title="Phòng tương tự khu vực Bình Thạnh" last>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {SIMILAR_ROOMS.map(room => (
          <div key={room.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(92,70,50,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
            <div style={{ position: "relative", height: 140 }}>
              <img src={room.img} alt={room.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", bottom: 8, right: 8, background: C.primaryDark, borderRadius: 999, padding: "3px 10px" }}>
                <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.cream }}>{room.price}/tháng</span>
              </div>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 5px", lineHeight: 1.4 }}>{room.title}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                <MapPin size={11} color={C.secondary} />
                <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>{room.district} · {room.area}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {room.tags.map(tag => (
                  <span key={tag} style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, background: C.caramelSoft, borderRadius: 6, padding: "2px 8px" }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════
   DESKTOP — STICKY SIDEBAR
══════════════════════════════════════════ */
function StickyContactCard({ onChat, onPhone }: { onChat: () => void; onPhone: () => void }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: "0 4px 24px rgba(92,70,50,0.10)", overflow: "hidden" }}>
      {/* Price header */}
      <div style={{ background: `linear-gradient(135deg, ${C.primaryDark} 0%, ${C.primary} 100%)`, padding: "20px 24px" }}>
        <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: "rgba(232,222,201,0.7)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Giá thuê hàng tháng</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span style={{ fontFamily: font, fontSize: 28, fontWeight: 800, color: C.cream, letterSpacing: "-0.02em" }}>3.200.000 đ</span>
          <span style={{ fontFamily: font, fontSize: 13, color: "rgba(232,222,201,0.7)" }}>/tháng</span>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.15)", display: "flex", flexDirection: "column", gap: 4 }}>
          {[{ label: "Điện", value: "3.500đ/kWh" }, { label: "Nước", value: "100k/người" }].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: font, fontSize: 12, color: "rgba(232,222,201,0.65)" }}>{label}</span>
              <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: "rgba(232,222,201,0.85)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Owner contact */}
      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${C.sand}, ${C.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <User size={22} color={C.white} />
          </div>
          <div>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Anh Minh</p>
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "2px 0 0" }}>Chủ trọ · Phản hồi nhanh</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3 }}>
            <Shield size={13} color="#6B8E5A" />
            <span style={{ fontFamily: font, fontSize: 11, color: "#6B8E5A", fontWeight: 600 }}>Đã xác minh</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onChat}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 20px", background: C.primary, color: C.white, border: "none", borderRadius: 12, fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "background 0.12s", boxShadow: "0 2px 12px rgba(138,106,69,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.background = C.primaryHover)}
            onMouseLeave={e => (e.currentTarget.style.background = C.primary)}>
            <MessageSquare size={17} />
            Gửi tin nhắn
          </button>
          <button onClick={onPhone}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px", background: "transparent", color: C.primary, border: `1.5px solid ${C.primary}`, borderRadius: 12, fontFamily: font, fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#F0E7D6"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            <Phone size={17} />
            Gọi 09xx xxx xxx
          </button>
        </div>

        <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "12px 0 0", lineHeight: 1.6, textAlign: "center" }}>
          Nhắn tin trực tiếp với chủ phòng trên Trọ Nhanh để hỏi thêm thông tin trước khi xem phòng.
        </p>

        <div style={{ marginTop: 10, padding: "10px 14px", background: C.caramelSoft, borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 7 }}>
          <Shield size={13} color={C.secondary} style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.55 }}>
            Trọ Nhanh khuyến khích trao đổi trong nền tảng để lưu lại nội dung tư vấn. Hãy kiểm tra phòng trực tiếp trước khi đặt cọc.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MOBILE — IMAGE CAROUSEL
══════════════════════════════════════════ */
function MobileImageCarousel({
  images, onBack, saved, onSave, onOpen,
}: { images: string[]; onBack: () => void; saved: boolean; onSave: () => void; onOpen: (i: number) => void }) {
  const [idx, setIdx] = useState(0);

  return (
    <div style={{ position: "relative", width: "100%", height: 280, backgroundColor: "#2a1a0e", flexShrink: 0 }}>
      <img src={images[idx]} alt={`Ảnh ${idx + 1}`} onClick={() => onOpen(idx)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <button onClick={onBack}
        style={{ position: "absolute", top: 14, left: 14, width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.88)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <ArrowLeft size={18} color={C.textPrimary} />
      </button>
      <button onClick={onSave}
        style={{ position: "absolute", top: 14, right: 14, width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.88)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <Heart size={17} color={saved ? "#E05C5C" : C.secondary} fill={saved ? "#E05C5C" : "none"} strokeWidth={2} />
      </button>
      <div style={{ position: "absolute", bottom: 14, right: 14, background: "rgba(0,0,0,0.5)", borderRadius: 999, padding: "4px 10px" }}>
        <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: "white" }}>{idx + 1}/{images.length} ảnh</span>
      </div>
      {idx > 0 && (
        <button onClick={() => setIdx(i => i - 1)} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.35)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ChevronLeft size={18} color="white" />
        </button>
      )}
      {idx < images.length - 1 && (
        <button onClick={() => setIdx(i => i + 1)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.35)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ChevronRight size={18} color="white" />
        </button>
      )}
      <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
        {images.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 999, background: i === idx ? "white" : "rgba(255,255,255,0.5)", border: "none", cursor: "pointer", transition: "all 0.2s", padding: 0 }} />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MODALS
══════════════════════════════════════════ */
function PhoneModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,10,4,0.5)", zIndex: 500, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 501, background: C.white, borderRadius: 20, padding: "28px 32px", maxWidth: 360, width: "calc(100vw - 48px)", textAlign: "center", boxShadow: "0 20px 60px rgba(20,10,4,0.25)" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Phone size={24} color={C.primary} />
        </div>
        <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>Gọi cho Anh Minh?</h3>
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 6px" }}>Chủ trọ Phòng trọ gác lửng Bình Thạnh</p>
        <div style={{ background: C.caramelSoft, borderRadius: 12, padding: "12px 20px", margin: "16px 0 24px" }}>
          <p style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.primary, margin: 0, letterSpacing: "0.03em" }}>0912 345 678</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>Hủy</button>
          <a href="tel:0912345678" style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", background: C.primary, border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer", textDecoration: "none" }}>
            <Phone size={16} /> Gọi ngay
          </a>
        </div>
      </div>
    </>
  );
}

const QUICK_MESSAGES = [
  "Phòng này còn trống không?",
  "Mình muốn hỏi thêm về chi phí điện nước.",
  "Có thể xem phòng vào cuối tuần không?",
];

function ChatModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<{ text: string; sent: boolean }[]>([]);
  const [input, setInput] = useState("");

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { text: text.trim(), sent: true }]);
    setInput("");
    setTimeout(() => {
      setMessages(prev => [...prev, { text: "Cảm ơn bạn đã nhắn tin! Mình sẽ phản hồi sớm nhé.", sent: false }]);
    }, 1000);
  };

  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,10,4,0.5)", zIndex: 500, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 501, background: C.white, borderRadius: 20, width: "calc(100vw - 48px)", maxWidth: 440, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(20,10,4,0.25)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: C.primaryDark, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${C.sand}, ${C.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <User size={18} color={C.white} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.cream, margin: 0 }}>Tin nhắn với Anh Minh</p>
            <p style={{ fontFamily: font, fontSize: 12, color: "rgba(232,222,201,0.7)", margin: "1px 0 0" }}>Chủ trọ · Phản hồi nhanh</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={15} color={C.cream} />
          </button>
        </div>

        {/* Listing context card */}
        <div style={{ margin: "12px 14px 0", background: C.caramelSoft, border: `1px solid ${C.border}`, borderRadius: 12, display: "flex", gap: 12, padding: "10px 12px", alignItems: "center" }}>
          <img src={IMAGES[0]} alt="Phòng" style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Phòng trọ có gác lửng gần ĐH Hutech</p>
            <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary, margin: "0 0 1px" }}>3.200.000 đ/tháng</p>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={11} color={C.secondary} />
              <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>Bình Thạnh, TP.HCM</span>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 10, minHeight: 120 }}>
          {messages.length === 0 && (
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, textAlign: "center", margin: "16px 0" }}>Bắt đầu cuộc trò chuyện với Anh Minh</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.sent ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "75%", padding: "9px 13px", borderRadius: msg.sent ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: msg.sent ? C.primary : C.caramelSoft, border: msg.sent ? "none" : `1px solid ${C.border}` }}>
                <span style={{ fontFamily: font, fontSize: 14, color: msg.sent ? C.white : C.textPrimary, lineHeight: 1.5 }}>{msg.text}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick messages */}
        {messages.length === 0 && (
          <div style={{ padding: "0 14px 8px", display: "flex", flexWrap: "wrap", gap: 7 }}>
            {QUICK_MESSAGES.map(qm => (
              <button key={qm} onClick={() => sendMessage(qm)}
                style={{ fontFamily: font, fontSize: 12, color: C.primary, background: C.white, border: `1.5px solid ${C.primary}`, borderRadius: 999, padding: "6px 13px", cursor: "pointer", transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.background = C.caramelSoft)}
                onMouseLeave={e => (e.currentTarget.style.background = C.white)}>
                {qm}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "10px 14px 14px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage(input)}
            placeholder="Nhập tin nhắn..."
            style={{ flex: 1, fontFamily: font, fontSize: 14, color: C.textPrimary, padding: "10px 14px", background: C.caramelSoft, border: `1.5px solid ${C.border}`, borderRadius: 999, outline: "none" }}
          />
          <button onClick={() => sendMessage(input)}
            style={{ width: 40, height: 40, borderRadius: "50%", background: C.primary, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <MessageSquare size={17} color={C.white} />
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════
   MOBILE — DESCRIPTION SECTION
══════════════════════════════════════════ */
function MobileDescriptionSection() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${C.border}` }}>
      <h3 style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 12px" }}>Thông tin mô tả</h3>
      <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, lineHeight: 1.75, margin: "0 0 10px" }}>
        Phòng trọ có gác lửng thoáng mát, phù hợp sinh viên hoặc người đi làm. Khu vực an ninh, yên tĩnh, gần trường học và các tiện ích thiết yếu.
      </p>
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
          {[
            "Diện tích: 25m², thiết kế có gác lửng tối ưu không gian.",
            "Nội thất: Giường nệm, tủ quần áo, bàn làm việc, máy lạnh, máy giặt riêng.",
            "Khu vực bếp nhỏ được trang bị bếp điện và kệ đựng đồ.",
          ].map((pt, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.secondary, flexShrink: 0, marginTop: 8 }} />
              <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, lineHeight: 1.65 }}>{pt}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setExpanded(v => !v)}
        style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.primary, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        {expanded ? "Rút gọn ▲" : "Xem thêm ▼"}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════
   MOBILE — NEARBY SECTION
══════════════════════════════════════════ */
function MobileNearbySection() {
  return (
    <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${C.border}` }}>
      <h3 style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 14px" }}>Vị trí & Tiện ích xung quanh</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {NEARBY_CATEGORIES.map(({ key, Icon, label, places }) => (
          <div key={key} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={13} color={C.primary} strokeWidth={1.8} />
              </div>
              <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{label}</span>
            </div>
            {places.map(({ name, dist }) => (
              <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 5 }}>
                <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>{name}</span>
                <span style={{ fontFamily: font, fontSize: 11, fontWeight: 600, color: C.secondary, background: C.caramelSoft, borderRadius: 999, padding: "2px 8px", flexShrink: 0, marginLeft: 8 }}>{dist}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Map placeholder */}
      <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, height: 140, background: `linear-gradient(135deg, ${C.cream} 0%, #ddd5c0 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.white, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MapPin size={16} color={C.primary} />
        </div>
        <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textSecondary }}>Đường Phan Văn Trị, Bình Thạnh</span>
        <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, opacity: 0.7 }}>Bản đồ · Google Maps</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MOBILE — SIMILAR ROOMS
══════════════════════════════════════════ */
function MobileSimilarRooms() {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 12px" }}>Phòng tương tự khu vực</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {SIMILAR_ROOMS.map(room => (
          <div key={room.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", cursor: "pointer" }}>
            <img src={room.img} alt={room.title} style={{ width: 90, height: 90, objectFit: "cover", flexShrink: 0 }} />
            <div style={{ padding: "11px 13px", flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 4px", lineHeight: 1.35 }}>{room.title}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                <MapPin size={11} color={C.secondary} />
                <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>{room.district} · {room.area}</span>
              </div>
              <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.primary }}>{room.price}/tháng</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export function RoomDetailPage() {
  const navigate = useNavigate();
  const onBack = () => navigate(-1);
  const { isMobile } = useBreakpoint();

  const [saved, setSaved]               = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx]   = useState(0);
  const [phoneModal, setPhoneModal]     = useState(false);
  const [chatModal, setChatModal]       = useState(false);

  const openLightbox = (idx: number) => { setLightboxIdx(idx); setLightboxOpen(true); };

  /* ── MOBILE ─────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* 1. Image carousel */}
          <MobileImageCarousel
            images={IMAGES}
            onBack={onBack}
            saved={saved}
            onSave={() => setSaved(v => !v)}
            onOpen={openLightbox}
          />
          <DemoBanner mobile />

          <div style={{ padding: "20px 16px 32px" }}>
            {/* 2. Title + location + status + compact price */}
            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ background: "#E8F5E1", color: "#4A7A34", fontFamily: font, fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "3px 12px" }}>
                    ● Trống
                  </span>
                  <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>Đăng 2 ngày trước</span>
                </div>
                {/* Compact price inline */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.primary }}>3.200.000đ</span>
                  <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>/tháng</span>
                </div>
              </div>
              <h1 style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: "0 0 8px", lineHeight: 1.3 }}>
                Phòng trọ có gác lửng gần ĐH Hutech
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <MapPin size={13} color={C.secondary} />
                <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>Bình Thạnh, TP. Hồ Chí Minh</span>
              </div>
            </div>

            {/* 3. Thông tin mô tả */}
            <MobileDescriptionSection />

            {/* 4. Thông tin cơ bản */}
            <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${C.border}` }}>
              <h3 style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 12px" }}>Thông tin cơ bản</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { Icon: Building2, label: "Diện tích", value: "25 m²" },
                  { Icon: Users,     label: "Tối đa",    value: "2 người" },
                  { Icon: Layers,    label: "Tầng",      value: "Tầng 2" },
                  { Icon: Key,       label: "Đặt cọc",   value: "1 tháng" },
                ].map(({ Icon, label, value }) => (
                  <div key={label} style={{ background: C.caramelSoft, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon size={18} color={C.primary} strokeWidth={1.8} />
                    <div>
                      <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{value}</p>
                      <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: 0 }}>{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Tiện ích căn hộ */}
            <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${C.border}` }}>
              <h3 style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 12px" }}>Tiện ích căn hộ</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {AMENITIES.map(({ key, Icon, label }) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 999 }}>
                    <Icon size={14} color={C.primary} strokeWidth={1.8} />
                    <span style={{ fontFamily: font, fontSize: 13, color: C.textPrimary }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 6–7. Vị trí & Tiện ích xung quanh + Map */}
            <MobileNearbySection />

            {/* 8. Phòng tương tự */}
            <MobileSimilarRooms />

            {/* Platform notice */}
            <div style={{ padding: "12px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, display: "flex", gap: 8 }}>
              <AlertTriangle size={13} color={C.secondary} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>
                Trọ Nhanh không tham gia giao dịch. Hãy gặp mặt và kiểm tra phòng trực tiếp trước khi đặt cọc.
              </p>
            </div>
          </div>
        </div>

        {/* 9. Sticky bottom CTA */}
        <div style={{ background: C.white, borderTop: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", gap: 10, flexShrink: 0, boxShadow: "0 -2px 12px rgba(92,70,50,0.08)" }}>
          <button onClick={() => setChatModal(true)}
            style={{ flex: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "14px", background: C.primary, color: C.white, border: "none", borderRadius: 12, fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer", minHeight: 44 }}>
            <MessageSquare size={17} /> Gửi tin nhắn
          </button>
          <button onClick={() => setPhoneModal(true)}
            style={{ flex: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "14px", background: "transparent", color: C.primary, border: `1.5px solid ${C.primary}`, borderRadius: 12, fontFamily: font, fontSize: 15, fontWeight: 600, cursor: "pointer", minHeight: 44 }}>
            <Phone size={17} /> Gọi điện
          </button>
        </div>

        <PhoneModal open={phoneModal} onClose={() => setPhoneModal(false)} />
        <ChatModal open={chatModal} onClose={() => setChatModal(false)} />
        <GalleryLightbox open={lightboxOpen} images={IMAGES} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} />
      </div>
    );
  }

  /* ── DESKTOP ─────────────────────────────────────────── */
  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicNavbarDesktop onSearch={() => navigate("/search")} />
      <DemoBanner />

      <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "28px 32px 80px" }}>
        <ImageGallery
          images={IMAGES}
          saved={saved}
          onSave={() => setSaved(v => !v)}
          onOpen={openLightbox}
        />

        <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
          {/* Left column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <TitleBlock />
            <DescriptionSection />
            <QuickStats />
            <AmenitiesGrid />
            <CostTable />
            <NearbySection />
            <SimilarRooms />
          </div>

          {/* Right sticky sidebar */}
          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={{ position: "sticky", top: 80 }}>
              <StickyContactCard
                onChat={() => setChatModal(true)}
                onPhone={() => setPhoneModal(true)}
              />
              <div style={{ marginTop: 14, padding: "12px 16px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, display: "flex", gap: 9 }}>
                <AlertTriangle size={14} color={C.secondary} style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>
                  Trọ Nhanh không tham gia giao dịch. Hãy gặp mặt và kiểm tra phòng trực tiếp trước khi đặt cọc.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PhoneModal open={phoneModal} onClose={() => setPhoneModal(false)} />
      <ChatModal open={chatModal} onClose={() => setChatModal(false)} />
      <GalleryLightbox open={lightboxOpen} images={IMAGES} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} />
      <DemoFAB />
    </div>
  );
}
