import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Building2, FileText, Plus, Zap, ChevronRight,
  Home, Users, CheckSquare, AlertTriangle, TrendingUp, KeyRound, CalendarClock,
} from "lucide-react";
import { C, font, shadow } from "../../../shared/theme";
import { useBreakpoint } from "../../../shared/components/useBreakpoint";
import { LandlordShell } from "../../../shared/components/LandlordShell";
import { formatVnd } from "../../../shared/utils/format";
import type { RoomStatus } from "../../../shared/types/status";
import { EmptyState, Button, Toast, Skeleton } from "../../../shared/components/common";
import { logError } from "../../../shared/services/supabase-error";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useCanWrite } from "../../../shared/contexts/SubscriptionContext";
import { getPropertiesByOwnerOrThrow } from "../../services/property-service";
import { getRoomsByOwnerOrThrow } from "../../services/room-service";
import { getDashboardMetrics, type DashboardKPIs } from "../../services/dashboard-service";
import { DUE_SOON_DAYS } from "../../services/invoice-due";
import { getMyListings } from "../../../marketplace/services/listing-queries";
import {
  PrimaryBtn, GhostBtn, StatusChip, PayText, PropertySelector,
  SegmentedBar, RoomTaskBtn, UtilityCard, ListingRow, Footer,
} from "./atoms";
import { UtilityModal } from "./UtilityModal";
import { KpiGrid, type DashboardKpi } from "./KpiGrid";
import { DueInvoicesPanel } from "./DueInvoicesPanel";
// Bản dùng chung ở `workspace/components/`, KHÔNG phải bản sao cũ trong thư mục
// này. Bản cũ gửi `owner_id` từ client (§6.1), `insert` thẳng vào `rooms` từ
// component thay vì qua service layer, và không có ô đơn giá riêng của phòng —
// nên tạo phòng từ dashboard là mất luôn tính năng đó.
import { AddRoomModal } from "../../components/AddRoomModal";

/**
 * Hộp thư hỗ trợ thật của nhóm. Đặt thành hằng số để không rải địa chỉ khắp nơi
 * — đổi email thì sửa đúng một chỗ.
 */
