import { useCallback, useEffect, useState } from "react";
import { CircleCheck, LoaderCircle, Sparkles, Star } from "lucide-react";
import { C, font } from "../../../shared/theme";
import { formatBoostVnd, getBoostPackages, type BoostPackage } from "../../services/boost-payment-service";

interface Step5VisibilityProps {
  boostAvailable: boolean;
  isTestMode: boolean;
  selectedBoostDays: number | null;
  onSelectBoostDays: (days: number | null) => void;
}

export function Step5Visibility({
  boostAvailable,
  isTestMode,
  selectedBoostDays,
  onSelectBoostDays,
}: Step5VisibilityProps) {
  const [packages, setPackages] = useState<BoostPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setPackages(await getBoostPackages());
    } catch {
      setPackages([]);
      setLoadError(true);
      onSelectBoostDays(null);
    } finally {
      setLoading(false);
    }
  }, [onSelectBoostDays]);

  useEffect(() => {
    if (boostAvailable) void loadPackages();
  }, [boostAvailable, loadPackages]);

  // A Draft can remember a previous Boost choice. It is not a selectable plan
  // when the current seller is outside the backend's test allowlist.
  const activeBoostDays = boostAvailable ? selectedBoostDays : null;
  const selectedBoostPackage = packages.find((item) => item.days === activeBoostDays);

  return (
    <section data-testid="listing-plan-step" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: font, fontSize: 23, fontWeight: 800, color: C.textPrimary, margin: "0 0 8px" }}>
          Chọn cách hiển thị tin
        </h2>
        <p style={{ fontFamily: font, fontSize: 14, lineHeight: 1.6, color: C.textSecondary, margin: 0 }}>
          Chọn đăng tin thường miễn phí hoặc gói Boost. Tin vẫn cần được duyệt trước khi hiển thị công khai.
        </p>
      </div>

      <button
        type="button"
        data-testid="listing-plan-standard"
        aria-pressed={activeBoostDays === null}
        onClick={() => onSelectBoostDays(null)}
        style={{
          display: "flex", alignItems: "flex-start", gap: 14, width: "100%", padding: 18,
          border: `2px solid ${activeBoostDays === null ? C.primary : C.border}`,
          borderRadius: 14, background: activeBoostDays === null ? "#FEF6EC" : C.white,
          textAlign: "left", cursor: "pointer", fontFamily: font,
        }}
      >
        <span style={{ color: activeBoostDays === null ? C.primary : C.textSecondary, marginTop: 1 }}>
          {activeBoostDays === null ? <CircleCheck size={20} /> : <span aria-hidden="true" style={{ display: "block", width: 18, height: 18, borderRadius: "50%", border: `2px solid ${C.border}` }} />}
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", color: C.textPrimary, fontSize: 16, fontWeight: 800 }}>Đăng tin thường</span>
          <span style={{ display: "block", color: C.textSecondary, fontSize: 13.5, lineHeight: 1.5, marginTop: 4 }}>
            Miễn phí. Tin sẽ được duyệt theo quy trình thông thường.
          </span>
        </span>
        <strong style={{ color: C.primary, fontFamily: font, fontSize: 14 }}>Miễn phí</strong>
      </button>

      {boostAvailable ? (
        <div
          data-testid="listing-plan-boost"
          style={{
            border: `2px solid ${activeBoostDays !== null ? C.primary : C.border}`,
            borderRadius: 14, background: activeBoostDays !== null ? "#FEF6EC" : C.white,
            padding: 18, display: "flex", flexDirection: "column", gap: 14,
          }}
        >
          <button
            type="button"
            aria-pressed={activeBoostDays !== null}
            onClick={() => {
              const preferredPackage = selectedBoostPackage ?? packages[0];
              if (preferredPackage) onSelectBoostDays(preferredPackage.days);
            }}
            disabled={loading || packages.length === 0}
            style={{ display: "flex", alignItems: "flex-start", gap: 14, width: "100%", padding: 0, border: 0, background: "transparent", textAlign: "left", cursor: loading || packages.length === 0 ? "not-allowed" : "pointer", fontFamily: font }}
          >
            <span style={{ color: activeBoostDays !== null ? C.primary : C.textSecondary, marginTop: 1 }}>
              {activeBoostDays !== null ? <CircleCheck size={20} /> : <span aria-hidden="true" style={{ display: "block", width: 18, height: 18, borderRadius: "50%", border: `2px solid ${C.border}` }} />}
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: C.textPrimary, fontSize: 16, fontWeight: 800 }}>
                <Sparkles size={17} color={C.primary} /> Tin nổi bật với Boost
              </span>
              <span style={{ display: "block", color: C.textSecondary, fontSize: 13.5, lineHeight: 1.5, marginTop: 4 }}>
                Thanh toán ngay sau khi gửi tin. Nếu thanh toán thành công, Boost sẽ bắt đầu khi moderator duyệt tin.
              </span>
            </span>
          </button>

          {loading ? (
            <p role="status" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, color: C.textSecondary, font: `13px ${font}` }}>
              <LoaderCircle size={16} /> Đang tải gói và giá từ máy chủ…
            </p>
          ) : null}

          {!loading && loadError ? (
            <div role="alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, color: C.error, font: `13px ${font}` }}>
              <span>Chưa tải được giá các gói. Tin thường vẫn có thể đăng bình thường.</span>
              <button type="button" onClick={() => void loadPackages()} style={{ border: 0, background: "none", color: C.primary, font: `700 13px ${font}`, cursor: "pointer", whiteSpace: "nowrap" }}>Thử lại</button>
            </div>
          ) : null}

          {packages.map((item) => (
            <label
              key={item.days}
              data-testid={`listing-boost-package-${item.days}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44, padding: "7px 10px", border: `1px solid ${activeBoostDays === item.days ? C.primary : C.border}`, borderRadius: 9, cursor: "pointer", background: activeBoostDays === item.days ? C.white : "transparent" }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 9, color: C.textPrimary, font: `650 13.5px ${font}` }}>
                <input
                  type="radio"
                  name="listing-boost-days"
                  value={item.days}
                  checked={activeBoostDays === item.days}
                  onChange={() => onSelectBoostDays(item.days)}
                  aria-label={`Gói Boost ${item.days} ngày`}
                />
                <Star size={15} color="#EAA329" fill="#EAA329" />
                {item.days} ngày
              </span>
              <strong style={{ color: C.primary, font: `750 13.5px ${font}` }}>{formatBoostVnd(item.amount)} đ</strong>
            </label>
          ))}

          {selectedBoostPackage ? (
            <p data-testid="listing-boost-immediate-payment" style={{ margin: 0, padding: 11, borderRadius: 9, background: C.cream, color: C.textSecondary, font: `12.5px/1.55 ${font}` }}>
              Đã chọn gói {selectedBoostPackage.days} ngày ({formatBoostVnd(selectedBoostPackage.amount)} đ). {isTestMode ? "Đang trong đợt kiểm thử giới hạn. " : ""}Bấm gửi tin sẽ lưu tin rồi chuyển ngay đến payOS. Tin vẫn ở trạng thái chờ duyệt; thời hạn Boost chỉ tính từ lúc được duyệt.
            </p>
          ) : null}
        </div>
      ) : (
        <p style={{ margin: 0, padding: 14, borderRadius: 10, background: C.cream, color: C.textSecondary, font: `13px/1.55 ${font}` }}>
          Gói nổi bật hiện chưa mở cho tài khoản này. Bạn vẫn có thể đăng tin thường miễn phí.
        </p>
      )}
    </section>
  );
}
