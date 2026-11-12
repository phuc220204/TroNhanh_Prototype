import { useCallback, useEffect, useState } from "react";
import { CircleCheck, LoaderCircle, Rocket } from "lucide-react";
import { LegalConsentCheckbox } from "../../../shared/components/common";
import { C, font } from "../../../shared/theme";
import { toUserMessage } from "../../../shared/services/supabase-error";
import { getDemandBoostPackages, type DemandBoostPackage } from "../../services/demand-boost-service";

const formatVnd = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

interface DemandBoostPickerProps {
  selectedDays: number | null;
  onSelectDays: (days: number | null) => void;
  hasAcceptedTerms: boolean;
  onAcceptTerms: (accepted: boolean) => void;
  disabled?: boolean;
}

function RadioMark({ isSelected }: { isSelected: boolean }) {
  return isSelected ? (
    <CircleCheck size={20} color={C.primary} />
  ) : (
    <span aria-hidden="true" style={{ display: "block", width: 18, height: 18, borderRadius: "50%", border: `2px solid ${C.border}` }} />
  );
}

/**
 * Chọn "tin thường" hoặc gói đẩy tin ngay lúc đăng tin nhu cầu. Giá chỉ để
 * hiển thị — server (`begin_demand_boost_checkout`) mới là nơi tính tiền.
 */
export function DemandBoostPicker({ selectedDays, onSelectDays, hasAcceptedTerms, onAcceptTerms, disabled }: DemandBoostPickerProps) {
  const [packages, setPackages] = useState<DemandBoostPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPackages = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      setPackages(await getDemandBoostPackages());
    } catch (err) {
      setLoadError(toUserMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  const isBoostSelected = selectedDays !== null;
  const selectedPackage = packages.find((item) => item.days === selectedDays);

  return (
    <section data-testid="demand-plan-section" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <h2 style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>
          Cách hiển thị tin
        </h2>
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
          Tin nổi bật được chủ trọ nhìn thấy trước, tăng cơ hội tìm được phòng nhanh hơn.
        </p>
      </div>

      <button
        type="button"
        data-testid="demand-plan-standard"
        aria-pressed={!isBoostSelected}
        disabled={disabled}
        onClick={() => onSelectDays(null)}
        style={{
          display: "flex", alignItems: "flex-start", gap: 12, width: "100%", padding: 16,
          border: `2px solid ${!isBoostSelected ? C.primary : C.border}`, borderRadius: 14,
          background: !isBoostSelected ? C.caramelSoft : C.white,
          textAlign: "left", cursor: "pointer", fontFamily: font,
        }}
      >
        <RadioMark isSelected={!isBoostSelected} />
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: C.textPrimary }}>Đăng tin thường</span>
          <span style={{ display: "block", fontSize: 13, color: C.textSecondary, marginTop: 3 }}>Hiển thị theo thứ tự mới nhất.</span>
        </span>
        <strong style={{ fontSize: 14, color: C.primary }}>Miễn phí</strong>
      </button>

      <div
        data-testid="demand-plan-boost"
        style={{
          display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 14,
          border: `2px solid ${isBoostSelected ? C.primary : C.border}`,
          background: isBoostSelected ? C.caramelSoft : C.white,
        }}
      >
        <button
          type="button"
          aria-pressed={isBoostSelected}
          disabled={disabled || isLoading || packages.length === 0}
          onClick={() => onSelectDays(selectedPackage?.days ?? packages[0]?.days ?? null)}
          style={{
            display: "flex", alignItems: "flex-start", gap: 12, width: "100%", padding: 0,
            border: 0, background: "transparent", textAlign: "left", fontFamily: font,
            cursor: isLoading || packages.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          <RadioMark isSelected={isBoostSelected} />
          <span style={{ flex: 1 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>
              <Rocket size={16} color={C.primary} /> Tin nổi bật
            </span>
            <span style={{ display: "block", fontSize: 13, color: C.textSecondary, marginTop: 3, lineHeight: 1.5 }}>
              Hiện <strong>trên cùng</strong> trang Tin nhu cầu, gắn nhãn “Nổi bật” để chủ trọ thấy bạn trước.
            </span>
          </span>
        </button>

        {isLoading ? (
          <p role="status" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontFamily: font, fontSize: 13, color: C.textSecondary }}>
            <LoaderCircle size={15} /> Đang tải gói…
          </p>
        ) : null}

        {!isLoading && loadError ? (
          <div role="alert" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontFamily: font, fontSize: 13, color: C.error }}>
            <span>{loadError} Bạn vẫn có thể đăng tin thường.</span>
            <button type="button" onClick={() => void loadPackages()} style={{ border: 0, background: "none", color: C.primary, fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              Thử lại
            </button>
          </div>
        ) : null}

        {packages.map((item) => {
          const isSelected = item.days === selectedDays;
          return (
            <label
              key={item.days}
              data-testid={`demand-plan-package-${item.days}`}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                minHeight: 44, padding: "8px 12px", borderRadius: 10, cursor: "pointer",
                border: `1px solid ${isSelected ? C.primary : C.border}`,
                background: isSelected ? C.white : "transparent",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: font, fontSize: 14, fontWeight: 650, color: C.textPrimary }}>
                <input
                  type="radio"
                  name="demand-boost-days"
                  value={item.days}
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => onSelectDays(item.days)}
                  aria-label={`Gói nổi bật ${item.days} ngày`}
                />
                {item.days} ngày nổi bật
              </span>
              <strong style={{ fontFamily: font, fontSize: 14, color: C.primary }}>{formatVnd(item.amount)} đ</strong>
            </label>
          );
        })}

        {isBoostSelected ? (
          <>
            <LegalConsentCheckbox
              variant="payment"
              checked={hasAcceptedTerms}
              onChange={onAcceptTerms}
              disabled={disabled}
              data-testid="demand-plan-terms-checkbox"
            />
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Phí dịch vụ hiển thị trả cho Trọ Nhanh, không phải tiền thuê hay tiền cọc. Bấm đăng sẽ lưu tin rồi chuyển sang payOS; thời gian nổi bật bắt đầu khi payOS xác nhận thanh toán.
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
