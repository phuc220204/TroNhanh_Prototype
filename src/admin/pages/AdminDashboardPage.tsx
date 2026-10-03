import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  ArrowRight,
  ArrowUpRight,
  CheckSquare,
  ChevronRight,
  CircleCheck,
  Clock3,
  Layers,
  MessageSquareWarning,
  Settings2,
  Users,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminShell } from "../components/AdminShell";
import { Card, Skeleton } from "../../shared/components/common";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { C, font, radius, space } from "../../shared/theme";
import { toUserMessage } from "../../shared/services/supabase-error";
import { getDashboardStats } from "../services/admin-user-service";

type StatKey = "pending_listings" | "active_listings" | "reported_reviews" | "total_users";

const CARDS: {
  key: StatKey;
  label: string;
  description: (value: number) => string;
  Icon: LucideIcon;
  to: string;
  accent: string;
}[] = [
  {
    key: "pending_listings",
    label: "Tin chờ duyệt",
    description: (value) => value > 0 ? "Đang cần kiểm tra" : "Hàng chờ đang trống",
    Icon: Clock3,
    to: "/quan-tri/kiem-duyet-tin",
    accent: C.primary,
  },
  {
    key: "active_listings",
    label: "Tin đang hiển thị",
    description: () => "Đang công khai trên Marketplace",
    Icon: Layers,
    to: "/quan-tri/kiem-duyet-tin",
    accent: C.available,
  },
  {
    key: "reported_reviews",
    label: "Đánh giá bị báo cáo",
    description: (value) => value > 0 ? "Cần xem xét nội dung" : "Không có báo cáo mới",
    Icon: MessageSquareWarning,
    to: "/quan-tri/danh-gia",
    accent: C.warning,
  },
  {
    key: "total_users",
    label: "Người dùng",
    description: () => "Tài khoản trong hệ thống",
    Icon: Users,
    to: "/quan-tri/nguoi-dung",
    accent: C.secondary,
  },
];

const QUICK_LINKS: { label: string; description: string; path: string; Icon: LucideIcon }[] = [
  { label: "Duyệt tin đăng", description: "Kiểm tra nội dung mới gửi lên", path: "/quan-tri/kiem-duyet-tin", Icon: CheckSquare },
  { label: "Quản lý đánh giá", description: "Xem các đánh giá cần xử lý", path: "/quan-tri/danh-gia", Icon: MessageSquareWarning },
  { label: "Cài đặt hệ thống", description: "Điều chỉnh cấu hình nền tảng", path: "/quan-tri/cai-dat", Icon: Settings2 },
];

