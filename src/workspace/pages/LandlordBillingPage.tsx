import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { LandlordShell } from "../../shared/components/LandlordShell";
import { C, font, radius } from "../../shared/theme";
import { useAuth } from "../../shared/contexts/AuthContext";
import { qk } from "../../shared/query/keys";
import {
  getInvoices,
  getInvoicePeriods,
  recordPayment,
  getPaidAmount,
  getRemainingAmount,
  type InvoiceStatusFilter,
  type InvoiceItem,
} from "../services/billing-service";
import { getPropertiesByOwner } from "../services/property-service";
import { toUserMessage } from "../../shared/services/supabase-error";
import {
  Button,
  Badge,
  EmptyState,
  Skeleton,
  AppSelect,
  ModalShell,
  VietQRBlock,
} from "../../shared/components/common";
import { INVOICE_STATUS_META } from "../../shared/utils/statusMaps";

function toInvoiceStatusKey(status: string): keyof typeof INVOICE_STATUS_META {
  const map: Record<string, keyof typeof INVOICE_STATUS_META> = {
    Unpaid: "unpaid",
    PartiallyPaid: "partiallyPaid",
    Paid: "paid",
    Overdue: "overdue",
    unpaid: "unpaid",
    partiallyPaid: "partiallyPaid",
    paid: "paid",
    overdue: "overdue",
  };
  return map[status] || "unpaid";
}

const STATUS_OPTIONS = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Chưa thanh toán", value: "Unpaid" },
  { label: "Thu một phần", value: "PartiallyPaid" },
  { label: "Đã thanh toán", value: "Paid" },
  { label: "Quá hạn", value: "Overdue" },
];

const ITEM_TYPE_LABELS: Record<string, string> = {
  Rent: "Tiền phòng",
  Electricity: "Tiền điện",
  Water: "Tiền nước",
  Service: "Phí dịch vụ",
  Other: "Khác",
};

