import { Phone, Users } from "lucide-react";
import { C, font, radius, shadow } from "../../../shared/theme";
import { Badge } from "../../../shared/components/common";
import type { Room } from "../../types/room";
import { RoomActions, type RoomActionType } from "./RoomActions";

const NOT_DECLARED = "Chưa khai báo";

/** "Tầng 1 · 25 m²" — bỏ phần chủ trọ chưa khai báo thay vì lặp "Chưa khai báo" hai lần. */
export function formatRoomMeta(room: Room): string {
  const parts = [room.floor, room.area].filter((part) => part && part !== NOT_DECLARED);
  return parts.length > 0 ? parts.join(" · ") : "Chưa khai báo tầng, diện tích";
}

interface RoomCardProps {
  room: Room;
  onSelect: (room: Room) => void;
  onAction: (type: RoomActionType, room: Room) => void;
}

export function RoomCard({ room, onSelect, onAction }: RoomCardProps) {
  return (
    <div
      data-testid="room-card"
      data-room-code={room.code}
      role="button"
      tabIndex={0}
      aria-label={`Xem chi tiết phòng ${room.code}`}
      onClick={() => onSelect(room)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(room); }
      }}
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: radius.xl,
        padding: 20,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: shadow.sm,
        fontFamily: font,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.textPrimary, lineHeight: 1.25 }}>
            Phòng {room.code}
          </div>
          <div style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>{formatRoomMeta(room)}</div>
        </div>
        <Badge kind="room" status={room.status} />
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: C.primary }}>{room.price}</span>
        <span style={{ fontSize: 14, color: C.textSecondary }}>/ tháng</span>
      </div>

      {room.occupant ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, background: C.bg, borderRadius: radius.md, padding: "10px 12px", fontSize: 14 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: C.textPrimary, minWidth: 0 }}>
            <Users size={15} color={C.primary} style={{ flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.occupant.name}</span>
          </span>
          {room.occupant.phone && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.textSecondary }}>
              <Phone size={14} style={{ flexShrink: 0 }} /> {room.occupant.phone}
            </span>
          )}
        </div>
      ) : (
        <div style={{ background: C.bg, borderRadius: radius.md, padding: "10px 12px", fontSize: 14, color: C.textSecondary }}>
          Chưa có người ở
        </div>
      )}

      {/* `marginTop: auto` giữ hàng nút ở đáy thẻ ⇒ các thẻ cùng hàng thẳng nút. */}
      <div style={{ marginTop: "auto", display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
        <RoomActions room={room} onAction={onAction} size="md" />
      </div>
    </div>
  );
}
