import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, TriangleAlert, ExternalLink, EyeOff, X } from "lucide-react";
import { AdminShell } from "../components/AdminShell";
import { EmptyState, Skeleton, Button } from "../../shared/components/common";
import { ModalShell } from "../../shared/components/common/ModalShell";
import { C, font, radius, space } from "../../shared/theme";
import { qk } from "../../shared/query/keys";
import { toUserMessage } from "../../shared/services/supabase-error";
import { listOpenReports, resolveReports, type OpenReportRow, type ReportTargetType } from "../services/report-moderation-service";

const TYPE_LABEL: Record<ReportTargetType, string> = {
  RentalListing: "Tin cho thuê",
  Review: "Đánh giá",
  DemandPost: "Tin nhu cầu",
};

// Nhãn ngắn cho hàng chờ; bản đầy đủ người dùng chọn nằm ở marketplace/services/report-service.
const REASON_LABEL: Record<string, string> = {
  Scam: "Lừa đảo",
  WrongInfo: "Sai thông tin",
  AlreadyRented: "Đã cho thuê",
  Duplicate: "Trùng lặp",
  Offensive: "Xúc phạm",
  Other: "Khác",
};

/** Đường xem nội dung gốc. Đánh giá không có trang riêng ⇒ không có link. */
function targetHref(row: OpenReportRow): string | null {
  if (row.target_type === "RentalListing") return `#/phong/${row.target_id}`;
  if (row.target_type === "DemandPost") return `#/tin-nhu-cau/${row.target_id}`;
  return null;
}

const rowKey = (row: OpenReportRow) => `${row.target_type}:${row.target_id}`;

/** /quan-tri/bao-cao — hàng chờ báo cáo vi phạm từ người dùng. */
export function ReportModerationPage() {
  const queryClient = useQueryClient();
  const [hideTarget, setHideTarget] = useState<OpenReportRow | null>(null);
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reportsQuery = useQuery({ queryKey: qk.admin.openReports, queryFn: listOpenReports });

  const resolveMutation = useMutation({
    mutationFn: ({ row, hide, why }: { row: OpenReportRow; hide: boolean; why: string }) =>
      resolveReports(row.target_type, row.target_id, hide, why),
    onSuccess: () => {
      setErrorMessage(null);
      setHideTarget(null);
      setNote("");
      void queryClient.invalidateQueries({ queryKey: qk.admin.openReports });
      void queryClient.invalidateQueries({ queryKey: qk.admin.dashboardStats });
    },
    onError: (err) => setErrorMessage(toUserMessage(err)),
  });

  const rows = reportsQuery.data ?? [];

  return (
    <AdminShell active="reports">
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[2]}px` }}>
          Báo cáo vi phạm
        </h1>
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: `0 0 ${space[5]}px` }}>
          Báo cáo từ người dùng, gom theo nội dung. <strong>Ẩn</strong> gỡ nội dung khỏi trang công khai và ghi nhật ký (bắt buộc lý do);
          <strong> Bỏ qua</strong> đóng báo cáo, giữ nguyên nội dung.
        </p>

        {errorMessage && (
          <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
            <TriangleAlert size={15} /> {errorMessage}
          </div>
        )}

        {reportsQuery.isPending ? (
          <Skeleton variant="card" count={2} />
        ) : reportsQuery.isError ? (
          <EmptyState icon={TriangleAlert} title="Không tải được hàng chờ" description={toUserMessage(reportsQuery.error)} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Flag} title="Không có báo cáo nào đang chờ" description="Báo cáo mới từ người dùng sẽ hiện ở đây." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
            {rows.map((row) => {
              const href = targetHref(row);
              const isBusy = resolveMutation.isPending && resolveMutation.variables?.row && rowKey(resolveMutation.variables.row) === rowKey(row);
              return (
                <div key={rowKey(row)} data-testid="report-row" style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: space[4], fontFamily: font }}>
                  <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap", marginBottom: space[2] }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: C.primary, background: C.cream, borderRadius: radius.pill, padding: "3px 10px" }}>{TYPE_LABEL[row.target_type]}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: C.error, background: C.errorBg, borderRadius: radius.pill, padding: "3px 10px" }}>{row.report_count} báo cáo</span>
                    {row.reasons.map((reason) => (
                      <span key={reason} style={{ fontSize: 11.5, color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: radius.pill, padding: "2px 9px" }}>{REASON_LABEL[reason] ?? reason}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 14.5, fontWeight: 700, color: C.textPrimary, margin: "0 0 4px", lineHeight: 1.45 }}>{row.target_title}</p>
                  {row.latest_details && (
                    <p style={{ fontSize: 13, color: C.textSecondary, margin: "0 0 4px", lineHeight: 1.5 }}>“{row.latest_details}”</p>
                  )}
                  <p style={{ fontSize: 12, color: C.textSecondary, margin: `0 0 ${space[3]}px` }}>
                    Báo cáo gần nhất: {new Date(row.last_reported_at).toLocaleString("vi-VN")}
                  </p>
                  <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
                    {href && (
                      <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: C.primary, textDecoration: "none", padding: "6px 4px" }}>
                        <ExternalLink size={14} /> Xem nội dung
                      </a>
                    )}
                    <Button size="sm" variant="danger" icon={<EyeOff size={14} />} disabled={Boolean(isBusy)} onClick={() => { setErrorMessage(null); setNote(""); setHideTarget(row); }} data-testid="report-hide-btn">
                      Ẩn nội dung
                    </Button>
                    <Button size="sm" variant="outline" icon={<X size={14} />} loading={Boolean(isBusy)} onClick={() => resolveMutation.mutate({ row, hide: false, why: "" })} data-testid="report-dismiss-btn">
                      Bỏ qua
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {hideTarget && (
        <ModalShell
          title={`Ẩn ${TYPE_LABEL[hideTarget.target_type].toLowerCase()}`}
          onClose={() => { if (!resolveMutation.isPending) setHideTarget(null); }}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setHideTarget(null)} disabled={resolveMutation.isPending}>Hủy</Button>
              <Button variant="danger" loading={resolveMutation.isPending} disabled={!note.trim()} onClick={() => resolveMutation.mutate({ row: hideTarget, hide: true, why: note })} data-testid="report-hide-confirm">
                Ẩn và đóng báo cáo
              </Button>
            </>
          )}
        >
          <p style={{ margin: 0, fontFamily: font, fontSize: 13.5, color: C.textPrimary, lineHeight: 1.55 }}>{hideTarget.target_title}</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 1000))}
            placeholder="Lý do ẩn (ghi vào nhật ký kiểm duyệt)"
            rows={3}
            data-testid="report-hide-note"
            style={{ width: "100%", boxSizing: "border-box", fontFamily: font, fontSize: 13.5, padding: space[3], border: `1.5px solid ${C.border}`, borderRadius: radius.sm, resize: "vertical" }}
          />
        </ModalShell>
      )}
    </AdminShell>
  );
}

export default ReportModerationPage;
