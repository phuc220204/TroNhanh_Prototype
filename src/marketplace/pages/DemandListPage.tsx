import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { PublicNavbar } from "../../shared/components/PublicNavbar";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { DemandPostCard } from "../components/DemandPostCard";
import { FileText, Search, Plus } from "lucide-react";
import { C, font } from "../../shared/theme";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { useAuth } from "../../shared/contexts/AuthContext";
import { listActiveDemandPosts, type DemandPostItem } from "../services/demand-post-service";
import { startConversation } from "../../shared/services/messaging-service";
import { REGIONS } from "../../shared/constants/catalog";

export function DemandListPage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { user } = useAuth();

  const [kindFilter, setKindFilter] = useState<"all" | "RoomWanted" | "RoommateWanted">("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [posts, setPosts] = useState<DemandPostItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const data = await listActiveDemandPosts({
        kind: kindFilter,
        district: districtFilter !== "all" ? districtFilter : undefined,
      });

      let filtered = data;
      if (districtFilter !== "all") {
        filtered = data.filter((p) => {
          if (p.kind === "RoomWanted") {
            return p.desired_districts?.includes(districtFilter);
          }
          return p.district === districtFilter;
        });
      }

      setPosts(filtered);
    } catch (_) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [kindFilter, districtFilter]);

  const handleMessage = async (post: DemandPostItem) => {
    if (!user) {
      navigate(`/dang-nhap?redirect=/tin-nhu-cau`);
      return;
    }
    if (post.renter_id === user.id) return;
    try {
      const convId = await startConversation("DemandPost", post.id);
      navigate(`/tin-nhan/${convId}`);
    } catch (_) {
      // Handled in service
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font }}>
      <PublicNavbar />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? 16 : "32px 24px 60px" }}>
        {/* Header Bar */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: font, fontSize: isMobile ? 22 : 26, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>
              Nhu cầu tìm phòng &amp; Ở ghép
            </h1>
            <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: 0 }}>
              Tổng hợp tin nhu cầu từ những người đang cần tìm phòng trọ hoặc tìm bạn ở ghép chia sẻ chi phí.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dang-tin-nhu-cau")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: C.primary,
              color: "white",
              border: "none",
              borderRadius: 12,
              fontFamily: font,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Plus size={16} /> Đăng tin nhu cầu
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          {/* Kind Filter Tabs */}
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { label: "Tất cả tin", value: "all" },
              { label: "Tìm phòng", value: "RoomWanted" },
              { label: "Ở ghép", value: "RoommateWanted" },
            ].map((tab) => {
              const active = kindFilter === tab.value;
              return (
                <button
                  type="button"
                  key={tab.value}
                  onClick={() => setKindFilter(tab.value as any)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 999,
                    border: `1px solid ${active ? C.primary : C.border}`,
                    background: active ? C.primary : C.white,
                    color: active ? "white" : C.textPrimary,
                    fontFamily: font,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* District Select */}
          <div style={{ marginLeft: "auto", minWidth: 160 }}>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontFamily: font,
                fontSize: 13,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                outline: "none",
              }}
            >
              <option value="all">Tất cả khu vực</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, textAlign: "center", padding: "48px 0" }}>
            Đang tải danh sách tin nhu cầu...
          </p>
        ) : posts.length === 0 ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px" }}>
            <EmptyState
              icon={FileText}
              title="Chưa có tin nhu cầu phù hợp"
              description="Thử đổi danh mục hoặc chọn khu vực khác để tìm kiếm."
            />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
            {posts.map((post) => (
              <DemandPostCard
                key={post.id}
                post={post}
                onMessage={() => handleMessage(post)}
                onView={() => navigate(`/tin-nhu-cau/${post.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DemandListPage;
