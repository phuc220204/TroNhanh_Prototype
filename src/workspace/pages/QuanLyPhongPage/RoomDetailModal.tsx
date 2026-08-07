import { useEffect } from "react";
import { X } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { useBreakpoint } from "../../../shared/components/useBreakpoint";
import type { Room } from "../../types/room";
import { RoomDetailTabs } from "../../components/RoomDetailTabs";

/**
 * Chi tiết phòng — modal lớn giữa màn hình.
 *
 * VÌ SAO KHÔNG CÒN LÀ DRAWER: bản cũ là slideover phải rộng tối đa 480px, còn
 * `RoomDetailTabs` có 4 tab và mỗi tab là một bảng nhiều cột (chỉ số điện nước,
 * hóa đơn, lịch sử ở). Ở 480px thì hàng tab phải scroll ngang, mọi bảng bên trong
 * cũng scroll ngang, và người dùng đọc dữ liệu vận hành qua một khe hẹp. Modal
 * rộng cho các bảng đó đủ chỗ nằm ngang.
 *
 * Chỉ HIỂN THỊ, không có nút ghi nào — nên không nhận prop gác quyền. (Bản cũ
 * nhận `isReadOnly` mà không dùng tới; một prop gác không gác gì thì tệ hơn là
 * không có, vì lần audit sau sẽ tưởng chỗ này đã an toàn.)
 */
interface RoomDetailModalProps {
  room: Room | null;
  onClose: () => void;
  onOpenActionModal?: (type: any, room: Room) => void;
}

export function RoomDetailModal({ room, onClose }: RoomDetailModalProps) {
  const { isMobile } = useBreakpoint();

  // Esc để đóng: modal chiếm gần hết màn hình nên tìm nút X mất công hơn drawer.
  useEffect(() => {
    if (!room) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [room, onClose]);

  if (!room) return null;

  return (
    <div
      onClick={onClose}
      data-testid="room-detail-modal"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(2px)",
        zIndex: 400,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 24,
      }}
    >
      <div
        // Chặn nổi bọt: bấm trong nội dung không được đóng modal.
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.white,
          width: "100%",
          maxWidth: isMobile ? "100%" : 1040,
          maxHeight: isMobile ? "92vh" : "88vh",
          borderRadius: isMobile ? `${radius.xl}px ${radius.xl}px 0 0` : radius.xl,
          boxShadow: "0 24px 64px rgba(42,26,12,0.28)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header cố định — tiêu đề luôn thấy khi cuộn bảng dài bên dưới. */}
        <div
          style={{
            padding: isMobile ? "16px 18px" : "20px 26px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontFamily: font, fontSize: isMobile ? 18 : 21, fontWeight: 800, color: C.textPrimary, margin: "0 0 2px" }}>
              Phòng {room.code}
            </h3>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>
              {room.floor} • {room.area} • {room.price}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            data-testid="room-detail-close"
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 6,
              borderRadius: radius.sm, display: "flex", alignItems: "center", flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.cream)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <X size={20} color={C.textSecondary} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? 16 : 26 }}>
          <RoomDetailTabs room={room} />
        </div>
      </div>
    </div>
  );
}
