import React from "react";
import { useNavigate } from "react-router";
import { Eye, Link2, MessageSquare, Plus, FileText, SearchX } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { Skeleton } from "../../../shared/components/common";
import { getListingImage, listingImageUrls } from "../../services/listing-mappers";
import { formatVND } from "../../utils/listingMetadata";
import type { BoostOrderSummary } from "../../services/boost-orders-service";
import { StatusChip, ListingActionGroup, RejectionNotice } from "./ListingRowActions";

export type DbListing = {
  id: string;
  title: string;
  room_id: string | null;
  district: string;
  price: number;
  area: number;
  status: string;
  views?: number;
  contacts?: number;
  updated_at: string;
  created_at: string;
  boost_expire_at: string | null;
  /** Lý do Moderator từ chối (FR-064). Chỉ có khi status = 'Rejected'. */
  rejection_reason?: string | null;
  /** Ảnh thật của tin; searchListings select kèm. Vắng mặt ở tin cũ → fallback. */
  listing_media?: { storage_path: string; sort_order: number }[];
  property_type?: string;
  address?: string;
  description?: string;
  /** A pending seller preference, not proof of payment or Boost entitlement. */
  boost_intent?: { days: number; selected_at?: string } | null;
  /** Seller-readable order summaries, newest first. */
  boost_orders?: BoostOrderSummary[];
};

const noteStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, lineHeight: 1.45 };

function BoostPaymentStatus({ listing }: { listing: DbListing }) {
  // Đơn đã trả đang chờ duyệt được ưu tiên hiển thị, kể cả khi có đơn mới hơn chưa trả.
  const latest = listing.boost_orders?.find((order) => order.status === "PAID_PENDING_APPROVAL") ?? listing.boost_orders?.[0];
  if (latest?.status === "PAID_PENDING_APPROVAL") {
    return <span data-testid="listing-paid-pending-approval" style={{ ...noteStyle, color: C.primary }}>Đã thanh toán {formatVND(latest.amount)} đ · Boost bắt đầu khi tin được duyệt</span>;
  }
  if (latest?.status === "PENDING" || latest?.status === "LINKED") {
    return <span data-testid="listing-boost-pending-payment" style={{ ...noteStyle, color: C.primary }}>Đơn Boost {latest.days} ngày chưa thanh toán · có thể mở lại để tiếp tục</span>;
  }
  if (latest?.status === "NEEDS_REVIEW") {
    return <span data-testid="listing-boost-needs-review" style={{ ...noteStyle, color: C.error }}>Thanh toán Boost cần được đối soát · hãy liên hệ hỗ trợ</span>;
  }
  if (latest?.status === "PAID" && listing.boost_expire_at && new Date(listing.boost_expire_at).getTime() > Date.now()) {
    return <span data-testid="listing-boost-active" style={{ ...noteStyle, color: C.success }}>Boost đang hoạt động đến {new Date(listing.boost_expire_at).toLocaleDateString("vi-VN")}</span>;
  }
  if (listing.status === "PendingApproval" && Number.isInteger(listing.boost_intent?.days)) {
    return <span data-testid="listing-boost-intent" style={{ ...noteStyle, color: C.primary }}>Đã chọn Boost {listing.boost_intent!.days} ngày · chưa tạo đơn</span>;
  }
  return null;
}

function canStartBoostPayment(listing: DbListing): boolean {
  return !listing.boost_orders?.some((order) => order.status === "PAID_PENDING_APPROVAL");
}

/** Gắn tin với một phòng trong module quản lý trọ. */
function LinkRoomButton({ listing, onLinkRoom }: { listing: DbListing; onLinkRoom: (listing: DbListing) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onLinkRoom(listing); }}
      data-testid="link-room-cell-btn"
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: 0, cursor: "pointer",
        fontFamily: font, fontSize: 12, fontWeight: 650, color: listing.room_id ? C.primary : C.textSecondary,
      }}
    >
      <Link2 size={12} />
      <span style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
        {listing.room_id ? `Phòng #${listing.room_id.slice(0, 6).toUpperCase()}` : "Gắn phòng"}
      </span>
    </button>
  );
}

const listingCode = (id: string) => `TNH-${id.slice(0, 8).toUpperCase()}`;
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

interface MyListingsTableProps {
  paginatedRows: DbListing[];
  isLoading: boolean;
  totalRows: number;
  totalListingsCount: number;
  mutatingId: string | null;
  /** `true` ⇒ layout thẻ (điện thoại & tablet). */
  isMobile: boolean;
  toPost: () => void;
  resetFilters: () => void;
  handleToggleStatus: (id: string, currentStatus: string) => void;
  onLinkRoom: (listing: DbListing) => void;
  handleDeleteListing: (id: string) => void;
  showBoostAction: boolean;
  onBoostListing: (listing: DbListing) => void;
}

const panelStyle: React.CSSProperties = { background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl };

export function MyListingsTable({
  paginatedRows,
  isLoading,
  totalRows,
  totalListingsCount,
  mutatingId,
  isMobile,
  toPost,
  resetFilters,
  handleToggleStatus,
  onLinkRoom,
  handleDeleteListing,
  showBoostAction,
  onBoostListing,
}: MyListingsTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div style={{ ...panelStyle, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <Skeleton variant="row" count={4} />
      </div>
    );
  }

  if (totalRows === 0) {
    const isEmptyAccount = totalListingsCount === 0;
    return (
      <div style={{ ...panelStyle, border: `1px ${isEmptyAccount ? "dashed" : "solid"} ${C.border}`, padding: "48px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, fontFamily: font }}>
        <span style={{ width: 56, height: 56, borderRadius: radius.pill, background: C.cream, display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.primary }}>
          {isEmptyAccount ? <FileText size={26} /> : <SearchX size={26} />}
        </span>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>
            {isEmptyAccount ? "Bạn chưa có tin đăng nào" : "Không có tin nào khớp bộ lọc"}
          </h3>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: 0, maxWidth: 380 }}>
            {isEmptyAccount
              ? "Đăng tin miễn phí để người tìm trọ thấy phòng trống của bạn."
              : "Thử đổi từ khóa, chọn tab trạng thái khác hoặc xóa bộ lọc."}
          </p>
        </div>
        {isEmptyAccount ? (
          <button type="button" onClick={toPost} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", background: C.primary, color: C.white, border: "none", borderRadius: radius.md, fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={16} /> Đăng tin đầu tiên
          </button>
        ) : (
          <button type="button" onClick={resetFilters} style={{ padding: "8px 16px", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: radius.md, fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textSecondary, cursor: "pointer" }}>
            Xóa bộ lọc
          </button>
        )}
      </div>
    );
  }

  const actionsFor = (l: DbListing) => (
    <ListingActionGroup
      status={l.status}
      isBlocked={mutatingId === l.id}
      onView={() => navigate(`/phong/${l.id}`)}
      onEdit={() => navigate(`/dang-tin-cho-thue/${l.id}`)}
      onToggleStatus={() => handleToggleStatus(l.id, l.status)}
      onDelete={() => handleDeleteListing(l.id)}
      onBoost={showBoostAction && canStartBoostPayment(l) ? () => onBoostListing(l) : undefined}
    />
  );
  const rejectionFor = (l: DbListing) => (
    <RejectionNotice
      reason={l.status === "Rejected" ? l.rejection_reason ?? null : null}
      onEdit={() => navigate(`/dang-tin-cho-thue/${l.id}`)}
    />
  );
  const imageFor = (l: DbListing) => listingImageUrls(l)[0] || getListingImage(l.id);
  // Cùng testid + data-* cho cả bảng lẫn thẻ ⇒ E2E chạy được ở mọi kích thước.
  const rowAttrs = (l: DbListing) => ({ "data-testid": "my-listing-row", "data-listing-id": l.id, "data-listing-status": l.status });

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {paginatedRows.map((l) => (
          <article key={l.id} {...rowAttrs(l)} style={{ ...panelStyle, padding: 14, display: "flex", flexDirection: "column", gap: 12, fontFamily: font }}>
            <div style={{ display: "flex", gap: 12 }}>
              <img src={imageFor(l)} alt="" style={{ width: 72, height: 72, borderRadius: radius.md, objectFit: "cover", flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <div><StatusChip status={l.status} /></div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{l.title}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.primary }}>{formatVND(l.price)} đ<span style={{ fontSize: 11.5, fontWeight: 500, color: C.textSecondary }}>/tháng</span></span>
                <span style={{ fontSize: 12, color: C.textSecondary }}>{l.district} · {l.area} m²</span>
              </div>
            </div>
            <BoostPaymentStatus listing={l} />
            {rejectionFor(l)}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: C.textSecondary }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Eye size={12} /> {l.views || 0} xem · <MessageSquare size={12} /> {l.contacts || 0} liên hệ</span>
                <LinkRoomButton listing={l} onLinkRoom={onLinkRoom} />
              </div>
              {actionsFor(l)}
            </div>
          </article>
        ))}
      </div>
    );
  }

  const headStyle: React.CSSProperties = { fontFamily: font, fontSize: 11, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", padding: "12px 14px", whiteSpace: "nowrap" };
  const cellStyle: React.CSSProperties = { fontFamily: font, fontSize: 13, color: C.textPrimary, padding: "14px", verticalAlign: "middle" };

  return (
    <div style={{ ...panelStyle, overflow: "hidden" }}>
      {/* Phòng hờ cho khung hẹp bất thường; ở ≥1024px bảng vừa khít không cần cuộn. */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
              <th style={headStyle}>Tin đăng</th>
              <th style={headStyle}>Giá thuê</th>
              <th style={headStyle}>Trạng thái</th>
              <th style={headStyle}>Hiệu quả</th>
              <th style={{ ...headStyle, textAlign: "right" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((l) => (
              <tr key={l.id} {...rowAttrs(l)} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ ...cellStyle, maxWidth: 380 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <img src={imageFor(l)} alt="" style={{ width: 56, height: 56, borderRadius: radius.md, objectFit: "cover", flexShrink: 0, border: `1px solid ${C.border}` }} />
                    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.title}>{l.title}</span>
                      <span style={{ fontSize: 12, color: C.textSecondary }}>{l.district} · {l.area} m² · {listingCode(l.id)}</span>
                      <LinkRoomButton listing={l} onLinkRoom={onLinkRoom} />
                      <BoostPaymentStatus listing={l} />
                    </div>
                  </div>
                </td>
                <td style={{ ...cellStyle, fontWeight: 800, color: C.primary, whiteSpace: "nowrap" }}>{formatVND(l.price)} đ</td>
                <td style={{ ...cellStyle, maxWidth: 240 }}>
                  <StatusChip status={l.status} />
                  <div style={{ fontSize: 11.5, color: C.textSecondary, marginTop: 5, whiteSpace: "nowrap" }}>
                    Cập nhật {formatDate(l.updated_at)} · {formatTime(l.updated_at)}
                  </div>
                  {rejectionFor(l)}
                </td>
                <td style={{ ...cellStyle, fontSize: 12.5, color: C.textSecondary, whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Eye size={12} /> {l.views || 0} xem</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MessageSquare size={12} /> {l.contacts || 0} liên hệ</span>
                  </div>
                </td>
                <td style={cellStyle}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>{actionsFor(l)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
