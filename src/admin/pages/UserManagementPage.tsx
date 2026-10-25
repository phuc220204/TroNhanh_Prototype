import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, TriangleAlert, Search, Lock, LockOpen } from "lucide-react";
import { AdminShell } from "../components/AdminShell";
import { EmptyState, Skeleton, Button, ModalShell, Pagination } from "../../shared/components/common";
import { C, font, radius, space } from "../../shared/theme";
import { qk } from "../../shared/query/keys";
import { toUserMessage } from "../../shared/services/supabase-error";
import { listUsers, grantRole, revokeRole, setUserLock, type AdminUserRow, type GrantableRole } from "../services/admin-user-service";
import { listSubscriptions } from "../services/admin-business-service";
import { formatDate } from "../../shared/utils/format";
import type { SubscriptionStatus } from "../../shared/types/status";

const GRANTABLE: GrantableRole[] = ["Seller", "Moderator"];

/** Lọc theo vai trò ở client: `admin_list_users` trả tối đa 200 người mới nhất. */
type RoleFilter = "all" | "Seller" | "Moderator" | "Admin" | "renterOnly";
const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "Seller", label: "Seller" },
  { key: "Moderator", label: "Moderator" },
  { key: "Admin", label: "Admin" },
  // Mọi tài khoản đều có vai trò Renter ⇒ lọc "chỉ đi thuê" thay vì "chưa có vai trò" (luôn rỗng).
  { key: "renterOnly", label: "Chỉ người thuê" },
];
const PAGE_SIZE = 20;

