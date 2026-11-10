import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BarChart3, Download, ReceiptText, TriangleAlert } from "lucide-react";
import { AdminShell } from "../../components/AdminShell";
import { Button, EmptyState, Pagination, Skeleton } from "../../../shared/components/common";
import { useBreakpoint } from "../../../shared/components/useBreakpoint";
import { C, font, radius, space } from "../../../shared/theme";
import { qk } from "../../../shared/query/keys";
import { toUserMessage } from "../../../shared/services/supabase-error";
import {
  REVENUE_EXPORT_LIMIT,
  getRevenueSummary,
  listRevenueTransactions,
  listRevenueTransactionsForExport,
  type RevenueTransactionFilters,
} from "../../services/admin-revenue-service";
import { RevenueFilters, type RevenueFilterState } from "./RevenueFilters";
import { RevenueSummaryCards } from "./RevenueSummaryCards";
import { RevenueChart } from "./RevenueChart";
import { RevenueTransactionsTable } from "./RevenueTransactionsTable";
import { buildRevenueCsv, downloadCsv } from "./revenue-csv";
import { MAX_DAY_RANGE, MAX_MONTH_RANGE, daysBetween, getRevenuePresets } from "./revenue-dates";

const PAGE_SIZE = 20;

function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" style={{ display: "flex", alignItems: "center", gap: space[2], background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, fontFamily: font, fontSize: 13 }}>
      <TriangleAlert size={15} aria-hidden="true" /> {message}
    </div>
  );
}

/**
 * /quan-tri/doanh-thu — thống kê giao dịch nền tảng: mua gói SaaS, đẩy tin cho
 * thuê, đẩy tin nhu cầu. Chỉ Admin (route bọc RequireAdmin; RPC tự chặn FORBIDDEN).
 */
