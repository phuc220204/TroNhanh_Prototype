import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Plus, Search, ChevronDown, Eye, Pencil, EyeOff, Eye as ShowIcon, Trash2, RefreshCw } from "lucide-react";
import { C, font } from "../theme";
import { useBreakpoint } from "../components/useBreakpoint";
import { LandlordShell, LandlordBreadcrumb } from "../components/LandlordShell";
import type { ListingStatus } from "../types/status";
import { LISTING_META } from "../utils/statusMaps";
import { LISTINGS, type Listing } from "../data/mockListings";

/* ══════════════════════════════════════════
   TYPES & DATA
══════════════════════════════════════════ */
const FILTERS: { label: string; value: ListingStatus | "all" }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Đang hiển thị", value: "published" },
  { label: "Chờ duyệt", value: "pending" },
  { label: "Đã ẩn", value: "hidden" },
  { label: "Hết hạn", value: "expired" },
  { label: "Bị từ chối", value: "rejected" },
];

const SORTS = ["Mới cập nhật", "Nhiều lượt xem", "Giá thấp đến cao", "Giá cao đến thấp"];

/* ══════════════════════════════════════════
   PRIMITIVES
══════════════════════════════════════════ */
function PrimaryBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 22px", background: C.primary, color: C.white, border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 10px rgba(138,106,69,0.25)", whiteSpace: "nowrap" }}
      onMouseEnter={e => (e.currentTarget.style.background = C.primaryHover)}
      onMouseLeave={e => (e.currentTarget.style.background = C.primary)}>
      {children}
    </button>
  );
}

function StatusChip({ status }: { status: ListingStatus }) {
  const m = LISTING_META[status];
  return <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color: m.color, background: m.bg, borderRadius: 999, padding: "3px 11px", whiteSpace: "nowrap" }}>{m.label}</span>;
}

function IconAction({ icon, label, danger }: { icon: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <button title={label} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: danger ? "#B5503C" : C.textSecondary }}>
      {icon}
    </button>
  );
}

/* Action set differs by listing status */
function ListingActions({ status }: { status: ListingStatus }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <IconAction icon={<Eye size={15} />} label="Xem tin" />
      <IconAction icon={<Pencil size={15} />} label="Sửa tin" />
      {status === "published" && <IconAction icon={<EyeOff size={15} />} label="Ẩn tin" />}
      {status === "hidden" && <IconAction icon={<ShowIcon size={15} />} label="Hiện lại" />}
      {status === "pending" && <IconAction icon={<Trash2 size={15} />} label="Xóa" danger />}
      {status === "expired" && <IconAction icon={<RefreshCw size={15} />} label="Gia hạn" />}
      {status === "rejected" && <IconAction icon={<Trash2 size={15} />} label="Xóa" danger />}
    </div>
  );
}

