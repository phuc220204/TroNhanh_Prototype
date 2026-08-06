import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Building2, FileText, Plus, Zap, ChevronRight,
  Eye, EyeOff, Lock, Home, Users, CheckSquare, AlertTriangle, TrendingUp,
} from "lucide-react";
import { C, font } from "../../../shared/theme";
import { useBreakpoint } from "../../../shared/components/useBreakpoint";
import { LandlordShell, useLandlordShell } from "../../../shared/components/LandlordShell";
import type { RoomStatus } from "../../../shared/types/status";
import { EmptyState, Button, Toast } from "../../../shared/components/common";
import { logError } from "../../../shared/services/supabase-error";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useCanWrite } from "../../../shared/contexts/SubscriptionContext";
import { getPropertiesByOwner } from "../../services/property-service";
import { getRoomsByOwner } from "../../services/room-service";
import { getDashboardMetrics, type DashboardKPIs } from "../../services/dashboard-service";
import { getMyListings } from "../../../marketplace/services/listing-queries";
import {
  PrimaryBtn, GhostBtn, StatusChip, PayText, PropertySelector,
  SegmentedBar, RoomTaskBtn, UtilityCard, ListingRow, Footer,
} from "./atoms";
import { UtilityModal } from "./UtilityModal";
import { AddRoomModal } from "./AddRoomModal";

/**
 * Hộp thư hỗ trợ thật của nhóm. Đặt thành hằng số để không rải địa chỉ khắp nơi
 * — đổi email thì sửa đúng một chỗ.
 */
