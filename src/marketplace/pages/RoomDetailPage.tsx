import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft, Heart, Share2, MapPin, Users, Building2,
  Clock,
  Zap, Droplets, Wrench, Key,
  Phone, MessageSquare, Star,
  ChevronLeft, ChevronRight, X,
  User,
  Shield, AlertTriangle,
} from "lucide-react";
import { C, font } from "../../shared/theme";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { PublicNavbarDesktop, DemoFAB } from "../../shared/components/PublicNavbar";
import { DemoBanner } from "../../shared/components/common/DemoBanner";
import { useAuth } from "../../shared/contexts/AuthContext";
import { getListingImage, listingImageUrls } from "../services/listing-mappers";
import { amenityIcon, amenityLabel } from "../../shared/constants/amenities";
import { nearbyCategoryMeta } from "../../shared/constants/nearby";
import { LeafletMap, isValidLatLng } from "../../shared/components/common/LeafletMap";
import { useQuery } from "@tanstack/react-query";
import { listPropertyReviews } from "../services/review-service";
import { getListingById, incrementViewCount, getSimilarListings } from "../services/listing-queries";
import type { ListingCardItem } from "../services/listing-mappers";
import { parseMetadataFromDescription } from "../utils/listingMetadata";
import { logError } from "../../shared/services/supabase-error";
import { startConversation } from "../../shared/services/messaging-service";

/* ══════════════════════════════════════════
   CURFEW HELPER FUNCTIONS
══════════════════════════════════════════ */
export interface CurfewInfo {
  type: "free" | "curfew";
  time?: string;
}

export function parseCurfewFromDescription(description: string): { cleanDescription: string; curfew: CurfewInfo } {
  const { cleanDescription, metadata } = parseMetadataFromDescription(description);
  return {
    cleanDescription,
    curfew: {
      type: metadata.curfew?.type || "free",
      time: metadata.curfew?.time || ""
    }
  };
}

