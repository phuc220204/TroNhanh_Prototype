import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

/** Đối tượng báo cáo được — khớp CHECK của bảng `content_reports`. */
export type ReportTargetType = "RentalListing" | "Review" | "DemandPost";

export type ReportReason = "Scam" | "WrongInfo" | "AlreadyRented" | "Duplicate" | "Offensive" | "Other";

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  Scam: "Lừa đảo, đòi chuyển tiền trước khi xem phòng",
  WrongInfo: "Thông tin sai sự thật (giá, ảnh, địa chỉ)",
  AlreadyRented: "Phòng đã cho thuê nhưng tin vẫn hiện",
  Duplicate: "Tin trùng lặp",
  Offensive: "Nội dung xúc phạm, không phù hợp",
  Other: "Lý do khác",
};

/**
 * Gửi báo cáo vi phạm. Chủ sở hữu, trạng thái hiển thị và chống báo cáo trùng
 * đều do RPC `report_content` kiểm — client chỉ gửi đối tượng + lý do.
 */
export async function reportContent(
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
  details: string,
): Promise<void> {
  try {
    const { error } = await supabase.rpc("report_content", {
      p_target_type: targetType,
      p_target_id: targetId,
      p_reason: reason,
      ...(details.trim() ? { p_details: details.trim() } : {}),
    });
    if (error) throw error;
  } catch (err) {
    logError("report-service.reportContent", err);
    throw err;
  }
}
