/* ══════════════════════════════════════════
   MOCK DATA — Dashboard chủ trọ (landlord overview)
   Prototype demo data; không phải dữ liệu thật.
══════════════════════════════════════════ */
import { Wallet, Clock, DoorOpen, Wrench } from "lucide-react";
import { C } from "../theme";
import type { RoomStatus, ListingStatus } from "../types/status";

export const PROPERTIES = ["Tất cả khu trọ", "Khu trọ Phan Văn Trị", "Căn hộ Quận 7", "Nhà trọ Thủ Đức"];

export const ATTENTION = [
  { icon: Wallet, title: "1 phòng chưa thanh toán", desc: "Phòng P202 chưa thanh toán tháng này.", action: "Nhắc thanh toán", color: "#B5503C", bg: "#FBEDE9", border: "#EAC9C0" },
  { icon: Clock, title: "1 hợp đồng sắp hết hạn", desc: "Phòng P203 còn 7 ngày hết hạn.", action: "Xem hợp đồng", color: "#C8861A", bg: "#FBF1DD", border: "#EAD8B4" },
  { icon: DoorOpen, title: "2 phòng đang trống", desc: "Có thể tạo tin đăng để tìm người thuê.", action: "Tạo tin đăng", color: "#6B8E5A", bg: "#EDF2E7", border: "#CDDCBE" },
  { icon: Wrench, title: "1 phòng đang sửa", desc: "Phòng P201 đang sửa WC.", action: "Cập nhật trạng thái", color: "#C07B4A", bg: "#FAEEE3", border: "#EAD2BC" },
];

export const KPIS = [
  { label: "Tổng khu trọ", value: 3, accent: C.primary },
  { label: "Tổng phòng", value: 22, accent: C.textPrimary },
  { label: "Phòng trống", value: 5, accent: "#6B8E5A" },
  { label: "Đang thuê", value: 16, accent: C.secondary },
  { label: "Đang sửa", value: 1, accent: "#C07B4A" },
  { label: "Tin hiển thị", value: 5, accent: "#C8861A" },
];

export const STATUS_DIST = [
  { label: "Trống", value: 5, color: "#6B8E5A" },
  { label: "Đang thuê", value: 14, color: C.primary },
  { label: "Đang sửa", value: 1, color: "#C07B4A" },
  { label: "Chưa thanh toán", value: 1, color: "#B5503C" },
  { label: "Sắp hết hạn", value: 1, color: "#C8861A" },
];

export interface PreviewRoom {
  code: string; property: string; status: RoomStatus;
  tenant: string | null; paid: boolean | null; task: string | null;
}
export const PREVIEW_ROOMS: PreviewRoom[] = [
  { code: "P101", property: "Phan Văn Trị", status: "available", tenant: null, paid: null, task: "Tạo tin đăng" },
  { code: "P102", property: "Phan Văn Trị", status: "rented", tenant: "Nguyễn Văn An", paid: true, task: null },
  { code: "P202", property: "Lê Đức Thọ", status: "rented", tenant: "Trần Thị B", paid: false, task: "Nhắc nợ" },
  { code: "P203", property: "Lê Đức Thọ", status: "expiring", tenant: "Lê Minh C", paid: true, task: "Gia hạn" },
];

export const RECENT_LISTINGS: { title: string; status: ListingStatus; sub: string; canDelete: boolean }[] = [
  { title: "Phòng trọ ban công, đủ nội thất - Phan Văn Trị", status: "published", sub: "Cập nhật 2 giờ trước · Quận Gò Vấp", canDelete: false },
  { title: "Kiot kinh doanh mặt tiền - Lê Đức Thọ", status: "pending", sub: "Đang chờ hệ thống phê duyệt", canDelete: true },
  { title: "Phòng trọ giá rẻ cho sinh viên", status: "hidden", sub: "Tin đã hết hạn hoặc bị ẩn", canDelete: true },
];
