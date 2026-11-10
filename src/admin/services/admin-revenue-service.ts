import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";
import {
  isOrderStatus,
  isRevenueKind,
  type OrderStatus,
  type RevenueKind,
} from "../../shared/utils/statusMaps";

/**
 * Thống kê giao dịch nền tảng (/quan-tri/doanh-thu) — CHỈ qua RPC admin (§2.3).
 * Cả hai RPC assert `has_role(auth.uid(), 'Admin')` bên trong body
 * (migration 20261110100000); guard ở UI chỉ để Moderator không gọi thừa.
 *
 * Doanh thu = mọi đơn đã nhận tiền (`paid_at` có giá trị), cộng `amount` lưu
 * trên đơn — không tính lại từ cấu hình giá hiện tại.
 */

export type RevenueGranularity = "day" | "month";

export interface RevenueSummaryRow {
  /** "YYYY-MM-DD" — ngày đầu kỳ theo giờ Việt Nam. */
  bucket: string;
  kind: RevenueKind;
  amount: number;
  orderCount: number;
}

export interface RevenueTransactionFilters {
  /** "YYYY-MM-DD", tính theo giờ Việt Nam, gồm cả hai đầu. */
  from: string;
  to: string;
  kind: RevenueKind | null;
  status: OrderStatus | null;
  isPaidOnly: boolean;
}

export interface RevenueTransaction {
  kind: RevenueKind;
  orderCode: number;
  buyerId: string;
  buyerName: string | null;
  buyerEmail: string | null;
  itemLabel: string;
  amount: number;
  status: OrderStatus | null;
  /** Giá trị thô khi status lạ (không đoán bừa nhãn). */
  rawStatus: string;
  createdAt: string;
  paidAt: string | null;
}

export interface RevenueTransactionPage {
  rows: RevenueTransaction[];
  total: number;
}

/** Trần số dòng một lần xuất CSV — khớp clamp trong RPC. */
export const REVENUE_EXPORT_LIMIT = 5000;

export async function getRevenueSummary(
  from: string,
  to: string,
  granularity: RevenueGranularity,
): Promise<RevenueSummaryRow[]> {
  try {
    const { data, error } = await supabase.rpc("admin_revenue_summary", {
      p_from: from,
      p_to: to,
      p_granularity: granularity,
    });
    if (error) throw error;
    return (data || [])
      .filter((row) => isRevenueKind(row.kind))
      .map((row) => ({
        bucket: row.bucket,
        kind: row.kind as RevenueKind,
        // bigint về dạng number|string tùy driver ⇒ ép số một chỗ.
        amount: Number(row.amount),
        orderCount: Number(row.order_count),
      }));
  } catch (err) {
    logError("admin-revenue-service.getRevenueSummary", err);
    throw err;
  }
}

async function fetchTransactions(
  filters: RevenueTransactionFilters,
  limit: number,
  offset: number,
): Promise<RevenueTransactionPage> {
  const { data, error } = await supabase.rpc("admin_list_revenue_transactions", {
    p_from: filters.from,
    p_to: filters.to,
    p_kind: filters.kind ?? undefined,
    p_status: filters.status ?? undefined,
    p_paid_only: filters.isPaidOnly,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  const rows = (data || [])
    .filter((row) => isRevenueKind(row.kind))
    .map((row) => ({
      kind: row.kind as RevenueKind,
      orderCode: Number(row.order_code),
      buyerId: row.buyer_id,
      buyerName: row.buyer_name ?? null,
      buyerEmail: row.buyer_email ?? null,
      itemLabel: row.item_label,
      amount: Number(row.amount),
      status: isOrderStatus(row.status) ? row.status : null,
      rawStatus: row.status,
      createdAt: row.created_at,
      paidAt: row.paid_at ?? null,
    }));
  // total_count lặp trên mọi dòng (count(*) over ()); trang rỗng ⇒ 0.
  const total = data && data.length > 0 ? Number(data[0]!.total_count) : 0;
  return { rows, total };
}

export async function listRevenueTransactions(
  filters: RevenueTransactionFilters,
  page: number,
  pageSize: number,
): Promise<RevenueTransactionPage> {
  try {
    return await fetchTransactions(filters, pageSize, (page - 1) * pageSize);
  } catch (err) {
    logError("admin-revenue-service.listRevenueTransactions", err);
    throw err;
  }
}

/** Toàn bộ đơn khớp bộ lọc (tối đa REVENUE_EXPORT_LIMIT) cho xuất CSV. */
export async function listRevenueTransactionsForExport(
  filters: RevenueTransactionFilters,
): Promise<RevenueTransactionPage> {
  try {
    return await fetchTransactions(filters, REVENUE_EXPORT_LIMIT, 0);
  } catch (err) {
    logError("admin-revenue-service.listRevenueTransactionsForExport", err);
    throw err;
  }
}
