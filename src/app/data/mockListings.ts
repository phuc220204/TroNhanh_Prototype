/* ══════════════════════════════════════════
   MOCK DATA — Quản lý tin đăng (listing management)
   Prototype demo data; không phải dữ liệu thật.
══════════════════════════════════════════ */
import type { ListingStatus } from "../types/status";

export interface Listing {
  id: string;
  title: string;
  room: string | null;
  area: string;
  price: string;        // display string
  priceNum: number;
  status: ListingStatus;
  views: number | null;
  contacts: number | null;
  updated: string;
  updatedRank: number;  // for "mới cập nhật" sort (higher = newer)
}

export const LISTINGS: Listing[] = [
  { id: "l1", title: "Phòng trọ ban công, đủ nội thất - Phan Văn Trị", room: "P101", area: "Gò Vấp", price: "3.200.000đ", priceNum: 3200000, status: "published", views: 120, contacts: 8, updated: "2 giờ trước", updatedRank: 100 },
  { id: "l2", title: "Kiot kinh doanh mặt tiền - Lê Đức Thọ", room: null, area: "Gò Vấp", price: "6.500.000đ", priceNum: 6500000, status: "pending", views: null, contacts: null, updated: "Hôm qua", updatedRank: 80 },
  { id: "l3", title: "Phòng trọ giá rẻ cho sinh viên", room: "P302", area: "Thủ Đức", price: "2.200.000đ", priceNum: 2200000, status: "hidden", views: 48, contacts: 3, updated: "1 tuần trước", updatedRank: 40 },
  { id: "l4", title: "Căn hộ mini full nội thất - Quận 7", room: "A02", area: "Quận 7", price: "5.000.000đ", priceNum: 5000000, status: "published", views: 95, contacts: 5, updated: "3 giờ trước", updatedRank: 95 },
  { id: "l5", title: "Phòng master rộng, có gác lửng - Bình Thạnh", room: "P203", area: "Bình Thạnh", price: "2.900.000đ", priceNum: 2900000, status: "published", views: 65, contacts: 4, updated: "Hôm qua", updatedRank: 78 },
  { id: "l6", title: "Studio nhỏ gần khu công nghệ - Thủ Đức", room: "P05", area: "Thủ Đức", price: "2.000.000đ", priceNum: 2000000, status: "expired", views: 100, contacts: 6, updated: "1 tháng trước", updatedRank: 10 },
];
