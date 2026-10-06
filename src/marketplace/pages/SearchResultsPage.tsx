import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { SlidersHorizontal } from "lucide-react";
import { C, font } from "../../shared/theme";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { PublicNavbarDesktop, PublicNavbarMobile } from "../../shared/components/PublicNavbar";
import { BottomTabBar } from "../../shared/components/common";
import { provinceName } from "../../shared/utils/vn-regions";
import { mapAmenityToKey, mapTypeToKey } from "../services/listing-mappers";
import { searchListings } from "../services/listing-queries";
import { parseAreaRangeLabel, parsePriceRangeLabel } from "../../shared/utils/catalog-bounds";
import { logError } from "../../shared/services/supabase-error";
import {
  areSearchFiltersEqual,
  emptySearchFilters,
  filtersFromSearch,
  type SearchFilters,
  type SearchRoom,
  type SearchSort,
} from "./SearchResultsPage/search-results-model";
import {
  FilterSidebar,
  MobileActiveChips,
  MobileFilterSheet,
  MobileSummaryBar,
  ResultsHeader,
  SearchEmptyState,
  SearchRoomCard,
} from "./SearchResultsPage/SearchResultsComponents";

export function SearchResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, width } = useBreakpoint();
  const isCompact = width < 1180;
  const parsedUrlFilters = useMemo(() => filtersFromSearch(location.search), [location.search]);
  const [filters, setFilters] = useState<SearchFilters>(() => filtersFromSearch(location.search));
  const [pendingFilters, setPendingFilters] = useState<SearchFilters>(() => filtersFromSearch(location.search));
  const [rooms, setRooms] = useState<SearchRoom[]>([]);
  const [sortBy, setSortBy] = useState<SearchSort>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    setFilters((current) => areSearchFiltersEqual(current, parsedUrlFilters) ? current : parsedUrlFilters);
    setPendingFilters((current) => areSearchFiltersEqual(current, parsedUrlFilters) ? current : parsedUrlFilters);
  }, [parsedUrlFilters]);

  useEffect(() => {
    let isCurrentRequest = true;
    const fetchRooms = async () => {
      setIsLoading(true);
      setHasLoadError(false);
      try {
        const { priceMin, priceMax, priceMinExclusive, priceMaxExclusive } = parsePriceRangeLabel(filters.priceLabel);
        const { areaMin, areaMax } = parseAreaRangeLabel(filters.area);
        const result = await searchListings({
          keyword: filters.keyword || undefined,
          provinceCode: filters.provinceCode,
          wardCodes: filters.wardCode != null ? [filters.wardCode] : undefined,
          priceMin,
          priceMax,
          priceMinExclusive,
          priceMaxExclusive,
          areaMin,
          areaMax,
          propertyTypes: filters.type !== "Tất cả" ? [filters.type] : undefined,
          amenities: filters.amenities.length > 0 ? filters.amenities : undefined,
          sort: sortBy,
          page: 1,
          pageSize: 50,
        });
        if (!isCurrentRequest) return;
        setHasLoadError(result.hasError);
        setRooms(result.data.map((item) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          priceNum: item.priceNum,
          area: item.area,
          loc: item.loc,
          amenities: item.amenities.map(mapAmenityToKey),
          type: mapTypeToKey(item.type),
          badge: item.badge,
          postedAt: item.postedAt,
          img: item.img,
          contact_phone: item.contact_phone,
          boost_expire_at: item.boost_expire_at,
        })));
      } catch (error) {
        if (isCurrentRequest) {
          logError("SearchResultsPage.fetchRooms", error);
          setHasLoadError(true);
          setRooms([]);
        }
      } finally {
        if (isCurrentRequest) setIsLoading(false);
      }
    };
    void fetchRooms();
    return () => { isCurrentRequest = false; };
  }, [filters, sortBy, retryCount]);

  const loadErrorContent = (
    <div role="alert" data-testid="search-results-error" style={{ fontFamily: font, color: C.textPrimary, textAlign: "center", padding: 32 }}>
      <p style={{ margin: "0 0 16px" }}>Không thể tải danh sách phòng. Vui lòng thử lại.</p>
      <button type="button" onClick={() => setRetryCount((count) => count + 1)} style={{ minHeight: 44, padding: "10px 20px", border: `1.5px solid ${C.primary}`, borderRadius: 10, background: C.white, color: C.primary, fontFamily: font, fontWeight: 700, cursor: "pointer" }}>Thử lại</button>
    </div>
  );

  const removeChip = (chip: string) => {
    setFilters((current) => {
      if (current.keyword === chip) return { ...current, keyword: "" };
      if (current.provinceCode != null && chip === provinceName(current.provinceCode)) return { ...current, provinceCode: null, wardCode: null };
      if (current.priceLabel === chip) return { ...current, priceLabel: "" };
      if (current.area === chip) return { ...current, area: "" };
      if (current.type === chip) return { ...current, type: "Tất cả" };
      if (current.amenities.includes(chip)) return { ...current, amenities: current.amenities.filter((amenity) => amenity !== chip) };
      return current;
    });
  };

  const clearAll = () => {
    setFilters(emptySearchFilters());
    setPendingFilters(emptySearchFilters());
  };
  const applyPending = () => setFilters({ ...pendingFilters, amenities: [...pendingFilters.amenities] });
  const openFilters = () => {
    setPendingFilters({ ...filters, amenities: [...filters.amenities] });
    setMobileFilterOpen(true);
  };

  if (isMobile) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <PublicNavbarMobile onSearch={() => navigate(-1)} />
        <MobileSummaryBar count={rooms.length} isLoading={isLoading} hasError={hasLoadError} onFilter={openFilters} />
        <MobileActiveChips filters={filters} onRemove={removeChip} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          {isLoading ? (
            <div data-testid="search-results-loading" style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, textAlign: "center", padding: 32 }}>Đang tìm kiếm phòng phù hợp...</div>
          ) : hasLoadError ? loadErrorContent : rooms.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "16px 16px 24px" }}>
              {rooms.map((room) => <SearchRoomCard key={room.id} room={room} mobile onClick={() => navigate(`/phong/${room.id}`)} />)}
            </div>
          ) : <div style={{ padding: 16 }}><SearchEmptyState onClear={clearAll} /></div>}
        </div>
        <BottomTabBar />
        <MobileFilterSheet open={mobileFilterOpen} filters={pendingFilters} onChange={setPendingFilters} onApply={applyPending} onClose={() => setMobileFilterOpen(false)} onClear={clearAll} />
      </div>
    );
  }

  const gridColumns = isCompact ? 2 : 3;
  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      {isCompact ? <PublicNavbarMobile onSearch={() => navigate(-1)} /> : <PublicNavbarDesktop onSearch={() => navigate(-1)} />}
      <div style={{ flex: 1, display: "flex", maxWidth: 1280, margin: "0 auto", width: "100%", boxSizing: "border-box", padding: isCompact ? "0 24px" : "0 32px", gap: 28, alignItems: "flex-start" }}>
        {!isCompact && (
          <aside style={{ width: 300, flexShrink: 0, paddingTop: 28 }}>
            <div style={{ position: "sticky", top: 78, maxHeight: "calc(100vh - 90px)", overflowY: "auto", paddingBottom: 24 }}>
              <FilterSidebar filters={pendingFilters} onChange={setPendingFilters} onApply={applyPending} onClear={clearAll} />
            </div>
          </aside>
        )}
        <main style={{ flex: 1, minWidth: 0, paddingTop: 28, paddingBottom: 72 }}>
          {isCompact && (
            <button type="button" onClick={openFilters} data-testid="search-open-filters" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 16, padding: "9px 16px", border: `1.5px solid ${C.primary}`, borderRadius: 10, background: C.white, color: C.primary, fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <SlidersHorizontal size={15} /> Bộ lọc
            </button>
          )}
          {!hasLoadError && <ResultsHeader count={rooms.length} filters={filters} onRemoveChip={removeChip} sortBy={sortBy} onSortChange={setSortBy} />}
          {isLoading ? (
            <div data-testid="search-results-loading" style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, textAlign: "center", padding: 72 }}>Đang tìm kiếm phòng phù hợp...</div>
          ) : hasLoadError ? loadErrorContent : rooms.length > 0 ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`, gap: 20 }}>
                {rooms.map((room) => <SearchRoomCard key={room.id} room={room} onClick={() => navigate(`/phong/${room.id}`)} />)}
              </div>
              <div style={{ textAlign: "center", marginTop: 48 }}>
                <button type="button" onClick={() => navigate(-1)} style={{ padding: "12px 26px", border: `1.5px solid ${C.primary}`, borderRadius: 10, background: "transparent", color: C.primary, fontFamily: font, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Quay lại</button>
              </div>
            </>
          ) : <SearchEmptyState onClear={clearAll} />}
        </main>
      </div>
      {isCompact && <MobileFilterSheet open={mobileFilterOpen} filters={pendingFilters} onChange={setPendingFilters} onApply={applyPending} onClose={() => setMobileFilterOpen(false)} onClear={clearAll} />}
    </div>
  );
}
