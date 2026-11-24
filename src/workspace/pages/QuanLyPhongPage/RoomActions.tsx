import { useEffect, useRef, useState } from "react";
import { Eye, FileSignature, FileText, MoreVertical, Pencil, UserPlus, Zap } from "lucide-react";
import { C, font, radius, shadow } from "../../../shared/theme";
import { Button } from "../../../shared/components/common";
import type { Room } from "../../types/room";

export type RoomActionType = "invoice" | "add-occupant" | "utility" | "contract" | "edit" | "detail";

const ACTION_META: Record<RoomActionType, { label: string; icon: React.ReactNode; testId: string }> = {
  invoice: { label: "Lập hóa đơn", icon: <FileText size={15} />, testId: "room-invoice-btn" },
  "add-occupant": { label: "Thêm người ở", icon: <UserPlus size={15} />, testId: "room-add-occupant-btn" },
  utility: { label: "Ghi chỉ số điện nước", icon: <Zap size={15} />, testId: "room-menu-utility" },
  contract: { label: "In hợp đồng", icon: <FileSignature size={15} />, testId: "room-menu-contract" },
  edit: { label: "Sửa phòng", icon: <Pencil size={15} />, testId: "room-menu-edit" },
  detail: { label: "Xem chi tiết", icon: <Eye size={15} />, testId: "room-menu-detail" },
};

/**
 * MỘT việc chính theo trạng thái phòng (≤ 3 chạm):
 * - Đang thuê → Lập hóa đơn (form đã có ô ghi chỉ số điện nước — không cần nút "Điện nước" riêng).
 * - Trống / Đã cọc → Thêm người ở.
 * - Đã ẩn → không có việc chính.
 */
export function getPrimaryRoomAction(room: Room): RoomActionType | null {
  if (room.status === "rented") return "invoice";
  if (room.status === "available" || room.status === "deposited") return "add-occupant";
  return null;
}

/** Việc phụ trong menu ⋮ (không lặp lại việc chính). */
export function getMenuRoomActions(room: Room): RoomActionType[] {
  const primary = getPrimaryRoomAction(room);
  const actions: RoomActionType[] = ["utility"];
  if (room.status === "rented" && room.contract?.id) actions.push("contract");
  actions.push("edit", "detail");
  return actions.filter((action) => action !== primary);
}

const MENU_WIDTH = 220;
const MENU_ESTIMATED_HEIGHT = 230;

/**
 * Menu ⋮. Đặt `position: fixed` theo toạ độ nút để không bị khung cuộn của bảng
 * cắt mất; gần đáy màn hình thì mở lên trên. Cuộn/đổi cỡ cửa sổ thì đóng.
 */
function RoomMenu({ room, onAction, exclude }: { room: Room; onAction: (type: RoomActionType, room: Room) => void; exclude: RoomActionType[] }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const open = anchor !== null;
  const setOpen = (next: boolean) => setAnchor(next ? rootRef.current?.getBoundingClientRect() ?? null : null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const dismiss = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Thao tác khác cho phòng ${room.code}`}
        onClick={() => setOpen(!open)}
        data-testid="room-menu-btn"
        style={{ width: 40, height: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}`, borderRadius: radius.sm, background: C.white, color: C.textPrimary, cursor: "pointer" }}
      >
        <MoreVertical size={18} />
      </button>
      {anchor && (
        <div role="menu" data-testid="room-menu" style={{
          position: "fixed",
          left: Math.max(8, anchor.right - MENU_WIDTH),
          ...(anchor.bottom + MENU_ESTIMATED_HEIGHT > window.innerHeight
            ? { bottom: window.innerHeight - anchor.top + 6 }
            : { top: anchor.bottom + 6 }),
          zIndex: 3000, width: MENU_WIDTH, background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.md, boxShadow: shadow.md, padding: 6 }}>
          {getMenuRoomActions(room).filter((type) => !exclude.includes(type)).map((type) => {
            const meta = ACTION_META[type];
            return (
              <button
                key={type}
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); onAction(type, room); }}
                data-testid={meta.testId}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", border: "none", borderRadius: radius.sm, background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13.5, color: C.textPrimary, textAlign: "left" }}
              >
                <span style={{ color: C.primary, display: "inline-flex" }}>{meta.icon}</span>
                {meta.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Nút việc chính + menu ⋮ — dùng chung cho thẻ phòng và dạng bảng. */
export function RoomActions({ room, onAction, size = "sm", exclude = [] }: {
  room: Room;
  onAction: (type: RoomActionType, room: Room) => void;
  size?: "sm" | "md";
  /** Ẩn bớt mục menu, ví dụ "detail" khi đang ở trong chi tiết phòng. */
  exclude?: RoomActionType[];
}) {
  const primary = getPrimaryRoomAction(room);
  return (
    <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "center" }}>
      {primary ? (
        <Button
          variant="primary"
          size={size}
          requiresWrite
          icon={ACTION_META[primary].icon}
          onClick={() => onAction(primary, room)}
          data-testid={ACTION_META[primary].testId}
          style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }}
        >
          {ACTION_META[primary].label}
        </Button>
      ) : (
        <span style={{ flex: 1, fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>Phòng đang ẩn</span>
      )}
      <RoomMenu room={room} onAction={onAction} exclude={exclude} />
    </div>
  );
}