const SUPPORT_EMAIL = "tronhanh2026@gmail.com";
const SUPPORT_EMAIL_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("[Trọ Nhanh] Yêu cầu hỗ trợ")}`;

export function ChuTroDashboardPage() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useBreakpoint();
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Chủ trọ";

  const [properties, setProperties] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [realListings, setRealListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(false);

  const [property, setProperty] = useState("all");
  const [modal, setModal] = useState<null | "utility" | "room">(null);
  const [revealKPIs, setRevealKPIs] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  // `canWrite` = BR-015, quyết định được GHI hay không (false cho cả NONE lẫn
  // READ_ONLY). READ_ONLY vẫn phải xem được dữ liệu. Trạng thái NONE (chưa kích
  // hoạt gói) do `LandlordShell` chặn bằng màn mời dùng thử — trang này không tự
  // kiểm tra lại. (Trước đây trang đọc `useLandlordShell()` NGOÀI Provider nên
  // luôn nhận "NONE": người đã trả tiền vẫn thấy banner khóa và bị chặn chuyển trang.)
  const canWrite = useCanWrite();

  const toRooms = () => navigate("/chu-tro/quan-ly-phong");
  const toListings = () => navigate("/tai-khoan/tin-cho-thue");
  const toPost = () => navigate("/dang-tin-cho-thue");

  const [dbKpis, setDbKpis] = useState<DashboardKPIs | null>(null);

  const loadDashboardData = useCallback(async (propertyId?: string) => {
    if (!user) return;
    try {
      setLoading(true);
      setDashboardError(false);
      const [props, rms, kpis, listings] = await Promise.all([
        getPropertiesByOwnerOrThrow(user.id),
        getRoomsByOwnerOrThrow(user.id),
        getDashboardMetrics(user.id, propertyId),
        getMyListings(user.id),
      ]);
      setProperties(props);
      setRooms(rms);
      setDbKpis(kpis);
      setRealListings(listings ? listings.slice(0, 3) : []);
    } catch (err) {
      logError("ChuTroDashboardPage.loadDashboardData", err);
      setDashboardError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const handlePropertyChange = (value: string) => {
    setProperty(value);
    void loadDashboardData(value === "all" ? undefined : value);
  };

  const displayProperties = useMemo(() => {
    return [{ value: "all", label: "Tất cả khu trọ" }, ...properties.map(p => ({ value: p.id, label: p.name }))];
  }, [properties]);

  // Filter rooms based on the selected property name
  const filteredRooms = useMemo(() => {
    if (rooms.length > 0) {
      return property === "all" ? rooms : rooms.filter(r => r.property_id === property);
    }
    return [];
  }, [rooms, property]);

  const activeRoomsList = useMemo(() => {
    return filteredRooms;
  }, [filteredRooms]);

  // Convert rooms data
  const displayRooms = useMemo(() => {
    return activeRoomsList.slice(0, 4).map(r => ({
      code: r.room_code || r.code || "",
      property: r.properties?.name || r.property || "Khu trọ",
      status: (r.status === "Available" ? "available" : r.status === "Deposited" ? "deposited" : r.status === "Rented" ? "rented" : r.status === "Hidden" ? "hidden" : r.status === "available" ? "available" : r.status === "deposited" ? "deposited" : r.status === "rented" ? "rented" : "available") as RoomStatus,
      occupant: r.occupant_name || (r.occupant ? r.occupant.name : null),
      paid: r.payment_status === "Paid" ? true : r.payment_status === "Unpaid" ? false : (r.bill ? r.bill.paid : null),
      task: r.status === "Available" || r.status === "available"
        ? "Tạo tin đăng"
        : (r.status === "Rented" || r.status === "rented") && (r.payment_status === "Unpaid" || (r.bill && !r.bill.paid))
          ? "Xem hóa đơn"
          : (r.status === "Deposited" || r.status === "deposited" || r.status === "Đã cọc" || r.status === "đã cọc")
            ? "Xem hợp đồng"
            : null
    }));
  }, [activeRoomsList]);

  // Convert listings
  // `getMyListings` chỉ trả tin Active dạng `ListingCardItem` (`type`, `loc`,
  // `priceNum`, `views_count`, `postedAt`) — map đúng các trường đó.
  const displayListings = useMemo(() => {
    return realListings.map(l => ({
      id: l.id as string,
      title: l.title,
      sub: [l.type || "Tin cho thuê", l.loc, `${formatVnd(l.priceNum)}/tháng`].filter(Boolean).join(" · "),
      status: "active",
      views: l.views_count ?? null,
      createdAt: l.postedAt ?? l.created_at ?? null,
    }));
  }, [realListings]);
  const viewListing = (listingId: string) => navigate(`/phong/${listingId}`);
  const editListing = (listingId: string) => navigate(`/dang-tin-cho-thue/${listingId}`);

  const handleUtilitySaved = () => {
    setModal(null);
    setToast({ message: "Đã lưu chỉ số điện nước.", variant: "success" });
    void loadDashboardData(property === "all" ? undefined : property);
  };

  const totalRoomsCount = dbKpis?.totalRoomsCount ?? 0;
  const rentedRoomsCount = dbKpis?.rentedRoomsCount ?? 0;
  const occupantCount = dbKpis?.occupantCount ?? 0;
  const emptyRoomsCount = dbKpis?.emptyRoomsCount ?? 0;
  const occupancyRate = totalRoomsCount > 0 ? Math.round((rentedRoomsCount / totalRoomsCount) * 100) : 0;
  const formatMoney = (amount: number) => amount >= 1_000_000
    ? `${(amount / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu đ`
    : `${Math.round(amount).toLocaleString("vi-VN")}đ`;

  // BR-012 — "Phòng trống", "Hóa đơn chưa thu", "Sắp đến hạn" LUÔN hiện (`secret: false`);
  // "Tổng số phòng" / "Phòng đã có người ở" / "Người ở hiện tại" / "Đã thu trong tháng"
  // mặc định ẩn (`secret: true` + `revealKPIs` khởi tạo `false`).
  const periodLabel = dbKpis?.periodLabel ?? "kỳ hiện tại";
  const dynamicKPIS: DashboardKpi[] = [
    { label: "Tổng số phòng", value: totalRoomsCount, unit: "Phòng", accent: C.primary, Icon: Home, secret: true },
    { label: "Phòng đã có người ở", value: rentedRoomsCount, unit: "Phòng", hint: `${occupancyRate}% lấp đầy`, accent: C.primary, Icon: KeyRound, secret: true, testId: "dashboard-kpi-rented-rooms" },
    { label: "Người ở hiện tại", value: occupantCount, unit: "Người", accent: C.available, Icon: Users, secret: true },
    { label: "Phòng trống", value: emptyRoomsCount, unit: "Phòng", accent: C.available, Icon: CheckSquare, secret: false },
    { label: "Hóa đơn chưa thu", value: dbKpis?.unpaidInvoiceCount ?? 0, unit: "HĐ", hint: formatMoney(dbKpis?.unpaidInvoiceAmount ?? 0), accent: C.repairing, Icon: AlertTriangle, secret: false },
    { label: `Sắp đến hạn (${DUE_SOON_DAYS} ngày)`, value: dbKpis?.dueSoonInvoiceCount ?? 0, unit: "HĐ", hint: formatMoney(dbKpis?.dueSoonInvoiceAmount ?? 0), accent: C.warning, Icon: CalendarClock, secret: false, testId: "dashboard-kpi-due-soon" },
    { label: "Đã thu trong tháng", value: formatMoney(dbKpis?.collectedThisMonth ?? 0), unit: "", caption: periodLabel, accent: C.primaryDark, Icon: TrendingUp, secret: true },
    { label: "Hóa đơn kỳ này", value: dbKpis?.invoiceCountThisPeriod ?? 0, unit: "HĐ", hint: `${formatMoney(dbKpis?.invoiceAmountThisPeriod ?? 0)} · ${periodLabel}`, accent: C.available, Icon: TrendingUp, secret: false },
  ];
  const reminderInvoices = dbKpis?.reminderInvoices ?? [];
  const openInvoice = (invoiceId: string) => navigate(`/chu-tro/hoa-don?hoa-don=${invoiceId}`);
  const toInvoices = () => navigate("/chu-tro/hoa-don");

  const handleRoomTask = (task: string) => {
    if (task === "Tạo tin đăng") {
      toPost();
    } else if (task === "Xem hóa đơn" || task === "Nhắc nợ") {
      toInvoices();
    } else if (task === "Xem hợp đồng" || task === "Gia hạn") {
      navigate("/chu-tro/quan-ly-phong?tab=occupants");
    }
  };

  // Nút mở modal đã tự khóa bằng `requiresWrite`; nhánh này chỉ chặn đường tắt
  // (bàn phím, script) chứ không phải lớp bảo vệ chính.
  const handleQuickToolClick = (type: "utility" | "room") => {
    if (!canWrite) return;
    setModal(type);
  };

  const Modals = (
    <>
      {modal === "utility" && <UtilityModal onClose={() => setModal(null)} properties={properties} rooms={rooms} onSaved={handleUtilitySaved} />}
      {modal === "room" && (
        <AddRoomModal
          properties={properties.map((p: any) => ({ id: p.id, name: p.name }))}
          onClose={() => setModal(null)}
          onCreated={() => void loadDashboardData(property === "all" ? undefined : property)}
        />
      )}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, left: isMobile ? 20 : undefined, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
          <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} data-testid="dashboard-toast" />
        </div>
      )}
    </>
  );

  if (loading) {
    return (
      <LandlordShell active="overview" mobileTitle="Dashboard">
        <Skeleton variant="row" count={6} label="Đang tải tổng quan" style={{ padding: "24px 0" }} />
      </LandlordShell>
    );
  }

  if (dashboardError) {
    return (
      <LandlordShell active="overview" mobileTitle="Dashboard">
        <div role="alert" style={{ maxWidth: 560, margin: "70px auto", padding: 24, background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, textAlign: "center", fontFamily: font }}>
          <AlertTriangle size={30} color={C.repairing} />
          <h1 style={{ fontSize: 18, color: C.textPrimary, margin: "12px 0 6px" }}>Chưa tải được dữ liệu dashboard</h1>
          <p style={{ color: C.textSecondary, fontSize: 13.5, lineHeight: 1.5 }}>Không thể đọc khu trọ, phòng hoặc hóa đơn. Dữ liệu chưa bị thay đổi; hãy thử tải lại.</p>
          <PrimaryBtn onClick={() => void loadDashboardData(property === "all" ? undefined : property)}>Thử tải lại</PrimaryBtn>
        </div>
      </LandlordShell>
    );
  }

  if (properties.length === 0) {
    return (
      <LandlordShell active="overview" mobileTitle="Dashboard">
        <div style={{ maxWidth: 600, margin: "60px auto", width: "100%", padding: "0 24px" }}>
          <EmptyState
            icon={<Building2 size={36} color={C.primary} />}
            title="Bạn chưa có khu trọ nào"
            description="Tạo khu trọ đầu tiên để bắt đầu quản lý danh sách phòng, người ở và hóa đơn."
            action={
              <Button variant="primary" requiresWrite onClick={() => navigate("/chu-tro/quan-ly-phong")}>
                Tạo khu trọ đầu tiên
              </Button>
            }
          />
        </div>
      </LandlordShell>
    );
  }

  /* ═══════════ MOBILE ═══════════ */
  if (isMobile) {
    return (
      <LandlordShell active="overview" mobileTitle="Dashboard">
        <div style={{ padding: "16px 16px 100px" }}>
          <p style={{ fontFamily: font, fontSize: 19, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>Chào {displayName} 👋</p>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 14px" }}>Mọi thứ trong tầm kiểm soát. Chúc bạn một ngày làm việc hiệu quả!</p>

          <div style={{ marginBottom: 18 }}><PropertySelector value={property} onChange={handlePropertyChange} options={displayProperties} mobile /></div>

          {/* Vacant Rooms Banner */}
          {emptyRoomsCount > 0 ? (
            <div style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Home size={16} color={C.available} />
                <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{emptyRoomsCount} phòng đang trống</span>
              </div>
              <button onClick={toPost} style={{ background: "none", border: "none", color: C.available, fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}>Tạo tin đăng</button>
            </div>
          ) : null}

          <KpiGrid kpis={dynamicKPIS} isRevealed={revealKPIs} onToggleReveal={() => setRevealKPIs(!revealKPIs)} isMobile />

          <DueInvoicesPanel invoices={reminderInvoices} onOpenInvoice={openInvoice} onViewAll={toInvoices} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>Tình trạng phòng</span>
            <button onClick={toRooms} style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer" }}>Xem tất cả</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
            {displayRooms.slice(0, 3).map((r, i) => (
              <div key={i} onClick={toRooms} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{r.code} <span style={{ fontWeight: 500, fontSize: 12.5, color: C.textSecondary }}>· {r.property}</span></span>
                  <StatusChip status={r.status} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: font, fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: C.textSecondary }}>Người ở</span>
                  <span style={{ color: C.textPrimary, fontWeight: 600 }}>{r.occupant ?? "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: font, fontSize: 13 }}>
                  <span style={{ color: C.textSecondary }}>Thanh toán</span>
                  <PayText paid={r.paid} />
                </div>
                {r.task && <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}><RoomTaskBtn task={r.task} onClick={() => handleRoomTask(r.task)} /></div>}
              </div>
            ))}
          </div>

          <p style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: "0 0 12px" }}>Quản lý nhanh</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 22 }}>
            {/* Ghi điện nước là việc chính khi đi từng phòng — trước đây chỉ có ở desktop. */}
            <button
              onClick={() => handleQuickToolClick("utility")}
              disabled={!canWrite}
              data-testid="dashboard-mobile-utility-btn"
              style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, cursor: canWrite ? "pointer" : "not-allowed", opacity: canWrite ? 1 : 0.5 }}
            >
              <Zap size={20} color={C.primary} />
              <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: C.textPrimary }}>Ghi điện nước</span>
            </button>
            <button onClick={toRooms} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, cursor: "pointer" }}>
              <Building2 size={20} color={C.primary} />
              <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: C.textPrimary }}>Khu trọ & Phòng</span>
            </button>
            <button onClick={toListings} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, cursor: "pointer" }}>
              <FileText size={20} color={C.primary} />
              <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: C.textPrimary }}>Quản lý tin đăng</span>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>Tin đăng gần đây</span>
            <button onClick={toListings} style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer" }}>Tất cả</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {displayListings.slice(0, 2).map(l => <ListingRow key={l.id} l={l} onClick={toListings} onView={() => viewListing(l.id)} onEdit={() => editListing(l.id)} />)}
          </div>
        </div>

        <button
          onClick={() => handleQuickToolClick("room")}
          disabled={!canWrite}
          data-testid="dashboard-fab-add-room"
          style={{ position: "fixed", right: 18, bottom: "calc(76px + env(safe-area-inset-bottom))", width: 54, height: 54, borderRadius: "50%", background: canWrite ? C.primary : C.border, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: canWrite ? "pointer" : "not-allowed", boxShadow: canWrite ? shadow.md : "none", zIndex: 90 }}>
          <Plus size={24} color={canWrite ? "white" : C.textSecondary} />
        </button>
        {Modals}
      </LandlordShell>
    );
  }

  /* ═══════════ DESKTOP ═══════════ */
  return (
    <LandlordShell active="overview" mobileTitle="Dashboard">
      <div style={{ display: "flex", gap: 24, padding: "28px 32px 0", maxWidth: 1500, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

        {/* MAIN COLUMN */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Greeting Header Block with Illustration */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: C.cream, borderRadius: 20, padding: "24px 32px", marginBottom: 24,
            border: `1px solid ${C.border}`, position: "relative", overflow: "hidden",
            boxShadow: shadow.sm
          }}>
            <div style={{ zIndex: 2 }}>
              <h1 style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Chào {displayName} 👋</h1>
              <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 18px", maxWidth: 450, lineHeight: 1.45 }}>Mọi thứ trong tầm kiểm soát. Chúc bạn một ngày làm việc hiệu quả!</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <PrimaryBtn requiresWrite onClick={() => handleQuickToolClick("room")} data-testid="dashboard-add-room-btn"><Plus size={15} /> Thêm phòng</PrimaryBtn>
                <GhostBtn onClick={toPost}><Plus size={15} /> Đăng tin</GhostBtn>
                <GhostBtn requiresWrite onClick={() => handleQuickToolClick("utility")} data-testid="dashboard-utility-btn"><Zap size={15} /> Ghi điện nước</GhostBtn>
              </div>
            </div>
            <img src="/assets/dashboard_house_illustration.png" alt="House Illustration" style={{ height: 132, width: "auto", objectFit: "contain", marginRight: -12, zIndex: 1, pointerEvents: "none" }} />
          </div>

          {/* Property Selector */}
          <div style={{ marginBottom: 24 }}>
            <PropertySelector value={property} onChange={handlePropertyChange} options={displayProperties} />
          </div>

          {/* Vacant Rooms Banner */}
          {emptyRoomsCount > 0 ? (
            <div style={{
              background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 16,
              padding: "16px 20px", display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 24, gap: 12, flexWrap: "wrap",
              boxShadow: shadow.sm
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.available, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
                  <Home size={18} />
                </div>
                <div>
                  <h4 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary, margin: "0 0 2px" }}>{emptyRoomsCount} phòng đang trống</h4>
                  <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>Có thể tạo tin đăng để tìm người ở.</p>
                </div>
              </div>
              <button onClick={toPost} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.available, fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                Tạo tin đăng <ChevronRight size={16} />
              </button>
            </div>
          ) : totalRoomsCount > 0 ? (
            <div style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: C.available, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
                <Home size={18} />
              </div>
              <div>
                <h4 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary, margin: "0 0 2px" }}>Hiện không có phòng trống.</h4>
                <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>Xem chi tiết trạng thái từng phòng ở mục Khu trọ &amp; Phòng.</p>
              </div>
            </div>
          ) : null}

          <KpiGrid kpis={dynamicKPIS} isRevealed={revealKPIs} onToggleReveal={() => setRevealKPIs(!revealKPIs)} />

          <DueInvoicesPanel invoices={reminderInvoices} onOpenInvoice={openInvoice} onViewAll={toInvoices} />

          {/* Room operations */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", marginBottom: 28, boxShadow: shadow.sm }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Tình trạng phòng</h2>
              <button onClick={toRooms} style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>Xem tất cả phòng <ChevronRight size={15} /></button>
            </div>

            <SegmentedBar rooms={rooms} propertyId={property} />

            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                <thead>
                  <tr style={{ background: C.caramelSoft }}>
                    {["Phòng", "Khu trọ", "Trạng thái", "Người ở", "Thanh toán", "Việc cần làm"].map(h => (
                      <th key={h} style={{ fontFamily: font, fontSize: 11.5, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "left", padding: "12px 14px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRooms.map((r, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? C.bg : C.white }}>
                      <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 800, color: C.textPrimary, padding: "13px 14px" }}>{r.code}</td>
                      <td style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, padding: "13px 14px" }}>{r.property}</td>
                      <td style={{ padding: "13px 14px" }}><StatusChip status={r.status} /></td>
                      <td style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, padding: "13px 14px" }}>{r.occupant ?? <span style={{ color: C.textSecondary }}>—</span>}</td>
                      <td style={{ padding: "13px 14px" }}><PayText paid={r.paid} /></td>
                      <td style={{ padding: "13px 14px" }}>{r.task ? <RoomTaskBtn task={r.task} onClick={() => handleRoomTask(r.task)} /> : <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "14px 0 0", fontStyle: "italic" }}>Đây chỉ là bản xem nhanh. Quản lý đầy đủ trong “Khu trọ &amp; Phòng”.</p>
          </div>

          {/* Recent listings */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Tin đăng gần đây</h2>
            {displayListings.length > 0 && (
              <button onClick={toListings} style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>Tất cả tin đăng <ChevronRight size={15} /></button>
            )}
          </div>
          {displayListings.length === 0 ? (
            <div style={{ background: C.white, border: `1.5px dashed ${C.border}`, borderRadius: 16, padding: "28px 24px", textAlign: "center" }}>
              <FileText size={24} color={C.textSecondary} style={{ marginBottom: 10, opacity: 0.7 }} />
              <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: "0 0 4px" }}>Bạn chưa có tin đăng nào</p>
              <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: "0 0 14px", lineHeight: 1.5 }}>Đăng tin phòng trống lên Marketplace để tiếp cận hàng nghìn người thuê trọ.</p>
              <PrimaryBtn onClick={toPost} small><Plus size={14} /> Đăng tin ngay</PrimaryBtn>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {displayListings.map(l => <ListingRow key={l.id} l={l} onClick={toListings} onView={() => viewListing(l.id)} onEdit={() => editListing(l.id)} />)}
            </div>
          )}

          <Footer />
        </main>

        {/* RIGHT COLUMN */}
        {/* Máy tính bảng: cột phụ 300px làm hẹp cột chính — chỉ hiện từ desktop. */}
        {!isTablet && <aside style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14, paddingTop: 2 }}>
          <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Công cụ quản lý</span>
          <UtilityCard
            title="Khu trọ & Phòng"
            desc="Quản lý số phòng, danh sách khu trọ và trạng thái từng phòng."
            cta="Quản lý"
            onClick={toRooms}
            color={C.available}
            bgImage="/assets/card_house_icon.png"
          />
          <UtilityCard
            title="Quản lý tin đăng"
            desc="Theo dõi các tin cho thuê đang hiển thị cho người thuê."
            cta="Chi tiết"
            onClick={toListings}
            color={C.secondary}
            bgImage="/assets/card_listing_icon.png"
          />
          <UtilityCard
            title="Thanh toán & Điện nước"
            desc="Theo dõi hóa đơn kỳ này và số tiền đang chờ thu."
            cta="Thu tiền"
            onClick={toInvoices}
            color={C.warning}
            bgImage="/assets/card_payment_icon.png"
          />
          <UtilityCard
            title="Hỗ trợ"
            desc="Liên hệ đội ngũ Trọ Nhanh khi cần trợ giúp."
            cta="Gửi ngay"
            onClick={() => { window.location.href = SUPPORT_EMAIL_HREF; }}
            color={C.available}
            bgImage="/assets/card_support_icon.png"
          />
        </aside>}
      </div>
      {Modals}
    </LandlordShell>
  );
}

export default ChuTroDashboardPage;
