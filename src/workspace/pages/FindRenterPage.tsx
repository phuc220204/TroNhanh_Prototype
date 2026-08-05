import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { Users, Filter, Sparkles, Building2 } from "lucide-react";
import { C, font, radius, space } from "../../shared/theme";
import { LandlordShell } from "../../shared/components/LandlordShell";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { getMyVacantRoomSummaries, scoreDemandMatch, type VacantRoomSummary } from "../../shared/services/vacancy-service";
import { listActiveDemandPosts, type DemandPostItem } from "../../marketplace/services/demand-post-service";
import { startConversation } from "../../shared/services/messaging-service";
import { DemandPostCard } from "../../marketplace/components/DemandPostCard";
import { REGIONS } from "../../shared/constants/catalog";
import { logError, toUserMessage } from "../../shared/services/supabase-error";

export function FindRenterPage() {
  const navigate = useNavigate();

  const [vacantRooms, setVacantRooms] = useState<VacantRoomSummary[]>([]);
  const [demandPosts, setDemandPosts] = useState<DemandPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [filterKind, setFilterKind] = useState<"all" | "RoomWanted" | "RoommateWanted">("all");
  const [filterDistrict, setFilterDistrict] = useState<string>("");
  const [filterPriceRange, setFilterPriceRange] = useState<string>("all");

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [rooms, posts] = await Promise.all([
          getMyVacantRoomSummaries(),
          listActiveDemandPosts(),
        ]);
        if (isMounted) {
          setVacantRooms(rooms);
          setDemandPosts(posts);
        }
      } catch (err) {
        logError("FindRenterPage.loadData", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const [contactError, setContactError] = useState<string | null>(null);

  const handleContact = async (postId: string) => {
    setContactError(null);
    try {
      const convId = await startConversation("DemandPost", postId);
      navigate(`/tin-nhan/${convId}`);
    } catch (err) {
      logError("FindRenterPage.handleContact", err);
      // Nuốt lỗi ở đây làm nút "Nhắn tin" trông như hỏng: BR-030 (tự nhắn tin
      // cho tin của chính mình) raise SELF_CONTACT_FORBIDDEN và người dùng
      // không thấy gì xảy ra.
      setContactError(toUserMessage(err));
    }
  };

  const matchedItems = useMemo(() => {
    return demandPosts
      .map((post) => {
        const { score, bestRoomId } = scoreDemandMatch(
          {
            desired_districts: post.desired_districts ?? (post.district ? [post.district] : null),
            price_min: post.price_min ?? post.share_price ?? 0,
            price_max: post.price_max ?? post.share_price ?? 0,
            min_area: post.min_area ?? null,
          },
          vacantRooms
        );
        const bestRoom = vacantRooms.find((r) => r.roomId === bestRoomId) || null;
        return { post, score, bestRoom };
      })
      .filter(({ post }) => {
        if (filterKind !== "all" && post.kind !== filterKind) return false;

        if (filterDistrict) {
          const districts = post.desired_districts || (post.district ? [post.district] : []);
          if (districts.length > 0 && !districts.includes(filterDistrict)) return false;
        }

        if (filterPriceRange === "under3m") {
          const max = post.price_max || post.share_price || 0;
          if (max > 3_000_000 && (post.price_min || 0) > 3_000_000) return false;
        } else if (filterPriceRange === "3m_5m") {
          const min = post.price_min || post.share_price || 0;
          const max = post.price_max || post.share_price || Infinity;
          if (max < 3_000_000 || min > 5_000_000) return false;
        } else if (filterPriceRange === "over5m") {
          const min = post.price_min || post.share_price || 0;
          if (min < 5_000_000 && (post.price_max || 0) < 5_000_000) return false;
        }

        return true;
      })
      .sort((a, b) => b.score - a.score);
  }, [demandPosts, vacantRooms, filterKind, filterDistrict, filterPriceRange]);

  if (!isLoading && vacantRooms.length === 0) {
    return (
      <LandlordShell active="overview" mobileTitle="Tìm người thuê">
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: `${space[8]}px ${space[4]}px` }}>
          <h1 style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: C.textPrimary, marginBottom: space[5] }}>
            Tìm người thuê phù hợp
          </h1>
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: radius.xl,
              padding: `${space[10]}px ${space[6]}px`,
              boxShadow: "0 4px 20px rgba(42,26,12,0.02)",
            }}
          >
            <EmptyState
              icon={Users}
              title="Bạn chưa có phòng trống nào"
              description="Thêm danh sách phòng trống trong quản lý khu trọ để thuật toán tự động gợi ý những người thuê có nhu cầu phù hợp nhất."
              action={
                <button
                  type="button"
                  onClick={() => navigate("/chu-tro/quan-ly-phong")}
                  style={{
                    padding: "10px 22px",
                    background: C.primary,
                    color: C.white,
                    border: "none",
                    borderRadius: radius.md,
                    fontFamily: font,
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(138,74,32,0.2)",
                  }}
                >
                  Quản lý phòng trọ
                </button>
              }
            />
          </div>
        </div>
      </LandlordShell>
    );
  }

  return (
    <LandlordShell active="overview" mobileTitle="Tìm người thuê">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: `${space[8]}px ${space[4]}px` }}>
        {/* Page Header */}
        <div style={{ marginBottom: space[6] }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
              Gợi ý ghép nối người thuê
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: C.caramelSoft,
                color: C.primary,
                fontFamily: font,
                fontSize: 12,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: radius.pill,
                border: `1px solid ${C.border}`,
              }}
            >
              <Sparkles size={13} /> {vacantRooms.length} phòng trống sẵn sàng
            </span>
          </div>
          <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: 0 }}>
            Tự động xếp hạng tin nhu cầu thuê trọ dựa trên khu vực, mức giá và diện tích phòng trống của bạn.
          </p>
        </div>

        {contactError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
            {contactError}
          </div>
        )}

        {/* Filter Controls Bar */}
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: radius.lg,
            padding: "14px 18px",
            marginBottom: space[6],
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            boxShadow: "0 2px 10px rgba(42,26,12,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.textPrimary, fontFamily: font, fontSize: 13, fontWeight: 700 }}>
            <Filter size={15} color={C.primary} /> Bộ lọc:
          </div>

          {/* Kind Select */}
          <select
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value as any)}
            style={{
              fontFamily: font,
              fontSize: 13,
              color: C.textPrimary,
              padding: "7px 12px",
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: radius.sm,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">Tất cả nhu cầu</option>
            <option value="RoomWanted">Tìm phòng trọ</option>
            <option value="RoommateWanted">Tìm người ở ghép</option>
          </select>

          {/* District Select */}
          <select
            value={filterDistrict}
            onChange={(e) => setFilterDistrict(e.target.value)}
            style={{
              fontFamily: font,
              fontSize: 13,
              color: C.textPrimary,
              padding: "7px 12px",
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: radius.sm,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">Tất cả khu vực</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Price Select */}
          <select
            value={filterPriceRange}
            onChange={(e) => setFilterPriceRange(e.target.value)}
            style={{
              fontFamily: font,
              fontSize: 13,
              color: C.textPrimary,
              padding: "7px 12px",
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: radius.sm,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">Tất cả khoảng giá</option>
            <option value="under3m">Dưới 3 triệu</option>
            <option value="3m_5m">3 – 5 triệu</option>
            <option value="over5m">Trên 5 triệu</option>
          </select>
        </div>

        {/* Results Section */}
        {isLoading ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: 40, textAlign: "center", fontFamily: font, fontSize: 14, color: C.textSecondary }}>
            Đang tìm kiếm & xếp hạng tin nhu cầu phù hợp...
          </div>
        ) : matchedItems.length === 0 ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: 48, textAlign: "center" }}>
            <EmptyState
              icon={Users}
              title="Không tìm thấy tin nhu cầu phù hợp"
              description="Thử điều chỉnh lại bộ lọc khu vực hoặc khoảng giá để mở rộng phạm vi tìm kiếm."
            />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
            {matchedItems.map(({ post, score, bestRoom }) => (
              <div
                key={post.id}
                data-testid="demand-match-row"
                style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: radius.xl,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  boxShadow: "0 3px 12px rgba(42,26,12,0.02)",
                  position: "relative",
                }}
              >
                {/* Match Banner Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: score >= 50 ? C.caramelSoft : C.bg,
                    border: `1px solid ${score >= 50 ? C.border : C.border}`,
                    borderRadius: radius.md,
                  }}
                >
                  <span
                    data-testid="match-score-badge"
                    style={{
                      fontFamily: font,
                      fontSize: 12,
                      fontWeight: 800,
                      color: score >= 50 ? C.primary : C.textSecondary,
                      background: C.white,
                      padding: "3px 9px",
                      borderRadius: radius.pill,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    Khớp {score}%
                  </span>

                  {bestRoom && (
                    <span
                      style={{
                        fontFamily: font,
                        fontSize: 11.5,
                        fontWeight: 650,
                        color: C.textPrimary,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 180,
                      }}
                      title={`${bestRoom.propertyName}${bestRoom.district ? ` (${bestRoom.district})` : ""}`}
                    >
                      <Building2 size={12} color={C.primary} />
                      Khớp: {bestRoom.propertyName}
                    </span>
                  )}
                </div>

                {/* Demand Post Card */}
                <DemandPostCard
                  post={post}
                  onMessage={() => handleContact(post.id)}
                  onView={() => navigate(`/tin-nhu-cau/${post.id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </LandlordShell>
  );
}

export default FindRenterPage;
