import { classifyContractEnd } from "./contract-due.ts";

/**
 * "Việc cần làm" trên dashboard chủ trọ — hàm thuần, test được không cần Supabase.
 *
 * Gom những thứ hệ thống ĐÃ ghi nhận nhưng trước đây không ai nhắc: hợp đồng
 * quá/sắp hết hạn, phòng đang thuê chưa có hóa đơn kỳ này. Hóa đơn quá hạn lấy
 * từ `DashboardKPIs` (đã có), tin hết hạn do marketplace đếm — không tính ở đây.
 */

export interface TodoRoomInput {
  id: string;
  property_id: string;
  room_code?: string | null;
  status: string;
  properties?: { name?: string | null } | null;
  contracts?: Array<{ id: string; status: string; end_date?: string | null }> | null;
  invoices?: Array<{ period: string }> | null;
}

export interface ContractTodo {
  contractId: string;
  roomId: string;
  propertyId: string;
  roomCode: string;
  propertyName: string;
  endDate: string;
  daysUntilEnd: number;
}

export interface RoomTodo {
  roomId: string;
  propertyId: string;
  roomCode: string;
  propertyName: string;
}

export interface LandlordTodos {
  /** Quá hạn lâu nhất trước. */
  expiredContracts: ContractTodo[];
  /** Hết hạn sớm nhất trước. */
  expiringContracts: ContractTodo[];
  /** Phòng `Rented` chưa có hóa đơn nào cho `period`. */
  roomsWithoutInvoice: RoomTodo[];
  /** Kỳ đang xét, dạng "YYYY-MM". */
  period: string;
}

export const toPeriod = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export function buildLandlordTodos(rooms: TodoRoomInput[], now = new Date()): LandlordTodos {
  const period = toPeriod(now);
  const expiredContracts: ContractTodo[] = [];
  const expiringContracts: ContractTodo[] = [];
  const roomsWithoutInvoice: RoomTodo[] = [];

  for (const room of rooms) {
    const base = {
      roomId: room.id,
      propertyId: room.property_id,
      roomCode: room.room_code ?? "",
      propertyName: room.properties?.name ?? "",
    };

    for (const contract of room.contracts ?? []) {
      const endInfo = classifyContractEnd(contract.end_date, contract.status, now);
      if (!endInfo || !contract.end_date) continue;
      const todo = { ...base, contractId: contract.id, endDate: contract.end_date, daysUntilEnd: endInfo.daysUntilEnd };
      (endInfo.state === "expired" ? expiredContracts : expiringContracts).push(todo);
    }

    const hasCurrentInvoice = (room.invoices ?? []).some((invoice) => invoice.period === period);
    if (room.status === "Rented" && !hasCurrentInvoice) roomsWithoutInvoice.push(base);
  }

  const byDaysUntilEnd = (a: ContractTodo, b: ContractTodo) => a.daysUntilEnd - b.daysUntilEnd;
  expiredContracts.sort(byDaysUntilEnd);
  expiringContracts.sort(byDaysUntilEnd);

  return { expiredContracts, expiringContracts, roomsWithoutInvoice, period };
}
