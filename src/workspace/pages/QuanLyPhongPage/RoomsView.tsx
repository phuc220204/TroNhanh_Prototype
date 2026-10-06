import { useState } from "react";
import { Plus, Search, ChevronDown, Home, Zap, FileText, Lock, Users, AlertTriangle, Building2 } from "lucide-react";
import { C, font, shadow } from "../../../shared/theme";
import { Badge, Button } from "../../../shared/components/common";
import type { Room, Property } from "../../types/room";
import type { RoomStatus } from "../../../shared/types/status";

const FILTER_CHIPS: { label: string; value: RoomStatus | "all" }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Trống", value: "available" },
  { label: "Đã cọc", value: "deposited" },
  { label: "Đang thuê", value: "rented" },
  { label: "Đã ẩn", value: "hidden" },
];

const SORT_OPTIONS = ["Mới cập nhật", "Mã phòng", "Giá thuê", "Trạng thái"];

function StatusChip({ status }: { status: RoomStatus }) {
  return <Badge kind="room" status={status} />;
}

interface RoomsViewProps {
  property: Property | null;
  rooms: Room[];
  search: string;
  setSearch: (v: string) => void;
  filter: RoomStatus | "all";
  setFilter: (f: RoomStatus | "all") => void;
  sort: string;
  setSort: (s: string) => void;
  onSelectRoom: (room: Room) => void;
  onOpenActionModal: (type: any, room: Room) => void;
  onAddRoom: () => void;
  onAddProperty: () => void;
  isReadOnly?: boolean;
  mobile?: boolean;
}

export function RoomsView({
  property,
  rooms,
  search,
  setSearch,
  filter,
  setFilter,
  sort,
  setSort,
  onSelectRoom,
  onOpenActionModal,
  onAddRoom,
  onAddProperty,
  isReadOnly,
  mobile,
}: RoomsViewProps) {
  const filteredRooms = rooms.filter((r) => {
    const matchesSearch = !search || r.code.toLowerCase().includes(search.toLowerCase()) || r.note?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || r.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top Filter & Action Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flex: 1 }}>
          {/* Search Input */}
          <div style={{ position: "relative", minWidth: 200, flex: "1 1 200px" }}>
            <Search size={15} color={C.textSecondary} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Tìm mã phòng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "9px 12px 9px 36px", fontFamily: font, fontSize: 13.5, border: `1px solid ${C.border}`, borderRadius: 10, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Filter Chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTER_CHIPS.map((chip) => {
              const active = filter === chip.value;
              return (
                <button
                  type="button"
                  key={chip.value}
                  onClick={() => setFilter(chip.value)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 999,
                    border: `1px solid ${active ? C.primary : C.border}`,
                    background: active ? C.primary : C.white,
                    color: active ? "white" : C.textPrimary,
                    fontFamily: font,
                    fontSize: 12.5,
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Thêm khu trọ.
              Trước đây lối vào DUY NHẤT để tạo khu là nút trong empty state, mà
              empty state chỉ hiện khi chưa có phòng nào. Nghĩa là chủ trọ có một
              khu rồi thì vĩnh viễn không tạo được khu thứ hai — cùng loại lỗ với
              cái migration 20260807140000 đã vá, chỉ là ở một mức sâu hơn. */}
          <Button variant="outline" requiresWrite icon={<Building2 size={16} />} onClick={onAddProperty} data-testid="add-property-btn">
            Thêm khu trọ
          </Button>

          {/* Add Room Button */}
          <Button variant="primary" requiresWrite icon={<Plus size={16} />} onClick={onAddRoom} data-testid="add-room-btn">
            Thêm phòng mới
          </Button>
        </div>
      </div>

      {/* Rooms Grid.
          BA trạng thái rỗng khác nhau, bản cũ gộp cả ba thành "Thử đổi từ khóa
          tìm kiếm" — kể cả khi người dùng chưa có khu trọ nào và chưa gõ gì. Khi
          đó lời khuyên đó vô nghĩa, mà việc thật cần làm (tạo khu) thì không có
          nút nào. */}
      {filteredRooms.length === 0 ? (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 16px", textAlign: "center" }} data-testid="rooms-empty">
          <Home size={36} color={C.textSecondary} style={{ marginBottom: 10 }} />
          {!property ? (
            <>
              <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
                Bạn chưa có khu trọ nào
              </p>
              <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 auto 16px", maxWidth: 380, lineHeight: 1.5 }}>
                Khu trọ là nơi chứa các phòng của bạn. Tạo khu đầu tiên để bắt đầu
                thêm phòng, ghi điện nước và xuất hóa đơn.
              </p>
              <Button variant="primary" requiresWrite onClick={onAddProperty} data-testid="create-first-property-btn">
                Tạo khu trọ đầu tiên
              </Button>
            </>
          ) : rooms.length === 0 ? (
            <>
              <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
                Khu này chưa có phòng nào
              </p>
              <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 auto 16px", maxWidth: 380, lineHeight: 1.5 }}>
                Thêm phòng đầu tiên vào <strong>{property.name}</strong> để quản lý
                người ở, chỉ số điện nước và hóa đơn.
              </p>
              <Button variant="primary" requiresWrite onClick={onAddRoom} data-testid="create-first-room-btn">
                Thêm phòng đầu tiên
              </Button>
            </>
          ) : (
            <>
              <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
                Không tìm thấy phòng phù hợp
              </p>
              <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>
                Thử đổi từ khóa tìm kiếm hoặc lọc theo trạng thái khác.
              </p>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              data-testid="room-card"
              data-room-code={room.code}
              role="button"
              tabIndex={0}
              aria-label={`Xem chi tiết phòng ${room.code}`}
              onClick={() => onSelectRoom(room)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectRoom(room); }
              }}
              style={{
                background: C.white,
                border: `1.5px solid ${C.border}`,
                borderRadius: 16,
                padding: 18,
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: shadow.sm,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary }}>
                  Phòng {room.code}
                </span>
                <StatusChip status={room.status} />
              </div>

              <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: font, display: "flex", flexDirection: "column", gap: 4 }}>
                <div>Tầng: <strong>{room.floor}</strong> • Diện tích: <strong>{room.area}</strong></div>
                <div>Giá thuê: <strong style={{ color: C.primary, fontSize: 14 }}>{room.price}</strong></div>
                {room.occupant && (
                  <div style={{ color: C.textPrimary, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <Users size={13} color={C.primary} /> {room.occupant.name} ({room.occupant.phone})
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: "flex", justifyContent: "space-between", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" requiresWrite icon={<Zap size={13} />} onClick={() => onOpenActionModal("utility", room)} data-testid="room-utility-btn" style={{ flex: 1, justifyContent: "center" }}>
                  Điện nước
                </Button>
                <Button variant="outline" size="sm" requiresWrite icon={<FileText size={13} />} onClick={() => onOpenActionModal("invoice", room)} data-testid="room-invoice-btn" style={{ flex: 1, justifyContent: "center" }}>
                  Hóa đơn
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
