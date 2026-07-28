import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { 
  Plus, Search, ChevronDown, Eye, EyeOff, Trash2, ArrowUpCircle, Shield, Pencil,
  FileText, Star, TrendingUp, Phone, Calendar, Info, MessageSquare, 
  Sparkles, Filter, RefreshCw, X, SlidersHorizontal, ChevronRight, ChevronLeft,
  ChevronsUpDown, AlertTriangle
} from "lucide-react";
import { C, font } from "../../shared/theme";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { LandlordShell, LandlordBreadcrumb } from "../../shared/components/LandlordShell";
import { useAuth } from "../../shared/contexts/AuthContext";
import { supabase } from "../../shared/supabaseClient";
import { DemoFAB } from "../../shared/components/PublicNavbar";
import { getListingImage } from "../../marketplace/pages/AllListingsPage";
import { formatVND } from "../../marketplace/utils/listingMetadata";
import { logError } from "../../shared/services/supabase-error";

/* ══════════════════════════════════════════
   TYPES & CONTANTS
   ══════════════════════════════════════════ */
type DbListing = {
  id: string;
  title: string;
  room_id: string | null;
  district: string;
  price: number;
  area: number;
  status: string;
  /** Từ cột thật `view_count` (thêm ở migration 0100). */
  views?: number;
  /**
   * Chưa có nguồn dữ liệu — bảng rental_listings không có cột này.
   * TODO(T11a): đếm từ `conversations` where ref_type='RentalListing' and ref_id=id.
   */
  contacts?: number;
  updated_at: string;
  created_at: string;
  boost_expire_at: string | null;
  property_type?: string;
  address?: string;
  description?: string;
};

const FILTERS = [
  { label: "Tất cả", value: "all" },
  { label: "Đang hiển thị", value: "Active" },
  { label: "Tin VIP nổi bật", value: "VIP" },
  // BR-001: giá trị đúng là "Hidden". Trước đây là "Inactive" nên filter
  // "Đã ẩn" không bao giờ khớp row nào.
  { label: "Đã ẩn", value: "Hidden" },
];

const SORTS = [
  { label: "Mới nhất", value: "newest" },
  { label: "Cũ nhất", value: "oldest" },
  { label: "Giá thấp đến cao", value: "price-asc" },
  { label: "Giá cao đến thấp", value: "price-desc" }
];

const REGION_OPTIONS = [
  "Tất cả quận/huyện",
  "Bình Thạnh",
  "Quận 7",
  "Thủ Đức",
  "Gò Vấp",
  "Quận 1",
  "Quận 3",
  "Quận 10",
  "Tân Bình"
];

/* ══════════════════════════════════════════
   LIGHTWEIGHT Sparkline (SVG)
   ══════════════════════════════════════════ */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const width = 100;
  const height = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ flexShrink: 0 }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

/* ══════════════════════════════════════════
   HELPERS & CHIPS
   ══════════════════════════════════════════ */
function getStatusMeta(status: string, boostExpire: string | null) {
  const isVIP = boostExpire && new Date(boostExpire) > new Date();
  if (status === "Active" || status === "active") {
    return isVIP 
      ? { label: "Hiển thị (VIP)", color: "#E05C5C", bg: "#FCECEC", vip: true } 
      : { label: "Đang hiển thị", color: "#4A7A34", bg: "#E8F5E1", vip: false };
  }
  if (status === "PendingApproval" || status === "pendingApproval") {
    return { label: "Chờ duyệt", color: "#C99B65", bg: "#FEF6EC", vip: false };
  }
  if (status === "Expired" || status === "expired") {
    return { label: "Hết hạn", color: "#A28B78", bg: "#F5EFE6", vip: false };
  }
  return { label: "Đã ẩn", color: C.textSecondary, bg: C.caramelSoft, vip: false };
}

function StatusChip({ status, boostExpire }: { status: string; boostExpire: string | null }) {
  const m = getStatusMeta(status, boostExpire);
  return (
    <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color: m.color, background: m.bg, borderRadius: 8, padding: "3px 9px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {m.vip && <Star size={10.5} fill="#E05C5C" stroke="none" />}
      {m.label}
    </span>
  );
}

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      style={{ 
        display: "inline-flex", alignItems: "center", gap: 7, 
        padding: "10px 18px", background: disabled ? C.border : C.primary, 
        color: disabled ? C.textSecondary : C.white, border: "none", 
        borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 700, 
        cursor: disabled ? "not-allowed" : "pointer", 
        boxShadow: disabled ? "none" : "0 2px 10px rgba(138,106,69,0.25)",
        whiteSpace: "nowrap", transition: "background 0.15s"
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = C.primaryHover; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = C.primary; }}>
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ 
        display: "inline-flex", alignItems: "center", gap: 7, 
        padding: "9px 16px", background: active ? C.caramelSoft : C.white, 
        color: active ? C.primary : C.textSecondary, 
        border: `1.5px solid ${active ? C.primary : C.border}`, borderRadius: 10, 
        fontFamily: font, fontSize: 13.5, fontWeight: 600, 
        cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s"
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = C.primary; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = C.border; }}>
      {children}
    </button>
  );
}

