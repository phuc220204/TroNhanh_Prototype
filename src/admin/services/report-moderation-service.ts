import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

/**
 * Hàng chờ báo cáo vi phạm. Chỉ gọi RPC moderator (CLAUDE.md §2.3):
 * `list_open_reports` (gom theo đối tượng) và `resolve_reports` (ẩn/bỏ qua,
 * ghi moderation_logs trong cùng transaction).
 */

export type ReportTargetType = "RentalListing" | "Review" | "DemandPost";

export interface OpenReportRow {
  target_type: ReportTargetType;
  target_id: string;
  target_title: string;
  target_owner_id: string | null;
  report_count: number;
  reasons: string[];
  latest_details: string | null;
  first_reported_at: string;
  last_reported_at: string;
}

export async function listOpenReports(): Promise<OpenReportRow[]> {
  try {
    const { data, error } = await supabase.rpc("list_open_reports");
    if (error) throw error;
    return (data || []) as OpenReportRow[];
  } catch (err) {
    logError("report-moderation-service.listOpenReports", err);
    throw err;
  }
}

/** `hide = true` ⇒ ẩn nội dung (bắt buộc `note`) và đóng báo cáo; `false` ⇒ bỏ qua báo cáo. */
export async function resolveReports(targetType: ReportTargetType, targetId: string, hide: boolean, note: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("resolve_reports", {
      p_target_type: targetType,
      p_target_id: targetId,
      p_hide: hide,
      ...(note.trim() ? { p_note: note.trim() } : {}),
    });
    if (error) throw error;
  } catch (err) {
    logError("report-moderation-service.resolveReports", err);
    throw err;
  }
}
