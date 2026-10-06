import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { C, font } from "../../shared/theme";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { PublicNavbarDesktop, PublicNavbarMobile } from "../../shared/components/PublicNavbar";
import { BottomTabBar, Button, EmptyState, Skeleton } from "../../shared/components/common";
import { logError } from "../../shared/services/supabase-error";
import { getFeaturedListings } from "../services/listing-queries";
import { mapAmenityToKey } from "../services/listing-mappers";
import { listActiveDemandPosts } from "../services/demand-post-service";
import {
  FeaturedRoomsSection,
  HeroSection,
  QuickFilterChips,
  RoomCard,
} from "./HomePage/HomeHeroSections";
import {
  InfoModal,
  LandlordCTA,
  MarketplaceSections,
  PostTypeModal,
  PostingCTASection,
  SiteFooter,
  WhyUsSection,
  type HomeModalContent,
} from "./HomePage/HomeSupportSections";

export function HomePage() {
  const navigate = useNavigate();
  const onSearch = () => navigate("/tim-phong");
  const onRoomClick = (id: string) => navigate(`/phong/${id}`);
  const onViewAll = () => navigate("/tat-ca-phong");
  const onLandlordPost = () => navigate("/dang-tin-cho-thue");
  const { isMobile, width } = useBreakpoint();
  const isTablet = width >= 768 && width < 1180;
  const [infoModal, setInfoModal] = useState<HomeModalContent>(null);
  const [postTypeModal, setPostTypeModal] = useState(false);

  const [dbRooms, setDbRooms] = useState<any[]>([]);
  const [dbRoomWants, setDbRoomWants] = useState<any[]>([]);
  const [dbRoommateWants, setDbRoommateWants] = useState<any[]>([]);
  const [isLoadingHome, setIsLoadingHome] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    const loadHomeData = async () => {
      setIsLoadingHome(true);
      try {
        const [featuredCards, demandData] = await Promise.all([
          getFeaturedListings(4),
          listActiveDemandPosts(),
        ]);
        if (!isCurrent) return;
        const formatted = featuredCards.map(l => ({
            id: l.id,
            title: l.title,
            // Dùng chuỗi đã format của `toListingCard` chứ không tự format lại:
            // bản cũ ra "5.500.000/tháng" trong khi Tất cả phòng và Tìm phòng
            // ra "5,5 tr/tháng" — cùng một tin, hai cách viết giá.
            price: l.price,
            area: l.area,
            loc: l.loc,
            // Tiện ích THẬT của tin (trước đây gắn cứng wifi + máy lạnh cho mọi tin),
            // và nhãn thật — không còn tự gắn "Mới đăng" cho tin đã cũ.
            amenities: Array.from(new Set(l.amenities.map(mapAmenityToKey))),
            badge: l.badge,
            postedAt: l.postedAt,
            img: l.img,
          }));
        setDbRooms(formatted);
        setDbRoomWants(demandData.filter(d => d.kind === "RoomWanted"));
        setDbRoommateWants(demandData.filter(d => d.kind === "RoommateWanted"));
      } catch (err) {
        logError("HomePage.loadHomeData", err);
      } finally {
        if (isCurrent) setIsLoadingHome(false);
      }
    };
    void loadHomeData();
    return () => { isCurrent = false; };
  }, []);

  const rooms = dbRooms;
  const roomWants = dbRoomWants;
  const roommateWants = dbRoommateWants;

  const selectRenterPostType = (type: string) => {
    setPostTypeModal(false);
    const kindParam = type.toLowerCase().includes("ở ghép") ? "o-ghep" : "tim-phong";
    navigate(`/dang-tin-nhu-cau?kind=${kindParam}`);
  };

  /* ── MOBILE ─────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <PublicNavbarMobile onSearch={onSearch} />

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
            {isLoadingHome ? (
              <div data-testid="home-listings-loading" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Skeleton variant="card" count={2} />
              </div>
            ) : rooms.length === 0 ? (
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

          <MarketplaceSections roomWants={roomWants} roommateWants={roommateWants} loading={isLoadingHome} mobile onInfo={setInfoModal} />
          <WhyUsSection mobile />
          <PostingCTASection mobile onRenterPost={() => setPostTypeModal(true)} onLandlordPost={onLandlordPost} />
          <LandlordCTA mobile onPost={onLandlordPost} />
          <SiteFooter mobile />
        </div>

        <BottomTabBar />
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

      <main style={{ flex: 1 }}>
        <HeroSection onSearch={onSearch} isMobile={isTablet} />
        <FeaturedRoomsSection rooms={rooms} loading={isLoadingHome} onRoomClick={onRoomClick} onSearch={onSearch} onViewAll={onViewAll} cols={gridCols} />
        <MarketplaceSections roomWants={roomWants} roommateWants={roommateWants} loading={isLoadingHome} tablet={isTablet} onInfo={setInfoModal} />
        <WhyUsSection />
        <PostingCTASection onRenterPost={() => setPostTypeModal(true)} onLandlordPost={onLandlordPost} />
        <LandlordCTA onPost={onLandlordPost} />
      </main>

      <SiteFooter />
      <InfoModal content={infoModal} onClose={() => setInfoModal(null)} />
      {postTypeModal && <PostTypeModal onClose={() => setPostTypeModal(false)} onSelect={selectRenterPostType} />}
    </div>
  );
}
