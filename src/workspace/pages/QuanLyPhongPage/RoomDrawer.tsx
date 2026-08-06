import { useState } from "react";
import { X, Users, FileText, Zap, Home } from "lucide-react";
import { C, font } from "../../../shared/theme";
import type { Room } from "../../types/room";
import { RoomDetailTabs } from "../../components/RoomDetailTabs";

/**
 * Drawer chỉ HIỂN THỊ chi tiết phòng — không có nút ghi nào.
 * Trước đây nó nhận `isReadOnly` nhưng không dùng tới ở bất kỳ đâu; một prop gác
 * mà không gác gì thì tệ hơn là không có, vì lần audit sau sẽ tưởng chỗ này đã an toàn.
 */
interface RoomDrawerProps {
  room: Room | null;
  onClose: () => void;
  onOpenActionModal?: (type: any, room: Room) => void;
}

export function RoomDrawer({ room, onClose }: RoomDrawerProps) {
  if (!room) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 400,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Slideover Content Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: 480,
          background: C.white,
          zIndex: 401,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Drawer Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: "0 0 2px" }}>
              Phòng {room.code}
            </h3>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>
              {room.floor} • {room.area} • {room.price}
            </p>
          </div>

          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} color={C.textSecondary} />
          </button>
        </div>

        {/* Drawer Body (Tabs) */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          <RoomDetailTabs room={room} />
        </div>
      </div>
    </>
  );
}
