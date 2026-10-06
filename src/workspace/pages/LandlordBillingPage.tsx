import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, TriangleAlert } from "lucide-react";
import { LandlordShell } from "../../shared/components/LandlordShell";
import { C, font, radius } from "../../shared/theme";
import { useAuth } from "../../shared/contexts/AuthContext";
import { qk } from "../../shared/query/keys";
import {
  getInvoices,
  getInvoicePeriods,
  getPaidAmount,
  getRemainingAmount,
  getLatestCollectionNote,
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
import { classifyInvoiceDue, formatDueLabel, getDaysUntilDue } from "../services/invoice-due";
import { CollectionLogSection } from "../components/CollectionLogSection";
import { RecordPaymentModal } from "../components/RecordPaymentModal";
import { formatDate, formatPeriod, formatVnd } from "../../shared/utils/format";

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

/**
 * Trạng thái để HIỂN THỊ: hóa đơn đã quá `due_date` mà còn thiếu tiền thì hiện
 * "Quá hạn" dù DB vẫn ghi `Unpaid` (chưa có job chuyển Overdue — BR-004).
 */
function toDisplayStatusKey(invoice: InvoiceItem): keyof typeof INVOICE_STATUS_META {
  const dueState = classifyInvoiceDue(invoice.due_date, getRemainingAmount(invoice), new Date());
  return dueState === "overdue" ? "overdue" : toInvoiceStatusKey(invoice.status);
}

const formatShortDate = (value: string) => {
  const [, month, day] = value.slice(0, 10).split("-");
  return day && month ? `${day}/${month}` : value;
};

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
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isLinkedInvoiceMissing, setIsLinkedInvoiceMissing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: periods = [] } = useQuery({
    queryKey: qk.billing.periods(user?.id),
    queryFn: () => getInvoicePeriods(user?.id),
    enabled: !!user?.id,
  });

  const periodOptions = useMemo(() => {
    const opts = [{ label: "Tất cả kỳ", value: "all" }];
    periods.forEach((p) => opts.push({ label: formatPeriod(p), value: p }));
    return opts;
  }, [periods]);

  const { data: properties = [], isError: isPropertiesError } = useQuery({
    queryKey: qk.properties.mine(user?.id),
    queryFn: () => getPropertiesByOwner(user?.id),
    enabled: !!user?.id,
  });

  const {
    data: invoices = [],
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
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

  // Link từ dashboard ("Hóa đơn cần nhắc"): /chu-tro/hoa-don?hoa-don=<id> mở sẵn modal.
  const linkedInvoiceId = searchParams.get("hoa-don");
  useEffect(() => {
    if (!linkedInvoiceId || isPending) return;
    const linkedInvoice = invoices.find((inv) => inv.id === linkedInvoiceId);
    if (linkedInvoice) setSelectedInvoice(linkedInvoice);
    // Không tìm thấy (đã xóa, hoặc link cũ) ⇒ báo rõ thay vì lặng lẽ bỏ qua.
    // Lỗi tải danh sách thì đã có khối lỗi riêng, không báo trùng.
    else if (!isError) setIsLinkedInvoiceMissing(true);
    setSearchParams((params) => {
      params.delete("hoa-don");
      return params;
    }, { replace: true });
  }, [linkedInvoiceId, isPending, isError, invoices, setSearchParams]);

  const invoiceProperty = useMemo(() => {
    if (!selectedInvoice?.rooms?.property_id) return null;
    return properties.find((p) => p.id === selectedInvoice.rooms?.property_id) || null;
  }, [selectedInvoice, properties]);

  const paidAmount = selectedInvoice ? getPaidAmount(selectedInvoice) : 0;
  const remainingAmount = selectedInvoice ? getRemainingAmount(selectedInvoice) : 0;

  const closeInvoiceDetail = () => {
    setSelectedInvoice(null);
    setIsRecordPaymentOpen(false);
    setActionMessage(null);
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

        {isLinkedInvoiceMissing && (
          <div
            data-testid="linked-invoice-missing"
            role="status"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: C.warningBg, border: `1px solid ${C.warningBorder}`, borderRadius: radius.md, padding: "10px 14px", marginBottom: 16, fontFamily: font, fontSize: 13, color: C.textPrimary }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <TriangleAlert size={15} color={C.warning} style={{ flexShrink: 0 }} />
              Không tìm thấy hóa đơn. Có thể hóa đơn đã bị xóa hoặc đường dẫn đã cũ.
            </span>
            <Button variant="ghost" size="sm" onClick={() => setIsLinkedInvoiceMissing(false)}>
              Đóng
            </Button>
          </div>
        )}

        {isPending ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <Skeleton variant="row" count={6} />
          </div>
        ) : isError ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: C.error, margin: "0 0 16px" }}>
              {toUserMessage(error) || "Có lỗi xảy ra khi tải danh sách hóa đơn. Vui lòng thử lại."}
            </p>
            <Button variant="outline" loading={isRefetching} onClick={() => refetch()} data-testid="invoices-retry">
              Thử lại
            </Button>
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
                  {invoices.map((inv) => {
                    const latestNote = getLatestCollectionNote(inv);
                    const daysUntilDue = inv.due_date ? getDaysUntilDue(inv.due_date, new Date()) : null;
                    const isDueSoon = classifyInvoiceDue(inv.due_date, getRemainingAmount(inv), new Date()) === "dueSoon";
                    return (
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
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: C.textPrimary }}>{formatPeriod(inv.period)}</td>
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: C.primary }}>{inv.rooms?.room_code || "-"}</td>
                      <td style={{ padding: "14px 16px", color: C.textPrimary }}>{inv.rooms?.properties?.name || "-"}</td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800, color: C.primary }}>
                        {formatVnd(inv.total_amount)}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center", color: C.textSecondary, fontSize: 13 }}>
                        {inv.due_date ? formatDate(inv.due_date) : "-"}
                        {isDueSoon && daysUntilDue !== null && (
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.warning, marginTop: 2 }}>{formatDueLabel(daysUntilDue)}</div>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <Badge kind="invoice" status={toDisplayStatusKey(inv)} />
                        {latestNote && (
                          <div
                            data-testid="invoice-latest-note"
                            title={latestNote.reason}
                            style={{ fontSize: 11.5, color: C.textSecondary, marginTop: 4, maxWidth: 200, marginInline: "auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {latestNote.follow_up_date ? `Hẹn thu lại ${formatShortDate(latestNote.follow_up_date)}` : latestNote.reason}
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedInvoice && isRecordPaymentOpen && (
          <RecordPaymentModal
            invoiceId={selectedInvoice.id}
            remainingAmount={remainingAmount}
            roomCode={selectedInvoice.rooms?.room_code}
            period={selectedInvoice.period}
            onClose={() => setIsRecordPaymentOpen(false)}
            onRecorded={({ amount, newStatus }) => {
              setSelectedInvoice((prev) =>
                prev ? { ...prev, status: newStatus, payments: [...(prev.payments ?? []), { amount }] } : null
              );
              setIsRecordPaymentOpen(false);
              setActionMessage({ type: "success", text: `Đã ghi nhận thu ${formatVnd(amount)}.` });
            }}
          />
        )}

        {/* Hai ModalShell cùng mở thì Esc đóng cả hai ⇒ khi đang ghi nhận thu thì tạm ẩn modal chi tiết. */}
        {selectedInvoice && !isRecordPaymentOpen && (
          <ModalShell
            title={`Chi tiết hóa đơn - Phòng ${selectedInvoice.rooms?.room_code ?? ""}`}
            onClose={closeInvoiceDetail}
            footer={
              <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
                <Badge kind="invoice" status={toDisplayStatusKey(selectedInvoice)} />
                <div style={{ display: "flex", gap: 10 }}>
                  <Button variant="outline" onClick={closeInvoiceDetail}>
                    Đóng
                  </Button>
                  <Button
                    variant="primary"
                    requiresWrite
                    data-testid="mark-paid-btn"
                    disabled={remainingAmount <= 0}
                    onClick={() => {
                      setActionMessage(null);
                      setIsRecordPaymentOpen(true);
                    }}
                  >
                    {remainingAmount <= 0 ? "Đã thanh toán đủ" : "Ghi nhận đã thu"}
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
                    background: actionMessage.type === "success" ? C.successBg : C.errorBg,
                    border: `1px solid ${actionMessage.type === "success" ? C.successBorder : C.errorBorder}`,
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
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{formatPeriod(selectedInvoice.period)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: C.textSecondary }}>Tổng tiền</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>{formatVnd(selectedInvoice.total_amount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: C.textSecondary }}>Hạn thanh toán</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>
                    {selectedInvoice.due_date ? formatDate(selectedInvoice.due_date) : "-"}
                  </div>
                </div>
                {paidAmount > 0 && (
                  <>
                    <div>
                      <div style={{ fontSize: 12, color: C.textSecondary }}>Đã thu</div>
                      <div data-testid="invoice-paid-amount" style={{ fontSize: 14, fontWeight: 700, color: C.success }}>
                        {formatVnd(paidAmount)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: C.textSecondary }}>Còn thiếu</div>
                      <div data-testid="invoice-remaining-amount" style={{ fontSize: 14, fontWeight: 700, color: remainingAmount > 0 ? C.error : C.success }}>
                        {formatVnd(remainingAmount)}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <CollectionLogSection invoiceId={selectedInvoice.id} isSettled={remainingAmount <= 0} />

              {/* Đã thu đủ thì không còn gì để quét. */}
              {remainingAmount > 0 && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                  <h4 style={{ fontFamily: font, fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: C.textPrimary }}>
                    Mã VietQR thanh toán
                  </h4>
                  {isPropertiesError && (
                    <div
                      data-testid="vietqr-property-error"
                      style={{ display: "flex", alignItems: "center", gap: 8, background: C.warningBg, border: `1px solid ${C.warningBorder}`, borderRadius: radius.md, padding: "8px 12px", marginBottom: 10, fontSize: 12.5, color: C.textPrimary }}
                    >
                      <TriangleAlert size={14} color={C.warning} style={{ flexShrink: 0 }} />
                      Không tải được thông tin tài khoản ngân hàng của khu trọ, nên chưa tạo được mã QR. Hãy tải lại trang.
                    </div>
                  )}
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
              )}

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                <h4 style={{ fontFamily: font, fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: C.textPrimary }}>
                  Chi tiết khoản thu ({selectedInvoice.invoice_items?.length || 0})
                </h4>
                {(!selectedInvoice.invoice_items || selectedInvoice.invoice_items.length === 0) ? (
                  <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>Hóa đơn chưa có khoản thu chi tiết.</p>
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
                              ({item.quantity} x {formatVnd(item.unit_price)})
                            </span>
                          ) : null}
                        </div>
                        <div style={{ fontWeight: 700, color: C.textPrimary, flexShrink: 0, marginLeft: 8 }}>
                          {formatVnd(item.amount)}
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
