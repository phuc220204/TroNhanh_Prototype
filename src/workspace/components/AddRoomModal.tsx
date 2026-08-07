import { useState, useEffect } from "react";
import { C, font, radius } from "../../shared/theme";
import { ModalShell } from "../../shared/components/common/ModalShell";
import { Button } from "../../shared/components/common";
import { Field } from "../../shared/components/common/FormField";
import { toUserMessage } from "../../shared/services/supabase-error";
import { useCanWrite, useWriteBlockReason } from "../../shared/contexts/SubscriptionContext";
import { createRoom, type RoomStatusDb } from "../services/room-service";

interface PropertyOption {
  id: string;
  name: string;
}

interface AddRoomModalProps {
  properties: PropertyOption[];
  /** Khu được chọn sẵn — dùng khi mở từ màn quản lý của đúng khu đó. */
  defaultPropertyId?: string;
  onClose: () => void;
  onCreated: () => void;
}

/** BR-002 — đúng 4 trạng thái. Không có "Repairing", không có "Inactive". */
const STATUS_OPTIONS: Array<{ value: RoomStatusDb; label: string }> = [
  { value: "Available", label: "Trống" },
  { value: "Deposited", label: "Đã cọc" },
  { value: "Rented", label: "Đang thuê" },
  { value: "Hidden", label: "Đang ẩn / bảo trì" },
];

/**
 * Thêm phòng mới vào một khu.
 *
 * Đặt ở `workspace/components/` vì cả `ChuTroDashboardPage` và `QuanLyPhongPage`
 * đều cần — §8.1: copy-paste lần thứ hai thì chuyển ra chỗ dùng chung.
 *
 * Ghi qua `createRoom()` chứ không `supabase.from("rooms").insert` tại chỗ: bản
 * cũ ở dashboard truyền `owner_id: user?.id` từ client, mà `owner_id` là giá trị
 * danh tính (§6.1). Giờ cột có `default auth.uid()` nên service không gửi nó nữa.
 */
export function AddRoomModal({ properties, defaultPropertyId, onClose, onCreated }: AddRoomModalProps) {
  const canWrite = useCanWrite();
  const blockReason = useWriteBlockReason();

  const [propId, setPropId] = useState(defaultPropertyId || properties[0]?.id || "");
  const [code, setCode] = useState("");
  const [floor, setFloor] = useState("");
  const [area, setArea] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<RoomStatusDb>("Available");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!propId && properties.length > 0) setPropId(properties[0]!.id);
  }, [properties, propId]);

  const handleSubmit = async () => {
    if (!canWrite) return;
    setErrorMsg("");

    if (!propId) {
      setErrorMsg("Vui lòng chọn khu trọ.");
      return;
    }
    const areaNum = Number(area.replace(/\D/g, ""));
    const priceNum = Number(price.replace(/\D/g, ""));
    if (!code.trim()) {
      setErrorMsg("Vui lòng nhập mã phòng.");
      return;
    }
    if (!Number.isFinite(areaNum) || areaNum <= 0) {
      setErrorMsg("Diện tích phải là số lớn hơn 0.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setErrorMsg("Giá thuê phải là số lớn hơn 0.");
      return;
    }

    try {
      setSubmitting(true);
      await createRoom({
        propertyId: propId,
        roomCode: code,
        area: areaNum,
        price: priceNum,
        floor: Number(floor) || 1,
        status,
        description: notes,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      // 23505 = trùng `unique(property_id, room_code)`; toUserMessage dịch sang
      // "Dữ liệu đã tồn tại." — đủ hiểu trong ngữ cảnh mã phòng.
      setErrorMsg(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title="Thêm phòng mới"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button
            variant="primary"
            requiresWrite
            loading={submitting}
            onClick={handleSubmit}
            data-testid="add-room-save-btn"
          >
            Lưu phòng
          </Button>
        </>
      }
    >
      {!canWrite && (
        <div data-testid="add-room-readonly-banner" style={{ background: C.white, border: `1px solid ${C.error}`, color: C.error, padding: "10px 14px", borderRadius: radius.sm, fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
          ⚠️ {blockReason}
        </div>
      )}
      {errorMsg && (
        <div data-testid="add-room-form-error" style={{ background: C.white, border: `1px solid ${C.error}`, color: C.error, padding: "10px 14px", borderRadius: radius.sm, fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Khu trọ *</span>
          <select
            value={propId}
            onChange={(e) => setPropId(e.target.value)}
            data-testid="add-room-property"
            style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}
          >
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <Field label="Mã phòng *" value={code} onChange={setCode} placeholder="VD: P101" />
        <Field label="Số tầng" value={floor} onChange={setFloor} placeholder="VD: 1" />
        <Field label="Diện tích (m²) *" value={area} onChange={setArea} placeholder="VD: 25" />
        <Field label="Giá thuê (đ/tháng) *" value={price} onChange={setPrice} placeholder="VD: 3.200.000" />

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Trạng thái ban đầu</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RoomStatusDb)}
            style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        <Field label="Ghi chú nội bộ" value={notes} onChange={setNotes} placeholder="Ghi chú về phòng này" textarea rows={3} />
      </div>
    </ModalShell>
  );
}
