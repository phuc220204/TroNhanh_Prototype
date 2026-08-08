import { useState, useEffect } from "react";
import { C, font, radius } from "../../shared/theme";
import { ModalShell } from "../../shared/components/common/ModalShell";
import { Button } from "../../shared/components/common";
import { Field } from "../../shared/components/common/FormField";
import { toUserMessage } from "../../shared/services/supabase-error";
import { useCanWrite, useWriteBlockReason } from "../../shared/contexts/SubscriptionContext";
import { getRoomById, updateRoom, type RoomStatusDb } from "../services/room-service";

/** BR-002 — đúng 4 trạng thái. Không có "Repairing", không có "Inactive". */
const STATUS_OPTIONS: Array<{ value: RoomStatusDb; label: string }> = [
  { value: "Available", label: "Trống" },
  { value: "Deposited", label: "Đã cọc" },
  { value: "Rented", label: "Đang thuê" },
  { value: "Hidden", label: "Đang ẩn / bảo trì" },
];

/** Đơn giá của KHU — chỉ để hiển thị "bỏ trống thì phòng dùng số này". */
interface PropertyPrices {
  electricity?: number;
  water?: number;
  service?: number;
}

interface EditRoomModalProps {
  roomId: string;
  propertyPrices?: PropertyPrices;
  onClose: () => void;
  onUpdated: () => void;
}

/** "" ⇒ `null` (theo giá khu) · "0" ⇒ `0` (miễn phí). HAI Ý KHÁC NHAU. */
function parseOptionalPrice(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return null;
  const num = Number(digits);
  return Number.isFinite(num) ? num : null;
}

const priceToInput = (v: number | null): string => (v === null ? "" : String(v));

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
export function EditRoomModal({ roomId, propertyPrices, onClose, onUpdated }: EditRoomModalProps) {
  const canWrite = useCanWrite();
  const blockReason = useWriteBlockReason();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [code, setCode] = useState("");
  const [floor, setFloor] = useState("");
  const [area, setArea] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<RoomStatusDb>("Available");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [customPrice, setCustomPrice] = useState(false);
  const [elecPrice, setElecPrice] = useState("");
  const [waterPrice, setWaterPrice] = useState("");
  const [serviceFee, setServiceFee] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const room = await getRoomById(roomId);
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
      setElecPrice(priceToInput(room.electricityPrice));
      setWaterPrice(priceToInput(room.waterPrice));
      setServiceFee(priceToInput(room.serviceFee));
      // Bật sẵn ô "giá riêng" khi phòng ĐANG có ít nhất một giá riêng — nếu không,
      // mở form ra sẽ thấy phần giá bị gập lại và tưởng phòng đang theo giá khu.
      setCustomPrice(
        room.electricityPrice !== null || room.waterPrice !== null || room.serviceFee !== null,
      );
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [roomId]);

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
        // Tắt ô "giá riêng" ⇒ gửi `null` cả ba ⇒ XÓA giá riêng, phòng quay về giá
        // khu. Đây là cách duy nhất để bỏ giá riêng, nên không được bỏ qua nhánh này.
        electricityPrice: customPrice ? parseOptionalPrice(elecPrice) : null,
        waterPrice: customPrice ? parseOptionalPrice(waterPrice) : null,
        serviceFee: customPrice ? parseOptionalPrice(serviceFee) : null,
      });
      onUpdated();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inheritedHint = (value: number | undefined, unit: string): string =>
    value === undefined ? "Để trống = theo khu" : `Để trống = theo khu (${value.toLocaleString("vi-VN")}${unit})`;

  const bannerStyle = {
    background: C.white,
    border: `1px solid ${C.error}`,
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
            disabled={loading || notFound}
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
        <div data-testid="edit-room-readonly-banner" style={bannerStyle}>⚠️ {blockReason}</div>
      )}
      {errorMsg && (
        <div data-testid="edit-room-form-error" style={bannerStyle}>{errorMsg}</div>
      )}

      {loading ? (
        <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, textAlign: "center", padding: "24px 0", margin: 0 }}>
          Đang tải thông tin phòng...
        </p>
      ) : notFound ? (
        <p data-testid="edit-room-not-found" style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, textAlign: "center", padding: "24px 0", margin: 0 }}>
          Không tìm thấy phòng này. Có thể phòng đã bị xóa ở một tab khác.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Mã phòng *" value={code} onChange={setCode} placeholder="VD: P101" />
          <Field label="Số tầng" value={floor} onChange={setFloor} placeholder="VD: 1" />
          <Field label="Diện tích (m²) *" value={area} onChange={setArea} placeholder="VD: 25" />
          <Field label="Giá thuê (đ/tháng) *" value={price} onChange={setPrice} placeholder="VD: 3200000" />

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

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 9, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={customPrice}
                onChange={(e) => setCustomPrice(e.target.checked)}
                data-testid="edit-room-custom-price-toggle"
                style={{ marginTop: 3, width: 16, height: 16, accentColor: C.primary, cursor: "pointer" }}
              />
              <span>
                <span style={{ display: "block", fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>
                  Phòng này có đơn giá riêng
                </span>
                <span style={{ display: "block", fontFamily: font, fontSize: 12, color: C.textSecondary, lineHeight: 1.45 }}>
                  Tắt ô này để bỏ giá riêng và cho phòng dùng lại đơn giá của khu.
                  Hóa đơn các kỳ đã lập giữ nguyên giá cũ — chỉ số điện nước đã
                  lưu sẵn đơn giá tại thời điểm ghi.
                </span>
              </span>
            </label>

            {customPrice && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                <Field label="Đơn giá điện (VND/kWh)" value={elecPrice} onChange={setElecPrice} placeholder={inheritedHint(propertyPrices?.electricity, "đ/kWh")} />
                <Field label="Đơn giá nước" value={waterPrice} onChange={setWaterPrice} placeholder={inheritedHint(propertyPrices?.water, "đ")} />
                <Field label="Phí dịch vụ (VND/tháng)" value={serviceFee} onChange={setServiceFee} placeholder={inheritedHint(propertyPrices?.service, "đ/tháng")} />
              </div>
            )}
          </div>

          <Field label="Ghi chú nội bộ" value={notes} onChange={setNotes} placeholder="Ghi chú về phòng này" textarea rows={3} />
        </div>
      )}
    </ModalShell>
  );
}
