import { Star, Shield, TrendingUp } from "lucide-react";
import { C, font } from "../../../shared/theme";

interface BoostBlockProps {
  isBoosted: boolean;
  setIsBoosted: (val: boolean) => void;
}

export function BoostBlock({ isBoosted, setIsBoosted }: BoostBlockProps) {
  return (
    <div
      onClick={() => setIsBoosted(!isBoosted)}
      style={{
        border: `2px solid ${isBoosted ? C.primary : C.border}`,
        borderRadius: 16,
        background: isBoosted ? "#FEF6EC" : C.white,
        padding: "20px 22px",
        cursor: "pointer",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
      }}
    >
      <input
        type="checkbox"
        checked={isBoosted}
        onChange={() => {}} // Handled by div click
        style={{ marginTop: 4, width: 18, height: 18, cursor: "pointer", accentColor: C.primary }}
      />

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary }}>
            Nâng cấp tin VIP nổi bật (Tăng 5x lượt xem)
          </span>
          <span style={{ background: "#E05C5C", color: "white", fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
            Nổi bật
          </span>
        </div>

        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 12px", lineHeight: 1.45 }}>
          Tin đăng của bạn sẽ được ưu tiên hiển thị ở vị trí đầu tiên trên trang tìm kiếm và trang chủ trong 7 ngày.
        </p>

        <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: C.textPrimary, fontWeight: 650 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Star size={14} color="#EAA329" fill="#EAA329" /> Huy hiệu VIP nổi bật
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <TrendingUp size={14} color="#4A7A34" /> Đẩy top ưu tiên 7 ngày
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Shield size={14} color="#3678C6" /> Phí dịch vụ: 100.000 đ
          </span>
        </div>
      </div>
    </div>
  );
}
