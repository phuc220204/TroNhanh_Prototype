import { useEffect, useRef, useState } from "react";
import {
  Building2, ChevronLeft, ChevronRight, Clock, Droplets, Key, MapPin,
  Star, Users, Wrench, X, Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { C, font } from "../../../shared/theme";
import { amenityIcon, amenityLabel } from "../../../shared/constants/amenities";
import { nearbyCategoryMeta } from "../../../shared/constants/nearby";
import { LeafletMap, isValidLatLng } from "../../../shared/components/common/LeafletMap";
import { listPropertyReviews } from "../../services/review-service";
import { getListingImage, type ListingCardItem } from "../../services/listing-mappers";
import { SaveListingButton } from "../../components/SaveListingButton";
import { parseMetadataFromDescription } from "../../utils/listingMetadata";
import { getListingCosts } from "../../utils/listingCosts";

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
export function GalleryLightbox({
  open, images, initialIndex, onClose,
}: { open: boolean; images: string[]; initialIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initialIndex);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const imageCountRef = useRef(images.length);
  onCloseRef.current = onClose;
  imageCountRef.current = images.length;

  useEffect(() => {
    if (open) setIdx(initialIndex);
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
      if (e.key === "ArrowLeft") setIdx(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx(i => Math.min(imageCountRef.current - 1, i + 1));
      if (e.key !== "Tab" || !dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>("button:not(:disabled)")];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) return;
      if (!dialog.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Xem ảnh phòng" style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(20,10,4,0.94)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button type="button" aria-label="Đóng thư viện ảnh" onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <X size={22} color="white" />
      </button>
      <div style={{ position: "absolute", top: 22, left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,0.12)", borderRadius: 999, padding: "5px 14px" }}>
        <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: "white" }}>{idx + 1} / {images.length} ảnh</span>
      </div>
      <button type="button" aria-label="Ảnh trước" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
        style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.3 : 1 }}>
        <ChevronLeft size={26} color="white" />
      </button>
      <img src={images[idx]} alt={`Ảnh ${idx + 1}`}
        style={{ maxWidth: "calc(100vw - 160px)", maxHeight: "calc(100vh - 120px)", objectFit: "contain", borderRadius: 10 }} />
      <button type="button" aria-label="Ảnh tiếp theo" onClick={() => setIdx(i => Math.min(images.length - 1, i + 1))} disabled={idx === images.length - 1}
        style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center", cursor: idx === images.length - 1 ? "not-allowed" : "pointer", opacity: idx === images.length - 1 ? 0.3 : 1 }}>
        <ChevronRight size={26} color="white" />
      </button>
      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
        {images.map((img, i) => (
          <button type="button" key={i} aria-label={`Xem ảnh ${i + 1}`} aria-current={i === idx ? "true" : undefined} onClick={() => setIdx(i)}
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
export function ImageGallery({
  images, listingId, onOpen,
}: { images: string[]; listingId: string; onOpen: (idx: number) => void }) {
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
        <SaveListingButton listingId={listingId} overlay size={18} />
        <button type="button" onClick={e => { e.stopPropagation(); onOpen(0); }}
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
            <button key={i} type="button" aria-label={`Xem ảnh phòng ${i + 1}`} style={{ position: "relative", cursor: "pointer", overflow: "hidden", border: "none", padding: 0, background: "transparent" }}
              onClick={() => { setMainIdx(i); if (isOverflowSlot) onOpen(i); }}>
              <img src={src} alt=""
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
            </button>
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
export function TitleBlock({ listing }: { listing: any }) {
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
          <span style={{ fontFamily: font, fontSize: 14, color: C.textSecondary }}>Khu vực {listing.district}</span>
        </div>
        <span style={{ background: "#E8F5E1", color: "#4A7A34", fontFamily: font, fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "3px 12px" }}>
          ● Trống
        </span>
      </div>
    </div>
  );
}

export function DescriptionSection({ listing }: { listing: any }) {
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

export function QuickStats({ listing, isMobile }: { listing: any; isMobile?: boolean }) {
  const { metadata } = parseMetadataFromDescription(listing.description);
  const curfew = metadata.curfew || { type: "free", time: "" };
  const curfewValue = curfew.type === "free"
    ? "Tự do"
    : (curfew.time ? curfew.time : "Có giới nghiêm");

  const depositValue = getListingCosts(listing).deposit;

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

export function AmenitiesGrid({ listing }: { listing: any }) {
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

export function CostTable({ listing }: { listing: any }) {
  const costValues = getListingCosts(listing);
  const priceFormatted = Number(listing.price).toLocaleString("vi-VN") + " đ/tháng";

  const costs = [
    { Icon: Key, label: "Giá thuê", value: priceFormatted },
    { Icon: Zap, label: "Tiền điện", value: costValues.electric },
    { Icon: Droplets, label: "Tiền nước", value: costValues.water },
    { Icon: Wrench, label: "Phí dịch vụ", value: costValues.service },
    { Icon: Key, label: "Đặt cọc", value: costValues.deposit }
  ];

  if (costValues.other) {
    costs.push({ Icon: Building2, label: "Chi phí khác", value: costValues.other });
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

export function NearbySection({ listing }: { listing: any }) {
  const { metadata } = parseMetadataFromDescription(listing.description);
  
  // KHÔNG fallback sang danh sách mock (PRD AC#1): tin không nhập gì thì khối này
  // hiện trạng thái rỗng, chứ không bịa ra "Vạn Hạnh Mall".
  //
  // Bỏ `as any[]`: `metadata.nearby` đã là `NearbyCategory[]` từ
  // `parseMetadataFromDescription`. Cast đó chỉ làm mất kiểu của `places`, và
  // khi bật noImplicitAny thì `{ name, dist }` bên dưới thành `any`.
  const categories = (metadata.nearby || [])
    .map((cat) => {
      const meta = nearbyCategoryMeta(cat.key);
      return { key: cat.key, Icon: meta.Icon, label: cat.label || meta.label, places: cat.places || [] };
    })
    .filter((cat) => cat.places.length > 0);

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
export function ReviewsSection({ listing }: { listing: any }) {
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
export function SimilarRooms({ listings, district, onOpen }: { listings: ListingCardItem[]; district?: string | null; onOpen: (id: string) => void }) {
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