export function RevenuePage() {
  const { isMobile, isTablet } = useBreakpoint();
  const thisMonth = getRevenuePresets()[0]!;
  const [filters, setFilters] = useState<RevenueFilterState>({
    from: thisMonth.from,
    to: thisMonth.to,
    granularity: thisMonth.granularity,
    kind: null,
    status: null,
    isPaidOnly: false,
  });
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const rangeDays = daysBetween(filters.from, filters.to);
  const isRangeValid = Number.isFinite(rangeDays) && rangeDays >= 0 && rangeDays <= MAX_MONTH_RANGE;
  const isDayDisabled = rangeDays > MAX_DAY_RANGE;
  const granularity = isDayDisabled ? "month" : filters.granularity;

  const transactionFilters: RevenueTransactionFilters = {
    from: filters.from,
    to: filters.to,
    kind: filters.kind,
    status: filters.status,
    isPaidOnly: filters.isPaidOnly,
  };

  const summaryQuery = useQuery({
    queryKey: qk.admin.revenueSummary(filters.from, filters.to, granularity),
    queryFn: () => getRevenueSummary(filters.from, filters.to, granularity),
    enabled: isRangeValid,
  });

  const transactionsQuery = useQuery({
    queryKey: qk.admin.revenueTransactions(transactionFilters, page),
    queryFn: () => listRevenueTransactions(transactionFilters, page, PAGE_SIZE),
    enabled: isRangeValid,
    // Giữ trang cũ khi chuyển trang — bảng không nháy về skeleton.
    placeholderData: keepPreviousData,
  });

  const changeFilters = (next: RevenueFilterState) => {
    setFilters(next);
    setPage(1);
    setExportError(null);
    setExportNotice(null);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportNotice(null);
    try {
      const { rows, total } = await listRevenueTransactionsForExport(transactionFilters);
      downloadCsv(`giao-dich-${filters.from}_${filters.to}.csv`, buildRevenueCsv(rows));
      if (total > rows.length) {
        setExportNotice(`Chỉ xuất ${REVENUE_EXPORT_LIMIT.toLocaleString("vi-VN")} giao dịch mới nhất trên tổng ${total.toLocaleString("vi-VN")}. Thu hẹp khoảng thời gian để xuất đủ.`);
      }
    } catch (err) {
      setExportError(toUserMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  // Tablet còn sidebar 232px ⇒ vùng nội dung chỉ ~500px: bảng 7 cột và chữ trục
  // biểu đồ quá chật, dùng bố cục gọn như mobile.
  const isCompact = isMobile || isTablet;
  const cardColumns =isMobile ? "1fr" : isTablet ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))";
  const summaryRows = summaryQuery.data ?? [];
  const transactions = transactionsQuery.data;

  return (
    <AdminShell active="revenue">
      <div data-testid="revenue-page" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: space[5] }}>
        <div>
          <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[2]}px` }}>
            Doanh thu & giao dịch
          </h1>
          <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: 0, lineHeight: 1.55 }}>
            Đơn mua gói quản lý SaaS, đẩy tin cho thuê và đẩy tin nhu cầu thanh toán qua payOS. Doanh thu tính mọi đơn
            đã nhận tiền (kể cả đơn đang chờ duyệt tin hoặc cần đối soát), theo giờ Việt Nam.
          </p>
        </div>

        <RevenueFilters value={filters} onChange={changeFilters} isDayDisabled={isDayDisabled} isMobile={isMobile} />

        {!isRangeValid ? (
          <ErrorBanner message="Khoảng thời gian chưa hợp lệ: ngày bắt đầu phải trước ngày kết thúc và không quá 10 năm." />
        ) : (
          <>
            {summaryQuery.isPending ? (
              <Skeleton variant="card" count={4} />
            ) : summaryQuery.isError ? (
              <ErrorBanner message={toUserMessage(summaryQuery.error)} />
            ) : (
              <>
                <RevenueSummaryCards rows={summaryRows} columns={cardColumns} />
                {summaryRows.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title="Chưa có doanh thu trong khoảng này"
                    description="Không có đơn nào được thanh toán trong khoảng thời gian đã chọn."
                    data-testid="revenue-chart-empty"
                  />
                ) : (
                  <RevenueChart rows={summaryRows} from={filters.from} to={filters.to} granularity={granularity} isMobile={isCompact} />
                )}
              </>
            )}

            <section aria-labelledby="revenue-transactions-heading" style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3], flexWrap: "wrap" }}>
                <div>
                  <h2 id="revenue-transactions-heading" style={{ margin: 0, fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary }}>
                    Danh sách giao dịch
                  </h2>
                  {transactions && (
                    <p data-testid="revenue-transaction-count" style={{ margin: `${space[1]}px 0 0`, fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>
                      {transactions.total.toLocaleString("vi-VN")} giao dịch khớp bộ lọc
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download size={14} />}
                  loading={isExporting}
                  disabled={isExporting || !transactions || transactions.total === 0}
                  onClick={() => void handleExport()}
                  data-testid="revenue-export-csv"
                >
                  Xuất CSV
                </Button>
              </div>

              {exportError && <ErrorBanner message={exportError} />}
              {exportNotice && (
                <p role="status" style={{ margin: 0, fontFamily: font, fontSize: 12.5, color: C.warning, background: C.warningBg, border: `1px solid ${C.warningBorder}`, borderRadius: radius.md, padding: `${space[2]}px ${space[3]}px` }}>
                  {exportNotice}
                </p>
              )}

              {transactionsQuery.isPending ? (
                <Skeleton variant="row" count={5} />
              ) : transactionsQuery.isError ? (
                <ErrorBanner message={toUserMessage(transactionsQuery.error)} />
              ) : transactions!.rows.length === 0 ? (
                <EmptyState
                  icon={ReceiptText}
                  title="Không có giao dịch nào"
                  description="Không có đơn nào khớp bộ lọc. Thử đổi khoảng thời gian, loại hoặc trạng thái."
                  data-testid="revenue-table-empty"
                />
              ) : (
                <>
                  <RevenueTransactionsTable rows={transactions!.rows} isMobile={isCompact} />
                  <Pagination page={page} pageSize={PAGE_SIZE} total={transactions!.total} onChange={setPage} data-testid="revenue-pagination" />
                </>
              )}
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

export default RevenuePage;