function IconAction({ icon, label, onClick, danger, vip, disabled }: { icon: React.ReactNode; label: string; onClick?: () => void; danger?: boolean; vip?: boolean; disabled?: boolean }) {
  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      title={label} 
      aria-label={label}
      style={{ 
        width: 32, height: 32, borderRadius: 8, 
        border: `1px solid ${vip ? C.repairing : C.border}`, 
        background: vip ? "#FEF6EC" : C.white, 
        display: "flex", alignItems: "center", justifyContent: "center", 
        cursor: disabled ? "not-allowed" : "pointer", 
        color: danger ? "#B5503C" : vip ? C.repairing : C.textSecondary,
        transition: "all 0.15s", opacity: disabled ? 0.5 : 1
      }}
      onMouseEnter={e => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-1px)";
        if (vip) e.currentTarget.style.background = "#FDE4CA";
        else e.currentTarget.style.borderColor = C.primary;
      }}
      onMouseLeave={e => {
        if (disabled) return;
        e.currentTarget.style.transform = "none";
        if (vip) e.currentTarget.style.background = "#FEF6EC";
        else e.currentTarget.style.borderColor = C.border;
      }}>
      {icon}
    </button>
  );
}

function PaymentModal({ open, title, onConfirm, onCancel }: { open: boolean; title: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(20,10,4,0.5)", zIndex: 500, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 501, background: C.white, borderRadius: 20, padding: "28px 32px", maxWidth: 400, width: "calc(100vw - 48px)", textAlign: "center", boxShadow: "0 20px 60px rgba(20,10,4,0.25)" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FFF3E0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <ArrowUpCircle size={24} color={C.repairing} />
        </div>
        <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>Đẩy tin VIP nổi bật</h3>
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 16px" }}>Tin: <strong>{title}</strong></p>
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 20px" }}>Số tiền: <strong style={{ color: C.repairing, fontSize: 16 }}>100.000 đ</strong> (Hiển thị nổi bật 7 ngày)</p>

        {/* VietQR simulation */}
        <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 16, background: C.white, display: "inline-block", marginBottom: 20 }}>
          <div style={{ width: 140, height: 140, background: "#f5f5f5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 8, margin: "0 auto", position: "relative" }}>
            <div style={{ border: "4px solid #333", width: 80, height: 80, display: "flex", flexWrap: "wrap", padding: 2 }}>
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} style={{ width: "25%", height: "25%", background: (i % 3 === 0 || i % 5 === 2) ? "#333" : "transparent" }} />
              ))}
            </div>
            <div style={{ fontFamily: font, fontSize: 9, fontWeight: 600, color: C.textSecondary, marginTop: 8 }}>TRỌ NHANH - BOOST</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>Hủy</button>
          <button onClick={onConfirm} style={{ flex: 2, padding: "12px", background: C.primary, border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer" }}>Xác nhận thanh toán</button>
        </div>
      </div>
    </>
  );
}

function Toast({ show, message }: { show: boolean; message: string }) {
  return (
    <div style={{ position: "fixed", bottom: 32, left: "50%", transform: `translateX(-50%) translateY(${show ? 0 : 20}px)`, opacity: show ? 1 : 0, transition: "all 0.25s", zIndex: 600, background: C.primaryDark, borderRadius: 10, padding: "12px 22px", pointerEvents: "none" }}>
      <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.cream }}>{message}</span>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════ */
