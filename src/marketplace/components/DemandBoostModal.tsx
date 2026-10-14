import { useEffect, useState } from "react";
import { Rocket } from "lucide-react";
import { Button, ModalShell } from "../../shared/components/common";
import { C, font } from "../../shared/theme";
import { toUserMessage } from "../../shared/services/supabase-error";
import {
  createDemandBoostCheckout,
  getDemandBoostPackages,
  redirectToDemandBoostCheckout,
  type DemandBoostPackage,
} from "../services/demand-boost-service";
import type { DemandPostItem } from "../services/demand-post-service";

const formatVnd = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

/** Chọn gói đẩy tin nhu cầu rồi chuyển sang payOS. Giá hiển thị; server mới là nơi tính tiền. */
export function DemandBoostModal({ post, onClose }: { post: DemandPostItem; onClose: () => void }) {
  const [packages, setPackages] = useState<DemandBoostPackage[]>([]);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await getDemandBoostPackages();
        if (cancelled) return;
        setPackages(list);
        setSelectedDays(list[0]?.days ?? null);
      } catch (err) {
        if (!cancelled) setLoadError(toUserMessage(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const handlePay = async () => {
    if (selectedDays === null) return;
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const checkout = await createDemandBoostCheckout(post.id, selectedDays);
      redirectToDemandBoostCheckout(checkout);
    } catch (err) {
      setSubmitError(toUserMessage(err));
      setIsSubmitting(false);
    }
  };

  const isBoostRunning = !!post.boost_expire_at && new Date(post.boost_expire_at).getTime() > Date.now();

  return (
    <ModalShell
      title="Đẩy tin nhu cầu"
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button
            icon={<Rocket size={15} />}
            loading={isSubmitting}
            disabled={selectedDays === null || !!loadError}
            onClick={() => void handlePay()}
            data-testid="demand-boost-pay"
          >
            Thanh toán qua payOS
          </Button>
        </>
      }
    >
      <p style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, margin: 0, lineHeight: 1.55 }}>
        Tin “{post.title}” sẽ hiện <strong>trên cùng</strong> trang Tin nhu cầu và được gắn nhãn “Nổi bật”, giúp chủ trọ thấy bạn trước.
      </p>
      {isBoostRunning ? (
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, background: C.warningBg, border: `1px solid ${C.warningBorder}`, borderRadius: 10, padding: "8px 12px", margin: 0 }}>
          Tin đang được đẩy đến {new Date(post.boost_expire_at!).toLocaleString("vi-VN")}. Mua thêm sẽ cộng dồn số ngày.
        </p>
      ) : null}

      {isLoading ? (
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: 0 }}>Đang tải gói…</p>
      ) : loadError ? (
        <p role="alert" style={{ fontFamily: font, fontSize: 13.5, color: C.error, margin: 0 }}>{loadError}</p>
      ) : (
        <div role="radiogroup" aria-label="Chọn gói đẩy tin" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {packages.map((item) => {
            const isSelected = item.days === selectedDays;
            return (
              <button
                key={item.days}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`demand-boost-package-${item.days}`}
                onClick={() => setSelectedDays(item.days)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  minHeight: 52,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: `1.5px solid ${isSelected ? C.primary : C.border}`,
                  background: isSelected ? C.caramelSoft : C.white,
                  fontFamily: font,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 14.5, fontWeight: 700, color: C.textPrimary }}>{item.days} ngày nổi bật</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.primary }}>{formatVnd(item.amount)} đ</span>
              </button>
            );
          })}
        </div>
      )}

      {submitError ? (
        <p role="alert" style={{ fontFamily: font, fontSize: 13.5, color: C.error, margin: 0 }}>{submitError}</p>
      ) : null}
      <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
        Phí dịch vụ hiển thị trả cho Trọ Nhanh, không phải tiền thuê hay tiền cọc. Thời gian nổi bật bắt đầu ngay khi payOS xác nhận thanh toán.
      </p>
    </ModalShell>
  );
}
