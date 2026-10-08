import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { C, font, radius, shadow } from "../../../shared/theme";

/** Số tin tối đa của section "Phòng mới đăng tải" trên trang chủ. */
export const HOME_NEW_LISTINGS_LIMIT = 12;

const GAP = 20;

/**
 * Trạng thái cuộn của một track ngang. Tách khỏi component track để header
 * section đặt được mũi tên ở chỗ khác (cạnh "Xem tất cả") mà vẫn điều khiển
 * đúng track.
 */
export function useCarouselScroll(itemCount: number) {
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

type CarouselState = ReturnType<typeof useCarouselScroll>;

function ArrowButton({ label, disabled, onClick, children, testId }: {
  label: string; disabled: boolean; onClick: () => void; children: React.ReactNode; testId: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      style={{
        width: 40, height: 40, borderRadius: radius.pill, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: `1.5px solid ${C.border}`, background: C.white, boxShadow: shadow.sm,
        color: disabled ? C.border : C.textPrimary,
        cursor: disabled ? "default" : "pointer",
        transition: "color 0.15s ease, border-color 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

export function CarouselArrows({ carousel }: { carousel: CarouselState }) {
  // Ít tin đến mức vừa một màn thì không cần mũi tên.
  if (!carousel.canPrev && !carousel.canNext) return null;
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <ArrowButton label="Phòng trước" testId="home-carousel-prev" disabled={!carousel.canPrev} onClick={carousel.prev}>
        <ChevronLeft size={18} />
      </ArrowButton>
      <ArrowButton label="Phòng tiếp theo" testId="home-carousel-next" disabled={!carousel.canNext} onClick={carousel.next}>
        <ChevronRight size={18} />
      </ArrowButton>
    </div>
  );
}

/**
 * Track ngang có scroll-snap: bấm mũi tên hoặc vuốt (mobile) để xem tin tiếp.
 * `perView` lẻ (1.15) trên mobile để lộ mép thẻ sau — gợi ý là vuốt được.
 * Thẻ phòng do nơi gọi render (`renderRoom`) để file này không import ngược
 * `HomeHeroSections`.
 */
export function RoomCarousel<T extends { id: string }>({ rooms, perView, carousel, renderRoom, onViewAll }: {
  rooms: T[];
  perView: number;
  carousel: CarouselState;
  renderRoom: (room: T) => React.ReactNode;
  onViewAll?: () => void;
}) {
  const itemWidth = `calc((100% - ${GAP * (Math.ceil(perView) - 1)}px) / ${perView})`;
  const itemStyle: React.CSSProperties = { flex: `0 0 ${itemWidth}`, minWidth: 0, scrollSnapAlign: "start", display: "flex" };

  return (
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
  );
}
