import { useState, useEffect } from "react";
import { C, font, radius } from "../../shared/theme";
import { ModalShell } from "../../shared/components/common/ModalShell";
import { Button, Skeleton } from "../../shared/components/common";
import { Field } from "../../shared/components/common/FormField";
import { toUserMessage } from "../../shared/services/supabase-error";
import { useCanWrite, useWriteBlockReason } from "../../shared/contexts/SubscriptionContext";
import { getRoomById, updateRoom, type RoomStatusDb } from "../services/room-service";
import { RoomServicesSection } from "./RoomServicesSection";

/** BR-002 — đúng 4 trạng thái. Không có "Repairing", không có "Inactive". */
const STATUS_OPTIONS: Array<{ value: RoomStatusDb; label: string }> = [
  { value: "Available", label: "Trống" },
  { value: "Deposited", label: "Đã cọc" },
  { value: "Rented", label: "Đang thuê" },
  { value: "Hidden", label: "Đã ẩn" },
];

interface EditRoomModalProps {
  roomId: string;
  onClose: () => void;
  onUpdated: () => void;
}

/**
 * Sửa một phòng đã tạo.
 *
 * VÌ SAO CẦN MÀN NÀY: `AddRoomModal` đặt được đơn giá riêng của phòng, nhưng chỉ
 * lúc TẠO. Nghiệp vụ đằng sau đơn giá theo phòng lại chính là việc đổi giá theo
 * thời điểm ký hợp đồng ("3.500đ với hợp đồng cũ, 3.700đ với phòng ký mới") —
 * tức là nó vô dụng nếu không sửa được. Trước màn này, cách duy nhất để đổi giá
 * một phòng là xóa rồi tạo lại, và như vậy mất cả chỉ số điện nước lẫn hóa đơn.
 *
 * Đọc giá trị thô qua `getRoomById()` chứ không nhận `Room` từ danh sách: `Room`
 * đã format để hiển thị (`"3.200.000đ"`), parse ngược là cách chắc chắn có ngày
 * sai.
 */
export function EditRoomModal({ roomId, onClose, onUpdated }: EditRoomModalProps) {
  const canWrite = useCanWrite();
  const blockReason = useWriteBlockReason();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // Lỗi tải (mạng, quyền…) KHÁC "không tìm thấy": phòng vẫn còn, chỉ là chưa đọc
  // được — phải cho thử lại thay vì báo phòng đã bị xóa.
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [code, setCode] = useState("");
  const [floor, setFloor] = useState("");
  const [area, setArea] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<RoomStatusDb>("Available");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [propertyId, setPropertyId] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError("");
      setNotFound(false);
      let room: Awaited<ReturnType<typeof getRoomById>>;
      try {
        room = await getRoomById(roomId);
      } catch (err: unknown) {
        if (cancelled) return;
        setLoadError(toUserMessage(err));
        setLoading(false);
        return;
      }
      if (cancelled) return;

      if (!room) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setCode(room.roomCode);
      setFloor(room.floor === null ? "" : String(room.floor));
      setArea(String(room.area));
      setPrice(String(room.price));
      setStatus(room.status);
      setNotes(room.description);
      setPropertyId(room.propertyId);
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [roomId, reloadToken]);

  const handleSubmit = async () => {
    if (!canWrite) return;
    setErrorMsg("");

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
      await updateRoom({
        roomId,
        roomCode: code,
        area: areaNum,
        price: priceNum,
        floor: Number(floor) || 1,
        status,
        description: notes,
      });
      onUpdated();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const bannerStyle = {
    background: C.errorBg,
    border: `1px solid ${C.errorBorder}`,
    color: C.error,
    padding: "10px 14px",
    borderRadius: radius.sm,
    fontFamily: font,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 14,
  } as const;

  return (
    <ModalShell
      title="Sửa thông tin phòng"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button
            variant="primary"
            requiresWrite
            disabled={loading || notFound || loadError !== ""}
            loading={submitting}
            onClick={handleSubmit}
            data-testid="edit-room-save-btn"
          >
            Lưu thay đổi
          </Button>
        </>
      }
    >
      {!canWrite && (
        <div data-testid="edit-room-readonly-banner" style={bannerStyle}>{blockReason}</div>
      )}
      {errorMsg && (
        <div data-testid="edit-room-form-error" style={bannerStyle}>{errorMsg}</div>
      )}

      {loading ? (
        <Skeleton variant="row" count={4} label="Đang tải thông tin phòng" style={{ padding: "8px 0" }} />
      ) : loadError ? (
        <div data-testid="edit-room-load-error" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0", textAlign: "center" }}>
          <p style={{ fontFamily: font, fontSize: 14, color: C.error, margin: 0, lineHeight: 1.5 }}>
            Không tải được thông tin phòng. {loadError}
          </p>
          <Button variant="outline" size="sm" onClick={() => setReloadToken((n) => n + 1)} data-testid="edit-room-retry-btn">
            Thử lại
          </Button>
        </div>
      ) : notFound ? (
        <p data-testid="edit-room-not-found" style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, textAlign: "center", padding: "24px 0", margin: 0 }}>
          Không tìm thấy phòng này. Có thể phòng đã bị xóa ở một tab khác.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Mã phòng *" data-testid="edit-room-code" value={code} onChange={setCode} placeholder="VD: P101" />
          <Field label="Số tầng" value={floor} onChange={setFloor} placeholder="VD: 1" />
          <Field label="Diện tích (m²) *" value={area} onChange={setArea} placeholder="VD: 25" />
          <Field label="Giá thuê (đ/tháng) *" data-testid="edit-room-price" value={price} onChange={setPrice} placeholder="VD: 3200000" />

          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Trạng thái</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as RoomStatusDb)}
              data-testid="edit-room-status"
              style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {status === "Rented" && (
              <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, lineHeight: 1.45 }}>
                Chuyển sang <strong>Đang thuê</strong> sẽ đồng thời chuyển tin đăng
                gắn với phòng này sang “Đã cho thuê”.
              </span>
            )}
          </label>

          {propertyId && (
            <RoomServicesSection roomId={roomId} propertyId={propertyId} onSaved={onUpdated} />
          )}

          <Field label="Ghi chú nội bộ" value={notes} onChange={setNotes} placeholder="Ghi chú về phòng này" textarea rows={3} />
        </div>
      )}
    </ModalShell>
  );
}
