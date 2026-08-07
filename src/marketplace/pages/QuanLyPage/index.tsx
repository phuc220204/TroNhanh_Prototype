import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { 
  Plus, Search, Eye, EyeOff, ArrowUpCircle, Pencil,
  FileText, Star, TrendingUp, Phone, Sparkles, X, SlidersHorizontal, ChevronRight, ChevronLeft,
  AlertTriangle
} from "lucide-react";
import { C, font } from "../../../shared/theme";
import { useBreakpoint } from "../../../shared/components/useBreakpoint";
import { LandlordShell, LandlordBreadcrumb } from "../../../shared/components/LandlordShell";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { supabase } from "../../../shared/supabaseClient";
import { DemoFAB } from "../../../shared/components/PublicNavbar";
import { searchListings } from "../../services/listing-queries";
import { updateListingStatus, deleteListing, boostListing, linkListingToRoom } from "../../services/listing-mutations";
import { formatVND } from "../../utils/listingMetadata";
import { logError, toUserMessage } from "../../../shared/services/supabase-error";
import { MyListingsTable, type DbListing } from "./MyListingsTable";
import { BoostModal } from "./BoostModal";
import { LinkRoomModal } from "./LinkRoomModal";

const FILTERS = [
  { label: "Tất cả", value: "all" },
  { label: "Đang hiển thị", value: "Active" },
  { label: "Tin VIP nổi bật", value: "VIP" },
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

function Toast({ show, message }: { show: boolean; message: string }) {
  return (
    <div style={{ position: "fixed", bottom: 32, left: "50%", transform: `translateX(-50%) translateY(${show ? 0 : 20}px)`, opacity: show ? 1 : 0, transition: "all 0.25s", zIndex: 600, background: C.primaryDark, borderRadius: 10, padding: "12px 22px", pointerEvents: "none" }}>
      <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.cream }}>{message}</span>
    </div>
  );
}

