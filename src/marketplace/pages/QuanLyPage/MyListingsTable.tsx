import React from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Pencil, ArrowUpCircle, Trash2, MessageSquare, AlertTriangle, FileText, Plus } from "lucide-react";
import { C, font } from "../../../shared/theme";
import { getListingImage, listingImageUrls } from "../../services/listing-mappers";
import { formatVND } from "../../utils/listingMetadata";
import { StatusChip, IconAction, ListingActionGroup, RejectionNotice } from "./ListingRowActions";

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
};

interface MyListingsTableProps {
  paginatedRows: DbListing[];
  isLoading: boolean;
  totalRows: number;
  totalListingsCount: number;
  mutatingId: string | null;
  isMobile: boolean;
  toPost: () => void;
  resetFilters: () => void;
  handleToggleStatus: (id: string, currentStatus: string) => void;
  handleDeleteListing: (id: string) => void;
  setBoostTarget: (listing: DbListing) => void;
}

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
  handleDeleteListing,
  setBoostTarget
}: MyListingsTableProps) {
  const navigate = useNavigate();
  const cellStyle: React.CSSProperties = { fontFamily: font, fontSize: 13.5, color: C.textPrimary, padding: "14px 16px", verticalAlign: "middle" };

  if (isLoading) {
    return (
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 14 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 12, height: 48, background: "#f9f9f9", borderRadius: 10 }} />
        ))}
      </div>
    );
  }

  if (totalRows === 0) {
    if (totalListingsCount === 0) {
      return (
        <div style={{ background: C.white, border: `1px dashed ${C.border}`, borderRadius: 20, padding: "56px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", color: C.primary }}>
            <FileText size={28} />
          </div>
          <div>
            <h3 style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>Bạn chưa có tin đăng nào</h3>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0, maxWidth: 360 }}>Bắt đầu kết nối phòng trọ trống của bạn lên thị trường để tiếp cận hàng nghìn khách hàng tiềm năng.</p>
          </div>
          <button onClick={toPost} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", background: C.primary, color: C.white, border: "none", borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={16} /> Đăng tin đầu tiên
          </button>
        </div>
      );
    }

    return (
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: "48px 32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <AlertTriangle size={24} color={C.textSecondary} />
        <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: 0 }}>Không tìm thấy tin đăng phù hợp với điều kiện lọc.</p>
        <button onClick={resetFilters} style={{ padding: "8px 16px", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>
          Xóa bộ lọc
        </button>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {paginatedRows.map(l => {
          // l.img đã do toListingCard() derive từ listing_media (fallback Unsplash bên trong).
          const imageSrc = listingImageUrls(l)[0] || getListingImage(l.id);
          const isVIP = !!(l.boost_expire_at && new Date(l.boost_expire_at) > new Date());
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
                <ListingActionGroup
                  id={l.id}
                  status={l.status}
                  isBlocked={isBlocked}
                  isVIP={isVIP}
                  onView={() => navigate(`/phong/${l.id}`)}
                  onEdit={() => alert("[Demo] Tính năng chỉnh sửa tin đăng sẽ khả dụng ở bản chính thức!")}
                  onToggleStatus={() => handleToggleStatus(l.id, l.status)}
                  onBoost={() => setBoostTarget(l)}
                  onDelete={() => handleDeleteListing(l.id)}
                />
              </div>
              <RejectionNotice
                reason={l.status === "Rejected" ? l.rejection_reason ?? null : null}
                onEdit={() => navigate(`/chu-tro/dang-tin/${l.id}`)}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
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
              // l.img đã do toListingCard() derive từ listing_media (fallback Unsplash bên trong).
          const imageSrc = listingImageUrls(l)[0] || getListingImage(l.id);
              const isVIP = !!(l.boost_expire_at && new Date(l.boost_expire_at) > new Date());
              const isBlocked = mutatingId === l.id;

              return (
                <tr key={l.id} style={{ borderBottom: `1px solid ${C.border}`, background: idx % 2 ? "rgba(240,231,214,0.03)" : C.white, transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(240,231,214,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 ? "rgba(240,231,214,0.03)" : C.white}>
                  
                  <td style={{ ...cellStyle, maxWidth: 320 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <img src={imageSrc} alt="" style={{ width: 54, height: 54, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: `1px solid ${C.border}` }} />
                      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontWeight: 800, color: C.textPrimary, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.title}>{l.title}</span>
                        <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 650 }}>ID: TNH-{l.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                    </div>
                  </td>

                  <td style={{ ...cellStyle, color: C.textSecondary, fontWeight: 650 }}>
                    {l.room_id ? `Phòng #${l.room_id.slice(0,6).toUpperCase()}` : "—"}
                  </td>

                  <td style={{ ...cellStyle, color: C.textSecondary, fontWeight: 650 }}>{l.district}</td>

                  <td style={{ ...cellStyle, fontWeight: 800, color: C.primary, fontSize: 14 }}>
                    {formatVND(l.price)} đ
                  </td>

                  <td style={cellStyle}>
                    <StatusChip status={l.status} boostExpire={l.boost_expire_at} />
                    <RejectionNotice
                      reason={l.status === "Rejected" ? l.rejection_reason ?? null : null}
                      onEdit={() => navigate(`/chu-tro/dang-tin/${l.id}`)}
                    />
                  </td>

                  <td style={cellStyle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12.5, color: C.textSecondary }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Eye size={12} /> {l.views || 0} xem</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MessageSquare size={12} /> {l.contacts || 0} liên hệ</span>
                    </div>
                  </td>

                  <td style={{ ...cellStyle, color: C.textSecondary, fontSize: 12.5 }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 600 }}>{new Date(l.updated_at).toLocaleDateString("vi-VN")}</span>
                      <span style={{ fontSize: 10.5, color: "#999" }}>{new Date(l.updated_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </td>

                  <td style={cellStyle}>
                    <ListingActionGroup
                      id={l.id}
                      status={l.status}
                      isBlocked={isBlocked}
                      isVIP={isVIP}
                      onView={() => navigate(`/phong/${l.id}`)}
                      onEdit={() => alert("[Demo] Tính năng chỉnh sửa tin đăng sẽ khả dụng ở bản chính thức!")}
                      onToggleStatus={() => handleToggleStatus(l.id, l.status)}
                      onBoost={() => setBoostTarget(l)}
                      onDelete={() => handleDeleteListing(l.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
