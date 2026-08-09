import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, TriangleAlert, Search } from "lucide-react";
import { AdminShell } from "../components/AdminShell";
import { EmptyState, Skeleton, Button } from "../../shared/components/common";
import { C, font, radius, space } from "../../shared/theme";
import { qk } from "../../shared/query/keys";
import { toUserMessage } from "../../shared/services/supabase-error";
import { listUsers, grantRole, revokeRole, type GrantableRole } from "../services/admin-user-service";

const GRANTABLE: GrantableRole[] = ["Seller", "Moderator"];

export function UserManagementPage() {
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: qk.admin.users(applied),
    queryFn: () => listUsers(applied),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role, grant }: { userId: string; role: GrantableRole; grant: boolean }) =>
      grant ? grantRole(userId, role) : revokeRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const rows = usersQuery.data ?? [];

  return (
    <AdminShell active="users">
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[2]}px` }}>
          Quản lý người dùng & Phân quyền
        </h1>
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: `0 0 ${space[5]}px` }}>
          Chỉ cấp được vai trò <strong>Seller</strong> và <strong>Moderator</strong>. Vai trò <strong>Admin</strong> cố ý
          không cấp qua giao diện — phải chạy SQL thủ công, để không tồn tại đường tự nâng quyền trong ứng dụng.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); setApplied(search); }}
          style={{ display: "flex", gap: space[2], marginBottom: space[4] }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            <Search size={15} color={C.textSecondary} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email"
              data-testid="admin-user-search"
              style={{
                width: "100%", fontFamily: font, fontSize: 14, color: C.textPrimary,
                padding: `${space[3]}px ${space[3]}px ${space[3]}px 38px`,
                background: C.white, border: `1.5px solid ${C.border}`,
                borderRadius: radius.md, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <Button type="submit">Tìm</Button>
        </form>

        {roleMutation.isError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
            <TriangleAlert size={15} /> {toUserMessage(roleMutation.error)}
          </div>
        )}

        {usersQuery.isPending ? (
          <Skeleton variant="row" count={5} />
        ) : usersQuery.isError ? (
          <EmptyState icon={TriangleAlert} title="Không tải được danh sách" description={toUserMessage(usersQuery.error)} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Không có người dùng nào"
            description="Danh sách chỉ hiển thị với tài khoản Admin. Nếu bạn là Moderator, mục này sẽ trống."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            {rows.map((u) => (
              <div
                key={u.user_id}
                data-testid="admin-user-row"
                style={{
                  display: "flex", alignItems: "center", gap: space[4], flexWrap: "wrap",
                  background: C.white, border: `1px solid ${C.border}`,
                  borderRadius: radius.md, padding: space[4],
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
                    {u.full_name || "(chưa đặt tên)"}
                  </p>
                  <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: "2px 0 0" }}>{u.email}</p>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {u.roles.length === 0 ? (
                    <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>Chưa có vai trò</span>
                  ) : (
                    u.roles.map((r) => (
                      <span key={r} style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color: C.primary, background: C.cream, borderRadius: radius.pill, padding: "3px 10px" }}>
                        {r}
                      </span>
                    ))
                  )}
                </div>

                <div style={{ display: "flex", gap: space[2] }}>
                  {GRANTABLE.map((role) => {
                    const has = u.roles.includes(role);
                    return (
                      <Button
                        key={role}
                        size="sm"
                        variant={has ? "outline" : "secondary"}
                        disabled={roleMutation.isPending}
                        onClick={() => roleMutation.mutate({ userId: u.user_id, role, grant: !has })}
                        data-testid={`role-toggle-${role}`}
                      >
                        {has ? `Thu hồi ${role}` : `Cấp ${role}`}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

export default UserManagementPage;
