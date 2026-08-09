import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, TriangleAlert } from "lucide-react";
import { AdminShell } from "../../components/AdminShell";
import { EmptyState, Skeleton } from "../../../shared/components/common";
import { C, font, radius, space } from "../../../shared/theme";
import { qk } from "../../../shared/query/keys";
import { toUserMessage } from "../../../shared/services/supabase-error";
import {
  listListingsForModeration,
  moderateListing,
  type ModerationAction,
  type ModerationFilter,
} from "../../services/moderation-service";
import { ModerationRowCard } from "./ModerationRow";
import { RejectDialog } from "./RejectDialog";

const FILTERS: { key: ModerationFilter; label: string }[] = [
  { key: "PendingApproval", label: "Chờ duyệt" },
  { key: "Rejected", label: "Bị từ chối" },
  { key: "Active", label: "Đang hiển thị" },
  { key: "All", label: "Tất cả" },
];

export function ListingModerationPage() {
  const [filter, setFilter] = useState<ModerationFilter>("PendingApproval");
  const [rejectTarget, setRejectTarget] = useState<{ id: string; title: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: qk.admin.moderationQueue(filter),
    queryFn: () => listListingsForModeration(filter),
  });

  const mutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: ModerationAction; reason?: string }) =>
      moderateListing(id, action, reason),
    onSuccess: () => {
      setErrorMessage(null);
      setRejectTarget(null);
      // Mọi tab đều đổi sau một action (tin rời hàng chờ sang Active/Rejected).
      queryClient.invalidateQueries({ queryKey: ["admin", "moderationQueue"] });
    },
    onError: (err) => setErrorMessage(toUserMessage(err)),
  });

  const rows = listQuery.data ?? [];

  return (
    <AdminShell active="moderation">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[2]}px` }}>
          Kiểm duyệt tin đăng
        </h1>
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: `0 0 ${space[5]}px` }}>
          Tin chỉ hiển thị công khai sau khi được duyệt, khi chế độ kiểm duyệt đang đặt là Thủ công.
        </p>

        <div style={{ display: "flex", gap: space[2], marginBottom: space[4], flexWrap: "wrap" }}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                data-testid={`moderation-filter-${f.key}`}
                style={{
                  fontFamily: font, fontSize: 13, fontWeight: 700,
                  color: active ? C.white : C.textSecondary,
                  background: active ? C.primary : C.white,
                  border: `1px solid ${active ? C.primary : C.border}`,
                  borderRadius: radius.pill,
                  padding: `${space[2]}px ${space[4]}px`,
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {errorMessage && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
            <TriangleAlert size={15} /> {errorMessage}
          </div>
        )}

        {listQuery.isPending ? (
          <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
            <Skeleton variant="card" count={3} />
          </div>
        ) : listQuery.isError ? (
          <EmptyState
            icon={TriangleAlert}
            title="Không tải được hàng chờ"
            description={toUserMessage(listQuery.error)}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title={filter === "PendingApproval" ? "Không có tin nào chờ duyệt" : "Không có tin nào trong mục này"}
            description={filter === "PendingApproval" ? "Mọi tin đăng đều đã được xử lý." : undefined}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
            {rows.map((row) => (
              <ModerationRowCard
                key={row.id}
                row={row}
                busy={mutation.isPending}
                onApprove={() => mutation.mutate({ id: row.id, action: "Approve" })}
                onHide={() => mutation.mutate({ id: row.id, action: "Hide" })}
                onRestore={() => mutation.mutate({ id: row.id, action: "Restore" })}
                onReject={() => { setErrorMessage(null); setRejectTarget({ id: row.id, title: row.title }); }}
              />
            ))}
          </div>
        )}
      </div>

      {rejectTarget && (
        <RejectDialog
          listingTitle={rejectTarget.title}
          submitting={mutation.isPending}
          onCancel={() => setRejectTarget(null)}
          onConfirm={(reason) => mutation.mutate({ id: rejectTarget.id, action: "Reject", reason })}
        />
      )}
    </AdminShell>
  );
}

export default ListingModerationPage;
