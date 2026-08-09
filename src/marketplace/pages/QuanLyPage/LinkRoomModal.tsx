import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link2, Unlink } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { ModalShell } from "../../../shared/components/common/ModalShell";
import { Button } from "../../../shared/components/common";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { qk } from "../../../shared/query/keys";
import { getMyVacantRoomSummaries } from "../../../shared/services/vacancy-service";

interface LinkRoomModalProps {
  listingTitle: string;
  /** Phòng đang gắn, nếu có. */
  currentRoomId: string | null;
  submitting?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  /** `null` = bỏ gán phòng. */
  onSubmit: (roomId: string | null) => void;
}

/**
 * Gán phòng trong khu trọ cho một tin đăng.
 *
 * ⚠️ Nguồn danh sách phòng là **`shared/services/vacancy-service.ts`** —
 * `getMyVacantRoomSummaries()`. Đây là **điểm nối duy nhất được phép** giữa
 * marketplace và workspace (CLAUDE.md §2.2). Tuyệt đối không query `rooms` trực
 * tiếp từ marketplace: nó trả cả dữ liệu vận hành (đơn giá, người ở, hóa đơn) mà
 * tầng tin đăng không có việc gì phải biết.
 *
 * `Room` và `RentalListing` vẫn là hai entity ĐỘC LẬP (§2.2). Gán ở đây chỉ tạo
 * liên kết để BR-027 chạy được: phòng chuyển `Rented` thì tin đăng gắn với nó
 * chuyển `Rented` theo, khỏi phải nhớ đi ẩn tin bằng tay.
 */
export function LinkRoomModal({
  listingTitle, currentRoomId, submitting, errorMessage, onCancel, onSubmit,
}: LinkRoomModalProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(currentRoomId);

  // `getMyVacantRoomSummaries()` không nhận userId: nó dựa vào RLS của `rooms`
  // để chỉ trả phòng của chính người gọi. `user?.id` chỉ dùng làm query key.
  const { data: rooms = [], isPending } = useQuery({
    queryKey: qk.rooms.vacant(user?.id),
    queryFn: () => getMyVacantRoomSummaries(),
    enabled: !!user?.id,
  });

  return (
    <ModalShell
      title="Gắn phòng cho tin đăng"
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>Hủy</Button>
          {currentRoomId && (
            <Button
              variant="outline"
              requiresWrite
              disabled={submitting}
              icon={<Unlink size={15} />}
              onClick={() => onSubmit(null)}
              data-testid="unlink-room-btn"
            >
              Bỏ gắn phòng
            </Button>
          )}
          <Button
            variant="primary"
            requiresWrite
            loading={submitting}
            disabled={!selected || selected === currentRoomId}
            icon={<Link2 size={15} />}
            onClick={() => onSubmit(selected)}
            data-testid="link-room-submit"
          >
            Gắn phòng
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, margin: 0, lineHeight: 1.55 }}>
          Tin đăng: <strong>{listingTitle}</strong>
        </p>
        <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
          Gắn phòng để hệ thống tự chuyển tin sang trạng thái <strong>Đã cho thuê</strong>
          {" "}khi phòng có người ở — bạn không phải nhớ đi ẩn tin bằng tay.
        </p>

        {errorMessage && (
          <div
            data-testid="link-room-error"
            style={{ background: C.white, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.sm, padding: "10px 14px", fontFamily: font, fontSize: 13, fontWeight: 600 }}
          >
            {errorMessage}
          </div>
        )}

        {isPending ? (
          <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: 0 }}>Đang tải danh sách phòng trống...</p>
        ) : rooms.length === 0 ? (
          <div style={{ background: C.cream, borderRadius: radius.md, padding: "14px 16px" }}>
            <p style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary, margin: "0 0 4px" }}>
              Chưa có phòng trống nào
            </p>
            <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Vào <strong>Khu trọ &amp; Phòng</strong> để tạo khu và thêm phòng. Chỉ
              phòng đang <strong>Trống</strong> mới gắn được vào tin đăng.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }} data-testid="link-room-options">
            {rooms.map((room) => {
              const isActive = selected === room.roomId;
              return (
                <button
                  key={room.roomId}
                  type="button"
                  onClick={() => setSelected(room.roomId)}
                  data-testid="link-room-option"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    padding: "11px 14px", textAlign: "left", width: "100%",
                    background: isActive ? C.cream : C.white,
                    border: `1.5px solid ${isActive ? C.primary : C.border}`,
                    borderRadius: radius.md, cursor: "pointer",
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>
                      {room.propertyName}
                    </span>
                    <span style={{ display: "block", fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>
                      {room.district} · {room.area} m²
                    </span>
                  </span>
                  <span style={{ fontFamily: font, fontSize: 13.5, fontWeight: 800, color: C.primary, flexShrink: 0 }}>
                    {Number(room.price).toLocaleString("vi-VN")}đ
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
