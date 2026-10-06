import { FileText, UserPlus, Zap } from "lucide-react";
import { Button } from "../../../shared/components/common";
import type { Room } from "../../types/room";

export type RoomActionType = "utility" | "invoice" | "add-occupant";

/**
 * Việc tiếp theo hợp lý theo trạng thái phòng (≤ 3 chạm):
 * - Trống / Đã cọc → Thêm người ở (+ ghi chỉ số chốt trước khi vào ở)
 * - Đang thuê → Ghi điện nước · Tạo hóa đơn
 * - Đã ẩn → chỉ ghi điện nước
 */
export function getRoomActions(status: Room["status"]): RoomActionType[] {
  if (status === "available" || status === "deposited") return ["add-occupant", "utility"];
  if (status === "rented") return ["utility", "invoice"];
  return ["utility"];
}

const ACTION_META: Record<RoomActionType, { label: string; icon: React.ReactNode; testId: string }> = {
  "add-occupant": { label: "Thêm người ở", icon: <UserPlus size={13} />, testId: "room-add-occupant-btn" },
  utility: { label: "Điện nước", icon: <Zap size={13} />, testId: "room-utility-btn" },
  invoice: { label: "Hóa đơn", icon: <FileText size={13} />, testId: "room-invoice-btn" },
};

export function RoomActions({ room, onAction, size = "sm" }: {
  room: Room;
  onAction: (type: RoomActionType, room: Room) => void;
  size?: "sm" | "md";
}) {
  return (
    <>
      {getRoomActions(room.status).map((type, index) => {
        const meta = ACTION_META[type];
        return (
          <Button
            key={type}
            variant={index === 0 ? "primary" : "outline"}
            size={size}
            requiresWrite
            icon={meta.icon}
            onClick={() => onAction(type, room)}
            data-testid={meta.testId}
            style={{ flex: 1, justifyContent: "center" }}
          >
            {meta.label}
          </Button>
        );
      })}
    </>
  );
}
