import { useMemo, useState } from "react";
import { Home } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { Button } from "../../../shared/components/common";
import type { Room, Property } from "../../types/room";
import type { RoomActionType } from "./RoomActions";
import { RoomCard } from "./RoomCard";
import { RoomsTable } from "./RoomsTable";
import { RoomsToolbar } from "./RoomsToolbar";
import {
  countRoomsByStatus,
  getVisibleRooms,
  readStoredViewMode,
  storeViewMode,
  type RoomFilter,
  type RoomSort,
  type RoomViewMode,
} from "./rooms-view-model";

interface RoomsViewProps {
  property: Property | null;
  rooms: Room[];
  search: string;
  setSearch: (v: string) => void;
  filter: RoomFilter;
  setFilter: (f: RoomFilter) => void;
  sort: RoomSort;
  setSort: (s: RoomSort) => void;
  onSelectRoom: (room: Room) => void;
  onOpenActionModal: (type: RoomActionType, room: Room) => void;
  onAddRoom: () => void;
  onAddProperty: () => void;
  /** Mở tab Cài đặt khu — dùng cho lời nhắc khi khu chưa có đơn giá/tài khoản nhận tiền. */
  onOpenSettings?: () => void;
  mobile?: boolean;
}

const emptyTitle: React.CSSProperties = { fontFamily: font, fontSize: 17, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" };
const emptyText: React.CSSProperties = { fontFamily: font, fontSize: 14, color: C.textSecondary, margin: "0 auto 16px", maxWidth: 400, lineHeight: 1.55 };

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
  onOpenSettings,
  mobile,
}: RoomsViewProps) {
  const [viewMode, setViewModeState] = useState<RoomViewMode>(readStoredViewMode);
  const setViewMode = (mode: RoomViewMode) => {
    setViewModeState(mode);
    storeViewMode(mode);
  };
  // Bảng không vừa màn điện thoại ⇒ luôn dạng lưới, giữ nguyên lựa chọn cho máy tính.
  const effectiveViewMode: RoomViewMode = mobile ? "grid" : viewMode;

  const counts = useMemo(() => countRoomsByStatus(rooms), [rooms]);
  const visibleRooms = useMemo(() => getVisibleRooms(rooms, search, filter, sort), [rooms, search, filter, sort]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <RoomsToolbar
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        counts={counts}
        sort={sort}
        setSort={setSort}
        viewMode={effectiveViewMode}
        setViewMode={setViewMode}
        canToggleView={!mobile}
        onAddRoom={onAddRoom}
      />

      {/* Thiếu đơn giá/tài khoản thì hóa đơn không tính được tiền điện nước và không có mã VietQR. */}
      {property && onOpenSettings && (property.electricity_unit_price == null || property.water_unit_price == null || !property.bank_account_number) && (
        <div data-testid="property-setup-reminder" role="status" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, background: C.warningBg, border: `1px solid ${C.warningBorder}`, borderRadius: radius.md, padding: "12px 16px", fontFamily: font }}>
          <span style={{ fontSize: 14, color: C.textPrimary, lineHeight: 1.5 }}>
            <strong>{property.name}</strong> chưa cài đủ đơn giá điện nước và tài khoản nhận tiền — hóa đơn sẽ không tự tính được.
          </span>
          <Button variant="outline" size="sm" onClick={onOpenSettings} data-testid="property-setup-btn">Cài đặt ngay</Button>
        </div>
      )}

      {/* BA trạng thái rỗng khác nhau: chưa có khu · khu chưa có phòng · lọc không ra.
          Gộp làm một thì "Thử đổi từ khóa" hiện cả khi việc thật cần làm là tạo khu. */}
      {visibleRooms.length === 0 ? (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: "48px 16px", textAlign: "center" }} data-testid="rooms-empty">
          <Home size={36} color={C.textSecondary} style={{ marginBottom: 10 }} />
          {!property ? (
            <>
              <p style={emptyTitle}>Bạn chưa có khu trọ nào</p>
              <p style={emptyText}>
                Khu trọ là nơi chứa các phòng của bạn. Tạo khu đầu tiên để bắt đầu
                thêm phòng, ghi điện nước và xuất hóa đơn.
              </p>
              <Button variant="primary" requiresWrite onClick={onAddProperty} data-testid="create-first-property-btn">
                Tạo khu trọ đầu tiên
              </Button>
            </>
          ) : rooms.length === 0 ? (
            <>
              <p style={emptyTitle}>Khu này chưa có phòng nào</p>
              <p style={emptyText}>
                Thêm phòng đầu tiên vào <strong>{property.name}</strong> để quản lý
                người ở, chỉ số điện nước và hóa đơn.
              </p>
              <Button variant="primary" requiresWrite onClick={onAddRoom} data-testid="create-first-room-btn">
                Thêm phòng đầu tiên
              </Button>
            </>
          ) : (
            <>
              <p style={emptyTitle}>Không tìm thấy phòng phù hợp</p>
              <p style={{ ...emptyText, margin: 0 }}>Thử đổi từ khóa tìm kiếm hoặc lọc theo trạng thái khác.</p>
            </>
          )}
        </div>
      ) : effectiveViewMode === "list" ? (
        <RoomsTable rooms={visibleRooms} onSelect={onSelectRoom} onAction={onOpenActionModal} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {visibleRooms.map((room) => (
            <RoomCard key={room.id} room={room} onSelect={onSelectRoom} onAction={onOpenActionModal} />
          ))}
        </div>
      )}
    </div>
  );
}
