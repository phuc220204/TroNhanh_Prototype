import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, ChevronLeft, ChevronRight, MapPin, MessageSquare, Phone, Shield, User,
} from "lucide-react";
import { C, font } from "../../../shared/theme";
import { nearbyCategoryMeta } from "../../../shared/constants/nearby";
import { LeafletMap, isValidLatLng } from "../../../shared/components/common/LeafletMap";
import { SaveListingButton } from "../../components/SaveListingButton";
import { getListingImage, type ListingCardItem } from "../../services/listing-mappers";
import { parseMetadataFromDescription } from "../../utils/listingMetadata";
import { getListingCosts } from "../../utils/listingCosts";

export function StickyContactCard({ listing, onChat, onPhone, user }: { listing: any; onChat: () => void; onPhone: () => void; user: any }) {
  const isGuest = !user;
  const rawPhone = listing?.contact_phone || "";
  const displayPhone = !rawPhone
    ? "Chưa cập nhật"
    : isGuest
      ? rawPhone.substring(0, 4) + "****" + rawPhone.substring(rawPhone.length - 3)
      : rawPhone;
  const priceFormatted = Number(listing?.price || 0).toLocaleString("vi-VN") + " đ";
  const costValues = getListingCosts(listing);

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
          {[{ label: "Điện", value: costValues.electric }, { label: "Nước", value: costValues.water }].map(({ label, value }) => (
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
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "2px 0 0" }}>Người đăng tin</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onChat} data-testid="listing-chat-btn"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 20px", background: C.primary, color: C.white, border: "none", borderRadius: 12, fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "background 0.12s", boxShadow: "0 2px 12px rgba(138,106,69,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.background = C.primaryHover)}
            onMouseLeave={e => (e.currentTarget.style.background = C.primary)}>
            <MessageSquare size={17} />
            Gửi tin nhắn
          </button>
          <button onClick={onPhone} data-testid="listing-phone-btn" disabled={!rawPhone}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px", background: "transparent", color: C.primary, border: `1.5px solid ${C.primary}`, borderRadius: 12, fontFamily: font, fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#F0E7D6"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            <Phone size={17} />
            {rawPhone ? `Gọi ${displayPhone}` : "Chưa có số điện thoại"}
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
export function MobileImageCarousel({
  images, onBack, listingId, onOpen,
}: { images: string[]; onBack: () => void; listingId: string; onOpen: (i: number) => void }) {
  const [idx, setIdx] = useState(0);

  return (
    <div style={{ position: "relative", width: "100%", height: 280, backgroundColor: "#2a1a0e", flexShrink: 0 }}>
      <img src={images[idx]} alt={`Ảnh ${idx + 1}`} onClick={() => onOpen(idx)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <button type="button" aria-label="Quay lại" onClick={onBack}
        style={{ position: "absolute", top: 14, left: 14, width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.88)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <ArrowLeft size={18} color={C.textPrimary} />
      </button>
      <SaveListingButton listingId={listingId} overlay size={17} />
      <div style={{ position: "absolute", bottom: 14, right: 14, background: "rgba(0,0,0,0.5)", borderRadius: 999, padding: "4px 10px" }}>
        <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: "white" }}>{idx + 1}/{images.length} ảnh</span>
      </div>
      {idx > 0 && (
        <button type="button" aria-label="Ảnh trước" onClick={() => setIdx(i => i - 1)} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.35)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ChevronLeft size={18} color="white" />
        </button>
      )}
      {idx < images.length - 1 && (
        <button type="button" aria-label="Ảnh tiếp theo" onClick={() => setIdx(i => i + 1)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.35)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ChevronRight size={18} color="white" />
        </button>
      )}
      <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
        {images.map((_, i) => (
          <button type="button" key={i} aria-label={`Xem ảnh ${i + 1}`} aria-current={i === idx ? "true" : undefined} onClick={() => setIdx(i)}
            style={{ width: 44, height: 44, borderRadius: 999, background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 999, background: i === idx ? "white" : "rgba(255,255,255,0.5)", transition: "all 0.2s" }} /></button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MODALS
══════════════════════════════════════════ */

export function PhoneModal({ open, onClose, phone, user, sellerName }: { open: boolean; onClose: () => void; phone: string; user: any; sellerName: string }) {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button, a[href]")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]")];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) return;
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  const safePhone = phone || "";
  const isGuest = !user;
  const displayPhone = !safePhone ? "Chưa cập nhật" : isGuest ? safePhone.substring(0, 4) + "****" + safePhone.substring(safePhone.length - 3) : safePhone;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,10,4,0.5)", zIndex: 500, backdropFilter: "blur(3px)" }} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Thông tin liên hệ chủ phòng" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 501, background: C.white, borderRadius: 20, padding: "28px 32px", maxWidth: 360, width: "calc(100vw - 48px)", textAlign: "center", boxShadow: "0 20px 60px rgba(20,10,4,0.25)" }}>
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
              <p data-testid="listing-phone-value" style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.primary, margin: 0, letterSpacing: "0.03em" }}>{displayPhone}</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>Đóng</button>
              <button onClick={() => { onClose(); navigate("/dang-nhap"); }} style={{ flex: 1, padding: "12px", background: C.primary, border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer" }}>Đăng nhập</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: C.caramelSoft, borderRadius: 12, padding: "12px 20px", margin: "16px 0 24px" }}>
              <p data-testid="listing-phone-value" style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.primary, margin: 0, letterSpacing: "0.03em" }}>{displayPhone}</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>Hủy</button>
              <a href={`tel:${safePhone}`} style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", background: C.primary, border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer", textDecoration: "none" }}>
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
export function MobileContactCard({ listing, onChat, onPhone, user }: { listing: any; onChat: () => void; onPhone: () => void; user: any }) {
  const hasPhone = Boolean(listing?.contact_phone);
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
          <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: "2px 0 0", whiteSpace: "nowrap" }}>Người đăng tin</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        <button type="button" onClick={onChat}
          style={{ flex: 3, minWidth: 0, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 8px", background: C.primary, color: C.white, border: "none", borderRadius: 11, fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(138,106,69,0.22)" }}>
          <MessageSquare size={16} />
          Gửi tin nhắn
        </button>
        <button type="button" onClick={onPhone} disabled={!hasPhone}
          style={{ flex: 2, minWidth: 0, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 7px", background: "transparent", color: hasPhone ? C.primary : C.textSecondary, border: `1.5px solid ${hasPhone ? C.primary : C.border}`, borderRadius: 11, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: hasPhone ? "pointer" : "not-allowed" }}>
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
export function MobileNearbySection({ listing }: { listing: any }) {
  const { metadata } = parseMetadataFromDescription(listing.description);

  // Không fallback mock (PRD AC#1) — xem ghi chú ở NearbySection bản desktop.
  const categories = (metadata.nearby || [])
    .map((cat) => {
      const meta = nearbyCategoryMeta(cat.key);
      return { key: cat.key, Icon: meta.Icon, label: cat.label || meta.label, places: cat.places || [] };
    })
    .filter((cat) => cat.places.length > 0);

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
export function MobileSimilarRooms({ listings, onOpen }: { listings: ListingCardItem[]; onOpen: (id: string) => void }) {
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