export function QuanLyPage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { user, profile } = useAuth();

  const [dbListings, setDbListings]   = useState<DbListing[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isError, setIsError]         = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState<string>("all");
  const [sort, setSort]               = useState("newest");
  const [toast, setToast]             = useState(false);
  const [toastMsg, setToastMsg]       = useState("");

  // Advanced Filters Collapsible
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selDistrict, setSelDistrict]   = useState("Tất cả quận/huyện");
  const [priceMin, setPriceMin]         = useState("");
  const [priceMax, setPriceMax]         = useState("");
  const [areaMin, setAreaMin]           = useState("");
  const [areaMax, setAreaMax]           = useState("");

  // Pagination
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(10);

  // Boost Modal State
  const [boostTarget, setBoostTarget] = useState<DbListing | null>(null);
  
  // Loading mutation blocker
  const [mutatingId, setMutatingId]   = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  // Fetch Owner listings from Supabase
  const fetchListings = async () => {
    if (!user) return;
    setIsLoading(true);
    setIsError(false);
    try {
      const { data, error } = await supabase
        .from("rental_listings")
        .select("*")
        .eq("seller_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      if (data) {
        // `views` map từ cột thật view_count; `contacts` chưa có nguồn (xem type).
        setDbListings(data.map(l => ({ ...l, views: l.view_count ?? 0 })));
      }
    } catch (err: any) {
      logError("QuanLyPage.fetchListings", err);
      setIsError(true);
      setErrorMessage(err.message || "Không thể kết nối đến cơ sở dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [user]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    // BR-001: rental_listings.status không có "Inactive" — ẩn tin là "Hidden".
    const nextStatus = currentStatus === "Active" ? "Hidden" : "Active";
    try {
      setMutatingId(id);
      const { error } = await supabase
        .from("rental_listings")
        .update({ status: nextStatus })
        .eq("id", id);
      if (error) throw error;
      setDbListings(prev => prev.map(l => l.id === id ? { ...l, status: nextStatus } : l));
      showToast(nextStatus === "Active" ? "Đã hiển thị tin đăng thành công" : "Đã ẩn tin đăng thành công");
    } catch (err: any) {
      logError("QuanLyPage.handleToggleStatus", err);
      showToast("Có lỗi xảy ra: " + err.message);
    } finally {
      setMutatingId(null);
    }
  };

  const handleDeleteListing = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tin đăng này? Thao tác này không thể hoàn tác.")) return;
    try {
      setMutatingId(id);
      const { error } = await supabase
        .from("rental_listings")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setDbListings(prev => prev.filter(l => l.id !== id));
      showToast("Đã xóa tin đăng thành công");
    } catch (err: any) {
      logError("QuanLyPage.handleDeleteListing", err);
      showToast("Có lỗi xảy ra: " + err.message);
    } finally {
      setMutatingId(null);
    }
  };

  const handleConfirmBoost = async () => {
    if (!boostTarget) return;
    try {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("rental_listings")
        .update({ boost_expire_at: futureDate })
        .eq("id", boostTarget.id);
      
      if (error) throw error;
      setDbListings(prev => prev.map(l => l.id === boostTarget.id ? { ...l, boost_expire_at: futureDate } : l));
      setBoostTarget(null);
      showToast("Đã đẩy tin VIP nổi bật thành công!");
    } catch (err: any) {
      logError("QuanLyPage.handleConfirmBoost", err);
      showToast("Có lỗi xảy ra: " + err.message);
    }
  };

  const toPost = () => navigate("/chu-tro/dang-tin");
  
  const resetFilters = () => {
    setSearch("");
    setFilter("all");
    setSelDistrict("Tất cả quận/huyện");
    setPriceMin("");
    setPriceMax("");
    setAreaMin("");
    setAreaMax("");
    setPage(1);
  };

  // Filter & Sort Logic
  const filteredRows = useMemo(() => {
    let r = dbListings;
    
    // 1. Text Search
    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter(l => 
        l.title.toLowerCase().includes(q) || 
        l.district.toLowerCase().includes(q) || 
        (l.room_id?.toLowerCase().includes(q) ?? false)
      );
    }
    
    // 2. Quick status filter chips
    if (filter !== "all") {
      if (filter === "VIP") {
        r = r.filter(l => l.boost_expire_at && new Date(l.boost_expire_at) > new Date());
      } else {
        r = r.filter(l => l.status === filter);
      }
    }

    // 3. District filter (advanced)
    if (selDistrict !== "Tất cả quận/huyện") {
      r = r.filter(l => l.district === selDistrict);
    }

    // 4. Price range filter
    if (priceMin) {
      r = r.filter(l => l.price >= Number(priceMin));
    }
    if (priceMax) {
      r = r.filter(l => l.price <= Number(priceMax));
    }

    // 5. Area range filter
    if (areaMin) {
      r = r.filter(l => l.area >= Number(areaMin));
    }
    if (areaMax) {
      r = r.filter(l => l.area <= Number(areaMax));
    }

    // Sort
    const arr = [...r];
    if (sort === "newest") {
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === "oldest") {
      arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sort === "price-asc") {
      arr.sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      arr.sort((a, b) => b.price - a.price);
    }
    
    return arr;
  }, [dbListings, search, filter, sort, selDistrict, priceMin, priceMax, areaMin, areaMax]);

  // Derived operational stats (KPIs)
  const kpis = useMemo(() => {
    const total = dbListings.length;
    const active = dbListings.filter(l => l.status === "Active" || l.status === "active").length;
    const vip = dbListings.filter(l => l.boost_expire_at && new Date(l.boost_expire_at) > new Date()).length;
    const hidden = dbListings.filter(l => l.status === "Inactive" || l.status === "Hidden" || l.status === "hidden").length;
    const views = dbListings.reduce((s, l) => s + (l.views ?? 0), 0);
    const contacts = dbListings.reduce((s, l) => s + (l.contacts ?? 0), 0);
    
    return [
      { label: "Tổng tin đăng", value: total, icon: FileText, color: C.primary, bg: "rgba(147,69,27,0.08)" },
      { label: "Đang hiển thị", value: active, icon: Eye, color: "#4A7A34", bg: "#E8F5E1" },
      { label: "Tin VIP nổi bật", value: vip, icon: Star, color: "#EAA329", bg: "#FEF6EC" },
      { label: "Đã ẩn", value: hidden, icon: EyeOff, color: "#7A685B", bg: "#F5EFE6" },
      { label: "Tổng lượt xem", value: formatVND(views) || "0", icon: TrendingUp, color: "#3678C6", bg: "#EDF5F9" },
      { label: "Tổng liên hệ", value: formatVND(contacts) || "0", icon: Phone, color: "#8A5BB5", bg: "#F5EEFA" },
    ];
  }, [dbListings]);

  // Active filters count badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selDistrict !== "Tất cả quận/huyện") count++;
    if (priceMin) count++;
    if (priceMax) count++;
    if (areaMin) count++;
    if (areaMax) count++;
    return count;
  }, [selDistrict, priceMin, priceMax, areaMin, areaMax]);

  // Paginated listings
  const totalRows = filteredRows.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  useEffect(() => {
    // Reset to page 1 when search or filter changes
    setPage(1);
  }, [search, filter, selDistrict, priceMin, priceMax, areaMin, areaMax, pageSize]);

  const cellStyle: React.CSSProperties = { fontFamily: font, fontSize: 13.5, color: C.textPrimary, padding: "14px 16px", verticalAlign: "middle" };

  return (
    <LandlordShell active="listings" mobileTitle="Tin đăng">
      <div style={{ padding: isMobile ? "16px 16px 100px" : "28px 32px 60px", maxWidth: 1550, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        
        {/* Breadcrumbs */}
        <LandlordBreadcrumb trail={isMobile ? ["Dashboard", "Tin đăng"] : ["Dashboard chủ trọ", "Tin đăng"]} />

        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: font, fontSize: isMobile ? 21 : 28, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Quản lý tin đăng</h1>
            <p style={{ fontFamily: font, fontSize: isMobile ? 12.8 : 14, color: C.textSecondary, margin: 0 }}>Quản lý và theo dõi hiệu quả các tin đăng cho thuê của bạn.</p>
          </div>
          <div style={{ width: isMobile ? "100%" : undefined }}>
            <PrimaryBtn onClick={toPost}>
              <Plus size={16} strokeWidth={2.5} /> Đăng tin mới
            </PrimaryBtn>
          </div>
        </div>

        {/* Dynamic Main & Sidebar Flex layout */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 24, alignItems: "flex-start" }}>
          
          {/* LEFT: MAIN WORKSPACE */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
            
            {/* KPI Summary Cards */}
            {isLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, height: 80, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div style={{ width: "60%", height: 10, background: "#f0f0f0", borderRadius: 4 }} />
                    <div style={{ width: "30%", height: 24, background: "#f0f0f0", borderRadius: 6 }} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, width: "100%", overflowX: "auto", paddingBottom: 6 }}>
                {kpis.map(it => {
                  const IconComp = it.icon;
                  return (
                    <div key={it.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", minWidth: 135, flex: 1, display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 2px 10px rgba(42,26,12,0.01)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: font, fontSize: 10.5, fontWeight: 850, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{it.label}</span>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: it.bg, display: "flex", alignItems: "center", justifyContent: "center", color: it.color, flexShrink: 0 }}>
                          <IconComp size={13} strokeWidth={2.4} />
                        </div>
                      </div>
                      <span style={{ fontFamily: font, fontSize: 24, fontWeight: 900, color: C.textPrimary, lineHeight: 1, letterSpacing: "-0.02em" }}>{it.value}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Error handling component */}
            {isError && (
              <div style={{ background: "#FCECEC", border: "1px solid #EAA0A0", borderRadius: 14, padding: "16px 20px", display: "flex", gap: 12, alignItems: "center" }}>
                <AlertTriangle size={20} color="#C0392B" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: font, fontSize: 13.5, color: "#C0392B", fontWeight: 700, margin: "0 0 2px" }}>Không thể tải dữ liệu tin đăng</p>
                  <p style={{ fontFamily: font, fontSize: 12.5, color: "#C0392B", margin: 0 }}>{errorMessage}</p>
                </div>
                <button onClick={fetchListings} style={{ padding: "6px 12px", background: "#C0392B", color: "white", border: "none", borderRadius: 8, fontFamily: font, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Thử lại</button>
              </div>
            )}

            {/* Toolbar search / chips / sort */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 4px 16px rgba(42,26,12,0.015)" }}>
              
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", width: "100%" }}>
                {/* Search Bar */}
                <div style={{ position: "relative", flex: 1, minWidth: isMobile ? "100%" : 320 }}>
                  <Search size={16} color={C.textSecondary} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                  <input 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    placeholder="Tìm theo tiêu đề, khu vực, phòng liên kết..."
                    style={{ 
                      fontFamily: font, fontSize: 13.8, color: C.textPrimary, 
                      border: `1.5px solid ${C.border}`, borderRadius: 10, 
                      padding: "10px 38px 10px 40px", width: "100%", boxSizing: "border-box", 
                      background: C.white, outline: "none", transition: "border-color 0.15s" 
                    }}
                    onFocus={e => e.target.style.borderColor = C.primary}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                  {search && (
                    <button onClick={() => setSearch("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      <X size={15} color={C.textSecondary} />
                    </button>
                  )}
                </div>

                {/* Advanced filter toggle button */}
                <button 
                  onClick={() => setShowAdvanced(s => !s)}
                  style={{ 
                    display: "inline-flex", alignItems: "center", gap: 8, 
                    padding: "10px 16px", background: showAdvanced ? C.caramelSoft : C.white, 
                    color: showAdvanced ? C.primary : C.textSecondary, 
                    border: `1.5px solid ${showAdvanced ? C.primary : C.border}`, 
                    borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 700, 
                    cursor: "pointer", transition: "all 0.15s", position: "relative"
                  }}
                >
                  <SlidersHorizontal size={14} />
                  Bộ lọc nâng cao
                  {activeFiltersCount > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: C.primary, color: "white", fontSize: 10.5, fontWeight: 800, position: "absolute", top: -8, right: -8 }}>
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {/* Sort selector */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <select 
                    value={sort} 
                    onChange={e => setSort(e.target.value)} 
                    style={{ 
                      fontFamily: font, fontSize: 13.5, color: C.textPrimary, fontWeight: 700,
                      border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 32px 10px 14px", 
                      background: C.white, outline: "none", cursor: "pointer", appearance: "none"
                    }}
                  >
                    {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Collapsible Advanced Filters Drawer */}
              {showAdvanced && (
                <div style={{ background: "rgba(240,231,214,0.15)", borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
                    
                    {/* District */}
                    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary }}>Khu vực quận/huyện</span>
                      <select value={selDistrict} onChange={e => setSelDistrict(e.target.value)} style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: 8, background: C.white, outline: "none" }}>
                        {REGION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </label>

                    {/* Price Range */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary }}>Khoảng giá (VND)</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="Tối thiểu" style={{ flex: 1, fontFamily: font, fontSize: 13, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", outline: "none" }} />
                        <span style={{ fontSize: 12, color: C.textSecondary }}>-</span>
                        <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="Tối đa" style={{ flex: 1, fontFamily: font, fontSize: 13, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", outline: "none" }} />
                      </div>
                    </div>

                    {/* Area Range */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary }}>Diện tích (m²)</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="number" value={areaMin} onChange={e => setAreaMin(e.target.value)} placeholder="Tối thiểu" style={{ flex: 1, fontFamily: font, fontSize: 13, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", outline: "none" }} />
                        <span style={{ fontSize: 12, color: C.textSecondary }}>-</span>
                        <input type="number" value={areaMax} onChange={e => setAreaMax(e.target.value)} placeholder="Tối đa" style={{ flex: 1, fontFamily: font, fontSize: 13, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", outline: "none" }} />
                      </div>
                    </div>

                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <GhostBtn onClick={resetFilters}>Xóa bộ lọc</GhostBtn>
                    <PrimaryBtn onClick={() => setShowAdvanced(false)}>Áp dụng</PrimaryBtn>
                  </div>
                </div>
              )}

              {/* Quick Filters Row */}
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                {FILTERS.map(f => {
                  const active = filter === f.value;
                  return (
                    <button key={f.value} onClick={() => setFilter(f.value)}
                      style={{ 
                        fontFamily: font, fontSize: 12.8, fontWeight: active ? 700 : 500, 
                        color: active ? C.white : C.textSecondary, 
                        background: active ? C.primary : C.white, 
                        border: `1.5px solid ${active ? C.primary : C.border}`, 
                        borderRadius: 999, padding: "6px 14px", cursor: "pointer", 
                        whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.12s" 
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = C.primary; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = C.border; }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Table Card */}
            {isLoading ? (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 14 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, height: 48, background: "#f9f9f9", borderRadius: 10, animation: "pulse 1.2s infinite" }} />
                ))}
              </div>
            ) : totalRows === 0 ? (
              // Empty State
              dbListings.length === 0 ? (
                <div style={{ background: C.white, border: `1px dashed ${C.border}`, borderRadius: 20, padding: "56px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", color: C.primary }}>
                    <FileText size={28} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>Bạn chưa có tin đăng nào</h3>
                    <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0, maxWidth: 360 }}>Bắt đầu kết nối phòng trọ trống của bạn lên thị trường để tiếp cận hàng nghìn khách hàng tiềm năng.</p>
                  </div>
                  <PrimaryBtn onClick={toPost}>
                    <Plus size={16} /> Đăng tin đầu tiên
                  </PrimaryBtn>
                </div>
              ) : (
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: "48px 32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  <AlertTriangle size={24} color={C.textSecondary} />
                  <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: 0 }}>Không tìm thấy tin đăng phù hợp với điều kiện lọc.</p>
                  <GhostBtn onClick={resetFilters}>Xóa bộ lọc</GhostBtn>
                </div>
              )
            ) : isMobile ? (
              // Mobile Cards List
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {paginatedRows.map(l => {
                  const imageSrc = getListingImage(l.id);
                  const isVIP = l.boost_expire_at && new Date(l.boost_expire_at) > new Date();
                  const isBlocked = mutatingId === l.id;
                  
                  return (
                    <div key={l.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, padding: 16, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 2px 8px rgba(42,26,12,0.01)" }}>
                      <div style={{ display: "flex", gap: 12 }}>
                        <img src={imageSrc} alt={l.title} style={{ width: 68, height: 68, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <span style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>{l.title}</span>
                          <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>ID: TNH-{l.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: `1px solid ${C.border}`, paddingTop: 10, fontSize: 12.8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: C.textSecondary }}>Giá hiển thị</span>
                          <b style={{ color: C.primary, fontWeight: 800 }}>{formatVND(l.price)} đ</b>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: C.textSecondary }}>Khu vực</span>
                          <span style={{ color: C.textPrimary, fontWeight: 650 }}>{l.district}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: C.textSecondary }}>Trạng thái</span>
                          <StatusChip status={l.status} boostExpire={l.boost_expire_at} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: C.textSecondary }}>Hiệu quả</span>
                          <span style={{ color: C.textPrimary, fontWeight: 650 }}>{l.views || 0} xem / {l.contacts || 0} liên hệ</span>
                        </div>
                      </div>
                      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: "flex", justifyContent: "flex-end", gap: 6 }}>
                        <IconAction icon={<Eye size={14} />} label="Xem chi tiết" onClick={() => navigate(`/phong/${l.id}`)} disabled={isBlocked} />
                        <IconAction icon={<Pencil size={14} />} label="Chỉnh sửa" onClick={() => alert("[Demo] Tính năng chỉnh sửa tin đăng sẽ khả dụng ở bản chính thức!")} disabled={isBlocked} />
                        <IconAction icon={l.status === "Active" ? <EyeOff size={14} /> : <Eye size={14} />} label={l.status === "Active" ? "Ẩn tin" : "Hiện tin"} onClick={() => handleToggleStatus(l.id, l.status)} disabled={isBlocked} />
                        <IconAction icon={<ArrowUpCircle size={14} />} label="Đẩy tin VIP" vip onClick={() => setBoostTarget(l)} disabled={isBlocked || isVIP} />
                        <IconAction icon={<Trash2 size={14} />} label="Xóa tin" danger onClick={() => handleDeleteListing(l.id)} disabled={isBlocked} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Desktop Table Card
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 20px rgba(42,26,12,0.015)" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                    <thead>
                      <tr style={{ background: "rgba(240,231,214,0.18)", borderBottom: `1.5px solid ${C.border}` }}>
                        {["Tin đăng", "Phòng liên kết", "Khu vực", "Giá hiển thị", "Trạng thái tin", "Hiệu quả", "Cập nhật", "Thao tác"].map(c => (
                          <th key={c} style={{ fontFamily: font, fontSize: 11, fontWeight: 900, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", padding: "14px 16px", whiteSpace: "nowrap" }}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.map((l, idx) => {
                        const imageSrc = getListingImage(l.id);
                        const isVIP = l.boost_expire_at && new Date(l.boost_expire_at) > new Date();
                        const isBlocked = mutatingId === l.id;

                        return (
                          <tr key={l.id} style={{ borderBottom: `1px solid ${C.border}`, background: idx % 2 ? "rgba(240,231,214,0.03)" : C.white, transition: "background 0.1s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(240,231,214,0.08)"}
                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 ? "rgba(240,231,214,0.03)" : C.white}>
                            
                            {/* TIN ĐĂNG */}
                            <td style={{ ...cellStyle, maxWidth: 320 }}>
                              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <img src={imageSrc} alt="" style={{ width: 54, height: 54, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: `1px solid ${C.border}` }} />
                                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                                  <span style={{ fontWeight: 800, color: C.textPrimary, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.title}>{l.title}</span>
                                  <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 650 }}>ID: TNH-{l.id.slice(0, 8).toUpperCase()}</span>
                                </div>
                              </div>
                            </td>

                            {/* PHÒNG LIÊN KẾT */}
                            <td style={{ ...cellStyle, color: C.textSecondary, fontWeight: 650 }}>
                              {l.room_id ? `Phòng #${l.room_id.slice(0,6).toUpperCase()}` : "—"}
                            </td>

                            {/* KHU VỰC */}
                            <td style={{ ...cellStyle, color: C.textSecondary, fontWeight: 650 }}>{l.district}</td>

                            {/* GIÁ HIỂN THỊ */}
                            <td style={{ ...cellStyle, fontWeight: 800, color: C.primary, fontSize: 14 }}>
                              {formatVND(l.price)} đ
                            </td>

                            {/* TRẠNG THÁI */}
                            <td style={cellStyle}>
                              <StatusChip status={l.status} boostExpire={l.boost_expire_at} />
                            </td>

                            {/* HIỆU QUẢ */}
                            <td style={cellStyle}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12.5, color: C.textSecondary }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Eye size={12} /> {l.views || 0} xem</span>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MessageSquare size={12} /> {l.contacts || 0} liên hệ</span>
                              </div>
                            </td>

                            {/* CẬP NHẬT */}
                            <td style={{ ...cellStyle, color: C.textSecondary, fontSize: 12.5 }}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontWeight: 600 }}>{new Date(l.updated_at).toLocaleDateString("vi-VN")}</span>
                                <span style={{ fontSize: 10.5, color: "#999" }}>{new Date(l.updated_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            </td>

                            {/* THAO TÁC */}
                            <td style={cellStyle}>
                              <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                                <IconAction icon={<Eye size={14} />} label="Xem tin" onClick={() => navigate(`/phong/${l.id}`)} disabled={isBlocked} />
                                <IconAction icon={<Pencil size={14} />} label="Chỉnh sửa" onClick={() => alert("[Demo] Tính năng chỉnh sửa tin đăng sẽ khả dụng ở bản chính thức!")} disabled={isBlocked} />
                                <IconAction icon={l.status === "Active" ? <EyeOff size={14} /> : <Eye size={14} />} label={l.status === "Active" ? "Ẩn tin" : "Hiện tin"} onClick={() => handleToggleStatus(l.id, l.status)} disabled={isBlocked} />
                                <IconAction icon={<ArrowUpCircle size={14} />} label="Đẩy tin VIP" vip onClick={() => setBoostTarget(l)} disabled={isBlocked || isVIP} />
                                <IconAction icon={<Trash2 size={14} />} label="Xóa tin" danger onClick={() => handleDeleteListing(l.id)} disabled={isBlocked} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination panel */}
            {!isLoading && totalRows > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "12px 18px", boxShadow: "0 2px 8px rgba(42,26,12,0.01)" }}>
                <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>
                  Hiển thị <b>{Math.min(totalRows, (page - 1) * pageSize + 1)}–{Math.min(totalRows, page * pageSize)}</b> trên <b>{totalRows}</b> tin đăng
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {/* Prev */}
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: page === 1 ? "not-allowed" : "pointer", color: C.textSecondary, opacity: page === 1 ? 0.5 : 1 }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pNum = idx + 1;
                    const active = page === pNum;
                    return (
                      <button 
                        key={pNum} 
                        onClick={() => setPage(pNum)}
                        style={{ 
                          width: 32, height: 32, borderRadius: 8, 
                          border: active ? `1.5px solid ${C.primary}` : `1px solid ${C.border}`, 
                          background: active ? C.primary : C.white, 
                          color: active ? "white" : C.textPrimary,
                          fontFamily: font, fontSize: 13, fontWeight: active ? 750 : 500,
                          cursor: "pointer"
                        }}
                      >
                        {pNum}
                      </button>
                    );
                  })}

                  {/* Next */}
                  <button 
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: page === totalPages ? "not-allowed" : "pointer", color: C.textSecondary, opacity: page === totalPages ? 0.5 : 1 }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>Hiển thị</span>
                  <select 
                    value={pageSize} 
                    onChange={e => setPageSize(Number(e.target.value))} 
                    style={{ 
                      fontFamily: font, fontSize: 12.8, color: C.textPrimary, fontWeight: 700,
                      border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "5px 24px 5px 10px", 
                      background: C.white, outline: "none", cursor: "pointer", appearance: "none"
                    }}
                  >
                    <option value={5}>5 / trang</option>
                    <option value={10}>10 / trang</option>
                    <option value={20}>20 / trang</option>
                  </select>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT: INSIGHTS SIDEBAR */}
          <aside style={{ width: isMobile ? "100%" : 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            
            {/* Card 1: Performance Insights */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 4px 16px rgba(42,26,12,0.015)" }}>
              <div>
                <h3 style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
                  <TrendingUp size={16} color={C.primary} />
                  Hiệu quả tin đăng
                </h3>
                <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: 0 }}>30 ngày gần nhất</p>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                
                {/* Views spark */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>Tổng lượt xem</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                      <span style={{ fontFamily: font, fontSize: 18, fontWeight: 900, color: C.textPrimary }}>18.250</span>
                      <span style={{ fontFamily: font, fontSize: 11, color: "#4A7A34", fontWeight: 700 }}>+18.6%</span>
                    </div>
                  </div>
                  <Sparkline data={[12000, 13400, 12800, 14200, 15100, 16800, 18250]} color="#4A7A34" />
                </div>

                {/* Contacts spark */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>Tổng liên hệ</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                      <span style={{ fontFamily: font, fontSize: 18, fontWeight: 900, color: C.textPrimary }}>124</span>
                      <span style={{ fontFamily: font, fontSize: 11, color: "#4A7A34", fontWeight: 700 }}>+12.4%</span>
                    </div>
                  </div>
                  <Sparkline data={[90, 95, 110, 105, 115, 118, 124]} color="#8A5BB5" />
                </div>

                {/* Conversion Rate spark */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>Tỷ lệ liên hệ / lượt xem</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                      <span style={{ fontFamily: font, fontSize: 18, fontWeight: 900, color: C.textPrimary }}>0,68%</span>
                      <span style={{ fontFamily: font, fontSize: 11, color: "#4A7A34", fontWeight: 700 }}>+5.1%</span>
                    </div>
                  </div>
                  <Sparkline data={[0.62, 0.64, 0.65, 0.63, 0.66, 0.67, 0.68]} color="#EAA329" />
                </div>

              </div>

              <button 
                onClick={() => alert("[Demo] Báo cáo chi tiết sẽ hiển thị biểu đồ phân tích sâu hơn ở bản chính thức!")}
                style={{ 
                  width: "100%", padding: "10px", background: "rgba(240,231,214,0.18)", border: "none", 
                  borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 700, 
                  color: C.primary, cursor: "pointer", display: "flex", alignItems: "center", 
                  justifyContent: "center", gap: 4, transition: "background 0.15s" 
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.caramelSoft}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(240,231,214,0.18)"}
              >
                Xem báo cáo chi tiết
              </button>
            </div>

            {/* Card 2: Marketing Tips */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 4px 16px rgba(42,26,12,0.015)" }}>
              <h3 style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={16} color={C.primary} />
                Mẹo tăng hiệu quả
              </h3>

              <ul style={{ paddingLeft: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { text: "Nâng cấp tin VIP để tăng hiển thị", icon: Star, color: "#EAA329" },
                  { text: "Cập nhật nội dung tin thường xuyên", icon: RefreshCw, color: "#4A7A34" },
                  { text: "Thêm ảnh chất lượng cao", icon: FileText, color: "#3678C6" }
                ].map((tip, index) => {
                  const TipIcon = tip.icon;
                  return (
                    <li key={index} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(240,231,214,0.18)", display: "flex", alignItems: "center", justifyContent: "center", color: tip.color, flexShrink: 0, marginTop: 1 }}>
                        <TipIcon size={11} strokeWidth={2.5} />
                      </div>
                      <span style={{ fontFamily: font, fontSize: 12.8, color: C.textSecondary, lineHeight: 1.45 }}>{tip.text}</span>
                    </li>
                  );
                })}
              </ul>

              <button 
                onClick={() => alert("[Demo] Hệ thống mẹo marketing và tối ưu tin đăng đang được xây dựng.")}
                style={{ 
                  background: "none", border: "none", color: C.primary, 
                  fontFamily: font, fontSize: 13, fontWeight: 700, 
                  cursor: "pointer", alignSelf: "flex-start", padding: 0, display: "inline-flex", alignItems: "center", gap: 4 
                }}
              >
                Xem tất cả mẹo <ChevronRight size={14} />
              </button>
            </div>

            {/* Card 3: Support */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 4px 16px rgba(42,26,12,0.015)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(54,120,198,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3678C6", flexShrink: 0 }}>
                  <Phone size={16} strokeWidth={2.4} />
                </div>
                <div>
                  <h4 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Cần hỗ trợ?</h4>
                  <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: 0 }}>Liên hệ 24/7</p>
                </div>
              </div>
              <p style={{ fontFamily: font, fontSize: 12.8, color: C.textSecondary, margin: 0, lineHeight: 1.45 }}>Đội ngũ Trọ Nhanh luôn sẵn sàng đồng hành cùng bạn để vận hành và tối ưu hóa việc cho thuê.</p>
              
              <a 
                href="mailto:tronhanh2026@gmail.com?subject=Yeu%20cau%20ho%20tro%20Quan%20ly%20tin%20dang"
                style={{ 
                  width: "100%", padding: "10px 14px", background: "#3678C6", border: "none", 
                  borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 700, 
                  color: "white", cursor: "pointer", display: "flex", alignItems: "center", 
                  justifyContent: "center", gap: 6, textDecoration: "none", textAlign: "center",
                  boxShadow: "0 2px 8px rgba(54,120,198,0.25)", transition: "background 0.15s" 
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#2D64A7"}
                onMouseLeave={e => e.currentTarget.style.background = "#3678C6"}
              >
                Liên hệ hỗ trợ
              </a>
            </div>

          </aside>

        </div>

      </div>

      <PaymentModal open={!!boostTarget} title={boostTarget?.title || ""} onConfirm={handleConfirmBoost} onCancel={() => setBoostTarget(null)} />
      <Toast show={toast} message={toastMsg} />
      <DemoFAB />
    </LandlordShell>
  );
}

export default QuanLyPage;
