import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, TriangleAlert } from "lucide-react";
import { LandlordShell } from "../../../shared/components/LandlordShell";
import { C, font, radius } from "../../../shared/theme";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useBreakpoint } from "../../../shared/components/useBreakpoint";
import { qk } from "../../../shared/query/keys";
import { getInvoices, getInvoicePeriods, getRemainingAmount, type InvoiceStatusFilter, type InvoiceItem } from "../../services/billing-service";
import { getPropertiesByOwner } from "../../services/property-service";
import { toUserMessage } from "../../../shared/services/supabase-error";
import { Button, EmptyState, Skeleton, AppSelect } from "../../../shared/components/common";
import { RecordPaymentModal } from "../../components/RecordPaymentModal";
import { formatPeriod, formatVnd } from "../../../shared/utils/format";
import { STATUS_OPTIONS } from "./invoice-display";
import { InvoiceList } from "./InvoiceList";
import { InvoiceDetailModal } from "./InvoiceDetailModal";

const ALL = "all";

export function LandlordBillingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedPeriod, setSelectedPeriod] = useState<string>(ALL);
  // Bộ lọc mở sẵn từ link, ví dụ dashboard "Xem tất cả" → ?trang-thai=Outstanding.
  const [selectedStatus, setSelectedStatus] = useState<string>(() => {
    const fromUrl = searchParams.get("trang-thai") ?? "";
    return STATUS_OPTIONS.some((option) => option.value === fromUrl) ? fromUrl : "";
  });
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(ALL);
  const [roomSearch, setRoomSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isLinkedInvoiceMissing, setIsLinkedInvoiceMissing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: periods = [] } = useQuery({
    queryKey: qk.billing.periods(user?.id),
    queryFn: () => getInvoicePeriods(user?.id),
    enabled: !!user?.id,
  });

  const periodOptions = useMemo(
    () => [{ label: "Tất cả kỳ", value: ALL }, ...periods.map((p) => ({ label: formatPeriod(p), value: p }))],
    [periods],
  );

  const { data: properties = [], isError: isPropertiesError } = useQuery({
    queryKey: qk.properties.mine(user?.id),
    queryFn: () => getPropertiesByOwner(user?.id),
    enabled: !!user?.id,
  });

  const propertyOptions = useMemo(
    () => [{ label: "Tất cả khu", value: ALL }, ...properties.map((p) => ({ label: p.name, value: p.id }))],
    [properties],
  );

  const { data: invoices = [], isPending, isError, error, refetch, isRefetching } = useQuery({
    queryKey: qk.billing.invoices(user?.id, selectedPeriod, selectedStatus),
    queryFn: () =>
      getInvoices({
        ownerId: user?.id,
        period: selectedPeriod === ALL ? undefined : selectedPeriod,
        status: selectedStatus ? (selectedStatus as InvoiceStatusFilter) : undefined,
      }),
    enabled: !!user?.id,
  });

  // Lọc khu + tìm phòng ở client: danh sách đã nằm trong cache, không cần gọi lại server.
  const visibleInvoices = useMemo(() => {
    const keyword = roomSearch.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (selectedPropertyId !== ALL && inv.rooms?.property_id !== selectedPropertyId) return false;
      if (keyword && !(inv.rooms?.room_code ?? "").toLowerCase().includes(keyword)) return false;
      return true;
    });
  }, [invoices, selectedPropertyId, roomSearch]);

  const hasActiveFilter = selectedPeriod !== ALL || selectedStatus !== "" || selectedPropertyId !== ALL || roomSearch.trim() !== "";
  const clearFilters = () => {
    setSelectedPeriod(ALL);
    setSelectedStatus("");
    setSelectedPropertyId(ALL);
    setRoomSearch("");
  };
  const totalOutstanding = visibleInvoices.reduce((sum, inv) => sum + getRemainingAmount(inv), 0);

  // Link từ dashboard ("Hóa đơn cần nhắc"): /chu-tro/hoa-don?hoa-don=<id> mở sẵn modal.
  const linkedInvoiceId = searchParams.get("hoa-don");
  useEffect(() => {
    if (!linkedInvoiceId || isPending) return;
    const linkedInvoice = invoices.find((inv) => inv.id === linkedInvoiceId);
    if (linkedInvoice) setSelectedInvoice(linkedInvoice);
    // Không tìm thấy (đã xóa, hoặc link cũ) ⇒ báo rõ thay vì lặng lẽ bỏ qua.
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

  const closeInvoiceDetail = () => {
    setSelectedInvoice(null);
    setIsRecordPaymentOpen(false);
    setActionMessage(null);
  };

  const filterBox: React.CSSProperties = {
    width: isMobile ? "100%" : 180,
    boxSizing: "border-box",
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: radius.md,
    padding: "8px 12px",
  };

  return (
    <LandlordShell active="billing" mobileTitle="Hóa đơn">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 16px 24px" : "28px 32px" }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: isMobile ? 12 : 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: font, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
              Hóa đơn &amp; thu tiền
            </h1>
            {!isPending && !isError && invoices.length > 0 && (
              <p data-testid="invoice-outstanding-total" style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "4px 0 0" }}>
                Còn phải thu: <strong style={{ color: C.primary }}>{formatVnd(totalOutstanding)}</strong>
              </p>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 8 : 10, alignItems: isMobile ? "stretch" : "center", flexWrap: "wrap" }}>
            <label style={{ ...filterBox, display: "flex", alignItems: "center", gap: 8 }}>
              <Search size={15} color={C.textSecondary} />
              <input
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder="Tìm mã phòng"
                aria-label="Tìm theo mã phòng"
                data-testid="invoice-room-search"
                style={{ border: "none", outline: "none", fontFamily: font, fontSize: 13.5, color: C.textPrimary, width: "100%", background: "transparent" }}
              />
            </label>
            {properties.length > 1 && (
              <div data-testid="invoice-property-filter" style={filterBox}>
                <AppSelect value={selectedPropertyId} options={propertyOptions} onChange={setSelectedPropertyId} />
              </div>
            )}
            <div data-testid="invoice-period-filter" style={filterBox}>
              <AppSelect value={selectedPeriod} options={periodOptions} onChange={setSelectedPeriod} />
            </div>
            <div data-testid="invoice-status-filter" style={filterBox}>
              <AppSelect value={selectedStatus} options={STATUS_OPTIONS} onChange={setSelectedStatus} />
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
            <Button variant="ghost" size="sm" onClick={() => setIsLinkedInvoiceMissing(false)}>Đóng</Button>
          </div>
        )}

        {isPending ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <Skeleton variant="row" count={6} />
          </div>
        ) : isError ? (
          <div role="alert" style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: C.error, margin: "0 0 16px" }}>
              {toUserMessage(error) || "Có lỗi xảy ra khi tải danh sách hóa đơn. Vui lòng thử lại."}
            </p>
            <Button variant="outline" loading={isRefetching} onClick={() => refetch()} data-testid="invoices-retry">Thử lại</Button>
          </div>
        ) : visibleInvoices.length === 0 ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px" }}>
            {hasActiveFilter ? (
              <EmptyState
                icon={FileText}
                title="Không có hóa đơn khớp bộ lọc"
                description="Thử đổi kỳ, trạng thái hoặc khu trọ."
                action={<Button variant="outline" onClick={clearFilters} data-testid="invoice-clear-filters">Xóa bộ lọc</Button>}
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="Chưa có hóa đơn nào"
                description="Ghi chỉ số điện nước rồi tạo hóa đơn từ thẻ phòng trong mục Khu trọ & Phòng."
                action={<Button variant="primary" onClick={() => navigate("/chu-tro/quan-ly-phong?tab=rooms")}>Đến Khu trọ &amp; Phòng</Button>}
              />
            )}
          </div>
        ) : (
          <InvoiceList
            invoices={visibleInvoices}
            isMobile={isMobile}
            onOpen={(inv) => {
              setSelectedInvoice(inv);
              setActionMessage(null);
            }}
          />
        )}

        {selectedInvoice && isRecordPaymentOpen && (
          <RecordPaymentModal
            invoiceId={selectedInvoice.id}
            remainingAmount={getRemainingAmount(selectedInvoice)}
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
          <InvoiceDetailModal
            invoice={selectedInvoice}
            property={invoiceProperty}
            isPropertiesError={isPropertiesError}
            actionMessage={actionMessage}
            onClose={closeInvoiceDetail}
            onRecordPayment={() => {
              setActionMessage(null);
              setIsRecordPaymentOpen(true);
            }}
          />
        )}
      </div>
    </LandlordShell>
  );
}

export default LandlordBillingPage;
