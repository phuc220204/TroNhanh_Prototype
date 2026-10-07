import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { AppSelect, Button } from "../../../shared/components/common";
import { FILTER_CHIPS, SORT_OPTIONS, type RoomFilter, type RoomSort, type RoomViewMode } from "./rooms-view-model";

interface RoomsToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  filter: RoomFilter;
  setFilter: (value: RoomFilter) => void;
  counts: Record<RoomFilter, number>;
  sort: RoomSort;
  setSort: (value: RoomSort) => void;
  viewMode: RoomViewMode;
  setViewMode: (value: RoomViewMode) => void;
  /** Điện thoại không có dạng danh sách (bảng không vừa màn) ⇒ ẩn nút chuyển. */
  canToggleView: boolean;
  onAddRoom: () => void;
}

const VIEW_OPTIONS: { value: RoomViewMode; label: string; Icon: typeof List }[] = [
  { value: "grid", label: "Dạng lưới", Icon: LayoutGrid },
  { value: "list", label: "Dạng danh sách", Icon: List },
];

export function RoomsToolbar({
  search, setSearch, filter, setFilter, counts, sort, setSort, viewMode, setViewMode, canToggleView, onAddRoom,
}: RoomsToolbarProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: 16, fontFamily: font }}>
      {/* Hàng 1: tìm kiếm · sắp xếp · kiểu xem · thêm phòng */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <Search size={17} color={C.textSecondary} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            data-testid="rooms-search"
            placeholder="Tìm mã phòng, tên người ở..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", height: 44, padding: "0 14px 0 40px", fontFamily: font, fontSize: 15, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: radius.md, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ width: 190 }}>
          <AppSelect
            value={sort}
            options={SORT_OPTIONS}
            onChange={(value) => setSort(value as RoomSort)}
            fontSize={14}
            ariaLabel="Sắp xếp phòng"
            data-testid="rooms-sort"
          />
        </div>

        {canToggleView && (
          <div role="group" aria-label="Kiểu hiển thị" style={{ display: "flex", padding: 3, gap: 2, background: C.cream, borderRadius: radius.md }}>
            {VIEW_OPTIONS.map(({ value, label, Icon }) => {
              const isActive = viewMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={label}
                  aria-pressed={isActive}
                  title={label}
                  data-testid={`rooms-view-toggle-${value}`}
                  onClick={() => setViewMode(value)}
                  style={{ width: 40, height: 38, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: radius.sm, cursor: "pointer", background: isActive ? C.white : "transparent", color: isActive ? C.primary : C.textSecondary }}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        )}

        <Button variant="primary" requiresWrite icon={<Plus size={17} />} onClick={onAddRoom} data-testid="add-room-btn" style={{ height: 44, whiteSpace: "nowrap" }}>
          Thêm phòng mới
        </Button>
      </div>

      {/* Hàng 2: lọc trạng thái kèm số đếm */}
      <div role="group" aria-label="Lọc theo trạng thái" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {FILTER_CHIPS.map((chip) => {
          const isActive = filter === chip.value;
          return (
            <button
              type="button"
              key={chip.value}
              aria-pressed={isActive}
              data-testid={`rooms-filter-${chip.value}`}
              onClick={() => setFilter(chip.value)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: radius.pill,
                border: `1px solid ${isActive ? C.primary : C.border}`,
                background: isActive ? C.primary : C.white,
                color: isActive ? C.white : C.textPrimary,
                fontFamily: font,
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {chip.label}
              <span style={{ fontSize: 12.5, fontWeight: 700, color: isActive ? C.white : C.textSecondary, opacity: isActive ? 0.85 : 1 }}>
                {counts[chip.value]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