export function appendCurfewToDescription(description: string, curfew: CurfewInfo): string {
  const { cleanDescription, metadata } = parseMetadataFromDescription(description);
  metadata.curfew = curfew;
  return `${cleanDescription}\n\n---METADATA---\n${JSON.stringify(metadata)}`;
}






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

  // Số ảnh thay đổi theo tin (3 ảnh thật, hoặc 5 ảnh fallback) — luôn kẹp chỉ số
  // vào khoảng hợp lệ, nếu không badge sẽ hiện kiểu "4/3 ảnh" và <img> nhận undefined.
  const safeMain = Math.min(Math.max(mainIdx, 0), images.length - 1);
  const thumbs = images.slice(1, 5);
  const hasThumbs = thumbs.length > 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: hasThumbs ? "3fr 2fr" : "1fr", height: 460, gap: 8, borderRadius: 16, overflow: "hidden", marginBottom: 32 }}>
      {/* Main image */}
      <div style={{ position: "relative", cursor: "pointer" }} onClick={() => onOpen(safeMain)}>
        <img src={images[safeMain]} alt="Ảnh chính"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", top: 14, left: 14, background: "rgba(0,0,0,0.42)", borderRadius: 999, padding: "5px 13px" }}>
          <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: "white" }}>{safeMain + 1}/{images.length} ảnh</span>
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

      {/* Thumbnail — chỉ render đúng số ảnh thật có, tối đa 4 */}
      {hasThumbs && (
      <div style={{ display: "grid", gridTemplateColumns: thumbs.length > 1 ? "1fr 1fr" : "1fr", gridTemplateRows: thumbs.length > 2 ? "1fr 1fr" : "1fr", gap: 8 }}>
        {thumbs.map((src, k) => {
          const i = k + 1;
          const isOverflowSlot = k === thumbs.length - 1 && images.length > 5;
          return (
            <div key={i} style={{ position: "relative", cursor: "pointer", overflow: "hidden" }}
              onClick={() => { setMainIdx(i); if (isOverflowSlot) onOpen(i); }}>
              <img src={src} alt={`Ảnh ${i + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              />
              {isOverflowSlot && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(20,10,4,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <span style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: "white" }}>+{images.length - 4}</span>
                  <span style={{ fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.85)" }}>ảnh nữa</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   CONTENT BLOCKS — LEFT COLUMN
══════════════════════════════════════════ */
function TitleBlock({ listing }: { listing: any }) {
  return (
    <div style={{ paddingBottom: 24, marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        {["Tìm phòng", listing.district, "Chi tiết phòng"].map((crumb, i, arr) => (
          <span key={crumb} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: font, fontSize: 12, color: i === arr.length - 1 ? C.textPrimary : C.textSecondary, fontWeight: i === arr.length - 1 ? 600 : 400 }}>
              {crumb}
            </span>
            {i < arr.length - 1 && <span style={{ fontFamily: font, fontSize: 12, color: C.border }}>/</span>}
          </span>
        ))}
      </div>
      <h1 style={{ fontFamily: font, fontSize: 26, fontWeight: 800, color: C.textPrimary, margin: "0 0 10px", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
        {listing.title}
      </h1>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <MapPin size={14} color={C.secondary} />
          <span style={{ fontFamily: font, fontSize: 14, color: C.textSecondary }}>Khu vực {listing.district}, TP. Hồ Chí Minh</span>
        </div>
        <span style={{ background: "#E8F5E1", color: "#4A7A34", fontFamily: font, fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "3px 12px" }}>
          ● Trống
        </span>
        {listing.boost_expire_at && new Date(listing.boost_expire_at) > new Date() && (
          <span style={{ background: C.primary, color: "#fff", fontFamily: font, fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "3px 12px" }}>
            ★ Nổi bật
          </span>
        )}
      </div>
    </div>
  );
}

function DescriptionSection({ listing }: { listing: any }) {
  const { cleanDescription } = parseCurfewFromDescription(listing.description);
  return (
    <Section title="Thông tin mô tả">
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px" }}>
        <p style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, lineHeight: 1.8, margin: "0", whiteSpace: "pre-line" }}>
          {cleanDescription || "Chủ nhà không cung cấp thêm mô tả chi tiết cho phòng này. Vui lòng liên hệ trực tiếp qua số điện thoại để trao đổi chi tiết."}
        </p>
      </div>
    </Section>
  );
}

function QuickStats({ listing, isMobile }: { listing: any; isMobile?: boolean }) {
  const { metadata } = parseMetadataFromDescription(listing.description);
  const curfew = metadata.curfew || { type: "free", time: "" };
  const curfewValue = curfew.type === "free"
    ? "Tự do"
    : (curfew.time ? curfew.time : "Có giới nghiêm");

  const depositValue = metadata.costs?.deposit 
    ? `${metadata.costs.deposit} đ` 
    : "1 tháng";

  const stats = [
    { Icon: Building2, label: "Diện tích", value: `${listing.area} m²` },
    { Icon: Users,     label: "Loại hình", value: listing.property_type },
    { Icon: Clock,     label: "Giờ giấc",  value: curfewValue },
    { Icon: Key,       label: "Đặt cọc",   value: depositValue },
  ];
  return (
    <Section title="Thông tin cơ bản">
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12 }}>
        {stats.map(({ Icon, label, value }) => (
          <div key={label} style={{ background: C.caramelSoft, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <Icon size={20} color={C.primary} strokeWidth={1.8} style={{ display: "block", margin: "0 auto 8px" }} />
            <p style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary, margin: "0 0 2px" }}>{value}</p>
            <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: 0 }}>{label}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function AmenitiesGrid({ listing }: { listing: any }) {
  const listingAmenities = (listing.listing_amenities || []).map((la: any) => la.amenity);
  return (
    <Section title="Tiện ích căn hộ">
      {listingAmenities.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {listingAmenities.map((amenity: string) => {
            const Icon = amenityIcon(amenity);
            return (
              <div key={amenity} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={16} color={C.primary} strokeWidth={1.8} />
                </div>
                {/* Tin đăng trước bản vá backfill lưu `key` — amenityLabel() dịch lại sang tiếng Việt. */}
                <span style={{ fontFamily: font, fontSize: 13, fontWeight: 500, color: C.textPrimary }}>{amenityLabel(amenity)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Chưa có thông tin tiện ích.</p>
      )}
    </Section>
  );
}

function CostTable({ listing }: { listing: any }) {
  const { metadata } = parseMetadataFromDescription(listing.description);
  const costsData = metadata.costs || {};

  /**
   * Chi phí: ưu tiên CỘT THẬT (có từ migration 0300), rồi mới tới `metadata.costs`
   * của tin cũ. Thiếu cả hai thì ghi "Chưa cập nhật".
   *
   * Trước đây thiếu dữ liệu là rơi vào số mặc định: "3.500 đ/kWh",
   * "100.000 đ/người", "150.000 đ/tháng". Người thuê đọc con số đó và tin rằng
   * chủ nhà đã công bố như vậy — trong khi chủ nhà chưa khai gì cả. Đó không phải
   * lỗi hiển thị mà là thông tin giá sai lệch, thứ người ta dựa vào để quyết định
   * đi xem phòng hay không.
   */
  const NOT_SET = "Chưa cập nhật";
  const formatVnd = (value: unknown): string | null => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num.toLocaleString("vi-VN") : null;
  };

  const priceFormatted = Number(listing.price).toLocaleString("vi-VN") + " đ/tháng";

  const electricAmount = formatVnd(listing.electricity_price) ?? formatVnd(costsData.electric);
  const electricVal = electricAmount ? `${electricAmount} đ/kWh` : NOT_SET;

  const waterUnitStr =
    listing.water_unit === "cubic" || costsData.waterUnit === "cubic" ? "đ/m³" : "đ/người";
  const waterAmount = formatVnd(listing.water_price) ?? formatVnd(costsData.water);
  const waterVal = waterAmount ? `${waterAmount} ${waterUnitStr}` : NOT_SET;

  const serviceAmount = formatVnd(listing.service_price) ?? formatVnd(costsData.service);
  const serviceVal = serviceAmount ? `${serviceAmount} đ/tháng` : NOT_SET;

  const depositAmount = formatVnd(listing.deposit) ?? formatVnd(costsData.deposit);
  const depositVal = depositAmount ? `${depositAmount} đ` : NOT_SET;

  const costs = [
    { Icon: Key, label: "Giá thuê", value: priceFormatted },
    { Icon: Zap, label: "Tiền điện", value: electricVal },
    { Icon: Droplets, label: "Tiền nước", value: waterVal },
    { Icon: Wrench, label: "Phí dịch vụ", value: serviceVal },
    { Icon: Key, label: "Đặt cọc", value: depositVal }
  ];

  if (costsData.other) {
    costs.push({ Icon: Building2, label: "Chi phí khác", value: costsData.other });
  }

  return (
    <Section title="Chi phí hàng tháng">
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        {costs.map(({ Icon, label, value }, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", padding: "13px 16px", background: i % 2 === 0 ? C.white : C.caramelSoft, borderBottom: i < costs.length - 1 ? `1px solid ${C.border}` : "none" }}>
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

function NearbySection({ listing }: { listing: any }) {
  const { metadata } = parseMetadataFromDescription(listing.description);
  
  // KHÔNG fallback sang danh sách mock (PRD AC#1): tin không nhập gì thì khối này
  // hiện trạng thái rỗng, chứ không bịa ra "Vạn Hạnh Mall".
  const categories = ((metadata.nearby || []) as any[])
    .map((cat: any) => {
      const meta = nearbyCategoryMeta(cat.key);
      return { key: cat.key, Icon: meta.Icon, label: cat.label || meta.label, places: cat.places || [] };
    })
    .filter((cat: any) => cat.places.length > 0);

  // Ưu tiên cột thật; metadata.coords chỉ để đọc tin cũ (trước khi có cột).
  const coords =
    listing.latitude != null && listing.longitude != null
      ? { lat: Number(listing.latitude), lng: Number(listing.longitude) }
      : metadata.coords;
  const hasCoords = isValidLatLng(coords);
  const mapAddress = `${listing.address || "Đường chính"}, ${listing.district}`;

  if (categories.length === 0 && !hasCoords) return null;

  return (
    <Section title="Vị trí & Tiện ích xung quanh">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        {categories.map(({ key, Icon, label, places }) => (
          <div key={key} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={15} color={C.primary} strokeWidth={1.8} />
              </div>
              <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{label}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {places.length > 0 ? (
                places.map(({ name, dist }) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                    <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: C.secondary, background: C.caramelSoft, borderRadius: 999, padding: "2px 9px", flexShrink: 0, marginLeft: 8 }}>{dist}</span>
                  </div>
                ))
              ) : (
                <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, fontStyle: "italic" }}>Không có địa điểm nào</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {hasCoords && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <LeafletMap center={coords} height={220} data-testid="listing-map" />
          <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <MapPin size={12} /> {mapAddress}
          </span>
        </div>
      )}
    </Section>
  );
}

/**
 * Khối đánh giá thật của khu trọ.
 *
 * BR-024: RLS "Public reads visible reviews" chỉ trả review khi khu đã bật
 * trang công khai — nên khu chưa bật sẽ ra danh sách rỗng và ta hiện trạng thái
 * trống, KHÔNG phải "đang phát triển".
 */
function ReviewsSection({ listing }: { listing: any }) {
  const propertyId = listing?.property_id as string | undefined;

  const reviewsQuery = useQuery({
    queryKey: ["marketplace", "listingReviews", propertyId],
    queryFn: () => listPropertyReviews(propertyId || ""),
    enabled: Boolean(propertyId),
  });

  const reviews = reviewsQuery.data ?? [];
  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  if (!propertyId || (!reviewsQuery.isPending && reviews.length === 0)) {
    return (
      <Section title="Đánh giá khu trọ">
        <div style={{ padding: 24, background: C.bg, border: `1.5px dashed ${C.border}`, borderRadius: 16, textAlign: "center" }}>
          <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 6px" }}>
            Chưa có đánh giá cho khu trọ này
          </p>
          <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: "0 auto", maxWidth: 380 }}>
            Chỉ người đã ở và xác nhận liên kết mới đánh giá được, nên đánh giá ở đây ít nhưng đáng tin.
          </p>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Đánh giá khu trọ">
      {reviewsQuery.isPending ? (
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>Đang tải đánh giá...</p>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Star size={20} color={C.warning} fill={C.warning} />
            <span style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary }}>{avg.toFixed(1)}</span>
            <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>({reviews.length} đánh giá)</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reviews.slice(0, 5).map(r => (
              <div key={r.id} data-testid="review-item" style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 6 }}>
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} size={13} color={n <= r.rating ? C.warning : C.border} fill={n <= r.rating ? C.warning : "none"} />
                  ))}
                  <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, marginLeft: 6 }}>
                    {new Date(r.created_at).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                {r.content && (
                  <p style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, margin: 0, lineHeight: 1.6 }}>{r.content}</p>
                )}
                {r.seller_reply && (
                  <div style={{ background: C.cream, borderRadius: 10, padding: 12, marginTop: 10 }}>
                    <p style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color: C.primary, margin: "0 0 3px" }}>Phản hồi của chủ trọ</p>
                    <p style={{ fontFamily: font, fontSize: 12.5, color: C.textPrimary, margin: 0, lineHeight: 1.5 }}>{r.seller_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

/**
 * Phòng tương tự — dữ liệu THẬT từ `getSimilarListings` (cùng quận, giá ±30%).
 *
 * Trước đây khối này render hằng số `SIMILAR_ROOMS` với 3 tin bịa và tiêu đề
 * cứng "khu vực Bình Thạnh" — hiện y như vậy trên mọi tin, kể cả tin ở tỉnh khác.
 * Không có tin nào khớp thì KHÔNG render gì (§8: DB rỗng thì đừng bịa nội dung).
 */
function SimilarRooms({ listings, district, onOpen }: { listings: ListingCardItem[]; district?: string | null; onOpen: (id: string) => void }) {
  if (listings.length === 0) return null;
  return (
    <Section title={district ? `Phòng tương tự khu vực ${district}` : "Phòng tương tự"} last>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }} data-testid="similar-rooms">
        {listings.map(room => (
          <div key={room.id} onClick={() => onOpen(room.id)} data-testid="similar-room-card"
            style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.15s" }}
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
                <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>{room.loc} · {room.area} m²</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {room.amenities.slice(0, 3).map(tag => (
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
function StickyContactCard({ listing, onChat, onPhone, user }: { listing: any; onChat: () => void; onPhone: () => void; user: any }) {
  const isGuest = !user;
  const rawPhone = listing?.contact_phone || "0912345678";
  const displayPhone = isGuest 
    ? rawPhone.substring(0, 4) + "****" + rawPhone.substring(rawPhone.length - 3)
    : rawPhone;
  const priceFormatted = Number(listing?.price || 0).toLocaleString("vi-VN") + " đ";

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: "0 4px 24px rgba(92,70,50,0.10)", overflow: "hidden" }}>
      {/* Price header */}
      <div style={{ background: `linear-gradient(135deg, ${C.primaryDark} 0%, ${C.primary} 100%)`, padding: "20px 24px" }}>
        <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: "rgba(232,222,201,0.7)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Giá thuê hàng tháng</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span style={{ fontFamily: font, fontSize: 28, fontWeight: 800, color: C.cream, letterSpacing: "-0.02em" }}>{priceFormatted}</span>
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
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{listing?.contact_name || "Chủ trọ"}</p>
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
            Gọi {displayPhone}
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

function PhoneModal({ open, onClose, phone, user, sellerName }: { open: boolean; onClose: () => void; phone: string; user: any; sellerName: string }) {
  if (!open) return null;
  const navigate = useNavigate();

  const isGuest = !user;
  const displayPhone = isGuest ? phone.substring(0, 4) + "****" + phone.substring(phone.length - 3) : phone;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,10,4,0.5)", zIndex: 500, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 501, background: C.white, borderRadius: 20, padding: "28px 32px", maxWidth: 360, width: "calc(100vw - 48px)", textAlign: "center", boxShadow: "0 20px 60px rgba(20,10,4,0.25)" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Phone size={24} color={C.primary} />
        </div>
        <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>Gọi cho {sellerName || "Chủ trọ"}?</h3>
        {isGuest ? (
          <>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 16px", lineHeight: 1.5 }}>
              Số điện thoại đã bị ẩn một phần. Vui lòng đăng nhập để xem đầy đủ số điện thoại của chủ trọ.
            </p>
            <div style={{ background: C.caramelSoft, borderRadius: 12, padding: "12px 20px", margin: "16px 0 24px" }}>
              <p style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.primary, margin: 0, letterSpacing: "0.03em" }}>{displayPhone}</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>Đóng</button>
              <button onClick={() => { onClose(); navigate("/dang-nhap"); }} style={{ flex: 1, padding: "12px", background: C.primary, border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer" }}>Đăng nhập</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: C.caramelSoft, borderRadius: 12, padding: "12px 20px", margin: "16px 0 24px" }}>
              <p style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.primary, margin: 0, letterSpacing: "0.03em" }}>{displayPhone}</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>Hủy</button>
              <a href={`tel:${phone}`} style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", background: C.primary, border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer", textDecoration: "none" }}>
                <Phone size={16} /> Gọi ngay
              </a>
            </div>
          </>
        )}
      </div>
    </>
  );
}


/* ══════════════════════════════════════════
   MOBILE — OWNER CONTACT
══════════════════════════════════════════ */
function MobileContactCard({ listing, onChat, onPhone, user }: { listing: any; onChat: () => void; onPhone: () => void; user: any }) {
  return (
    <div style={{ width: "100%", boxSizing: "border-box", background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "15px", marginBottom: 24, boxShadow: "0 3px 14px rgba(92,70,50,0.07)" }}>
      <h3 style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 13px" }}>
        Liên hệ chủ phòng
      </h3>

      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg, ${C.sand}, ${C.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <User size={19} color={C.white} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{listing?.contact_name || "Chủ trọ"}</p>
          <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: "2px 0 0", whiteSpace: "nowrap" }}>Chủ trọ · Phản hồi nhanh</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0, background: C.caramelSoft, borderRadius: 999, padding: "5px 8px" }}>
          <Shield size={12} color={C.available} />
          <span style={{ fontFamily: font, fontSize: 10, color: C.available, fontWeight: 700, whiteSpace: "nowrap" }}>Đã xác minh</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        <button type="button" onClick={onChat}
          style={{ flex: 3, minWidth: 0, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 8px", background: C.primary, color: C.white, border: "none", borderRadius: 11, fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(138,106,69,0.22)" }}>
          <MessageSquare size={16} />
          Gửi tin nhắn
        </button>
        <button type="button" onClick={onPhone}
          style={{ flex: 2, minWidth: 0, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 7px", background: "transparent", color: C.primary, border: `1.5px solid ${C.primary}`, borderRadius: 11, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Phone size={16} />
          Gọi điện
        </button>
      </div>

      <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: "11px 0 0", lineHeight: 1.55 }}>
        Nhắn tin trực tiếp trên Trọ Nhanh để hỏi thêm thông tin trước khi xem phòng.
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════
   MOBILE — DESCRIPTION SECTION
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   MOBILE — NEARBY SECTION
══════════════════════════════════════════ */
function MobileNearbySection({ listing }: { listing: any }) {
  const { metadata } = parseMetadataFromDescription(listing.description);

  // Không fallback mock (PRD AC#1) — xem ghi chú ở NearbySection bản desktop.
  const categories = ((metadata.nearby || []) as any[])
    .map((cat: any) => {
      const meta = nearbyCategoryMeta(cat.key);
      return { key: cat.key, Icon: meta.Icon, label: cat.label || meta.label, places: cat.places || [] };
    })
    .filter((cat: any) => cat.places.length > 0);

  const coords =
    listing.latitude != null && listing.longitude != null
      ? { lat: Number(listing.latitude), lng: Number(listing.longitude) }
      : metadata.coords;
  const hasCoords = isValidLatLng(coords);
  const mapAddress = `${listing.address || "Đường chính"}, ${listing.district}`;

  if (categories.length === 0 && !hasCoords) return null;

  return (
    <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${C.border}` }}>
      <h3 style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 14px" }}>Vị trí & Tiện ích xung quanh</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {categories.map(({ key, Icon, label, places }) => (
          <div key={key} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={13} color={C.primary} strokeWidth={1.8} />
              </div>
              <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{label}</span>
            </div>
            {places.length > 0 ? (
              places.map(({ name, dist }) => (
                <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 5 }}>
                  <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                  <span style={{ fontFamily: font, fontSize: 11, fontWeight: 600, color: C.secondary, background: C.caramelSoft, borderRadius: 999, padding: "2px 8px", flexShrink: 0, marginLeft: 8 }}>{dist}</span>
                </div>
              ))
            ) : (
              <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, fontStyle: "italic", paddingTop: 5, display: "block" }}>Không có địa điểm nào</span>
            )}
          </div>
        ))}
      </div>
      {hasCoords && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <LeafletMap center={coords} height={180} zoom={15} data-testid="listing-map-mobile" />
          <span style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <MapPin size={11} /> {mapAddress}
          </span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   MOBILE — SIMILAR ROOMS
══════════════════════════════════════════ */
function MobileSimilarRooms({ listings, onOpen }: { listings: ListingCardItem[]; onOpen: (id: string) => void }) {
  if (listings.length === 0) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 12px" }}>Phòng tương tự khu vực</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-testid="similar-rooms">
        {listings.map(room => (
          <div key={room.id} onClick={() => onOpen(room.id)} data-testid="similar-room-card"
            style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", cursor: "pointer" }}>
            <img src={room.img} alt={room.title} style={{ width: 90, height: 90, objectFit: "cover", flexShrink: 0 }} />
            <div style={{ padding: "11px 13px", flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 4px", lineHeight: 1.35 }}>{room.title}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                <MapPin size={11} color={C.secondary} />
                <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>{room.loc} · {room.area} m²</span>
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
  const { id } = useParams<{ id: string }>();
  const onBack = () => navigate(-1);
  const { isMobile } = useBreakpoint();
  const { user } = useAuth();

  const [listing, setListing]           = useState<any>(null);
  const [similarListings, setSimilarListings] = useState<ListingCardItem[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [saved, setSaved]               = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx]   = useState(0);
  const [phoneModal, setPhoneModal]     = useState(false);
  const [showMobileStickyCta, setShowMobileStickyCta] = useState(false);
  const mobileContactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const fetchListing = async () => {
      setIsLoading(true);
      try {
        const data = await getListingById(id);
        setListing(data);
        if (data) {
          incrementViewCount(id);
          // Tin tương tự tải sau, không chặn render trang chính.
          getSimilarListings(id, data.district, Number(data.price))
            .then(setSimilarListings)
            .catch((err) => logError("RoomDetailPage.fetchSimilar", err));
        }
      } catch (err) {
        logError("RoomDetailPage.fetchListing", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  const openSimilar = (similarId: string) => {
    navigate(`/phong/${similarId}`);
    window.scrollTo({ top: 0 });
  };

  const openLightbox = (idx: number) => { setLightboxIdx(idx); setLightboxOpen(true); };
  const openChat = async () => {
    if (!listing) return;
    if (!user) {
      navigate(`/dang-nhap?redirect=/phong/${listing.id}`);
      return;
    }
    if (listing.seller_id === user.id) return;
    try {
      const convId = await startConversation("RentalListing", listing.id);
      navigate(`/tin-nhan/${convId}`);
    } catch (err: any) {
      logError("RoomDetailPage.openChat", err);
    }
  };
  const openPhone = () => setPhoneModal(true);

  useEffect(() => {
    if (!isMobile || !mobileContactRef.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      setShowMobileStickyCta(entry.intersectionRatio < 0.2);
    }, { threshold: [0, 0.2] });

    observer.observe(mobileContactRef.current);
    return () => observer.disconnect();
  }, [isMobile, listing]);

  if (isLoading) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: font, fontSize: 16, color: C.textSecondary }}>Đang tải thông tin chi tiết phòng...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <p style={{ fontFamily: font, fontSize: 16, color: C.textSecondary, marginBottom: 16 }}>Không tìm thấy thông tin phòng trọ này.</p>
        <button onClick={onBack} style={{ padding: "10px 20px", background: C.primary, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: font, fontWeight: 700 }}>Quay lại</button>
      </div>
    );
  }

  // Ảnh thật từ listing_media theo sort_order; tin cũ chưa có media thì
  // listingImageUrls() tự trả về 1 ảnh Unsplash deterministic làm fallback.
  const mediaImages = listingImageUrls(listing);
  const detailImages =
    mediaImages.length > 1
      ? mediaImages
      : [
          mediaImages[0] ?? getListingImage(listing.id),
          getListingImage(listing.id + "_1"),
          getListingImage(listing.id + "_2"),
          getListingImage(listing.id + "_3"),
          getListingImage(listing.id + "_4"),
        ];

  /* ── MOBILE ─────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* 1. Image carousel */}
          <MobileImageCarousel
            images={detailImages}
            onBack={onBack}
            saved={saved}
            onSave={() => setSaved(v => !v)}
            onOpen={openLightbox}
          />
          <DemoBanner mobile />

          <div style={{ padding: "20px 16px calc(104px + env(safe-area-inset-bottom, 0px))" }}>
            {/* 2–5. Status + price + title + location */}
            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ background: "#E8F5E1", color: "#4A7A34", fontFamily: font, fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "3px 12px" }}>
                    ● Trống
                  </span>
                  <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>Đăng gần đây</span>
                </div>
                {/* Compact price inline */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.primary }}>
                    {Number(listing.price).toLocaleString("vi-VN")} đ
                  </span>
                  <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>/tháng</span>
                </div>
              </div>
              <h1 style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: "0 0 8px", lineHeight: 1.3 }}>
                {listing.title}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <MapPin size={13} color={C.secondary} />
                <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>{listing.district}, TP. Hồ Chí Minh</span>
              </div>
            </div>

            {/* 6. Early contact action */}
            <div ref={mobileContactRef}>
              <MobileContactCard listing={listing} onChat={openChat} onPhone={openPhone} user={user} />
            </div>

            {/* 7. Thông tin mô tả */}
            <DescriptionSection listing={listing} />

            {/* 8. Thông tin cơ bản */}
            <QuickStats listing={listing} isMobile={isMobile} />

            {/* 9. Tiện ích căn hộ */}
            <AmenitiesGrid listing={listing} />

            {/* 10. Vị trí & Tiện ích xung quanh + Map */}
            <MobileNearbySection listing={listing} />

            {/* 11. Đánh giá khu trọ */}
            <ReviewsSection listing={listing} />

            {/* 12. Phòng tương tự */}
            <MobileSimilarRooms listings={similarListings} onOpen={openSimilar} />

            {/* 12. Safety notice */}
            <div style={{ padding: "12px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, display: "flex", gap: 8 }}>
              <AlertTriangle size={13} color={C.secondary} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>
                Trọ Nhanh không tham gia giao dịch. Hãy gặp mặt và kiểm tra phòng trực tiếp trước khi đặt cọc.
              </p>
            </div>
          </div>
        </div>

        {/* Persistent mobile fallback CTA */}
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 20, background: C.white, borderTop: `1px solid ${C.border}`, padding: "10px 16px calc(10px + env(safe-area-inset-bottom, 0px))", display: "flex", gap: 8, boxShadow: "0 -2px 12px rgba(92,70,50,0.08)", opacity: showMobileStickyCta ? 1 : 0, visibility: showMobileStickyCta ? "visible" : "hidden", transform: showMobileStickyCta ? "translateY(0)" : "translateY(100%)", pointerEvents: showMobileStickyCta ? "auto" : "none", transition: "opacity 0.18s ease, transform 0.18s ease" }}>
          <button type="button" onClick={openChat}
            style={{ flex: 3, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", background: C.primary, color: C.white, border: "none", borderRadius: 11, fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer", minHeight: 44 }}>
            <MessageSquare size={17} /> Gửi tin nhắn
          </button>
          <button type="button" onClick={openPhone}
            style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", background: "transparent", color: C.primary, border: `1.5px solid ${C.primary}`, borderRadius: 11, fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 44 }}>
            <Phone size={17} /> Gọi điện
          </button>
        </div>

        <PhoneModal open={phoneModal} onClose={() => setPhoneModal(false)} phone={listing.contact_phone} user={user} sellerName={listing.contact_name} />
        <GalleryLightbox open={lightboxOpen} images={detailImages} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} />
      </div>
    );
  }

  /* ── DESKTOP ─────────────────────────────────────────── */
  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicNavbarDesktop onSearch={() => navigate("/tim-phong")} />
      <DemoBanner />

      <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "28px 32px 80px" }}>
        <ImageGallery
          images={detailImages}
          saved={saved}
          onSave={() => setSaved(v => !v)}
          onOpen={openLightbox}
        />

        <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
          {/* Left column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <TitleBlock listing={listing} />
            <DescriptionSection listing={listing} />
            <QuickStats listing={listing} isMobile={isMobile} />
            <AmenitiesGrid listing={listing} />
            <CostTable listing={listing} />
            <NearbySection listing={listing} />
            <ReviewsSection listing={listing} />
            <SimilarRooms listings={similarListings} district={listing?.district} onOpen={openSimilar} />
          </div>

          {/* Right sticky sidebar */}
          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={{ position: "sticky", top: 80 }}>
              <StickyContactCard
                listing={listing}
                onChat={openChat}
                onPhone={openPhone}
                user={user}
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

      <PhoneModal open={phoneModal} onClose={() => setPhoneModal(false)} phone={listing.contact_phone} user={user} sellerName={listing.contact_name} />
      <GalleryLightbox open={lightboxOpen} images={detailImages} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} />
      <DemoFAB />
    </div>
  );
}
