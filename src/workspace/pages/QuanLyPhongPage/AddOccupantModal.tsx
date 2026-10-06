import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { Button, ModalShell } from "../../../shared/components/common";
import { toUserMessage } from "../../../shared/services/supabase-error";
import { addMonthsToISODate, toLocalISODate } from "../../../shared/utils/format";
import { ROOM_STATUS_META } from "../../../shared/utils/statusMaps";
import type { Property } from "../../types/room";
import { createOccupancyWithContract, linkRenterAccount } from "../../services/occupancy-service";

interface AddOccupantModalProps {
  property: Property | null;
  mobile?: boolean;
  /** Mở sẵn cho một phòng (vd. từ thẻ phòng "Thêm người ở"). */
  initialRoomId?: string;
  onClose: () => void;
  /** Gọi sau khi tạo xong — `message` để hiện thông báo thành công. */
  onCreated: (message: string) => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, color: C.textPrimary,
  border: `1px solid ${C.border}`, borderRadius: radius.sm, outline: "none", boxSizing: "border-box", background: C.white,
};
const labelStyle: React.CSSProperties = { display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 };
const Required = () => <span style={{ color: C.error }}> *</span>;

const roomPrice = (price: string) => Number(price.replace(/[^\d]/g, "")) || 0;

/**
 * "Thêm người ở & tạo hợp đồng" — một RPC atomic (occupancy + contract + phòng → Đang thuê).
 * Chỉ liệt kê phòng còn nhận người (Trống / Đã cọc): phòng Đang thuê đã có hợp đồng (BR-006).
 */
