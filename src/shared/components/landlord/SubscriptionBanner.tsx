import { C, font } from "../../theme";
import type { SubscriptionStatus } from "../../types/status";

interface SubscriptionBannerProps {
  status: SubscriptionStatus;
  trialDaysLeft: number;
  onUpgrade?: () => void;
}

export function SubscriptionBanner({ status, trialDaysLeft, onUpgrade }: SubscriptionBannerProps) {
  if (status === "TRIAL") {
    return (
      <div
        style={{
          background: C.cream,
          borderBottom: `1px solid ${C.border}`,
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <p style={{ fontFamily: font, fontSize: 13, color: C.primary, margin: 0, fontWeight: 700 }}>
          Bạn đang dùng thử gói Quản lý vận hành — còn {trialDaysLeft} ngày.
        </p>
        {onUpgrade && <button
          onClick={onUpgrade}
          style={{
            padding: "6px 14px",
            background: C.primary,
            color: C.white,
            border: "none",
            borderRadius: 8,
            fontFamily: font,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Nâng cấp gói
        </button>}
      </div>
    );
  }

  if (status === "READ_ONLY") {
    return (
      <div
        style={{
          background: C.errorBg,
          borderBottom: `1px solid ${C.errorBorder}`,
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <p style={{ fontFamily: font, fontSize: 13, color: C.repairing, margin: 0, fontWeight: 700 }}>
          Gói dịch vụ đã hết hạn — đang ở chế độ chỉ xem. Dữ liệu của bạn vẫn được giữ nguyên; gia hạn để tiếp tục thêm, sửa.
        </p>
        {onUpgrade && <button
          onClick={onUpgrade}
          style={{
            padding: "6px 14px",
            background: C.repairing,
            color: C.white,
            border: "none",
            borderRadius: 8,
            fontFamily: font,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Gia hạn gói
        </button>}
      </div>
    );
  }

  return null;
}
