/* ══════════════════════════════════════════
   MOCK DATA — Dashboard chủ trọ (landlord overview)
   Prototype demo data; không phải dữ liệu thật.
   Thuật ngữ: Occupant (KHÔNG dùng "Tenant" — Rules §1).
   RoomStatus: available/deposited/rented/hidden (BR-002).
   ListingStatus: draft/pendingApproval/active/rejected/hidden/expired/rented (BR-001).
══════════════════════════════════════════ */
import { Wallet, Clock, DoorOpen, EyeOff } from "lucide-react";
import { C } from "../theme";
import type { RoomStatus, ListingStatus } from "../types/status";

export const PROPERTIES = ["Tất cả khu trọ", "Khu trọ Phan Văn Trị", "Căn hộ Quận 7", "Nhà trọ Thủ Đức"];

export const ATTENTION = [
  { icon: Wallet, title: "1 phòng chưa đóng tiền", desc: "Phòng P202 chưa thanh toán hóa đơn tháng này.", action: "Nhắc đóng tiền", color: "#B5503C", bg: "#FBEDE9", border: "#EAC9C0" },
  { icon: Clock, title: "1 hợp đồng sắp hết hạn", desc: "Phòng P203 còn 7 ngày hết hạn.", action: "Xem hợp đồng", color: "#C8861A", bg: "#FBF1DD", border: "#EAD8B4" },
  { icon: DoorOpen, title: "2 phòng đang trống", desc: "Có thể tạo tin đăng để tìm người ở.", action: "Tạo tin đăng", color: "#6B8E5A", bg: "#EDF2E7", border: "#CDDCBE" },
  { icon: EyeOff, title: "1 phòng đang ẩn", desc: "Phòng P201 hiện đang ẩn hiển thị.", action: "Cập nhật trạng thái", color: "#C07B4A", bg: "#FAEEE3", border: "#EAD2BC" },
];

export const KPIS = [
  { label: "Tổng khu trọ", value: 3, accent: C.primary },
  { label: "Tổng phòng", value: 22, accent: C.textPrimary },
  { label: "Phòng trống", value: 5, accent: "#6B8E5A" },
  { label: "Đang thuê", value: 16, accent: C.secondary },
  { label: "Phòng đã cọc", value: 1, accent: "#C8861A" },
  { label: "Tin hiển thị", value: 5, accent: "#6B8E5A" },
];

export const STATUS_DIST = [
  { label: "Trống", value: 5, color: "#6B8E5A" },
  { label: "Đã cọc", value: 2, color: "#C8861A" },
  { label: "Đang thuê", value: 14, color: C.primary },
  { label: "Đã ẩn", value: 1, color: "#9B8C78" },
];

export interface PreviewRoom {
  code: string;
  property: string;
  status: RoomStatus;
  occupant: string | null;
  paid: boolean | null;
  task: string | null;
  price?: string;
}
export const PREVIEW_ROOMS: PreviewRoom[] = [
  { code: "P101", property: "Phan Văn Trị", status: "available", occupant: null, paid: null, task: "Tạo tin đăng", price: "2.800.000đ" },
  { code: "P102", property: "Phan Văn Trị", status: "rented", occupant: "Nguyễn Văn An", paid: true, task: null, price: "2.800.000đ" },
  { code: "P202", property: "Lê Đức Thọ", status: "rented", occupant: "Trần Thị B", paid: false, task: "Nhắc nợ", price: "3.200.000đ" },
  { code: "P203", property: "Lê Đức Thọ", status: "rented", occupant: "Lê Minh C", paid: true, task: "Gia hạn", price: "3.000.000đ" },
];

export const RECENT_LISTINGS: { title: string; status: ListingStatus; sub: string; canDelete: boolean }[] = [
  { title: "Phòng trọ ban công, đủ nội thất - Phan Văn Trị", status: "active", sub: "Cập nhật 2 giờ trước · Quận Gò Vấp", canDelete: false },
  { title: "Kiot kinh doanh mặt tiền - Lê Đức Thọ", status: "pendingApproval", sub: "Đang chờ hệ thống phê duyệt", canDelete: true },
  { title: "Phòng trọ giá rẻ cho sinh viên", status: "hidden", sub: "Tin đã hết hạn hoặc bị ẩn", canDelete: true },
];
