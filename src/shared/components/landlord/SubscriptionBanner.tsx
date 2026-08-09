import { C, font } from "../../theme";
import type { SubscriptionStatus } from "../../types/status";

interface SubscriptionBannerProps {
  status: SubscriptionStatus;
  trialDaysLeft: number;
  onUpgrade: () => void;
}

export function SubscriptionBanner({ status, trialDaysLeft, onUpgrade }: SubscriptionBannerProps) {
  if (status === "TRIAL") {
    return (
      <div
        style={{
          background: "#FEF6EC",
          borderBottom: `1px solid ${C.border}`,
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <p style={{ fontFamily: font, fontSize: 13, color: C.primary, margin: 0, fontWeight: 700 }}>
          ⚡ Bạn đang sử dụng bản dùng thử SaaS. Còn {trialDaysLeft} ngày dùng thử.
        </p>
        <button
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
        </button>
      </div>
    );
  }

  if (status === "READ_ONLY") {
    return (
      <div
        style={{
          background: "#FCECEC",
          borderBottom: `1px solid #FFEBEB`,
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <p style={{ fontFamily: font, fontSize: 13, color: C.repairing, margin: 0, fontWeight: 700 }}>
          ⚠️ Gói dịch vụ đã hết hạn. Hệ thống đang ở chế độ Chỉ đọc (Read-Only). Bạn không thể thực hiện lưu/xóa dữ liệu.
        </p>
        <button
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
        </button>
      </div>
    );
  }

  return null;
}