function KpiCards({ scroll }: { scroll?: boolean }) {
  const total = LISTINGS.length;
  const live = LISTINGS.filter(l => l.status === "published").length;
  const pending = LISTINGS.filter(l => l.status === "pending").length;
  const hidden = LISTINGS.filter(l => l.status === "hidden").length;
  const expired = LISTINGS.filter(l => l.status === "expired").length;
  const views = LISTINGS.reduce((s, l) => s + (l.views ?? 0), 0);
  const items = [
    { label: "Tổng tin đăng", value: total, accent: C.primary },
    { label: "Đang hiển thị", value: live, accent: "#4A7A34" },
    { label: "Chờ duyệt", value: pending, accent: "#C8861A" },
    { label: "Đã ẩn", value: hidden, accent: "#9B8C78" },
    { label: "Hết hạn", value: expired, accent: "#B5503C" },
    { label: "Tổng lượt xem", value: views, accent: C.secondary },
  ];
  return (
    <div style={{ display: scroll ? "flex" : "grid", gridTemplateColumns: scroll ? undefined : "repeat(6, 1fr)", gap: 12, marginBottom: scroll ? 18 : 24, overflowX: scroll ? "auto" : undefined, paddingBottom: scroll ? 4 : 0 }}>
      {items.map(it => (
        <div key={it.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 14px", minWidth: scroll ? 120 : undefined, flexShrink: scroll ? 0 : undefined }}>
          <p style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: C.textSecondary, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.03em" }}>{it.label}</p>
          <span style={{ fontFamily: font, fontSize: 25, fontWeight: 900, color: it.accent, lineHeight: 1, letterSpacing: "-0.02em" }}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   CONTROLS
══════════════════════════════════════════ */
function Controls({ search, onSearch, filter, onFilter, sort, onSort, mobile }: {
  search: string; onSearch: (v: string) => void;
  filter: ListingStatus | "all"; onFilter: (v: ListingStatus | "all") => void;
  sort: string; onSort: (v: string) => void; mobile?: boolean;
}) {
  const [sortOpen, setSortOpen] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: mobile ? undefined : 280 }}>
          <Search size={16} color={C.textSecondary} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Tìm theo tiêu đề tin, khu vực, phòng liên kết..."
            style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px 10px 38px", width: "100%", boxSizing: "border-box", background: C.white, outline: "none" }} />
        </div>
        {!mobile && (
          <div style={{ position: "relative" }}>
            <button onClick={() => setSortOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, cursor: "pointer", whiteSpace: "nowrap" }}>
              {sort} <ChevronDown size={15} color={C.textSecondary} />
            </button>
            {sortOpen && (
              <>
                <div onClick={() => setSortOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 39 }} />
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(42,26,12,0.16)", padding: 6, zIndex: 40, minWidth: 190 }}>
                  {SORTS.map(o => (
                    <button key={o} onClick={() => { onSort(o); setSortOpen(false); }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: o === sort ? C.caramelSoft : "transparent", border: "none", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: o === sort ? 700 : 500, color: C.textPrimary, cursor: "pointer" }}>
                      {o}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {FILTERS.map(f => {
          const active = filter === f.value;
          return (
            <button key={f.value} onClick={() => onFilter(f.value)}
              style={{ fontFamily: font, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? C.white : C.textSecondary, background: active ? C.primary : C.white, border: `1.5px solid ${active ? C.primary : C.border}`, borderRadius: 999, padding: mobile ? "9px 15px" : "7px 15px", minHeight: mobile ? 40 : undefined, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.12s" }}>
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   TABLE (desktop)
══════════════════════════════════════════ */
function ListingTable({ rows }: { rows: Listing[] }) {
  const cols = ["Tin đăng", "Phòng liên kết", "Khu vực", "Giá hiển thị", "Trạng thái tin", "Lượt xem", "Liên hệ", "Cập nhật", "Thao tác"];
  const cell = { fontFamily: font, fontSize: 13.5, color: C.textPrimary, padding: "13px 14px", verticalAlign: "middle" as const };
  const dash = <span style={{ color: C.textSecondary }}>—</span>;
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1040 }}>
          <thead>
            <tr style={{ background: C.caramelSoft }}>
              {cols.map(c => (
                <th key={c} style={{ fontFamily: font, fontSize: 11.5, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "left", padding: "12px 14px", whiteSpace: "nowrap" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((l, i) => (
              <tr key={l.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? "rgba(240,231,214,0.35)" : C.white }}>
                <td style={{ ...cell, fontWeight: 700, maxWidth: 280 }}>{l.title}</td>
                <td style={{ ...cell, color: C.textSecondary }}>{l.room ?? dash}</td>
                <td style={{ ...cell, color: C.textSecondary }}>{l.area}</td>
                <td style={{ ...cell, fontWeight: 700 }}>{l.price}</td>
                <td style={cell}><StatusChip status={l.status} /></td>
                <td style={cell}>{l.views ?? dash}</td>
                <td style={cell}>{l.contacts ?? dash}</td>
                <td style={{ ...cell, color: C.textSecondary, whiteSpace: "nowrap" }}>{l.updated}</td>
                <td style={cell}><ListingActions status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   CARD (mobile)
══════════════════════════════════════════ */
function ListingCard({ l }: { l: Listing }) {
  const dash = <span style={{ color: C.textSecondary }}>—</span>;
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: font, fontSize: 14.5, fontWeight: 700, color: C.textPrimary, lineHeight: 1.3 }}>{l.title}</span>
        <div style={{ flexShrink: 0 }}><StatusChip status={l.status} /></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
        <Row k="Phòng liên kết" v={l.room ?? "—"} />
        <Row k="Khu vực" v={l.area} />
        <Row k="Giá hiển thị" v={l.price} strong />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>Lượt xem / Liên hệ</span>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{l.views ?? "—"} / {l.contacts ?? "—"}</span>
        </div>
        <Row k="Cập nhật" v={l.updated} />
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: "flex", justifyContent: "flex-end" }}>
        <ListingActions status={l.status} />
      </div>
    </div>
  );
}
function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>{k}</span>
      <span style={{ fontFamily: font, fontSize: 13, fontWeight: strong ? 800 : 600, color: C.textPrimary, textAlign: "right" }}>{v}</span>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export function QuanLyPage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ListingStatus | "all">("all");
  const [sort, setSort] = useState(SORTS[0]);

  const rows = useMemo(() => {
    let r = LISTINGS;
    const q = search.trim().toLowerCase();
    if (q) r = r.filter(l => l.title.toLowerCase().includes(q) || l.area.toLowerCase().includes(q) || (l.room?.toLowerCase().includes(q) ?? false));
    if (filter !== "all") r = r.filter(l => l.status === filter);
    const arr = [...r];
    if (sort === "Mới cập nhật") arr.sort((a, b) => b.updatedRank - a.updatedRank);
    else if (sort === "Nhiều lượt xem") arr.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    else if (sort === "Giá thấp đến cao") arr.sort((a, b) => a.priceNum - b.priceNum);
    else if (sort === "Giá cao đến thấp") arr.sort((a, b) => b.priceNum - a.priceNum);
    return arr;
  }, [search, filter, sort]);

  const toPost = () => navigate("/dang-tin");

  if (isMobile) {
    return (
      <LandlordShell active="listings" mobileTitle="Tin đăng">
        <div style={{ padding: "16px 16px 100px" }}>
          <LandlordBreadcrumb trail={["Dashboard", "Tin đăng"]} />
          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>Quản lý tin đăng</h1>
            <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0, lineHeight: 1.4 }}>Các tin cho thuê đang hiển thị cho người thuê.</p>
          </div>
          <KpiCards scroll />
          <Controls search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} sort={sort} onSort={setSort} mobile />
          {rows.length === 0
            ? <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, textAlign: "center", padding: "32px 0" }}>Không tìm thấy tin đăng phù hợp.</p>
            : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{rows.map(l => <ListingCard key={l.id} l={l} />)}</div>}
        </div>
        <button onClick={toPost}
          style={{ position: "fixed", right: 18, bottom: 78, height: 50, borderRadius: 999, background: C.primary, border: "none", display: "flex", alignItems: "center", gap: 7, padding: "0 20px", cursor: "pointer", boxShadow: "0 4px 16px rgba(138,106,69,0.36)", zIndex: 90, fontFamily: font, fontSize: 14, fontWeight: 700, color: C.white }}>
          <Plus size={20} /> Đăng tin mới
        </button>
      </LandlordShell>
    );
  }

  return (
    <LandlordShell active="listings" mobileTitle="Tin đăng">
      <div style={{ padding: "28px 32px 60px", maxWidth: 1400, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <LandlordBreadcrumb trail={["Dashboard chủ trọ", "Tin đăng"]} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: font, fontSize: 26, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Quản lý tin đăng</h1>
            <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: 0 }}>Quản lý các tin cho thuê đang hiển thị cho người thuê.</p>
          </div>
          <PrimaryBtn onClick={toPost}><Plus size={16} /> Đăng tin mới</PrimaryBtn>
        </div>
        <KpiCards />
        <p style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: "0 0 16px" }}>Danh sách tin đăng</p>
        <Controls search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} sort={sort} onSort={setSort} />
        {rows.length === 0
          ? <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "48px", textAlign: "center", fontFamily: font, fontSize: 14, color: C.textSecondary }}>Không tìm thấy tin đăng phù hợp.</div>
          : <ListingTable rows={rows} />}
      </div>
    </LandlordShell>
  );
}

export default QuanLyPage;