export function AdminDashboardPage() {
  const { isMobile, isTablet, width } = useBreakpoint();
  const useTwoColumns = isTablet || width < 1280;
  const statsQuery = useQuery({
    queryKey: ["admin", "dashboardStats"],
    queryFn: getDashboardStats,
  });
  const stats = statsQuery.data;
  const pendingCount = stats?.pending_listings ?? 0;
  const reviewCount = stats?.reported_reviews ?? 0;
  const today = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <AdminShell active="dashboard">
      <div data-testid="admin-dashboard" style={{ maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", gap: space[8] }}>
        <section
          data-testid="admin-dashboard-welcome"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: space[5],
            flexWrap: "wrap",
            background: C.cream,
            border: `1px solid ${C.border}`,
            borderRadius: radius.xl,
            padding: isMobile ? space[5] : space[8],
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 360px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: space[3], color: C.primary, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              <ShieldMark />
              Trung tâm điều hành
            </div>
            <h1 style={{ fontFamily: font, fontSize: isMobile ? 25 : 32, lineHeight: 1.2, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: "-0.025em" }}>
              Tổng quan quản trị
            </h1>
            <p style={{ fontFamily: font, fontSize: 13.5, lineHeight: 1.6, color: C.textSecondary, margin: `${space[2]}px 0 0` }}>
              Theo dõi hoạt động và xử lý các nội dung cần chú ý trên Trọ Nhanh.
            </p>
            <p data-testid="admin-dashboard-date" style={{ fontFamily: font, fontSize: 11.5, fontWeight: 600, color: C.textSecondary, margin: `${space[3]}px 0 0`, textTransform: "capitalize" }}>
              {today}
            </p>
          </div>

          <Link
            to="/quan-tri/kiem-duyet-tin"
            data-testid="admin-dashboard-primary-action"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: space[2],
              minHeight: 46,
              boxSizing: "border-box",
              padding: `${space[3]}px ${space[4]}px`,
              borderRadius: radius.md,
              background: C.primary,
              color: C.white,
              fontFamily: font,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Mở hàng chờ duyệt <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </section>

        {statsQuery.isError && (
          <div role="alert" data-testid="admin-dashboard-error" style={{ display: "flex", alignItems: "center", gap: space[2], background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, fontFamily: font, fontSize: 13 }}>
            <TriangleAlert size={16} aria-hidden="true" /> {toUserMessage(statsQuery.error)}
          </div>
        )}

        <section aria-labelledby="admin-kpi-heading" style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: space[3], flexWrap: "wrap" }}>
            <div>
              <h2 id="admin-kpi-heading" style={{ fontFamily: font, fontSize: 18, lineHeight: 1.35, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
                Tình hình nền tảng
              </h2>
              <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: `${space[1]}px 0 0` }}>
                Các chỉ số được tải trực tiếp từ hệ thống.
              </p>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: space[2], color: C.success, fontFamily: font, fontSize: 11.5, fontWeight: 700 }}>
              <CircleCheck size={15} aria-hidden="true" /> Dữ liệu quản trị
            </div>
          </div>

          {statsQuery.isPending ? (
            <Skeleton variant="card" count={4} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : useTwoColumns ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))", gap: space[4] }}>
              {CARDS.map(({ key, label, description, Icon, to, accent }) => {
                const value = stats?.[key];
                const needsAttention = (key === "pending_listings" && pendingCount > 0)
                  || (key === "reported_reviews" && reviewCount > 0);
                return (
                  <Link
                    key={key}
                    to={to}
                    data-testid={`admin-kpi-${key}`}
                    style={{ display: "block", minWidth: 0, color: "inherit", textDecoration: "none" }}
                  >
                    <Card hoverable padding={space[5]} style={{ height: "100%", boxSizing: "border-box", borderColor: needsAttention ? C.secondary : C.border }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: space[3] }}>
                        <div style={{ width: 42, height: 42, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: radius.md, background: needsAttention ? C.cream : C.bg, color: accent }}>
                          <Icon size={20} aria-hidden="true" />
                        </div>
                        {needsAttention && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: radius.pill, background: C.cream, color: C.primary, padding: `5px ${space[2]}px`, fontFamily: font, fontSize: 10, lineHeight: 1, fontWeight: 800, whiteSpace: "nowrap" }}>
                            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: radius.pill, background: C.primary }} /> Cần xử lý
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: space[5], fontFamily: font, fontSize: 12.5, fontWeight: 600, color: C.textSecondary }}>{label}</div>
                      <div style={{ marginTop: space[1], fontFamily: font, fontSize: isMobile ? 30 : 34, lineHeight: 1.12, fontWeight: 800, color: C.textPrimary, fontVariantNumeric: "tabular-nums" }}>
                        {statsQuery.isError || value == null ? "—" : new Intl.NumberFormat("vi-VN").format(value)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[2], marginTop: space[3] }}>
                        <span style={{ fontFamily: font, fontSize: 11, lineHeight: 1.45, color: needsAttention ? C.primary : C.textSecondary }}>{value == null ? "Chưa có dữ liệu" : description(value)}</span>
                        <ChevronRight size={16} aria-hidden="true" color={C.textSecondary} />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="admin-shortcuts-heading" style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
          <div>
            <h2 id="admin-shortcuts-heading" style={{ fontFamily: font, fontSize: 18, lineHeight: 1.35, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
              Truy cập nhanh
            </h2>
            <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: `${space[1]}px 0 0` }}>
              Đi thẳng đến các công cụ quản trị thường dùng.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : useTwoColumns ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))", gap: space[3] }}>
            {QUICK_LINKS.map(({ label, description: detail, path, Icon }) => (
              <Link key={path} to={path} data-testid={`admin-quick-${path.split("/").at(-1) || "moderation"}`} style={{ color: "inherit", textDecoration: "none", minWidth: 0 }}>
                <Card hoverable padding={space[4]} style={{ display: "flex", alignItems: "center", gap: space[3], minHeight: 80, boxSizing: "border-box" }}>
                  <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: radius.md, background: C.cream, color: C.primary, display: "grid", placeItems: "center" }}>
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: font, fontSize: 12.5, fontWeight: 800, color: C.textPrimary }}>{label}</div>
                    <div style={{ fontFamily: font, fontSize: 11, lineHeight: 1.45, color: C.textSecondary, marginTop: 3 }}>{detail}</div>
                  </div>
                  <ArrowRight size={16} aria-hidden="true" color={C.primary} />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function ShieldMark() {
  return <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center" }}><CheckSquare size={14} /></span>;
}

export default AdminDashboardPage;
