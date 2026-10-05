import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AlertTriangle, MapPin, MessageSquare, Phone } from "lucide-react";
import { C, font } from "../../shared/theme";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { PublicNavbar } from "../../shared/components/PublicNavbar";
import { useAuth } from "../../shared/contexts/AuthContext";
import { getListingImage, listingImageUrls, type ListingCardItem } from "../services/listing-mappers";
import { getListingById, incrementViewCount, getSimilarListings } from "../services/listing-queries";
import { logError } from "../../shared/services/supabase-error";
import { ListingHeaderMeta } from "../components/ListingCardMeta";
import { startConversation } from "../../shared/services/messaging-service";
import {
  AmenitiesGrid, CostTable, DescriptionSection, GalleryLightbox, ImageGallery,
  NearbySection, QuickStats, ReviewsSection, SimilarRooms, TitleBlock,
} from "./RoomDetailPage/RoomDetailContent";
import {
  MobileContactCard, MobileImageCarousel, MobileNearbySection,
  MobileSimilarRooms, PhoneModal, StickyContactCard,
} from "./RoomDetailPage/RoomDetailContact";

export function RoomDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const onBack = () => navigate(-1);
  const { isMobile, width } = useBreakpoint();
  const isCompact = width < 1024;
  const { user } = useAuth();

  const [listing, setListing]           = useState<any>(null);
  const [similarListings, setSimilarListings] = useState<ListingCardItem[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
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
    if (!isCompact || !mobileContactRef.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      setShowMobileStickyCta(entry.intersectionRatio < 0.2);
    }, { threshold: [0, 0.2] });

    observer.observe(mobileContactRef.current);
    return () => observer.disconnect();
  }, [isCompact, listing]);

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
  if (isCompact) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* 1. Image carousel */}
          <MobileImageCarousel
            images={detailImages}
            onBack={onBack}
            listingId={listing.id}
            onOpen={openLightbox}
          />

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
                <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>{listing.district}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <ListingHeaderMeta listing={listing} size={12} />
              </div>
            </div>

            {/* 6. Early contact action */}
            <div ref={mobileContactRef}>
              <MobileContactCard listing={listing} onChat={openChat} onPhone={openPhone} user={user} />
            </div>

            {/* 7. Thông tin mô tả */}
            <DescriptionSection listing={listing} />

            {/* 8. Thông tin cơ bản */}
            <QuickStats listing={listing} isMobile />

            {/* 9. Tiện ích căn hộ */}
            <AmenitiesGrid listing={listing} />

            {/* 10. Chi phí dùng cùng một nguồn với bản desktop */}
            <CostTable listing={listing} />

            {/* 11. Vị trí & Tiện ích xung quanh + Map */}
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
          <button type="button" onClick={openPhone} disabled={!listing.contact_phone}
            style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", background: "transparent", color: listing.contact_phone ? C.primary : C.textSecondary, border: `1.5px solid ${listing.contact_phone ? C.primary : C.border}`, borderRadius: 11, fontFamily: font, fontSize: 14, fontWeight: 600, cursor: listing.contact_phone ? "pointer" : "not-allowed", minHeight: 44 }}>
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
      <PublicNavbar onSearch={() => navigate("/tim-phong")} />

      <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "28px 32px 80px", boxSizing: "border-box" }}>
        <ImageGallery
          images={detailImages}
          listingId={listing.id}
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
    </div>
  );
}
