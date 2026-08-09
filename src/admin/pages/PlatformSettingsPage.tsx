import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { AdminShell } from "../components/AdminShell";
import { Skeleton } from "../../shared/components/common";
import { C, font, radius, space } from "../../shared/theme";
import { qk } from "../../shared/query/keys";
import { toUserMessage } from "../../shared/services/supabase-error";
import { getSettings, setAutoApproveListings } from "../services/admin-settings-service";

export function PlatformSettingsPage() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: qk.admin.settings,
    queryFn: getSettings,
  });

  const toggleMutation = useMutation({
    mutationFn: setAutoApproveListings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admin.settings });
      // Đổi chế độ làm tin mới đi vào hàng chờ thay vì Active — làm mới luôn.
      queryClient.invalidateQueries({ queryKey: ["admin", "moderationQueue"] });
    },
  });

  const settings = settingsQuery.data;
  const autoApprove = settings?.autoApproveListings ?? true;

  return (
    <AdminShell active="settings">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[5]}px` }}>
          Cài đặt cấu hình hệ thống
        </h1>

        {toggleMutation.isError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
            <TriangleAlert size={15} /> {toUserMessage(toggleMutation.error)}
          </div>
        )}

        {settingsQuery.isPending ? (
          <Skeleton variant="card" count={2} />
        ) : settingsQuery.isError ? (
          <div style={{ fontFamily: font, fontSize: 13.5, color: C.error }}>
            {toUserMessage(settingsQuery.error)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: space[5] }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: space[4] }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[1]}px` }}>
                    Chế độ kiểm duyệt tin đăng
                  </p>
                  <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0, lineHeight: 1.55 }}>
                    <strong>Tự động:</strong> tin hiển thị ngay sau khi đăng.<br />
                    <strong>Thủ công:</strong> tin phải được duyệt trước khi hiển thị.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={!autoApprove}
                  disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate(!autoApprove)}
                  data-testid="auto-approve-toggle"
                  style={{
                    flexShrink: 0,
                    fontFamily: font, fontSize: 13, fontWeight: 700,
                    color: autoApprove ? C.textSecondary : C.white,
                    background: autoApprove ? C.cream : C.primary,
                    border: `1px solid ${autoApprove ? C.border : C.primary}`,
                    borderRadius: radius.pill,
                    padding: `${space[2]}px ${space[4]}px`,
                    cursor: toggleMutation.isPending ? "wait" : "pointer",
                    minWidth: 110,
                  }}
                >
                  {autoApprove ? "Tự động" : "Thủ công"}
                </button>
              </div>

              <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: `${space[3]}px 0 0` }}>
                Cả hai chế độ đều ghi một dòng vào nhật ký kiểm duyệt, nên vòng đời tin luôn truy vết được.
              </p>
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: space[5] }}>
              <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[1]}px` }}>
                Hạn hiển thị tin được duyệt
              </p>
              <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>
                {settings?.listingTtlDays ?? 60} ngày kể từ lúc duyệt (BR-026). Chỉ đọc ở phiên bản này.
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

export default PlatformSettingsPage;
