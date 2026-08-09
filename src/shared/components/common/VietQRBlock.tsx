import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, AlertCircle } from "lucide-react";
import { C, font, radius } from "../../theme";
import { buildVietQrPayload } from "../../utils/vietqr";
import { findBankByCode } from "../../utils/vietqr-banks";
import { logError } from "../../services/supabase-error";

export interface VietQRBlockProps {
  /** `properties.bank_name` — mã ngân hàng. */
  bankCode: string | null | undefined;
  accountNumber: string | null | undefined;
  accountName?: string | null;
  /** Số tiền VND. Bỏ trống ⇒ QR tĩnh, người chuyển tự nhập. */
  amount?: number | null;
  /** Nội dung chuyển khoản (sẽ tự bỏ dấu). */
  purpose?: string;
  size?: number;
  /** Ẩn phần chữ, chỉ hiện ảnh QR. */
  compact?: boolean;
}

/**
 * Mã VietQR của một hóa đơn tiền phòng.
 *
 * AS-002 — nền tảng KHÔNG giữ tiền thuê. Mã này chuyển tiền THẲNG vào tài khoản
 * chủ trọ, nên nó là thật, không phải giả lập. (Mã VietQR ở màn mua gói SaaS thì
 * ngược lại — chỗ đó phải ghi rõ "(giả lập)".)
 *
 * QR được vẽ tại máy người dùng: số tài khoản không đi qua máy chủ nào khác.
 */
export function VietQRBlock({
  bankCode, accountNumber, accountName, amount, purpose, size = 200, compact,
}: VietQRBlockProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [renderError, setRenderError] = useState<string>("");

  const result = buildVietQrPayload({ bankCode, accountNumber, amount, purpose });
  const bank = findBankByCode(bankCode);
  const payload = result.payload ?? "";

  useEffect(() => {
    let cancelled = false;
    if (!payload) {
      setDataUrl("");
      return;
    }
    setRenderError("");
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: size * 2,
      color: { dark: "#2A1A0C", light: "#FFFFFF" },
    })
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .catch((err) => {
        logError("VietQRBlock.toDataURL", err);
        if (!cancelled) setRenderError("Không tạo được mã QR. Vui lòng thử lại.");
      });
    return () => { cancelled = true; };
  }, [payload, size]);

  if (!result.payload) {
    return (
      <div
        data-testid="vietqr-unavailable"
        style={{
          display: "flex", gap: 10, alignItems: "flex-start",
          background: "#FEF6EC", border: `1px solid ${C.border}`,
          borderRadius: radius.md, padding: "12px 14px",
        }}
      >
        <AlertCircle size={18} color={C.secondary} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 2px" }}>
            Chưa tạo được mã VietQR
          </p>
          <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0, lineHeight: 1.45 }}>
            {result.reason} Vào tab <strong>Cài đặt</strong> của khu trọ để bổ sung.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="vietqr-block" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div
        style={{
          background: C.white, border: `1px solid ${C.border}`,
          borderRadius: radius.md, padding: 12, lineHeight: 0,
        }}
      >
        {renderError ? (
          <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: font, fontSize: 12.5, color: C.error, textAlign: "center", lineHeight: 1.4 }}>
              {renderError}
            </span>
          </div>
        ) : dataUrl ? (
          <img
            src={dataUrl}
            alt="Mã VietQR để chuyển khoản tiền phòng"
            width={size}
            height={size}
            style={{ display: "block", width: size, height: size }}
          />
        ) : (
          <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <QrCode size={32} color={C.border} />
          </div>
        )}
      </div>

      {!compact && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: font, fontSize: 13.5, fontWeight: 800, color: C.textPrimary, margin: "0 0 2px" }}>
            {bank?.name} · {accountNumber}
          </p>
          {accountName && (
            <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: "0 0 6px" }}>
              {accountName}
            </p>
          )}
          {amount != null && amount > 0 && (
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.primary, margin: "0 0 6px" }}>
              {Number(amount).toLocaleString("vi-VN")}đ
            </p>
          )}
          <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: 0, lineHeight: 1.45, maxWidth: 260 }}>
            Quét bằng app ngân hàng để chuyển khoản. Tiền vào thẳng tài khoản chủ trọ —
            Trọ Nhanh không giữ tiền thuê.
          </p>
        </div>
      )}
    </div>
  );
}
