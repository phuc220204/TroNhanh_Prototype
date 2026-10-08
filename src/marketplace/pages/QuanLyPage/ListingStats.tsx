import { Eye, FileText, TrendingUp, TriangleAlert, type LucideIcon } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { LISTING_META } from "../../../shared/utils/statusMaps";
import { formatVND } from "../../utils/listingMetadata";
import type { DbListing } from "./MyListingsTable";

interface StatTile {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  onClick?: () => void;
}

function Tile({ tile }: { tile: StatTile }) {
  const Icon = tile.icon;
  const isClickable = Boolean(tile.onClick);
  const Wrapper = isClickable ? "button" : "div";
  return (
    <Wrapper
      type={isClickable ? "button" : undefined}
      onClick={tile.onClick}
      data-testid={`listing-stat-${tile.id}`}
      style={{
        background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl,
        padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, minWidth: 0,
        textAlign: "left", fontFamily: font, cursor: isClickable ? "pointer" : "default",
      }}
    >
      <span style={{ width: 38, height: 38, borderRadius: radius.md, background: tile.bg, color: tile.color, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tile.label}</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: C.textPrimary, lineHeight: 1.2 }}>{tile.value}</span>
        {tile.hint && <span style={{ fontSize: 11.5, color: C.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tile.hint}</span>}
      </span>
    </Wrapper>
  );
}

/**
 * 4 ô tổng quan trên một hàng. Ô "Cần xử lý" gom tin Chờ duyệt + Bị từ chối —
 * hai trạng thái người bán phải để ý — và bấm vào để lọc ngay.
 */
export function ListingStats({ listings, isMobile, onSelectStatus }: {
  listings: DbListing[];
  isMobile: boolean;
  onSelectStatus: (status: string) => void;
}) {
  const count = (status: string) => listings.filter((l) => l.status === status).length;
  const pending = count("PendingApproval");
  const rejected = count("Rejected");
  const views = listings.reduce((sum, l) => sum + (l.views ?? 0), 0);
  const contacts = listings.reduce((sum, l) => sum + (l.contacts ?? 0), 0);
  const needsAction = pending + rejected;

  const tiles: StatTile[] = [
    { id: "total", label: "Tổng tin đăng", value: listings.length, icon: FileText, color: C.primary, bg: C.cream },
    {
      id: "active", label: "Đang hiển thị", value: count("Active"), icon: Eye,
      color: LISTING_META.active.color, bg: LISTING_META.active.bg,
      onClick: () => onSelectStatus("Active"),
    },
    {
      id: "attention", label: "Cần xử lý", value: needsAction,
      hint: needsAction > 0 ? `${pending} chờ duyệt · ${rejected} bị từ chối` : "Mọi tin đều ổn",
      icon: TriangleAlert,
      color: needsAction > 0 ? LISTING_META.pendingApproval.color : C.textSecondary,
      bg: needsAction > 0 ? LISTING_META.pendingApproval.bg : C.cream,
      // Tin bị từ chối cần sửa ngay ⇒ ưu tiên mở tab đó.
      onClick: needsAction > 0 ? () => onSelectStatus(rejected > 0 ? "Rejected" : "PendingApproval") : undefined,
    },
    {
      id: "views", label: "Lượt xem", value: formatVND(views) || "0",
      hint: `${formatVND(contacts) || "0"} lượt liên hệ`,
      icon: TrendingUp, color: C.secondaryPress, bg: C.cream,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, minmax(0, 1fr))`, gap: 12 }}>
      {tiles.map((tile) => <Tile key={tile.id} tile={tile} />)}
    </div>
  );
}
