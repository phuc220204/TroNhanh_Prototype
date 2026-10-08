import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { C, font, radius, shadow } from "../../../shared/theme";

/** Số tin tối đa của section "Phòng mới đăng tải" trên trang chủ. */
export const HOME_NEW_LISTINGS_LIMIT = 12;

const GAP = 20;
const ARROW_SIZE = 44;
/** Rãnh hai bên dải thẻ cho mũi tên: nút + 12px khoảng cách tới thẻ. */
const ARROW_GUTTER = ARROW_SIZE + 12;

/** Trạng thái cuộn của một track ngang: còn cuộn được về trước / về sau không. */
function useCarouselScroll(itemCount: number) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // Sai số 2px: scrollLeft lẻ khi trình duyệt zoom hoặc snap.
    setCanPrev(el.scrollLeft > 2);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update, itemCount]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * (el.clientWidth + GAP), behavior: "smooth" });
  };

  return {
    trackRef,
    onScroll: update,
    canPrev,
    canNext,
    prev: () => scrollByPage(-1),
    next: () => scrollByPage(1),
  };
}

/**
 * Mũi tên nổi ở mép dải thẻ, căn giữa theo chiều dọc. Hết chỗ cuộn về phía
 * đó thì mờ đi và không bấm được (ẩn hẳn, không để nút xám nằm đó).
 */
function EdgeArrow({ side, visible, mobile, onClick }: {
  side: "prev" | "next"; visible: boolean; mobile?: boolean; onClick: () => void;
}) {
  const size = mobile ? 36 : ARROW_SIZE;
  // Desktop: nút nằm trọn trong rãnh `ARROW_GUTTER` hai bên, không chạm thẻ.
  // Mobile: không đủ chỗ cho rãnh ⇒ đặt nút vào trong mép, đè lên ảnh.
  const offset = mobile ? 6 : 0;
  const isPrev = side === "prev";
  return (
    <button
      type="button"
      aria-label={isPrev ? "Phòng trước" : "Phòng tiếp theo"}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={onClick}
      data-testid={isPrev ? "home-carousel-prev" : "home-carousel-next"}
      style={{
        // Mobile: nút nằm đè lên thẻ ⇒ căn giữa phần ảnh (4px đệm track + ảnh 190px)
        // để không che tiêu đề và giá.
        position: "absolute", top: mobile ? 4 + 190 / 2 : "50%", [isPrev ? "left" : "right"]: offset, zIndex: 2,
        transform: `translateY(-50%) scale(${visible ? 1 : 0.85})`,
        width: size, height: size, borderRadius: radius.pill,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${C.border}`, background: C.white, boxShadow: shadow.md,
        color: C.textPrimary, cursor: "pointer",
        opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.2s ease, transform 0.2s ease",
      }}
    >
      {isPrev ? <ChevronLeft size={mobile ? 18 : 20} /> : <ChevronRight size={mobile ? 18 : 20} />}
    </button>
  );
}

/**
 * Track ngang có scroll-snap: bấm mũi tên ở 2 bên hoặc vuốt (mobile) để xem tin
 * tiếp. `perView` lẻ (1.15) trên mobile để lộ mép thẻ sau — gợi ý là vuốt được.
 * Thẻ phòng do nơi gọi render (`renderRoom`) để file này không import ngược
 * `HomeHeroSections`.
 */
export function RoomCarousel<T extends { id: string }>({ rooms, perView, renderRoom, onViewAll, mobile }: {
  rooms: T[];
  perView: number;
  renderRoom: (room: T) => React.ReactNode;
  onViewAll?: () => void;
  mobile?: boolean;
}) {
  const carousel = useCarouselScroll(rooms.length);
  const itemWidth = `calc((100% - ${GAP * (Math.ceil(perView) - 1)}px) / ${perView})`;
  const itemStyle: React.CSSProperties = { flex: `0 0 ${itemWidth}`, minWidth: 0, scrollSnapAlign: "start", display: "flex" };

  return (
    <div style={{ position: "relative", padding: mobile ? 0 : `0 ${ARROW_GUTTER}px` }}>
      <EdgeArrow side="prev" visible={carousel.canPrev} mobile={mobile} onClick={carousel.prev} />
      <EdgeArrow side="next" visible={carousel.canNext} mobile={mobile} onClick={carousel.next} />
      <div
        ref={carousel.trackRef}
        onScroll={carousel.onScroll}
        data-testid="home-listings-carousel"
        style={{
          display: "flex", gap: GAP, overflowX: "auto", scrollSnapType: "x mandatory",
          scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
          // Chừa chỗ cho bóng của thẻ khi hover, không bị track cắt mất.
          padding: "4px 2px 12px", margin: "-4px -2px -12px",
        }}
      >
        {rooms.map((room) => (
          <div key={room.id} style={itemStyle}>
            {/* grid ⇒ thẻ giãn đủ chiều cao slide, các thẻ cao bằng nhau. */}
            <div style={{ width: "100%", display: "grid" }}>{renderRoom(room)}</div>
          </div>
        ))}
        {onViewAll && (
          <div style={itemStyle}>
            <button
              type="button"
              onClick={onViewAll}
              aria-label="Xem tất cả phòng"
              data-testid="home-carousel-view-all"
              style={{
                width: "100%", minHeight: 240, borderRadius: radius.xl, cursor: "pointer",
                border: `1.5px dashed ${C.secondary}`, background: C.cream,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
                fontFamily: font, color: C.primary,
              }}
            >
              <span style={{ width: 48, height: 48, borderRadius: radius.pill, background: C.white, display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: shadow.sm }}>
                <ArrowRight size={20} />
              </span>
              <span style={{ fontSize: 15, fontWeight: 800 }}>Xem tất cả phòng</span>
              <span style={{ fontSize: 12.5, color: C.textSecondary }}>Lọc theo khu vực, giá, loại phòng</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
