import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { CheckSquare, MessageSquare, Users, Layers, TriangleAlert } from "lucide-react";
import { AdminShell } from "../components/AdminShell";
import { Skeleton } from "../../shared/components/common";
import { C, font, radius, space } from "../../shared/theme";
import { toUserMessage } from "../../shared/services/supabase-error";
import { getDashboardStats } from "../services/admin-user-service";

const CARDS = [
  { key: "pending_listings", label: "Tin chờ duyệt",   Icon: CheckSquare,    to: "/quan-tri/kiem-duyet-tin" },
  { key: "active_listings",  label: "Tin đang hiển thị", Icon: Layers,       to: "/quan-tri/kiem-duyet-tin" },
  { key: "reported_reviews", label: "Đánh giá bị báo cáo", Icon: MessageSquare, to: "/quan-tri/danh-gia" },
  { key: "total_users",      label: "Tổng người dùng",  Icon: Users,          to: "/quan-tri/nguoi-dung" },
] as const;

export function AdminDashboardPage() {
  const statsQuery = useQuery({
    queryKey: ["admin", "dashboardStats"],
    queryFn: getDashboardStats,
  });

  return (
    <AdminShell active="dashboard">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[5]}px` }}>
          Tổng quan hệ thống Quản trị
        </h1>

        {statsQuery.isPending ? (
          <Skeleton variant="card" count={4} />
        ) : statsQuery.isError ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, fontFamily: font, fontSize: 13 }}>
            <TriangleAlert size={15} /> {toUserMessage(statsQuery.error)}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: space[4] }}>
            {CARDS.map(({ key, label, Icon, to }) => (
              <Link
                key={key}
                to={to}
                data-testid={`admin-kpi-${key}`}
                style={{
                  display: "block", textDecoration: "none",
                  background: C.white, border: `1px solid ${C.border}`,
                  borderRadius: radius.xl, padding: space[5],
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: space[3] }}>
                  <div style={{ width: 34, height: 34, borderRadius: radius.sm, background: C.cream, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} color={C.primary} />
                  </div>
                  <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textSecondary }}>{label}</span>
                </div>
                <span style={{ fontFamily: font, fontSize: 28, fontWeight: 800, color: C.textPrimary }}>
                  {statsQuery.data?.[key] ?? 0}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

export default AdminDashboardPage;
