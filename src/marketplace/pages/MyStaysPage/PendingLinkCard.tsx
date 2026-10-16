import { TriangleAlert, UserCheck } from "lucide-react";
import { C, font, radius, space } from "../../../shared/theme";
import { Button } from "../../../shared/components/common";
import { formatDate, formatVnd } from "../../../shared/utils/format";
import type { ReviewableStay } from "../../services/review-service";

interface PendingLinkCardProps {
  stay: ReviewableStay;
  /** Tên chủ trọ từ `get_my_pending_link_details()`; `undefined` = chưa tải xong / không đọc được. */
  landlordName: string | null | undefined;
  /** Tên trên tài khoản đang đăng nhập — để đối chiếu với tên trên hồ sơ người ở. */
  accountName: string | null | undefined;
  busy: boolean;
  onConfirm: () => void;
  onReject: () => void;
}

/** So tên không phân biệt hoa thường, dấu và khoảng trắng thừa ("Nguyễn  Văn An" = "nguyen van an"). */
function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isNameMismatch(occupantName: string | null | undefined, accountName: string | null | undefined): boolean {
  if (!occupantName?.trim() || !accountName?.trim()) return false;
  return normalizeName(occupantName) !== normalizeName(accountName);
}

function DetailRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>{label}</span>
      <span data-testid={testId} style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary, overflowWrap: "anywhere" }}>{value}</span>
    </div>
  );
}

/**
 * Lời mời liên kết (BR-029: Pending → Confirmed do CHÍNH người ở bấm).
 * Hiện đủ thông tin để người được mời tự đối chiếu trước khi xác nhận: chủ trọ,
 * ngày bắt đầu, giá thuê, tên trên hồ sơ người ở.
 */
export function PendingLinkCard({ stay, landlordName, accountName, busy, onConfirm, onReject }: PendingLinkCardProps) {
  const hasNameMismatch = isNameMismatch(stay.occupant_name, accountName);

  return (
    <div
      data-testid="pending-link-card"
      style={{ background: C.white, border: `1px solid ${C.secondary}`, borderRadius: radius.lg, padding: space[5] }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: space[2] }}>
        <UserCheck size={16} color={C.primary} />
        <p style={{ fontFamily: font, fontSize: 14.5, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
          Xác nhận bạn là người ở {stay.property_name || "khu trọ"}
          {stay.room_code ? ` · Phòng ${stay.room_code}` : ""}
        </p>
      </div>
      <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: `0 0 ${space[3]}px`, lineHeight: 1.55 }}>
        Chủ trọ đã gắn tài khoản của bạn vào đợt ở này. Chỉ khi bạn xác nhận thì liên kết mới có hiệu lực,
        và bạn mới có thể đánh giá khu trọ về sau. Hãy đối chiếu thông tin bên dưới trước khi xác nhận.
      </p>

      <div
        data-testid="pending-link-details"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: space[3], background: C.bg, borderRadius: radius.md, padding: space[4], marginBottom: space[3] }}
      >
        <DetailRow label="Chủ trọ" value={landlordName?.trim() || "Chưa có tên"} testId="pending-link-landlord" />
        <DetailRow label="Ngày bắt đầu" value={stay.start_date ? formatDate(stay.start_date) : "Chưa có hợp đồng"} testId="pending-link-start-date" />
        <DetailRow label="Giá thuê" value={stay.rent_price != null ? `${formatVnd(stay.rent_price)}/tháng` : "Chưa có hợp đồng"} testId="pending-link-rent" />
        <DetailRow label="Tên trên hồ sơ người ở" value={stay.occupant_name?.trim() || "Chưa có tên"} testId="pending-link-occupant-name" />
      </div>

      {hasNameMismatch && (
        <div
          role="status"
          data-testid="pending-link-name-mismatch"
          style={{ display: "flex", alignItems: "flex-start", gap: space[2], background: C.warningBg, border: `1px solid ${C.warningBorder}`, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[3], fontFamily: font, fontSize: 13, color: C.textPrimary, lineHeight: 1.5 }}
        >
          <TriangleAlert size={15} color={C.warning} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Tên trên hồ sơ người ở (<strong>{stay.occupant_name}</strong>) khác tên tài khoản của bạn
            (<strong>{accountName}</strong>). Nếu đây không phải đợt ở của bạn, hãy bấm “Từ chối”.
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: space[2] }}>
        <Button disabled={busy} onClick={onConfirm} data-testid="confirm-link-btn">
          Xác nhận
        </Button>
        <Button variant="outline" disabled={busy} onClick={onReject} data-testid="reject-link-btn">
          Từ chối
        </Button>
      </div>
    </div>
  );
}
