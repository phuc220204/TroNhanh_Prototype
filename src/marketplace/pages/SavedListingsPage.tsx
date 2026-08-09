import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, MapPin, Maximize2 } from "lucide-react";
import { C, font, radius } from "../../shared/theme";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
// Thuộc khu vực TÀI KHOẢN nên dùng chung shell, giữ sidebar khi điều hướng.
import { RenterShell } from "../../shared/components/RenterShell";
import { EmptyState, Skeleton, Button } from "../../shared/components/common";
import { useAuth } from "../../shared/contexts/AuthContext";
import { qk } from "../../shared/query/keys";
import { getSavedListings } from "../services/saved-listings-service";
import { SaveListingButton } from "../components/SaveListingButton";
import type { ListingCardItem } from "../services/listing-mappers";

/**
 * `/yeu-thich` — tin đã lưu.
 *
 * "Yêu thích" và "Tin đã lưu" là MỘT trang, theo quyết định của chủ dự án: hai
 * nhãn đó cùng nghĩa, tách ra chỉ khiến người dùng đi tìm tin đã lưu ở hai chỗ.
 * Cả nút trái tim trên navbar và mục "Tin đã lưu" trong menu tài khoản đều dẫn
 * về đây.
 */
function SavedCard({ item, onOpen }: { item: ListingCardItem; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      data-testid="saved-listing-card"
      style={{
        background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.lg,
        overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ position: "relative", height: 168 }}>
        <img src={item.img} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <SaveListingButton listingId={item.id} overlay size={16} />
      </div>
      <div style={{ padding: "13px 15px", display: "flex", flexDirection: "column", gap: 7 }}>
        <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0, lineHeight: 1.4 }}>
          {item.title}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>
            <MapPin size={12} color={C.secondary} /> {item.loc}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>
            <Maximize2 size={12} color={C.secondary} /> {item.area} m²
          </span>
        </div>
        <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.primary }}>{item.price}<span style={{ fontSize: 12, fontWeight: 400, color: C.textSecondary }}>/tháng</span></span>
      </div>
    </div>
  );
}

export function SavedListingsPage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { user } = useAuth();

  const { data: listings = [], isPending, isError } = useQuery({
    queryKey: qk.savedListings.list(user?.id),
    queryFn: () => getSavedListings(user?.id),
    enabled: !!user?.id,
  });

  return (
    <RenterShell active="saved">
      <div style={{ boxSizing: "border-box" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: font, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.textPrimary, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            Tin đã lưu
          </h1>
          <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: 0 }}>
            {listings.length > 0
              ? `${listings.length} tin bạn đã lưu. Bấm vào trái tim để bỏ khỏi danh sách.`
              : "Những tin bạn bấm trái tim sẽ được lưu ở đây để xem lại sau."}
          </p>
        </div>

        {isPending ? (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 18 }}>
            <Skeleton variant="card" count={isMobile ? 2 : 6} />
          </div>
        ) : isError ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: C.error, margin: 0 }}>
              Không tải được danh sách tin đã lưu. Vui lòng thử lại.
            </p>
          </div>
        ) : listings.length === 0 ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: "48px 24px" }}>
            <EmptyState
              icon={Heart}
              title="Bạn chưa lưu tin nào"
              description="Khi xem một tin phù hợp, bấm vào biểu tượng trái tim để lưu lại. Danh sách này chỉ bạn thấy."
              action={<Button variant="primary" onClick={() => navigate("/tat-ca-phong")}>Xem tin đang đăng</Button>}
              data-testid="saved-listings-empty"
            />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 18 }} data-testid="saved-listings-grid">
            {listings.map((item) => (
              <SavedCard key={item.id} item={item} onOpen={() => navigate(`/phong/${item.id}`)} />
            ))}
          </div>
        )}
      </div>
    </RenterShell>
  );
}

export default SavedListingsPage;