const SUBSCRIPTION_LABEL: Record<SubscriptionStatus, string> = {
  NONE: "Chưa có gói",
  TRIAL: "Dùng thử",
  ACTIVE: "Đang hoạt động",
  READ_ONLY: "Hết hạn — chỉ xem",
};

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.admin.usersAll }),
  });

  const [lockTarget, setLockTarget] = useState<AdminUserRow | null>(null);
  const [lockReason, setLockReason] = useState("");

  const lockMutation = useMutation({
    mutationFn: ({ userId, locked, reason }: { userId: string; locked: boolean; reason: string }) =>
      setUserLock(userId, locked, reason),
    onSuccess: () => {
      setLockTarget(null);
      setLockReason("");
      void queryClient.invalidateQueries({ queryKey: qk.admin.usersAll });
    },
  });

  const rows = usersQuery.data ?? [];
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [page, setPage] = useState(1);

  // Gói của từng tài khoản (RPC admin riêng — không đổi `admin_list_users`).
  // Lỗi thì cột gói ghi "—", danh sách người dùng vẫn dùng được.
  const subscriptionsQuery = useQuery({ queryKey: qk.admin.subscriptions, queryFn: listSubscriptions });
  const subscriptionByUser = useMemo(
    () => new Map((subscriptionsQuery.data ?? []).map((s) => [s.seller_id, s])),
    [subscriptionsQuery.data],
  );

  const filteredRows = useMemo(() => rows.filter((u) => {
    if (roleFilter === "all") return true;
    if (roleFilter === "renterOnly") return !u.roles.some((role) => role === "Seller" || role === "Moderator" || role === "Admin");
    return u.roles.includes(roleFilter);
  }), [rows, roleFilter]);
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const describeSubscription = (userId: string) => {
    if (subscriptionsQuery.isError) return "—";
    if (subscriptionsQuery.isPending) return "…";
    const subscription = subscriptionByUser.get(userId);
    if (!subscription) return SUBSCRIPTION_LABEL.NONE;
    const name = subscription.plan_name ? ` · ${subscription.plan_name}` : "";
    const until = subscription.expire_date ? ` · đến ${formatDate(subscription.expire_date)}` : "";
    return `${SUBSCRIPTION_LABEL[subscription.status]}${name}${until}`;
  };

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
          <Button type="submit" onClick={() => setPage(1)}>Tìm</Button>
        </form>

        {lockMutation.isError && !lockTarget && (
          <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
            <TriangleAlert size={15} /> {toUserMessage(lockMutation.error)}
          </div>
        )}

        {roleMutation.isError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
            <TriangleAlert size={15} /> {toUserMessage(roleMutation.error)}
          </div>
        )}

        <div role="group" aria-label="Lọc theo vai trò" style={{ display: "flex", gap: space[2], flexWrap: "wrap", marginBottom: space[4] }}>
          {ROLE_FILTERS.map((f) => {
            const isActive = f.key === roleFilter;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => { setRoleFilter(f.key); setPage(1); }}
                data-testid={`admin-user-role-filter-${f.key}`}
                style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: isActive ? C.white : C.textSecondary, background: isActive ? C.primary : C.white, border: `1px solid ${isActive ? C.primary : C.border}`, borderRadius: radius.pill, padding: `${space[2]}px ${space[4]}px`, cursor: "pointer" }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {usersQuery.isPending ? (
          <Skeleton variant="row" count={5} />
        ) : usersQuery.isError ? (
          <EmptyState icon={TriangleAlert} title="Không tải được danh sách" description={toUserMessage(usersQuery.error)} />
        ) : filteredRows.length === 0 ? (
          rows.length > 0 ? (
            <EmptyState icon={Users} title="Không có người dùng nào với vai trò này" description="Chọn bộ lọc vai trò khác." data-testid="admin-user-filter-empty" />
          ) : (
          <EmptyState
            icon={Users}
            title="Không có người dùng nào"
            description="Danh sách chỉ hiển thị với tài khoản Admin. Nếu bạn là Moderator, mục này sẽ trống."
          />
          )
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            <p data-testid="admin-user-count" style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: `0 0 ${space[1]}px` }}>
              {filteredRows.length} người dùng{rows.length >= 200 ? " (trong 200 tài khoản mới nhất — tìm theo tên/email để thu hẹp)" : ""}
            </p>
            {pageRows.map((u) => (
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
                  <p data-testid="admin-user-meta" style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "4px 0 0" }}>
                    Tạo ngày {formatDate(u.created_at)} · Gói: {describeSubscription(u.user_id)}
                  </p>
                  {u.locked_until && (
                    <span data-testid="user-locked-badge" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontFamily: font, fontSize: 11.5, fontWeight: 700, color: C.error, background: C.errorBg, borderRadius: radius.pill, padding: "3px 10px" }}>
                      <Lock size={11} /> Đã khóa
                    </span>
                  )}
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

                <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
                  {!u.roles.includes("Admin") && (
                    u.locked_until ? (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<LockOpen size={13} />}
                        loading={lockMutation.isPending && lockMutation.variables?.userId === u.user_id}
                        disabled={lockMutation.isPending}
                        onClick={() => lockMutation.mutate({ userId: u.user_id, locked: false, reason: "" })}
                        data-testid="user-unlock-btn"
                      >
                        Mở khóa
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<Lock size={13} />}
                        disabled={lockMutation.isPending}
                        onClick={() => { lockMutation.reset(); setLockReason(""); setLockTarget(u); }}
                        data-testid="user-lock-btn"
                      >
                        Khóa
                      </Button>
                    )
                  )}
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
            <Pagination page={page} pageSize={PAGE_SIZE} total={filteredRows.length} onChange={setPage} data-testid="admin-user-pagination" style={{ marginTop: space[3] }} />
          </div>
        )}
      </div>

      {lockTarget && (
        <ModalShell
          title="Khóa tài khoản"
          onClose={() => { if (!lockMutation.isPending) setLockTarget(null); }}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setLockTarget(null)} disabled={lockMutation.isPending}>Hủy</Button>
              <Button
                variant="danger"
                loading={lockMutation.isPending}
                disabled={!lockReason.trim()}
                onClick={() => lockMutation.mutate({ userId: lockTarget.user_id, locked: true, reason: lockReason })}
                data-testid="user-lock-confirm"
              >
                Khóa tài khoản
              </Button>
            </>
          )}
        >
          <p style={{ margin: 0, fontFamily: font, fontSize: 13.5, color: C.textPrimary, lineHeight: 1.55 }}>
            <strong>{lockTarget.full_name || lockTarget.email}</strong> sẽ không đăng nhập được nữa và bị đăng xuất khỏi mọi thiết bị
            (phiên đang mở hết hiệu lực trong tối đa 1 giờ). Tin đăng của họ <strong>không</strong> tự ẩn — xử lý ở Báo cáo vi phạm.
          </p>
          <textarea
            value={lockReason}
            onChange={(e) => setLockReason(e.target.value.slice(0, 1000))}
            placeholder="Lý do khóa (ghi vào nhật ký kiểm duyệt)"
            rows={3}
            data-testid="user-lock-reason"
            style={{ width: "100%", boxSizing: "border-box", fontFamily: font, fontSize: 13.5, padding: space[3], border: `1.5px solid ${C.border}`, borderRadius: radius.sm, resize: "vertical" }}
          />
          {lockMutation.isError && <p role="alert" style={{ margin: 0, fontFamily: font, fontSize: 13, color: C.error }}>{toUserMessage(lockMutation.error)}</p>}
        </ModalShell>
      )}
    </AdminShell>
  );
}

export default UserManagementPage;
