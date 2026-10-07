import type { Room } from "../../types/room";
import type { RoomStatus } from "../../../shared/types/status";

export type RoomFilter = RoomStatus | "all";
export type RoomSort = "code" | "price-asc" | "price-desc" | "status";
export type RoomViewMode = "grid" | "list";

export const FILTER_CHIPS: { label: string; value: RoomFilter }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Trống", value: "available" },
  { label: "Đã cọc", value: "deposited" },
  { label: "Đang thuê", value: "rented" },
  { label: "Đã ẩn", value: "hidden" },
];

export const SORT_OPTIONS: { label: string; value: RoomSort }[] = [
  { label: "Mã phòng", value: "code" },
  { label: "Giá thấp → cao", value: "price-asc" },
  { label: "Giá cao → thấp", value: "price-desc" },
  { label: "Trạng thái", value: "status" },
];

/** Phòng cần xử lý (trống, đã cọc) lên trước; phòng ẩn xuống cuối. */
const STATUS_ORDER: Record<RoomStatus, number> = { available: 0, deposited: 1, rented: 2, hidden: 3 };

export function countRoomsByStatus(rooms: Room[]): Record<RoomFilter, number> {
  const counts: Record<RoomFilter, number> = { all: rooms.length, available: 0, deposited: 0, rented: 0, hidden: 0 };
  for (const room of rooms) counts[room.status] += 1;
  return counts;
}

function compareCode(a: Room, b: Room) {
  // `numeric` để P2 đứng trước P10.
  return a.code.localeCompare(b.code, "vi", { numeric: true, sensitivity: "base" });
}

export function getVisibleRooms(rooms: Room[], search: string, filter: RoomFilter, sort: RoomSort): Room[] {
  const keyword = search.trim().toLowerCase();
  const filtered = rooms.filter((room) => {
    const matchesSearch = !keyword
      || room.code.toLowerCase().includes(keyword)
      || room.note.toLowerCase().includes(keyword)
      || (room.occupant?.name.toLowerCase().includes(keyword) ?? false);
    const matchesFilter = filter === "all" || room.status === filter;
    return matchesSearch && matchesFilter;
  });

  return [...filtered].sort((a, b) => {
    if (sort === "price-asc") return a.priceValue - b.priceValue || compareCode(a, b);
    if (sort === "price-desc") return b.priceValue - a.priceValue || compareCode(a, b);
    if (sort === "status") return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || compareCode(a, b);
    return compareCode(a, b);
  });
}

const VIEW_MODE_STORAGE_KEY = "tronhanh.roomsViewMode";

/** Chỉ là tuỳ chọn hiển thị của người xem — đọc hỏng thì về dạng lưới. */
export function readStoredViewMode(): RoomViewMode {
  try {
    return window.localStorage.getItem(VIEW_MODE_STORAGE_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

export function storeViewMode(mode: RoomViewMode) {
  try {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // Trình duyệt chặn bộ nhớ (ẩn danh…) — lần sau về dạng lưới, không sao.
  }
}
