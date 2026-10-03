import { useEffect, useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { ModalShell } from "../../../shared/components/common/ModalShell";
import { C, font } from "../../../shared/theme";
import {
  createBoostCheckout,
  formatBoostVnd,
  getBoostCheckoutErrorMessage,
  getBoostPackages,
  redirectToBoostCheckout,
  type BoostPackage,
} from "../../services/boost-payment-service";
import type { DbListing } from "./MyListingsTable";

export function BoostCheckoutModal({ listing, onClose, initialDays }: { listing: DbListing; onClose: () => void; initialDays?: number | null }) {
  const [packages, setPackages] = useState<BoostPackage[]>([]);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getBoostPackages()
      .then((available) => {
        if (!active) return;
        setPackages(available);
        setSelectedDays(available.find((item) => item.days === initialDays)?.days ?? available[0]?.days ?? null);
      })
      .catch(() => {
        if (active) setErrorMessage("Chưa tải được các gói thanh toán. Bạn có thể thử lại sau.");
      })
      .finally(() => {
        if (active) setLoadingPackages(false);
      });
    return () => { active = false; };
  }, [initialDays]);

  const payNow = async () => {
    if (selectedDays === null || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const checkout = await createBoostCheckout(listing.id, selectedDays);
      redirectToBoostCheckout(checkout);
    } catch (error) {
      setErrorMessage(getBoostCheckoutErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title="Thanh toán Boost"
      onClose={submitting ? () => undefined : onClose}
      footer={(
        <>
          <button type="button" disabled={submitting} onClick={onClose} style={{ minHeight: 44, padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, color: C.textSecondary, fontFamily: font, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}>Đóng</button>
          <button type="button" disabled={loadingPackages || submitting || selectedDays === null} onClick={() => void payNow()} style={{ minHeight: 44, padding: "10px 16px", borderRadius: 10, border: "none", background: C.primary, color: C.white, fontFamily: font, fontWeight: 750, cursor: loadingPackages || submitting ? "not-allowed" : "pointer", opacity: loadingPackages || submitting ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 8 }}>
            {submitting ? "Đang chuyển đến payOS…" : "Thanh toán ngay"} <ExternalLink size={15} />
          </button>
        </>
      )}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Sparkles size={20} color={C.primary} style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ margin: 0, fontFamily: font, color: C.textSecondary, fontSize: 13.5, lineHeight: 1.6 }}>
          Tin: <strong style={{ color: C.textPrimary }}>{listing.title}</strong>. Thanh toán được xác nhận bởi webhook máy chủ; nếu tin đang chờ duyệt, thời hạn Boost chỉ bắt đầu khi moderator duyệt tin.
        </p>
      </div>
      {loadingPackages ? <p role="status" style={{ margin: 0, fontFamily: font, color: C.textSecondary }}>Đang tải các gói Boost…</p> : null}
      {packages.map((item) => (
        <label key={item.days} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 48, padding: "8px 12px", border: `1px solid ${selectedDays === item.days ? C.primary : C.border}`, borderRadius: 10, cursor: "pointer" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: font, fontSize: 14, fontWeight: 650, color: C.textPrimary }}>
            <input type="radio" name="boost-days" value={item.days} checked={selectedDays === item.days} onChange={() => setSelectedDays(item.days)} />
            {item.days} ngày
          </span>
          <strong style={{ fontFamily: font, fontSize: 14, color: C.primary }}>{formatBoostVnd(item.amount)} đ</strong>
        </label>
      ))}
      {errorMessage ? <p role="alert" style={{ margin: 0, fontFamily: font, color: C.error, fontSize: 13.5 }}>{errorMessage}</p> : null}
      <p style={{ margin: 0, fontFamily: font, color: C.textSecondary, fontSize: 12, lineHeight: 1.5 }}>Sau khi hoàn tất tại payOS, quay lại Trọ Nhanh và chờ thông báo xác nhận. Đừng thanh toán cùng một đơn lần hai.</p>
    </ModalShell>
  );
}
