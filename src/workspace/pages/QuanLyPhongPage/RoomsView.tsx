import { useState } from "react";
import { Plus, Search, ChevronDown, Home, Zap, FileText, Lock, Users, AlertTriangle } from "lucide-react";
import { C, font } from "../../../shared/theme";
import type { Room, Property } from "../../types/room";
import type { RoomStatus } from "../../../shared/types/status";
import { ROOM_STATUS_META } from "../../../shared/utils/statusMaps";

const FILTER_CHIPS: { label: string; value: RoomStatus | "all" }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Trống", value: "available" },
  { label: "Đã cọc", value: "deposited" },
  { label: "Đang thuê", value: "rented" },
  { label: "Đã ẩn", value: "hidden" },
];

const SORT_OPTIONS = ["Mới cập nhật", "Mã phòng", "Giá thuê", "Trạng thái"];

function StatusChip({ status, small }: { status: RoomStatus; small?: boolean }) {
  const m = ROOM_STATUS_META[status];
  return (
    <span
      style={{
        fontFamily: font,
        fontSize: small ? 11 : 12,
        fontWeight: 700,
        color: C.white,
        background: m?.color || C.textSecondary,
        borderRadius: 999,
        padding: small ? "2px 9px" : "3px 11px",
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {m?.label || status}
    </span>
  );
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

        {/* Add Room Button */}
        <button
          type="button"
          disabled={isReadOnly}
          onClick={onAddRoom}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 16px",
            background: isReadOnly ? C.border : C.primary,
            color: isReadOnly ? C.textSecondary : "white",
            border: "none",
            borderRadius: 10,
            fontFamily: font,
            fontSize: 13.5,
            fontWeight: 700,
            cursor: isReadOnly ? "not-allowed" : "pointer",
          }}
        >
          <Plus size={16} /> Thêm phòng mới
        </button>
      </div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 16px", textAlign: "center" }}>
          <Home size={36} color={C.textSecondary} style={{ marginBottom: 10 }} />
          <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
            Không tìm thấy phòng phù hợp
          </p>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>
            Thử đổi từ khóa tìm kiếm hoặc lọc theo trạng thái khác.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => onSelectRoom(room)}
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
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
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
                <button
                  type="button"
                  title="Ghi chỉ số điện nước"
                  onClick={() => onOpenActionModal("utility", room)}
                  style={{ flex: 1, padding: "6px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                >
                  <Zap size={13} color={C.primary} /> Điện nước
                </button>
                <button
                  type="button"
                  title="Tạo hóa đơn"
                  onClick={() => onOpenActionModal("invoice", room)}
                  style={{ flex: 1, padding: "6px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                >
                  <FileText size={13} color={C.primary} /> Hóa đơn
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
