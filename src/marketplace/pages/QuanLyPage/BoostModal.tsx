import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpCircle, Check } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { ModalShell } from "../../../shared/components/common/ModalShell";
import { Button } from "../../../shared/components/common";
import { getBoostPackages, type BoostPackage } from "../../../shared/services/platform-settings-service";

interface BoostModalProps {
  open: boolean;
  title: string;
  submitting?: boolean;
  errorMessage?: string | null;
  onConfirm: (days: number) => void;
  onCancel: () => void;
}

/**
 * Chọn gói đẩy tin nổi bật (BR-005).
 *
 * Bản trước của modal này hardcode "100.000 đ (7 ngày)" — lệch hẳn với
 * `platform_settings.boost_config` (7 ngày = 20.000đ), và vẽ một mã QR giả bằng
 * 16 thẻ div tô màu theo `i % 3`. Người dùng quét mã đó thì không ra gì cả.
 *
 * Giờ: gói và giá đọc từ config; RPC `boost_listing()` tra lại giá cùng nguồn và
 * ghi `payments` theo giá server — client không gửi giá lên.
 *
 * AS-002: chưa có cổng thanh toán thật cho boost ⇒ phải ghi rõ **"(giả lập)"**.
 * (Khác với VietQR trên hóa đơn tiền phòng — cái đó là tiền thật vào tài khoản
 * chủ trọ, không được gắn chữ này.)
 */
export function BoostModal({ open, title, submitting, errorMessage, onConfirm, onCancel }: BoostModalProps) {
  const { data: packages = [], isPending } = useQuery({
    queryKey: ["platformSettings", "boostPackages"],
    queryFn: getBoostPackages,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const effectiveDays = selectedDays ?? packages[0]?.days ?? null;

  if (!open) return null;

  return (
    <ModalShell
      title="Đẩy tin nổi bật"
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Hủy</Button>
          <Button
            variant="primary"
            loading={submitting}
            disabled={effectiveDays === null || isPending}
            onClick={() => effectiveDays !== null && onConfirm(effectiveDays)}
            data-testid="boost-confirm-btn"
          >
            Xác nhận thanh toán (giả lập)
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 40, height: 40, borderRadius: radius.md, background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ArrowUpCircle size={20} color={C.secondary} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 2px" }}>Tin đăng</p>
            <p style={{ fontFamily: font, fontSize: 14.5, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{title}</p>
          </div>
        </div>

        {errorMessage && (
          <div
            data-testid="boost-error"
            style={{ background: C.white, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.sm, padding: "10px 14px", fontFamily: font, fontSize: 13, fontWeight: 600 }}
          >
            {errorMessage}
          </div>
        )}

        <div>
          <p style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textSecondary, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Chọn thời hạn
          </p>

          {isPending ? (
            <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: 0 }}>Đang tải gói đẩy tin...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }} data-testid="boost-package-list">
              {packages.map((pkg: BoostPackage) => {
                const isSelected = pkg.days === effectiveDays;
                return (
                  <button
                    key={pkg.days}
                    type="button"
                    onClick={() => setSelectedDays(pkg.days)}
                    data-testid="boost-package-option"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "12px 14px",
                      background: isSelected ? C.cream : C.white,
                      border: `1.5px solid ${isSelected ? C.primary : C.border}`,
                      borderRadius: radius.md,
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 18, height: 18, borderRadius: radius.pill, flexShrink: 0,
                          border: `1.5px solid ${isSelected ? C.primary : C.border}`,
                          background: isSelected ? C.primary : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {isSelected && <Check size={11} color={C.white} strokeWidth={3} />}
                      </span>
                      <span style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>
                        Nổi bật {pkg.days} ngày
                      </span>
                    </span>
                    <span style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.primary, flexShrink: 0 }}>
                      {pkg.price.toLocaleString("vi-VN")}đ
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
          Tin nổi bật được xếp trước trong mọi danh sách tìm kiếm suốt thời hạn đã chọn.
          Nếu tin đang còn hạn nổi bật, thời hạn mới sẽ được <strong>cộng dồn</strong>.
          {" "}Thanh toán ở bước này là <strong>giả lập</strong> — chưa trừ tiền thật.
        </p>
      </div>
    </ModalShell>
  );
}