export function QuanLyPage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { user } = useAuth();

  const [dbListings, setDbListings]   = useState<DbListing[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isError, setIsError]         = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState<string>("all");
  const [sort, setSort]               = useState("newest");
  const [toast, setToast]             = useState(false);
  const [toastMsg, setToastMsg]       = useState("");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selDistrict, setSelDistrict]   = useState("Tất cả quận/huyện");
  const [priceMin, setPriceMin]         = useState("");
  const [priceMax, setPriceMax]         = useState("");
  const [areaMin, setAreaMin]           = useState("");
  const [areaMax, setAreaMax]           = useState("");

  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(10);
  const [boostTarget, setBoostTarget] = useState<DbListing | null>(null);
  const [boostSubmitting, setBoostSubmitting] = useState(false);
  const [boostError, setBoostError] = useState<string | null>(null);
  const [linkTarget, setLinkTarget] = useState<DbListing | null>(null);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [mutatingId, setMutatingId]   = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  const fetchListings = async () => {
    if (!user) return;
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await searchListings({
        sellerId: user.id,
        // "All" để thấy CẢ tin Chờ duyệt / Bị từ chối / Đã ẩn — đây là trang
        // quản lý tin của chính mình, không phải trang tìm kiếm công khai.
        status: "All",
        pageSize: 100,
        page: 1,
      });
      if (result.rawRows) {
        setDbListings(result.rawRows.map(l => ({ ...l, views: l.view_count ?? 0 })));
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
    const nextStatus = currentStatus === "Active" ? "Hidden" : "Active";
    try {
      setMutatingId(id);
      await updateListingStatus(id, nextStatus);
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
      await deleteListing(id);
      setDbListings(prev => prev.filter(l => l.id !== id));
      showToast("Đã xóa tin đăng thành công");
    } catch (err: any) {
      logError("QuanLyPage.handleDeleteListing", err);
      showToast("Có lỗi xảy ra: " + err.message);
    } finally {
      setMutatingId(null);
    }
  };

  const handleConfirmRoomLink = async (roomId: string | null) => {
    if (!linkTarget) return;
    setLinkError(null);
    try {
      setLinkSubmitting(true);
      await linkListingToRoom(linkTarget.id, roomId);
      setDbListings(prev => prev.map(l => l.id === linkTarget.id ? { ...l, room_id: roomId } : l));
      setLinkTarget(null);
      showToast(roomId ? "Đã gắn phòng cho tin đăng." : "Đã bỏ gắn phòng khỏi tin đăng.");
    } catch (err: unknown) {
      logError("QuanLyPage.handleConfirmRoomLink", err);
      setLinkError(toUserMessage(err));
    } finally {
      setLinkSubmitting(false);
    }
  };

  const handleConfirmBoost = async (days: number) => {
    if (!boostTarget) return;
    setBoostError(null);
    try {
      setBoostSubmitting(true);
      // Ngày hết hạn do SERVER trả về (RPC tự cộng dồn nếu boost còn hạn).
      // Trước đây client tự tính `Date.now() + days` rồi ghi thẳng vào cột —
      // vừa không qua thanh toán, vừa xóa mất phần hạn còn lại.
      const newExpiry = await boostListing(boostTarget.id, days);
      setDbListings(prev => prev.map(l => l.id === boostTarget.id ? { ...l, boost_expire_at: newExpiry } : l));
      setBoostTarget(null);
      showToast("Đã đẩy tin nổi bật thành công!");
    } catch (err: unknown) {
      logError("QuanLyPage.handleConfirmBoost", err);
      setBoostError(toUserMessage(err));
    } finally {
      setBoostSubmitting(false);
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

  const filteredRows = useMemo(() => {
    let r = dbListings;
    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter(l => 
        l.title.toLowerCase().includes(q) || 
        l.district.toLowerCase().includes(q) || 
        (l.room_id?.toLowerCase().includes(q) ?? false)
      );
    }
    
    if (filter !== "all") {
      if (filter === "VIP") {
        r = r.filter(l => l.boost_expire_at && new Date(l.boost_expire_at) > new Date());
      } else {
        r = r.filter(l => l.status === filter);
      }
    }

    if (selDistrict !== "Tất cả quận/huyện") {
      r = r.filter(l => l.district === selDistrict);
    }

    if (priceMin) r = r.filter(l => l.price >= Number(priceMin));
    if (priceMax) r = r.filter(l => l.price <= Number(priceMax));
    if (areaMin) r = r.filter(l => l.area >= Number(areaMin));
    if (areaMax) r = r.filter(l => l.area <= Number(areaMax));

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

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selDistrict !== "Tất cả quận/huyện") count++;
    if (priceMin) count++;
    if (priceMax) count++;
    if (areaMin) count++;
    if (areaMax) count++;
    return count;
  }, [selDistrict, priceMin, priceMax, areaMin, areaMax]);

  const totalRows = filteredRows.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, filter, selDistrict, priceMin, priceMax, areaMin, areaMax, pageSize]);

  return (
    <LandlordShell active="listings" mobileTitle="Tin đăng">
      <div style={{ padding: isMobile ? "16px 16px 100px" : "28px 32px 60px", maxWidth: 1550, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <LandlordBreadcrumb trail={isMobile ? ["Dashboard", "Tin đăng"] : ["Dashboard chủ trọ", "Tin đăng"]} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: font, fontSize: isMobile ? 21 : 28, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Quản lý tin đăng</h1>
            <p style={{ fontFamily: font, fontSize: isMobile ? 12.8 : 14, color: C.textSecondary, margin: 0 }}>Quản lý và theo dõi hiệu quả các tin đăng cho thuê của bạn.</p>
          </div>
          <div style={{ width: isMobile ? "100%" : undefined }}>
            <button onClick={toPost} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", background: C.primary, color: C.white, border: "none", borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
              <Plus size={16} strokeWidth={2.5} /> Đăng tin mới
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 24, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
            
            {isLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, height: 80 }} />
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, width: "100%", overflowX: "auto", paddingBottom: 6 }}>
                {kpis.map(it => {
                  const IconComp = it.icon;
                  return (
                    <div key={it.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", minWidth: 135, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: font, fontSize: 10.5, fontWeight: 850, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>{it.label}</span>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: it.bg, display: "flex", alignItems: "center", justifyContent: "center", color: it.color }}>
                          <IconComp size={13} strokeWidth={2.4} />
                        </div>
                      </div>
                      <span style={{ fontFamily: font, fontSize: 24, fontWeight: 900, color: C.textPrimary, lineHeight: 1 }}>{it.value}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {isError && (
              <div style={{ background: "#FCECEC", border: "1px solid #EAA0A0", borderRadius: 14, padding: "16px 20px", display: "flex", gap: 12, alignItems: "center" }}>
                <AlertTriangle size={20} color="#C0392B" />
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: font, fontSize: 13.5, color: "#C0392B", fontWeight: 700, margin: 0 }}>Không thể tải dữ liệu tin đăng</p>
                  <p style={{ fontFamily: font, fontSize: 12.5, color: "#C0392B", margin: 0 }}>{errorMessage}</p>
                </div>
                <button onClick={fetchListings} style={{ padding: "6px 12px", background: "#C0392B", color: "white", border: "none", borderRadius: 8, fontFamily: font, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Thử lại</button>
              </div>
            )}

            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", width: "100%" }}>
                <div style={{ position: "relative", flex: 1, minWidth: isMobile ? "100%" : 320 }}>
                  <Search size={16} color={C.textSecondary} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                  <input 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    placeholder="Tìm theo tiêu đề, khu vực, phòng liên kết..."
                    style={{ fontFamily: font, fontSize: 13.8, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 38px 10px 40px", width: "100%", boxSizing: "border-box", background: C.white, outline: "none" }}
                  />
                  {search && (
                    <button onClick={() => setSearch("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      <X size={15} color={C.textSecondary} />
                    </button>
                  )}
                </div>

                <button 
                  onClick={() => setShowAdvanced(s => !s)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", background: showAdvanced ? C.caramelSoft : C.white, color: showAdvanced ? C.primary : C.textSecondary, border: `1.5px solid ${showAdvanced ? C.primary : C.border}`, borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer", position: "relative" }}
                >
                  <SlidersHorizontal size={14} />
                  Bộ lọc nâng cao
                  {activeFiltersCount > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: C.primary, color: "white", fontSize: 10.5, fontWeight: 800, position: "absolute", top: -8, right: -8 }}>
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                <select value={sort} onChange={e => setSort(e.target.value)} style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, fontWeight: 700, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 32px 10px 14px", background: C.white, outline: "none", cursor: "pointer" }}>
                  {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {showAdvanced && (
                <div style={{ background: "rgba(240,231,214,0.15)", borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary }}>Khu vực quận/huyện</span>
                      <select value={selDistrict} onChange={e => setSelDistrict(e.target.value)} style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: 8, background: C.white, outline: "none" }}>
                        {REGION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </label>

                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary }}>Khoảng giá (VND)</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="Tối thiểu" style={{ flex: 1, fontFamily: font, fontSize: 13, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", outline: "none" }} />
                        <span style={{ fontSize: 12, color: C.textSecondary }}>-</span>
                        <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="Tối đa" style={{ flex: 1, fontFamily: font, fontSize: 13, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", outline: "none" }} />
                      </div>
                    </div>

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
                    <button onClick={resetFilters} style={{ padding: "8px 16px", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>Xóa bộ lọc</button>
                    <button onClick={() => setShowAdvanced(false)} style={{ padding: "8px 16px", background: C.primary, color: C.white, border: "none", borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Áp dụng</button>
                  </div>
                </div>
              )}

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
                        whiteSpace: "nowrap", flexShrink: 0 
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <MyListingsTable
              paginatedRows={paginatedRows}
              isLoading={isLoading}
              totalRows={totalRows}
              totalListingsCount={dbListings.length}
              mutatingId={mutatingId}
              isMobile={isMobile}
              toPost={toPost}
              resetFilters={resetFilters}
              handleToggleStatus={handleToggleStatus}
            onLinkRoom={(l) => { setLinkError(null); setLinkTarget(l); }}
              handleDeleteListing={handleDeleteListing}
              setBoostTarget={setBoostTarget}
            />

            {!isLoading && totalRows > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "12px 18px" }}>
                <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>
                  Hiển thị <b>{Math.min(totalRows, (page - 1) * pageSize + 1)}–{Math.min(totalRows, page * pageSize)}</b> trên <b>{totalRows}</b> tin đăng
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, cursor: page === 1 ? "not-allowed" : "pointer" }}>
                    <ChevronLeft size={16} />
                  </button>
                  
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pNum = idx + 1;
                    const active = page === pNum;
                    return (
                      <button key={pNum} onClick={() => setPage(pNum)} style={{ width: 32, height: 32, borderRadius: 8, border: active ? `1.5px solid ${C.primary}` : `1px solid ${C.border}`, background: active ? C.primary : C.white, color: active ? "white" : C.textPrimary, fontFamily: font, fontSize: 13, fontWeight: active ? 750 : 500, cursor: "pointer" }}>
                        {pNum}
                      </button>
                    );
                  })}

                  <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, cursor: page === totalPages ? "not-allowed" : "pointer" }}>
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>Hiển thị</span>
                  <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} style={{ fontFamily: font, fontSize: 12.8, color: C.textPrimary, fontWeight: 700, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "5px 12px", background: C.white, outline: "none" }}>
                    <option value={5}>5 / trang</option>
                    <option value={10}>10 / trang</option>
                    <option value={20}>20 / trang</option>
                  </select>
                </div>
              </div>
            )}

          </div>

          <aside style={{ width: isMobile ? "100%" : 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h3 style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
                  <TrendingUp size={16} color={C.primary} />
                  Hiệu quả tin đăng
                </h3>
                <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: 0 }}>30 ngày gần nhất</p>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
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
              </div>
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              <h3 style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={16} color={C.primary} />
                Mẹo tăng hiệu quả
              </h3>

              <ul style={{ paddingLeft: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { text: "Nâng cấp tin VIP để tăng hiển thị", icon: Star, color: "#EAA329" },
                  { text: "Cập nhật nội dung tin thường xuyên", icon: Eye, color: "#4A7A34" },
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
            </div>
          </aside>
        </div>
      </div>

      {linkTarget && (
        <LinkRoomModal
          listingTitle={linkTarget.title}
          currentRoomId={linkTarget.room_id}
          submitting={linkSubmitting}
          errorMessage={linkError}
          onCancel={() => { setLinkTarget(null); setLinkError(null); }}
          onSubmit={handleConfirmRoomLink}
        />
      )}

      <BoostModal
        open={!!boostTarget}
        title={boostTarget?.title || ""}
        submitting={boostSubmitting}
        errorMessage={boostError}
        onConfirm={handleConfirmBoost}
        onCancel={() => { setBoostTarget(null); setBoostError(null); }}
      />
      <Toast show={toast} message={toastMsg} />
      <DemoFAB />
    </LandlordShell>
  );
}

export default QuanLyPage;