const SUPPORT_EMAIL = "tronhanh2026@gmail.com";
const SUPPORT_EMAIL_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("[Trọ Nhanh] Yêu cầu hỗ trợ")}`;

export function ChuTroDashboardPage() {
  const { subStatus } = useLandlordShell();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Chủ trọ";

  const [properties, setProperties] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [realListings, setRealListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [property, setProperty] = useState("Tất cả khu trọ");
  const [modal, setModal] = useState<null | "utility" | "room">(null);
  const [revealKPIs, setRevealKPIs] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  // `isLocked` = chưa từng kích hoạt gói ⇒ khóa cả đường VÀO module SaaS.
  // `canWrite` = BR-015, quyết định được GHI hay không (false cho cả NONE lẫn
  // READ_ONLY). Hai thứ khác nhau: READ_ONLY vẫn phải xem được dữ liệu.
  const isLocked = subStatus === "NONE";
  const canWrite = useCanWrite();

  const toRooms = () => {
    if (isLocked) {
      setToast({ message: "Vui lòng kích hoạt dùng thử hoặc đăng ký gói SaaS ở góc dưới Sidebar để truy cập tính năng Quản lý trọ.", variant: "error" });
      return;
    }
    navigate("/chu-tro/quan-ly-phong");
  };
  const toListings = () => navigate("/chu-tro/tin-dang");
  const toPost = () => navigate("/chu-tro/dang-tin");

  const [dbKpis, setDbKpis] = useState<DashboardKPIs | null>(null);

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Load properties
      const props = await getPropertiesByOwner(user.id);
      setProperties(props || []);

      setProperty("Tất cả khu trọ");

      // Load rooms
      const rms = await getRoomsByOwner(user.id);
      setRooms(rms || []);

      // Load server-side KPI counts via head: true
      const kpis = await getDashboardMetrics(user.id);
      setDbKpis(kpis);

      // Load recent listings from user
      const listings = await getMyListings(user.id);
      setRealListings(listings ? listings.slice(0, 3) : []);
    } catch (err) {
      logError("ChuTroDashboardPage.loadDashboardData", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const displayProperties = useMemo(() => {
    return ["Tất cả khu trọ", ...properties.map(p => p.name)];
  }, [properties]);

  // Filter rooms based on the selected property name
  const filteredRooms = useMemo(() => {
    if (rooms.length > 0) {
      return property === "Tất cả khu trọ" ? rooms : rooms.filter(r => r.properties?.name === property);
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
  const displayListings = useMemo(() => {
    return realListings.map(l => ({
      title: l.title,
      sub: `${l.property_type || "Tin cho thuê"} · ${l.district || ""} · ${Number(l.price || 0).toLocaleString("vi-VN")}đ`,
      status: (l.status === "Active" ? "active" : l.status === "Inactive" ? "hidden" : l.status) as any,
      canDelete: true
    }));
  }, [realListings]);

  // Dynamic KPIs calculations
  const totalRoomsCount = (property === "Tất cả khu trọ" && dbKpis) ? dbKpis.totalRoomsCount : activeRoomsList.length;

  const rentedRoomsCount = useMemo(() => {
    if (property === "Tất cả khu trọ" && dbKpis) return dbKpis.rentedRoomsCount;
    return rooms.length > 0
      ? activeRoomsList.filter(r => r.status === "Rented").length
      : activeRoomsList.filter(r => r.status === "rented").length;
  }, [rooms, activeRoomsList, property, dbKpis]);

  const emptyRoomsCount = useMemo(() => {
    if (property === "Tất cả khu trọ" && dbKpis) return dbKpis.emptyRoomsCount;
    return rooms.length > 0
      ? activeRoomsList.filter(r => r.status === "Available").length
      : activeRoomsList.filter(r => r.status === "available").length;
  }, [rooms, activeRoomsList, property, dbKpis]);

  const unpaidRoomsCount = useMemo(() => {
    if (property === "Tất cả khu trọ" && dbKpis) return dbKpis.unpaidRoomsCount;
    return rooms.length > 0
      ? activeRoomsList.filter(r => r.payment_status === "Unpaid").length
      : activeRoomsList.filter(r => r.bill && !r.bill.paid).length;
  }, [rooms, activeRoomsList, property, dbKpis]);

  const revenueAmount = useMemo(() => {
    return rooms.length > 0
      ? activeRoomsList.filter(r => r.status === "Rented").reduce((sum, r) => sum + Number(r.price || 0), 0)
      : activeRoomsList.filter(r => r.status === "rented").reduce((sum, r) => {
          const priceStr = typeof r.price === "string" ? r.price : String(r.price || "");
          return sum + (Number(priceStr.replace(/\D/g, "")) || 0);
        }, 0);
  }, [rooms, activeRoomsList]);

  const revenueFormatted = revenueAmount >= 1000000
    ? `${(revenueAmount / 1000000).toFixed(1)} triệu`
    : revenueAmount.toLocaleString("vi-VN") + "đ";

  // BR-012 — "Phòng trống" và "Chưa đóng tiền" LUÔN hiện (`secret: false`);
  // "Tổng số phòng" / "Khách đang ở" / "Doanh thu" mặc định ẩn sau toggle
  // (`secret: true` + `revealKPIs` khởi tạo `false`).
  const dynamicKPIS = [
    { label: "Tổng số phòng", value: totalRoomsCount, accent: C.primary, secret: true },
    { label: "Khách đang ở", value: rentedRoomsCount, accent: "#4F7A4A", secret: true },
    { label: "Phòng trống", value: emptyRoomsCount, accent: C.secondary, secret: false },
    { label: "Chưa đóng tiền", value: unpaidRoomsCount, accent: "#C07B4A", secret: false },
    { label: "Doanh thu tháng", value: revenueFormatted, accent: C.primaryDark, secret: true },
  ];

  const handleRoomTask = (task: string) => {
    if (task === "Tạo tin đăng") {
      toPost();
    } else if (task === "Xem hóa đơn" || task === "Nhắc nợ") {
      navigate("/chu-tro/hoa-don");
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
      {modal === "utility" && <UtilityModal onClose={() => setModal(null)} properties={properties} onSave={loadDashboardData} />}
      {modal === "room" && <AddRoomModal onClose={() => setModal(null)} properties={properties} onSave={loadDashboardData} />}
    </>
  );

  if (!loading && properties.length === 0) {
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
          {isLocked && (
            <div style={{ background: "#FEF6EC", border: `1.5px dashed ${C.primary}`, borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Lock size={20} color={C.primary} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <h4 style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>Gói SaaS chưa kích hoạt</h4>
                <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "0 0 10px", lineHeight: 1.4 }}>Hãy bắt đầu dùng thử gói SaaS Quản lý vận hành 30 ngày ở dropdown chân Sidebar để mở khóa đầy đủ tính năng.</p>
              </div>
            </div>
          )}

          <p style={{ fontFamily: font, fontSize: 19, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>Chào {displayName} 👋</p>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 14px" }}>Mọi thứ trong tầm kiểm soát. Chúc bạn một ngày làm việc hiệu quả!</p>

          <div style={{ marginBottom: 18 }}><PropertySelector value={property} onChange={setProperty} options={displayProperties} mobile /></div>

          {/* Vacant Rooms Banner */}
          {emptyRoomsCount > 0 ? (
            <div style={{ background: "#EBF2E8", border: "1px solid #C6D8C1", borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Home size={16} color="#4F7A4A" />
                <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{emptyRoomsCount} phòng đang trống</span>
              </div>
              <button onClick={toPost} style={{ background: "none", border: "none", color: "#4F7A4A", fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}>Tạo tin đăng</button>
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Chỉ số vận hành</p>
            <button
              onClick={() => setRevealKPIs(!revealKPIs)}
              data-testid="dashboard-kpi-toggle"
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: C.primary, fontFamily: font, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {revealKPIs ? <EyeOff size={14} /> : <Eye size={14} />} {revealKPIs ? "Ẩn số liệu" : "Hiện số liệu"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, marginBottom: 22 }}>
            {dynamicKPIS.map(k => {
              const isSecret = k.secret && !revealKPIs;
              return (
                <div key={k.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 16px", minWidth: 120, flexShrink: 0 }}>
                  <p style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: C.textSecondary, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</p>
                  <span style={{ fontFamily: font, fontSize: 26, fontWeight: 900, color: k.accent, lineHeight: 1 }}>{isSecret ? "•••" : k.value}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>Tình trạng phòng</span>
            <button onClick={toRooms} style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer" }}>Xem tất cả</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
            {displayRooms.slice(0, 3).map((r, i) => (
              <div key={i} onClick={toRooms} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, cursor: isLocked ? "default" : "pointer" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 22 }}>
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
            {displayListings.slice(0, 2).map((l, i) => <ListingRow key={i} l={l} onClick={toListings} />)}
          </div>
        </div>

        <button
          onClick={() => handleQuickToolClick("room")}
          disabled={!canWrite}
          data-testid="dashboard-fab-add-room"
          style={{ position: "fixed", right: 18, bottom: "calc(76px + env(safe-area-inset-bottom))", width: 54, height: 54, borderRadius: "50%", background: canWrite ? C.primary : C.border, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: canWrite ? "pointer" : "not-allowed", boxShadow: canWrite ? "0 4px 16px rgba(138,106,69,0.36)" : "none", zIndex: 90 }}>
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
          {isLocked && (
            <div style={{ background: "#FEF6EC", border: `1.5px dashed ${C.primary}`, borderRadius: 14, padding: 18, marginBottom: 20, display: "flex", gap: 14, alignItems: "center" }}>
              <Lock size={24} color={C.primary} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>Trải nghiệm đầy đủ tính năng Quản lý vận hành (SaaS)</h4>
                <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Các tính năng quản lý khu trọ, hóa đơn, người ở đang bị khóa. Hãy chọn trạng thái **Dùng thử (TRIAL)** hoặc **Kích hoạt (ACTIVE)** ở góc dưới Sidebar để trải nghiệm.</p>
              </div>
            </div>
          )}

          {/* Greeting Header Block with Illustration */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#F7EFE2", borderRadius: 20, padding: "24px 32px", marginBottom: 24,
            border: `1px solid ${C.border}`, position: "relative", overflow: "hidden",
            boxShadow: "0 2px 10px rgba(42,26,12,0.02)"
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
            <PropertySelector value={property} onChange={setProperty} options={displayProperties} />
          </div>

          {/* Vacant Rooms Banner */}
          {emptyRoomsCount > 0 ? (
            <div style={{
              background: "#EBF2E8", border: "1px solid #C6D8C1", borderRadius: 16,
              padding: "16px 20px", display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 24, gap: 12, flexWrap: "wrap",
              boxShadow: "0 2px 8px rgba(79,122,74,0.04)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#4F7A4A", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
                  <Home size={18} />
                </div>
                <div>
                  <h4 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary, margin: "0 0 2px" }}>{emptyRoomsCount} phòng đang trống</h4>
                  <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>Có thể tạo tin đăng để tìm người ở.</p>
                </div>
              </div>
              <button onClick={toPost} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#4F7A4A", fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                Tạo tin đăng <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div style={{ background: "#F5F8F5", border: "1px solid #D5E2D5", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#85A081", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
                <Home size={18} />
              </div>
              <div>
                <h4 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary, margin: "0 0 2px" }}>Tất cả phòng hiện đã có người thuê.</h4>
                <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>Bạn đang vận hành hiệu suất 100%!</p>
              </div>
            </div>
          )}

          {/* Operational Metrics (KPI Section) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontFamily: font, fontSize: 13, fontWeight: 800, color: C.textSecondary, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Chỉ số vận hành</h2>
            <button
              onClick={() => setRevealKPIs(!revealKPIs)}
              data-testid="dashboard-kpi-toggle"
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.primary, fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {revealKPIs ? <EyeOff size={15} /> : <Eye size={15} />} {revealKPIs ? "Ẩn số liệu nhạy cảm" : "Hiện số liệu ẩn"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 28 }}>
            {dynamicKPIS.map((k, index) => {
              const isSecret = k.secret && !revealKPIs;
              let IconComponent = Home;
              let iconColor = C.primary;
              let iconBg = "rgba(138, 74, 32, 0.06)";

              if (index === 0) {
                IconComponent = Home;
                iconColor = C.primary;
                iconBg = "rgba(138, 74, 32, 0.06)";
              } else if (index === 1) {
                IconComponent = Users;
                iconColor = "#4F7A4A";
                iconBg = "rgba(79, 122, 74, 0.06)";
              } else if (index === 2) {
                IconComponent = CheckSquare;
                iconColor = "#4F7A4A";
                iconBg = "rgba(79, 122, 74, 0.06)";
              } else if (index === 3) {
                IconComponent = AlertTriangle;
                iconColor = "#C07B4A";
                iconBg = "rgba(192, 123, 74, 0.06)";
              } else if (index === 4) {
                IconComponent = TrendingUp;
                iconColor = C.primary;
                iconBg = "rgba(138, 74, 32, 0.06)";
              }

              return (
                <div key={k.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 10px rgba(42,26,12,0.015)" }}>
                  <div>
                    <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</p>
                    <span style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, lineHeight: 1 }}>
                      {isSecret ? "••••••" : k.value}
                      {!isSecret && <span style={{ fontSize: 12, fontWeight: 500, color: C.textSecondary, marginLeft: 4 }}>
                        {index === 4 ? "" : index === 1 ? "Người" : "Phòng"}
                      </span>}
                    </span>
                    {index === 4 && <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: "4px 0 0" }}>Tháng 6/2026</p>}
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
                    <IconComponent size={18} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Room operations */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", marginBottom: 28, boxShadow: "0 2px 10px rgba(42,26,12,0.015)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Tình trạng phòng</h2>
              <button onClick={toRooms} style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>Xem tất cả phòng <ChevronRight size={15} /></button>
            </div>

            <SegmentedBar rooms={rooms} property={property} />

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
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? "rgba(247,239,226,0.2)" : C.white }}>
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
              {displayListings.map((l, i) => <ListingRow key={i} l={l} onClick={toListings} />)}
            </div>
          )}

          <Footer />
        </main>

        {/* RIGHT COLUMN */}
        <aside style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14, paddingTop: 2 }}>
          <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Công cụ quản lý</span>
          <UtilityCard
            title="Khu trọ & Phòng"
            desc="Quản lý số phòng, danh sách khu trọ và trạng thái từng phòng."
            cta="Quản lý"
            onClick={toRooms}
            color="#4F7A4A"
            bgImage="/assets/card_house_icon.png"
          />
          <UtilityCard
            title="Quản lý tin đăng"
            desc="Theo dõi các tin cho thuê đang hiển thị cho người thuê."
            cta="Chi tiết"
            onClick={toListings}
            color="#C99B65"
            bgImage="/assets/card_listing_icon.png"
          />
          <UtilityCard
            title="Thanh toán & Điện nước"
            desc="Theo dõi hóa đơn tháng này và các khoản chưa thu."
            progress={{ pct: 85, label: "85% đã thu tiền" }}
            cta="Thu tiền"
            onClick={() => navigate("/chu-tro/hoa-don")}
            color="#C8861A"
            bgImage="/assets/card_payment_icon.png"
          />
          <UtilityCard
            title="Hỗ trợ"
            desc="Liên hệ đội ngũ Trọ Nhanh khi cần trợ giúp."
            cta="Gửi ngay"
            onClick={() => { window.location.href = SUPPORT_EMAIL_HREF; }}
            color="#6B8E5A"
            bgImage="/assets/card_support_icon.png"
          />
        </aside>
      </div>
      {Modals}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000 }}>
          <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
        </div>
      )}
    </LandlordShell>
  );
}

export default ChuTroDashboardPage;
