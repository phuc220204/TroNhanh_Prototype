import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { qk } from "../../../shared/query/keys";
import { getPropertiesByOwnerOrThrow } from "../../services/property-service";
import { getRoomsByOwnerOrThrow, type RoomItem } from "../../services/room-service";
import type { RoomStatus } from "../../../shared/types/status";
import { normalizeContractStatus, normalizeInvoiceStatus, normalizeRoomStatus } from "../../../shared/utils/statusMaps";
import { getDashboardMetrics } from "../../services/dashboard-service";

/**
 * Dữ liệu dashboard chủ trọ qua React Query.
 *
 * - `staleTime: 0`: màn quản lý phòng / hóa đơn chưa invalidate cache dashboard
 *   sau mỗi thao tác, nên mỗi lần mở dashboard đều tải lại ngầm — vẫn hiện ngay
 *   dữ liệu cũ trong cache thay vì khung chờ.
 * - KPI theo khu dùng `keepPreviousData`: đổi khu không làm trắng cả trang, số
 *   cũ giữ nguyên tới khi số mới về.
 */
export function useDashboardData(ownerId: string | undefined, propertyId: string) {
  const enabled = !!ownerId;
  const scopedPropertyId = propertyId === "all" ? undefined : propertyId;

  const propertiesQuery = useQuery({
    queryKey: qk.properties.mine(ownerId),
    queryFn: () => getPropertiesByOwnerOrThrow(ownerId!),
    enabled,
    staleTime: 0,
  });

  const roomsQuery = useQuery({
    queryKey: qk.rooms.mine(ownerId),
    queryFn: () => getRoomsByOwnerOrThrow(ownerId!),
    enabled,
    staleTime: 0,
  });

  const metricsQuery = useQuery({
    queryKey: qk.dashboard.metrics(ownerId, scopedPropertyId),
    queryFn: () => getDashboardMetrics(ownerId!, scopedPropertyId),
    enabled,
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  // Không đọc tin đăng ở đây: `rental_listings` thuộc marketplace (§2.1) —
  // dashboard chỉ có nút sang /tai-khoan/tin-cho-thue.
  const coreQueries = [propertiesQuery, roomsQuery, metricsQuery];

  return {
    properties: propertiesQuery.data ?? [],
    rooms: roomsQuery.data ?? [],
    kpis: metricsQuery.data ?? null,
    /** Chỉ lần tải đầu (chưa có gì để hiện). Tải lại ngầm không bật khung chờ. */
    isPending: coreQueries.some((q) => q.isPending),
    /** Lỗi khi chưa có dữ liệu. Làm mới ngầm lỗi thì giữ số đang hiện. */
    isError: coreQueries.some((q) => q.isError && q.data === undefined),
    /** Đang đổi khu: KPI đang hiện là của khu trước. */
    isSwitchingProperty: metricsQuery.isPlaceholderData,
    refetchAll: () => Promise.all(coreQueries.map((q) => q.refetch())),
  };
}

/** Một dòng trong bảng "Phòng" của dashboard, dựng từ dữ liệu phòng thật. */
export function toDashboardRoom(room: RoomItem) {
  const status: RoomStatus = normalizeRoomStatus(room.status) ?? "available";
  const activeContract = (room.contracts ?? []).find((c) => normalizeContractStatus(c.status) === "active");
  const occupant = activeContract?.occupancies?.find((o: { full_name?: string | null }) => o.full_name)?.full_name ?? null;
  // Kỳ dạng "YYYY-MM" ⇒ so chuỗi là so thời gian.
  const latestInvoice = [...(room.invoices ?? [])].sort((a, b) => String(b.period).localeCompare(String(a.period)))[0];
  const invoiceStatus = latestInvoice ? normalizeInvoiceStatus(latestInvoice.status) : null;
  const paid = invoiceStatus == null ? null : invoiceStatus === "paid";

  return {
    code: room.room_code || room.room_number || "",
    property: room.properties?.name || "Khu trọ",
    status,
    occupant,
    paid,
    task: status === "available"
      ? "Tạo tin đăng"
      : status === "rented" && paid === false
        ? "Xem hóa đơn"
        : status === "deposited"
          ? "Xem hợp đồng"
          : null,
  };
}
