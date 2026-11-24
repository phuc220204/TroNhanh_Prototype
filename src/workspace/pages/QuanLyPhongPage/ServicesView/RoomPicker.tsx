import { useMemo } from "react";
import { C, font, radius } from "../../../../shared/theme";
import type { Room } from "../../../types/room";

/** Chọn phòng theo tầng, có "chọn tất cả" và "chọn cả tầng". */
export function RoomPicker({
  rooms, selectedIds, onChange,
}: {
  rooms: Room[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const floors = useMemo(() => {
    const groups = new Map<string, Room[]>();
    for (const room of rooms) {
      // `room.floor` đã định dạng sẵn ("Tầng 1" / "Chưa khai báo").
      const key = room.floor || "Chưa khai báo";
      groups.set(key, [...(groups.get(key) ?? []), room]);
    }
    // "Tầng 10" phải sau "Tầng 2": so sánh theo số, không theo chữ.
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "vi", { numeric: true }));
  }, [rooms]);

  const selected = new Set(selectedIds);
  const allSelected = rooms.length > 0 && rooms.every((r) => selected.has(r.id));

  const toggleMany = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    onChange([...next]);
  };

  if (rooms.length === 0) {
    return <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Khu chưa có phòng nào.</p>;
  }

  return (
    <div data-testid="service-room-picker" style={{ border: `1px solid ${C.border}`, borderRadius: radius.sm, overflow: "hidden" }}>
      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: C.bg, fontFamily: font, fontSize: 12.5, color: C.textSecondary, cursor: "pointer" }}>
        <span>Đã chọn {selectedIds.length}/{rooms.length} phòng</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: C.primary }}>
          <input type="checkbox" checked={allSelected} onChange={(e) => toggleMany(rooms.map((r) => r.id), e.target.checked)} data-testid="service-rooms-all" />
          Chọn tất cả
        </span>
      </label>
      {floors.map(([floor, floorRooms]) => {
        const floorAll = floorRooms.every((r) => selected.has(r.id));
        return (
          <div key={floor} style={{ borderTop: `1px solid ${C.border}`, padding: "8px 12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, cursor: "pointer", marginBottom: 6 }}>
              <input type="checkbox" checked={floorAll} onChange={(e) => toggleMany(floorRooms.map((r) => r.id), e.target.checked)} />
              {floor}
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {floorRooms.map((room) => {
                const on = selected.has(room.id);
                return (
                  <label key={room.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, border: `1px solid ${on ? C.primary : C.border}`, background: on ? C.cream : C.white, fontFamily: font, fontSize: 12.5, color: C.textPrimary, cursor: "pointer" }}>
                    <input type="checkbox" checked={on} onChange={(e) => toggleMany([room.id], e.target.checked)} data-testid={`service-room-${room.code}`} />
                    {room.code}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