export function AddOccupantModal({ property, mobile, initialRoomId, onClose, onCreated }: AddOccupantModalProps) {
  const eligibleRooms = (property?.rooms ?? []).filter((r) => r.status === "available" || r.status === "deposited");
  const firstRoom = eligibleRooms.find((r) => r.id === initialRoomId) ?? eligibleRooms[0];

  const [selectedRoomId, setSelectedRoomId] = useState(firstRoom?.id ?? "");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [occupantCount, setOccupantCount] = useState("1");
  const [startDate, setStartDate] = useState(() => toLocalISODate());
  const [endDate, setEndDate] = useState(() => addMonthsToISODate(toLocalISODate(), 12));
  const [rentPrice, setRentPrice] = useState(firstRoom ? String(roomPrice(firstRoom.price) || "") : "");
  const [deposit, setDeposit] = useState(firstRoom ? String(roomPrice(firstRoom.price) || "") : "");
  const [renterEmail, setRenterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = eligibleRooms.find((r) => r.id === roomId);
    if (room) {
      const price = roomPrice(room.price);
      setRentPrice(price ? String(price) : "");
      setDeposit(price ? String(price) : "");
    }
  };

  const validationError =
    !selectedRoomId ? "Chọn phòng cho người ở."
    : !fullName.trim() ? "Nhập họ tên người ở."
    : !rentPrice || Number(rentPrice) <= 0 ? "Nhập giá thuê."
    : endDate <= startDate ? "Ngày hết hạn phải sau ngày bắt đầu."
    : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg("");
      const result = await createOccupancyWithContract(
        selectedRoomId,
        {
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim() || undefined,
          occupant_count: Number(occupantCount) || 1,
          start_date: startDate,
          end_date: endDate,
        },
        { start_date: startDate, end_date: endDate, rent_price: Number(rentPrice) || 0, deposit: Number(deposit) || 0 },
      );

      let message = "Đã thêm người ở và tạo hợp đồng.";
      if (renterEmail.trim()) {
        try {
          await linkRenterAccount(result.occupancyId, renterEmail.trim());
          message = `Đã thêm người ở và gửi yêu cầu liên kết tới ${renterEmail.trim()}. Nếu người ở chưa có tài khoản, yêu cầu sẽ chờ tới khi họ đăng ký và xác minh email này.`;
        } catch (linkErr: unknown) {
          message = `Đã thêm người ở nhưng chưa liên kết được tài khoản: ${toUserMessage(linkErr)}`;
        }
      }
      onCreated(message);
    } catch (err: unknown) {
      // BR-006: ROOM_HAS_ACTIVE_CONTRACT và lỗi RPC khác.
      setErrorMsg(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const twoCols = mobile ? "1fr" : "1fr 1fr";

  return (
    <ModalShell
      title="Thêm người ở & tạo hợp đồng"
      size="lg"
      onClose={() => { if (!submitting) onClose(); }}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button
            type="submit"
            variant="primary"
            requiresWrite
            loading={submitting}
            disabled={eligibleRooms.length === 0}
            data-testid="occupancy-submit-btn"
            onClick={(e) => void handleSubmit(e as unknown as React.FormEvent)}
          >
            Lưu người ở &amp; hợp đồng
          </Button>
        </>
      }
    >
      {eligibleRooms.length === 0 ? (
        <p data-testid="add-occupant-no-room" style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>
          Khu này chưa có phòng trống để nhận người ở. Thêm phòng mới, hoặc kết thúc hợp đồng cũ trước.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: font }}>
          {errorMsg && (
            <div role="alert" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error, padding: "10px 14px", borderRadius: radius.sm, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} /> {errorMsg}
            </div>
          )}

          <div>
            <label htmlFor="occupant-room" style={labelStyle}>Phòng<Required /></label>
            <select id="occupant-room" value={selectedRoomId} onChange={(e) => handleRoomChange(e.target.value)} style={inputStyle}>
              {eligibleRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Phòng {r.code} · {r.price} · {ROOM_STATUS_META[r.status]?.label ?? "—"}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: twoCols, gap: 12 }}>
            <div>
              <label htmlFor="occupant-name" style={labelStyle}>Họ và tên người ở<Required /></label>
              <input id="occupant-name" required data-testid="occupant-name-input" placeholder="VD: Nguyễn Văn A" value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label htmlFor="occupant-phone" style={labelStyle}>Số điện thoại</label>
              <input id="occupant-phone" type="tel" inputMode="tel" placeholder="VD: 0901234567" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label htmlFor="occupant-start" style={labelStyle}>Ngày bắt đầu<Required /></label>
              <input id="occupant-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ ...inputStyle, padding: "10px 8px", fontSize: 13 }} />
            </div>
            <div>
              <label htmlFor="occupant-end" style={labelStyle}>Hết hạn HĐ<Required /></label>
              <input id="occupant-end" type="date" required min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ ...inputStyle, padding: "10px 8px", fontSize: 13 }} />
            </div>
            <div>
              <label htmlFor="occupant-count" style={labelStyle}>Số người ở</label>
              <input id="occupant-count" type="number" min="1" inputMode="numeric" value={occupantCount} onChange={(e) => setOccupantCount(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: twoCols, gap: 12 }}>
            <div>
              <label htmlFor="occupant-rent" style={labelStyle}>Giá thuê (đ/tháng)<Required /></label>
              <input id="occupant-rent" type="number" min="0" inputMode="numeric" required data-testid="contract-rent-input" placeholder="VD: 3500000" value={rentPrice} onChange={(e) => setRentPrice(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label htmlFor="occupant-deposit" style={labelStyle}>Tiền cọc (đ)</label>
              <input id="occupant-deposit" type="number" min="0" inputMode="numeric" placeholder="VD: 3500000" value={deposit} onChange={(e) => setDeposit(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div>
            <label htmlFor="occupant-email" style={labelStyle}>Email tài khoản Trọ Nhanh của người ở (tùy chọn)</label>
            <input id="occupant-email" type="email" placeholder="VD: ten@email.com" value={renterEmail} onChange={(e) => setRenterEmail(e.target.value)} style={inputStyle} />
            <p style={{ fontSize: 11.5, color: C.textSecondary, margin: "4px 0 0", lineHeight: 1.5 }}>
              Người ở sẽ nhận yêu cầu liên kết và cần tự xác nhận trong trang cá nhân để xem hóa đơn của mình.
            </p>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
