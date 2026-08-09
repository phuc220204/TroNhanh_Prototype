import { useState } from "react";
import { X, FileText, AlertCircle } from "lucide-react";
import { C, font } from "../../../shared/theme";
import { Button, VietQRBlock } from "../../../shared/components/common";
import type { Room, Property } from "../../types/room";
import { createInvoiceWithItems } from "../../services/billing-service";
import { toUserMessage } from "../../../shared/services/supabase-error";

interface InvoicePreviewProps {
  room: Room | null;
  property: Property | null;
  onClose: () => void;
  onSuccess?: () => void;
  isReadOnly?: boolean;
}

export function InvoicePreview({ room, property, onClose, onSuccess, isReadOnly }: InvoicePreviewProps) {
  if (!room) return null;

  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0] || "";
  });

  const priceClean = Number(room.price.replace(/[^\d]/g, "")) || 0;
  const [rentPrice, setRentPrice] = useState(String(priceClean));
  const [elecAmount, setElecAmount] = useState("150000");
  const [waterAmount, setWaterAmount] = useState("100000");
  const [serviceAmount, setServiceAmount] = useState("100000");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const totalCalc = (Number(rentPrice) || 0) + (Number(elecAmount) || 0) + (Number(waterAmount) || 0) + (Number(serviceAmount) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!dueDate || !rentPrice) {
      setErrorMsg("Vui lòng điền đầy đủ hạn thanh toán và tiền thuê.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const items = [
        { type: "Rent" as const, description: `Tiền nhà kỳ ${period}`, quantity: 1, unit_price: Number(rentPrice) || 0, amount: Number(rentPrice) || 0 },
        { type: "Electricity" as const, description: `Tiền điện kỳ ${period}`, quantity: 1, unit_price: Number(elecAmount) || 0, amount: Number(elecAmount) || 0 },
        { type: "Water" as const, description: `Tiền nước kỳ ${period}`, quantity: 1, unit_price: Number(waterAmount) || 0, amount: Number(waterAmount) || 0 },
        { type: "Service" as const, description: `Phí dịch vụ kỳ ${period}`, quantity: 1, unit_price: Number(serviceAmount) || 0, amount: Number(serviceAmount) || 0 },
      ].filter((i) => i.amount > 0);

      await createInvoiceWithItems({
        roomId: room.id,
        period,
        dueDate,
        items,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      // Handles INVOICE_PERIOD_EXISTS error
      setErrorMsg(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.white, borderRadius: 16, width: "100%", maxWidth: 480, padding: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
            Tạo hóa đơn - Phòng {room.code}
          </h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={20} color={C.textSecondary} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: "#FDF2F0", border: "1px solid #F5C2B9", color: "#B5503C", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontFamily: font, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                Kỳ hóa đơn (YYYY-MM)
              </label>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                Hạn thanh toán
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                Tiền phòng (VND)
              </label>
              <input
                type="number"
                value={rentPrice}
                onChange={(e) => setRentPrice(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                Tiền điện (VND)
              </label>
              <input
                type="number"
                value={elecAmount}
                onChange={(e) => setElecAmount(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                Tiền nước (VND)
              </label>
              <input
                type="number"
                value={waterAmount}
                onChange={(e) => setWaterAmount(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                Phí dịch vụ (VND)
              </label>
              <input
                type="number"
                value={serviceAmount}
                onChange={(e) => setServiceAmount(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ background: C.bg, borderRadius: 10, padding: "12px 16px", marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>TỔNG CỘNG HÓA ĐƠN:</span>
            <span style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.primary }}>
              {totalCalc.toLocaleString("vi-VN")}đ
            </span>
          </div>

          {/* AS-002 — người ở chuyển khoản thẳng cho chủ trọ. Số tiền trên mã
              QR bám theo tổng đang tính, nên sửa dòng nào QR đổi theo dòng đó. */}
          {totalCalc > 0 && (
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 4 }}>
              <p style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textSecondary, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "center" }}>
                Mã VietQR của hóa đơn
              </p>
              <VietQRBlock
                bankCode={property?.bank_name}
                accountNumber={property?.bank_account_number}
                accountName={property?.bank_account_name}
                amount={totalCalc}
                purpose={`Tien phong ${room.code} ky ${period}`}
                size={170}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
            <Button variant="ghost" onClick={onClose}>Hủy</Button>
            <Button
              type="submit"
              variant="primary"
              requiresWrite
              loading={loading}
              data-testid="create-invoice-btn"
            >
              {loading ? "Đang tạo..." : "Xác nhận tạo hóa đơn"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
