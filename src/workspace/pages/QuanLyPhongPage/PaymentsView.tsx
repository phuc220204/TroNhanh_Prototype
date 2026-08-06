import { useState, useEffect } from "react";
import { FileText, CheckCircle, Clock } from "lucide-react";
import { C, font } from "../../../shared/theme";
import { Button } from "../../../shared/components/common";
import type { Property } from "../../types/room";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { getInvoices, type InvoiceItem } from "../../services/billing-service";
import { recordPayment } from "../../services/billing-service";
import { toUserMessage } from "../../../shared/services/supabase-error";

interface PaymentsViewProps {
  property: Property | null;
  mobile?: boolean;
  isReadOnly?: boolean;
}

export function PaymentsView({ property, mobile, isReadOnly }: PaymentsViewProps) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const fetchInvoicesData = async () => {
    if (!property || !user) return;
    try {
      setLoading(true);
      // `ownerId` là CHỦ, `propertyId` là KHU — trước đây id khu bị truyền vào
      // vị trí đầu nên danh sách này luôn rỗng mà không báo lỗi gì.
      const data = await getInvoices({ ownerId: user.id, propertyId: property.id });
      setInvoices(data || []);
    } catch (err: unknown) {
      showToast(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoicesData();
  }, [property, user]);

  const handleConfirmPayment = async (invoiceId: string, amount: number) => {
    if (isReadOnly) return;
    try {
      setLoading(true);
      await recordPayment(invoiceId, amount, "BankTransfer");
      showToast("Đã xác nhận thanh toán thành công!");
      fetchInvoicesData();
    } catch (err: any) {
      showToast("Lỗi khi xác nhận thanh toán: " + toUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: mobile ? 16 : 22 }}>
      {toastMsg && (
        <div style={{ background: "#E8F5E1", border: "1px solid #B4E1A2", color: "#2E5B1E", padding: "10px 16px", borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {toastMsg}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>
          Hóa đơn & Thanh toán
        </h2>
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>
          Theo dõi danh sách hóa đơn hàng tháng, trạng thái thanh toán và xác nhận tiền về tài khoản.
        </p>
      </div>

      {loading ? (
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, textAlign: "center", padding: "32px 0" }}>
          Đang tải danh sách hóa đơn...
        </p>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 16px", border: `1px dashed ${C.border}`, borderRadius: 12 }}>
          <FileText size={32} color={C.textSecondary} style={{ marginBottom: 8 }} />
          <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: 0 }}>
            Chưa có hóa đơn nào được tạo trong khu trọ này
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
            <thead>
              <tr style={{ background: C.caramelSoft }}>
                {["Kỳ hóa đơn", "Phòng", "Tổng tiền", "Hạn thanh toán", "Trạng thái", "Thao tác"].map((h) => (
                  <th key={h} style={{ fontFamily: font, fontSize: 11.5, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", padding: "10px 12px", textAlign: "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary, padding: "12px" }}>
                    Kỳ {inv.period}
                  </td>
                  <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: C.textPrimary, padding: "12px" }}>
                    Phòng {inv.rooms?.room_code || inv.room_id}
                  </td>
                  <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.primary, padding: "12px" }}>
                    {Number(inv.total_amount || 0).toLocaleString("vi-VN")}đ
                  </td>
                  <td style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, padding: "12px" }}>
                    {inv.due_date}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {inv.status === "Paid" ? (
                      <span style={{ color: "#2E5B1E", fontWeight: 700, fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle size={13} /> Đã thanh toán
                      </span>
                    ) : (
                      <span style={{ color: C.repairing, fontWeight: 700, fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Clock size={13} /> Chưa thanh toán
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {inv.status !== "Paid" && (
                      <Button
                        variant="primary"
                        size="sm"
                        requiresWrite
                        onClick={() => handleConfirmPayment(inv.id, inv.total_amount || 0)}
                        data-testid="confirm-payment-btn"
                      >
                        Xác nhận đã nhận tiền
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