export function LandlordBillingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: periods = [] } = useQuery({
    queryKey: qk.billing.periods(user?.id),
    queryFn: () => getInvoicePeriods(user?.id),
    enabled: !!user?.id,
  });

  const periodOptions = useMemo(() => {
    const opts = [{ label: "Tất cả kỳ", value: "all" }];
    periods.forEach((p) => opts.push({ label: `Kỳ ${p}`, value: p }));
    return opts;
  }, [periods]);

  const { data: properties = [] } = useQuery({
    queryKey: qk.properties.mine(user?.id),
    queryFn: () => getPropertiesByOwner(user?.id),
    enabled: !!user?.id,
  });

  const {
    data: invoices = [],
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: qk.billing.invoices(user?.id, selectedPeriod, selectedStatus),
    queryFn: () =>
      getInvoices({
        ownerId: user?.id,
        period: selectedPeriod === "all" ? undefined : selectedPeriod,
        status: selectedStatus ? (selectedStatus as InvoiceStatusFilter) : undefined,
      }),
    enabled: !!user?.id,
  });

  const invoiceProperty = useMemo(() => {
    if (!selectedInvoice?.rooms?.property_id) return null;
    return properties.find((p) => p.id === selectedInvoice.rooms?.property_id) || null;
  }, [selectedInvoice, properties]);

  const paidAmount = selectedInvoice ? getPaidAmount(selectedInvoice) : 0;
  const remainingAmount = selectedInvoice ? getRemainingAmount(selectedInvoice) : 0;

  const handleRecordPayment = async () => {
    if (!selectedInvoice || remainingAmount <= 0) return;
    setRecordingPayment(true);
    setActionMessage(null);
    try {
      // Gửi số CÒN THIẾU, không phải `total_amount`: `record_payment` chỉ cộng
      // dồn payments và không chặn thu vượt, nên hóa đơn đã thu một phần mà gửi
      // nguyên tổng sẽ ghi nhận nhiều hơn số tiền thật của hóa đơn.
      const newStatus = await recordPayment(selectedInvoice.id, remainingAmount);
      const newPayments = [...(selectedInvoice.payments ?? []), { amount: remainingAmount }];
      setSelectedInvoice((prev) => (prev ? { ...prev, status: newStatus, payments: newPayments } : null));
      setActionMessage({ type: "success", text: "Đã ghi nhận thanh toán thành công." });
      queryClient.invalidateQueries({ queryKey: qk.billing.all });
    } catch (err) {
      setActionMessage({ type: "error", text: toUserMessage(err) });
    } finally {
      setRecordingPayment(false);
    }
  };

  return (
    <LandlordShell active="overview" mobileTitle="Quản lý hóa đơn">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <h1 style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
            Danh sách hóa đơn thanh toán
          </h1>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div
              data-testid="invoice-period-filter"
              style={{
                width: 160,
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: radius.md,
                padding: "8px 12px",
              }}
            >
              <AppSelect
                value={selectedPeriod}
                options={periodOptions}
                onChange={setSelectedPeriod}
              />
            </div>

            <div
              data-testid="invoice-status-filter"
              style={{
                width: 180,
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: radius.md,
                padding: "8px 12px",
              }}
            >
              <AppSelect
                value={selectedStatus}
                options={STATUS_OPTIONS}
                onChange={setSelectedStatus}
              />
            </div>
          </div>
        </div>

        {isPending ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <Skeleton variant="row" count={6} />
          </div>
        ) : isError ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: C.error, margin: 0 }}>
              {toUserMessage(error) || "Có lỗi xảy ra khi tải danh sách hóa đơn. Vui lòng thử lại."}
            </p>
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px" }}>
            <EmptyState
              icon={FileText}
              title="Chưa có hóa đơn nào"
              description="Không tìm thấy hóa đơn nào phù hợp với bộ lọc đã chọn."
            />
          </div>
        ) : (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font, fontSize: 14 }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase" }}>Kỳ</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase" }}>Mã phòng</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase" }}>Tên khu</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase" }}>Tổng tiền</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase" }}>Hạn thanh toán</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase" }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      data-testid="invoice-row"
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setActionMessage(null);
                      }}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        cursor: "pointer",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.cream)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: C.textPrimary }}>Kỳ {inv.period}</td>
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: C.primary }}>{inv.rooms?.room_code || "-"}</td>
                      <td style={{ padding: "14px 16px", color: C.textPrimary }}>{inv.rooms?.properties?.name || "-"}</td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800, color: C.primary }}>
                        {inv.total_amount?.toLocaleString("vi-VN")}đ
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center", color: C.textSecondary, fontSize: 13 }}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString("vi-VN") : "-"}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <Badge kind="invoice" status={toInvoiceStatusKey(inv.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedInvoice && (
          <ModalShell
            title={`Chi tiết hóa đơn - Phòng ${selectedInvoice.rooms?.room_code ?? ""}`}
            onClose={() => {
              setSelectedInvoice(null);
              setActionMessage(null);
            }}
            footer={
              <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
                <Badge kind="invoice" status={toInvoiceStatusKey(selectedInvoice.status)} />
                <div style={{ display: "flex", gap: 10 }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedInvoice(null);
                      setActionMessage(null);
                    }}
                  >
                    Đóng
                  </Button>
                  <Button
                    variant="primary"
                    requiresWrite
                    data-testid="mark-paid-btn"
                    disabled={remainingAmount <= 0}
                    loading={recordingPayment}
                    onClick={handleRecordPayment}
                  >
                    {remainingAmount <= 0
                      ? "Đã thanh toán đủ"
                      : `Đã thu ${remainingAmount.toLocaleString("vi-VN")}đ`}
                  </Button>
                </div>
              </div>
            }
          >
            <div data-testid="invoice-detail-modal" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {actionMessage && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: radius.md,
                    background: C.white,
                    border: `1px solid ${actionMessage.type === "success" ? C.success : C.error}`,
                    color: actionMessage.type === "success" ? C.success : C.error,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {actionMessage.text}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: C.bg, padding: 12, borderRadius: radius.md }}>
                <div>
                  <div style={{ fontSize: 12, color: C.textSecondary }}>Khu trọ</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{selectedInvoice.rooms?.properties?.name || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: C.textSecondary }}>Kỳ thanh toán</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>Kỳ {selectedInvoice.period}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: C.textSecondary }}>Tổng tiền</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>{selectedInvoice.total_amount?.toLocaleString("vi-VN")}đ</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: C.textSecondary }}>Hạn thanh toán</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>
                    {selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString("vi-VN") : "-"}
                  </div>
                </div>
                {paidAmount > 0 && (
                  <>
                    <div>
                      <div style={{ fontSize: 12, color: C.textSecondary }}>Đã thu</div>
                      <div data-testid="invoice-paid-amount" style={{ fontSize: 14, fontWeight: 700, color: C.success }}>
                        {paidAmount.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: C.textSecondary }}>Còn thiếu</div>
                      <div data-testid="invoice-remaining-amount" style={{ fontSize: 14, fontWeight: 700, color: remainingAmount > 0 ? C.error : C.success }}>
                        {remainingAmount.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                <h4 style={{ fontFamily: font, fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: C.textPrimary }}>
                  Mã VietQR thanh toán
                </h4>
                {/* Số tiền trên QR là số CÒN THIẾU — hóa đơn đã thu một phần mà
                    quét ra tổng gốc thì người ở chuyển thừa. */}
                <VietQRBlock
                  bankCode={invoiceProperty?.bank_name}
                  accountNumber={invoiceProperty?.bank_account_number}
                  accountName={invoiceProperty?.bank_account_name}
                  amount={remainingAmount}
                  purpose={`Tien phong ${selectedInvoice.rooms?.room_code ?? ""} ky ${selectedInvoice.period}`}
                />
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                <h4 style={{ fontFamily: font, fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: C.textPrimary }}>
                  Chi tiết khoản thu ({selectedInvoice.invoice_items?.length || 0})
                </h4>
                {(!selectedInvoice.invoice_items || selectedInvoice.invoice_items.length === 0) ? (
                  <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>Khấu trừ / Phụ phí chưa liệt kê chi tiết.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedInvoice.invoice_items.map((item: any, idx: number) => (
                      <div
                        key={item.id || idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          background: C.bg,
                          borderRadius: radius.sm,
                          fontSize: 13,
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, color: C.textPrimary }}>
                            {ITEM_TYPE_LABELS[item.type] || item.type}:{" "}
                          </span>
                          <span style={{ color: C.textSecondary }}>{item.description || "-"}</span>
                          {item.quantity && item.unit_price ? (
                            <span style={{ fontSize: 11.5, color: C.textSecondary, marginLeft: 6 }}>
                              ({item.quantity} x {item.unit_price.toLocaleString("vi-VN")}đ)
                            </span>
                          ) : null}
                        </div>
                        <div style={{ fontWeight: 700, color: C.textPrimary, flexShrink: 0, marginLeft: 8 }}>
                          {item.amount?.toLocaleString("vi-VN")}đ
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ModalShell>
        )}
      </div>
    </LandlordShell>
  );
}

export default LandlordBillingPage;
