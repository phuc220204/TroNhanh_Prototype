import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { Plus, TriangleAlert } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { useBreakpoint } from "../../../shared/components/useBreakpoint";
import { AppSelect, Pagination } from "../../../shared/components/common";
// Trang này thuộc marketplace (§2.4 — nó chạy 100% trên `rental_listings`) và
// từ 2026-08-09 nằm trong khu vực TÀI KHOẢN, không phải "Dashboard chủ trọ".
// Đăng tin là việc miễn phí ai cũng làm được; `/chu-tro/*` là module SaaS trả phí.
import { RenterShell } from "../../../shared/components/RenterShell";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import { searchListings } from "../../services/listing-queries";
import { listMyBoostOrders, type BoostOrderSummary } from "../../services/boost-orders-service";
import { updateListingStatus, deleteListing, linkListingToRoom } from "../../services/listing-mutations";
import { useBoostAvailability } from "../../hooks/useBoostAvailability";
import { logError, toUserMessage } from "../../../shared/services/supabase-error";
import { MyListingsTable, type DbListing } from "./MyListingsTable";
import { ListingStats } from "./ListingStats";
import { ListingsToolbar, EMPTY_ADVANCED_FILTERS, type AdvancedFilters } from "./ListingsToolbar";
import { LinkRoomModal } from "./LinkRoomModal";
import { DeleteListingModal } from "./DeleteListingModal";
import { BoostCheckoutModal } from "./BoostCheckoutModal";

const PAGE_SIZE_OPTIONS = [5, 10, 20].map((n) => ({ label: `${n} / trang`, value: String(n) }));

function sortListings(rows: DbListing[], sort: string): DbListing[] {
  const arr = [...rows];
  const time = (iso: string) => new Date(iso).getTime();
  if (sort === "newest") arr.sort((a, b) => time(b.created_at) - time(a.created_at));
  else if (sort === "oldest") arr.sort((a, b) => time(a.created_at) - time(b.created_at));
  else if (sort === "price-asc") arr.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") arr.sort((a, b) => b.price - a.price);
  return arr;
}

