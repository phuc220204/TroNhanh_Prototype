import type { RoomStatus } from "../../shared/types/status";

export interface Occupant {
  name: string;
  phone: string;
  startDate: string;
  occupantCount: number;
}

export interface Contract {
  start: string;
  end: string;
  deposit: string;
  status: string;
}

export interface Bill {
  rent: string;
  electric: string;
  water: string;
  service: string;
  total: string;
  paid: boolean;
}

/** Nợ của phòng: còn hóa đơn chưa thu đủ. `overdue` = có hóa đơn đã quá `due_date`. */
export interface RoomDebt {
  state: "overdue" | "outstanding";
  /** Số ngày quá hạn của hóa đơn trễ nhất; 0 khi chưa quá hạn. */
  overdueDays: number;
  invoiceCount: number;
}

export interface Room {
  id: string;
  code: string;
  floor: string;
  status: RoomStatus;
  area: string;
  price: string;
  /** Giá thuê dạng số (VND) — để sắp xếp; `price` là chuỗi đã định dạng. */
  priceValue: number;
  amenities: string[];
  note: string;
  occupant: Occupant | null;
  contract: Contract | null;
  bill: Bill | null;
  debt: RoomDebt | null;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  district: string;
  rooms: Room[];
  electricity_unit_price?: number;
  water_unit_price?: number;
  service_fee?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
}
