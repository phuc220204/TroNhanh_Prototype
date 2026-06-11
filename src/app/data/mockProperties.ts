/* ══════════════════════════════════════════
   MOCK DATA — Khu trọ & Phòng (property/room management)
   Prototype demo data; không phải dữ liệu thật.
══════════════════════════════════════════ */
import type { RoomStatus } from "../types/status";

export interface Tenant {
  name: string;
  phone: string;
  startDate: string;
  occupants: number;
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
export interface Room {
  id: string;
  code: string;
  floor: string;
  status: RoomStatus;
  area: string;
  price: string;
  amenities: string[];
  note: string;
  tenant: Tenant | null;
  contract: Contract | null;
  bill: Bill | null;
}
export interface Property {
  id: string;
  name: string;
  address: string;
  district: string;
  rooms: Room[];
}

export const INIT_PROPERTIES: Property[] = [
  {
    id: "pvt",
    name: "Khu trọ Phan Văn Trị",
    address: "123 Phan Văn Trị, Bình Thạnh, TP.HCM",
    district: "Bình Thạnh, TP.HCM",
    rooms: [
      { id: "pvt-101", code: "P101", floor: "Tầng 1", status: "available", area: "25 m²", price: "3.200.000đ", amenities: ["Gác lửng", "WC riêng"], note: "Có gác lửng", tenant: null, contract: null, bill: null },
      { id: "pvt-102", code: "P102", floor: "Tầng 1", status: "rented", area: "28 m²", price: "2.800.000đ", amenities: ["Wifi", "Máy lạnh"], note: "2 người ở",
        tenant: { name: "Nguyễn Văn An", phone: "0901 234 567", startDate: "01/02/2026", occupants: 2 },
        contract: { start: "01/02/2026", end: "01/10/2026", deposit: "2.800.000đ", status: "Còn 4 tháng" },
        bill: { rent: "2.800.000đ", electric: "180.000đ", water: "90.000đ", service: "100.000đ", total: "3.170.000đ", paid: true } },
      { id: "pvt-201", code: "P201", floor: "Tầng 2", status: "repairing", area: "30 m²", price: "3.500.000đ", amenities: ["Ban công"], note: "Sửa WC", tenant: null, contract: null, bill: null },
      { id: "pvt-202", code: "P202", floor: "Tầng 2", status: "unpaid", area: "26 m²", price: "3.000.000đ", amenities: ["Wifi", "Chỗ để xe"], note: "Cần nhắc thanh toán",
        tenant: { name: "Trần Minh Khoa", phone: "0938 765 432", startDate: "15/06/2025", occupants: 1 },
        contract: { start: "15/06/2025", end: "15/07/2026", deposit: "3.000.000đ", status: "Sắp hết hạn" },
        bill: { rent: "3.000.000đ", electric: "210.000đ", water: "95.000đ", service: "100.000đ", total: "3.405.000đ", paid: false } },
      { id: "pvt-203", code: "P203", floor: "Tầng 2", status: "expiring", area: "24 m²", price: "2.900.000đ", amenities: ["Wifi"], note: "Khách muốn gia hạn",
        tenant: { name: "Lê Thị Hương", phone: "0977 111 222", startDate: "20/06/2025", occupants: 2 },
        contract: { start: "20/06/2025", end: "20/06/2026", deposit: "2.900.000đ", status: "Sắp hết hạn" },
        bill: { rent: "2.900.000đ", electric: "150.000đ", water: "80.000đ", service: "100.000đ", total: "3.230.000đ", paid: true } },
      { id: "pvt-301", code: "P301", floor: "Tầng 3", status: "rented", area: "32 m²", price: "3.600.000đ", amenities: ["Máy lạnh", "Tủ lạnh"], note: "Gia đình trẻ",
        tenant: { name: "Phạm Quốc Bảo", phone: "0912 333 444", startDate: "10/03/2026", occupants: 3 },
        contract: { start: "10/03/2026", end: "10/03/2027", deposit: "3.600.000đ", status: "Còn 9 tháng" },
        bill: { rent: "3.600.000đ", electric: "240.000đ", water: "110.000đ", service: "120.000đ", total: "4.070.000đ", paid: true } },
      { id: "pvt-302", code: "P302", floor: "Tầng 3", status: "available", area: "22 m²", price: "2.600.000đ", amenities: ["Wifi"], note: "Mới sơn lại", tenant: null, contract: null, bill: null },
    ],
  },
  {
    id: "q7",
    name: "Căn hộ Quận 7",
    address: "45 Nguyễn Thị Thập, Quận 7, TP.HCM",
    district: "Quận 7, TP.HCM",
    rooms: [
      { id: "q7-a1", code: "A01", floor: "Tầng 1", status: "rented", area: "35 m²", price: "5.200.000đ", amenities: ["Máy lạnh", "Full nội thất"], note: "Căn hộ mini",
        tenant: { name: "Đỗ Thu Trang", phone: "0966 888 999", startDate: "01/01/2026", occupants: 1 },
        contract: { start: "01/01/2026", end: "01/01/2027", deposit: "5.200.000đ", status: "Còn 7 tháng" },
        bill: { rent: "5.200.000đ", electric: "300.000đ", water: "120.000đ", service: "150.000đ", total: "5.770.000đ", paid: true } },
      { id: "q7-a2", code: "A02", floor: "Tầng 1", status: "available", area: "33 m²", price: "5.000.000đ", amenities: ["Máy lạnh"], note: "", tenant: null, contract: null, bill: null },
      { id: "q7-b1", code: "B01", floor: "Tầng 2", status: "available", area: "30 m²", price: "4.800.000đ", amenities: ["Ban công"], note: "View đẹp", tenant: null, contract: null, bill: null },
    ],
  },
  {
    id: "td",
    name: "Nhà trọ Thủ Đức",
    address: "78 Võ Văn Ngân, Thủ Đức, TP.HCM",
    district: "Thủ Đức, TP.HCM",
    rooms: [
      { id: "td-1", code: "P01", floor: "Tầng trệt", status: "rented", area: "18 m²", price: "2.200.000đ", amenities: ["Wifi"], note: "Sinh viên",
        tenant: { name: "Vũ Đức Thành", phone: "0944 222 111", startDate: "05/09/2025", occupants: 2 },
        contract: { start: "05/09/2025", end: "05/09/2026", deposit: "2.200.000đ", status: "Còn 3 tháng" },
        bill: { rent: "2.200.000đ", electric: "120.000đ", water: "60.000đ", service: "50.000đ", total: "2.430.000đ", paid: true } },
      { id: "td-2", code: "P02", floor: "Tầng trệt", status: "available", area: "18 m²", price: "2.200.000đ", amenities: ["Wifi"], note: "", tenant: null, contract: null, bill: null },
    ],
  },
];