export function QuanLyPage() {
  const navigate = useNavigate();
  const { isMobile, width } = useBreakpoint();
  // RenterShell có sidebar ⇒ dưới ~1180px vùng nội dung không đủ cho bảng, dùng thẻ.
  const isCardLayout = width < 1180;
  const { user } = useAuth();
  const { showToast } = useToast();
  const showBoostAction = useBoostAvailability().isBoostAvailable;

  const [dbListings, setDbListings] = useState<DbListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState("newest");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const deletingRef = useRef(false);
  const [linkTarget, setLinkTarget] = useState<DbListing | null>(null);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DbListing | null>(null);
  const [boostTarget, setBoostTarget] = useState<DbListing | null>(null);

  const fetchListings = async () => {
    if (!user) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [result, boostOrders] = await Promise.all([
        searchListings({
          sellerId: user.id,
          // "All" để thấy CẢ tin Chờ duyệt / Bị từ chối / Đã ẩn — đây là trang
          // quản lý tin của chính mình, không phải trang tìm kiếm công khai.
          status: "All",
          pageSize: 100,
          page: 1,
        }),
        // The order panel is supplemental. A temporary read failure must not
        // hide the seller's listings or make ordinary management unavailable.
        listMyBoostOrders().catch((error): BoostOrderSummary[] => {
          logError("QuanLyPage.fetchBoostOrders", error);
          return [];
        }),
      ]);
      if (result.rawRows) {
        const ordersByListing = new Map<string, BoostOrderSummary[]>();
        for (const order of boostOrders) {
          const orders = ordersByListing.get(order.listing_id) ?? [];
          orders.push(order);
          ordersByListing.set(order.listing_id, orders);
        }
        setDbListings(result.rawRows.map((l) => ({
          ...l,
          views: l.view_count ?? 0,
          boost_orders: ordersByListing.get(l.id) ?? [],
        })));
      }
    } catch (err) {
      logError("QuanLyPage.fetchListings", err);
      setLoadError(toUserMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchListings();
  }, [user]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (currentStatus !== "Active" && currentStatus !== "Hidden") return;
    const nextStatus = currentStatus === "Active" ? "Hidden" : "Active";
    try {
      setMutatingId(id);
      await updateListingStatus(id, nextStatus);
      setDbListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: nextStatus } : l)));
      showToast(nextStatus === "Active" ? "Đã hiển thị tin đăng thành công" : "Đã ẩn tin đăng thành công");
    } catch (err) {
      logError("QuanLyPage.handleToggleStatus", err);
      showToast(toUserMessage(err), { variant: "error" });
    } finally {
      setMutatingId(null);
    }
  };

  const handleDeleteListing = (id: string) => {
    const listing = dbListings.find((item) => item.id === id);
    if (listing) setDeleteTarget(listing);
  };

  const confirmDeleteListing = async () => {
    if (!deleteTarget || deletingRef.current) return;
    const target = deleteTarget;
    deletingRef.current = true;
    // Xóa khỏi danh sách ngay; nếu RPC thất bại, hoàn tác rồi nạp lại để xử lý
    // cả trường hợp server đã commit nhưng response bị mất trên đường về.
    setDbListings((prev) => prev.filter((l) => l.id !== target.id));
    try {
      setMutatingId(target.id);
      await deleteListing(target.id);
      setDeleteTarget(null);
      showToast("Đã xóa tin đăng thành công");
    } catch (err) {
      logError("QuanLyPage.handleDeleteListing", err);
      setDbListings((prev) => (prev.some((l) => l.id === target.id) ? prev : [...prev, target]));
      showToast(toUserMessage(err), { variant: "error" });
      await fetchListings();
    } finally {
      setMutatingId(null);
      deletingRef.current = false;
    }
  };

  const handleConfirmRoomLink = async (roomId: string | null) => {
    if (!linkTarget) return;
    setLinkError(null);
    try {
      setLinkSubmitting(true);
      await linkListingToRoom(linkTarget.id, roomId);
      setDbListings((prev) => prev.map((l) => (l.id === linkTarget.id ? { ...l, room_id: roomId } : l)));
      setLinkTarget(null);
      showToast(roomId ? "Đã gắn phòng cho tin đăng." : "Đã bỏ gắn phòng khỏi tin đăng.");
    } catch (err) {
      logError("QuanLyPage.handleConfirmRoomLink", err);
      setLinkError(toUserMessage(err));
    } finally {
      setLinkSubmitting(false);
    }
  };

  const toPost = () => navigate("/dang-tin-cho-thue");

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setAdvanced(EMPTY_ADVANCED_FILTERS);
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of dbListings) counts[l.status] = (counts[l.status] ?? 0) + 1;
    return counts;
  }, [dbListings]);

  const districtOptions = useMemo(
    () => Array.from(new Set(dbListings.map((l) => l.district).filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi")),
    [dbListings],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const num = (v: string) => Number(v);
    const rows = dbListings.filter((l) => {
      if (q && !(
        l.title.toLowerCase().includes(q) ||
        l.district.toLowerCase().includes(q) ||
        `tnh-${l.id.slice(0, 8)}`.includes(q)
      )) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (advanced.district && l.district !== advanced.district) return false;
      if (advanced.priceMin && l.price < num(advanced.priceMin)) return false;
      if (advanced.priceMax && l.price > num(advanced.priceMax)) return false;
      if (advanced.areaMin && l.area < num(advanced.areaMin)) return false;
      if (advanced.areaMax && l.area > num(advanced.areaMax)) return false;
      return true;
    });
    return sortListings(rows, sort);
  }, [dbListings, search, statusFilter, sort, advanced]);

  const totalRows = filteredRows.length;
  const paginatedRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, advanced, pageSize]);

  return (
    <RenterShell active="listings">
      <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20, fontFamily: font }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 21 : 28, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Quản lý tin đăng</h1>
            <p style={{ fontSize: isMobile ? 13 : 14, color: C.textSecondary, margin: 0 }}>Theo dõi trạng thái, chỉnh sửa và đẩy tin cho thuê của bạn.</p>
          </div>
          <button type="button" onClick={toPost} data-testid="my-listings-new-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 18px", width: isMobile ? "100%" : undefined, background: C.primary, color: C.white, border: "none", borderRadius: radius.md, fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={16} strokeWidth={2.5} /> Đăng tin mới
          </button>
        </div>

        {!isLoading && !loadError && (
          <ListingStats listings={dbListings} isMobile={isMobile} onSelectStatus={setStatusFilter} />
        )}

        {loadError && (
          <div role="alert" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: radius.lg, padding: "14px 18px", display: "flex", gap: 12, alignItems: "center" }}>
            <TriangleAlert size={20} color={C.error} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13.5, color: C.error, fontWeight: 700, margin: 0 }}>Không thể tải tin đăng</p>
              <p style={{ fontSize: 12.5, color: C.error, margin: 0 }}>{loadError}</p>
            </div>
            <button type="button" onClick={() => void fetchListings()} style={{ padding: "6px 12px", background: C.error, color: C.white, border: "none", borderRadius: radius.sm, fontFamily: font, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Thử lại</button>
          </div>
        )}

        <ListingsToolbar
          isMobile={isMobile}
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSort={setSort}
          status={statusFilter}
          onStatus={setStatusFilter}
          statusCounts={statusCounts}
          totalCount={dbListings.length}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced((s) => !s)}
          advanced={advanced}
          onAdvanced={setAdvanced}
          districtOptions={districtOptions}
          onReset={() => setAdvanced(EMPTY_ADVANCED_FILTERS)}
        />

        <MyListingsTable
          paginatedRows={paginatedRows}
          isLoading={isLoading}
          totalRows={totalRows}
          totalListingsCount={dbListings.length}
          mutatingId={mutatingId}
          isMobile={isCardLayout}
          toPost={toPost}
          resetFilters={resetFilters}
          handleToggleStatus={handleToggleStatus}
          onLinkRoom={(l) => { setLinkError(null); setLinkTarget(l); }}
          handleDeleteListing={handleDeleteListing}
          showBoostAction={showBoostAction}
          onBoostListing={setBoostTarget}
        />

        {!isLoading && totalRows > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 13, color: C.textSecondary }}>
              Hiển thị <b>{(page - 1) * pageSize + 1}–{Math.min(totalRows, page * pageSize)}</b> trên <b>{totalRows}</b> tin
            </span>
            <Pagination page={page} pageSize={pageSize} total={totalRows} onChange={setPage} style={{ padding: 0 }} />
            <div style={{ width: 130, background: C.white, border: `1.5px solid ${C.border}`, borderRadius: radius.md, padding: "7px 12px" }}>
              <AppSelect value={String(pageSize)} options={PAGE_SIZE_OPTIONS} onChange={(v) => setPageSize(Number(v))} ariaLabel="Số tin mỗi trang" fontSize={13} />
            </div>
          </div>
        )}
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

      {deleteTarget && (
        <DeleteListingModal
          title={deleteTarget.title}
          submitting={mutatingId === deleteTarget.id}
          onCancel={() => { if (!mutatingId) setDeleteTarget(null); }}
          onConfirm={confirmDeleteListing}
        />
      )}
      {boostTarget && showBoostAction ? (
        <BoostCheckoutModal listing={boostTarget} initialDays={boostTarget.boost_orders?.[0]?.days ?? boostTarget.boost_intent?.days} onClose={() => setBoostTarget(null)} />
      ) : null}
    </RenterShell>
  );
}

export default QuanLyPage;
