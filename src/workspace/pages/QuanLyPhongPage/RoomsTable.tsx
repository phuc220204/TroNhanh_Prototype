import { C } from "../../../shared/theme";
import { Badge, Table, type Column } from "../../../shared/components/common";
import type { Room } from "../../types/room";
import { RoomActions, type RoomActionType } from "./RoomActions";

const COLUMNS: Column<Room>[] = [
  { key: "code", label: "Phòng" },
  { key: "status", label: "Trạng thái" },
  { key: "floor", label: "Tầng" },
  { key: "area", label: "Diện tích" },
  { key: "price", label: "Giá thuê", align: "right" },
  { key: "occupant", label: "Người ở" },
  { key: "actions", label: "Thao tác", width: 260 },
];

interface RoomsTableProps {
  rooms: Room[];
  onSelect: (room: Room) => void;
  onAction: (type: RoomActionType, room: Room) => void;
}

/** Dạng danh sách — đọc lướt nhiều phòng một lúc. Bấm hàng = mở chi tiết, như thẻ. */
export function RoomsTable({ rooms, onSelect, onAction }: RoomsTableProps) {
  return (
    <Table<Room>
      data-testid="rooms-table"
      columns={COLUMNS}
      rows={rooms}
      onRowClick={onSelect}
      getRowLabel={(room) => `Xem chi tiết phòng ${room.code}`}
      getRowAttributes={(room) => ({ "data-testid": "room-row", "data-room-code": room.code })}
      renderCell={(room, key) => {
        switch (key) {
          case "code":
            return <strong style={{ fontSize: 15, whiteSpace: "nowrap" }}>Phòng {room.code}</strong>;
          case "status":
            return <Badge kind="room" status={room.status} />;
          case "price":
            return <strong style={{ color: C.primary, whiteSpace: "nowrap" }}>{room.price}</strong>;
          case "occupant":
            return room.occupant ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{room.occupant.name}</span>
                {room.occupant.phone && <span style={{ fontSize: 13, color: C.textSecondary }}>{room.occupant.phone}</span>}
              </div>
            ) : (
              <span style={{ color: C.textSecondary }}>—</span>
            );
          case "actions":
            return (
              <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <RoomActions room={room} onAction={onAction} />
              </div>
            );
          default:
            return <span style={{ whiteSpace: "nowrap" }}>{room[key as "floor" | "area"]}</span>;
        }
      }}
    />
  );
}
