import { Users, CheckCircle, Clock, UserPlus, CalendarPlus } from "lucide-react";
import { C, font } from "../../../shared/theme";
import type { Property } from "../../types/room";
import type { OccupancyItem } from "../../services/occupancy-service";

type ContractRow = NonNullable<OccupancyItem["contracts"]>[number];

interface OccupancyTableProps {
  loading: boolean;
  occupancies: OccupancyItem[];
  property: Property | null;
  contractById: Map<string, ContractRow>;
  isReadOnly?: boolean;
  onOpenLinkModal: (occ: OccupancyItem) => void;
  onAddCoOccupant: (target: { contractId: string; roomLabel: string; primaryName: string }) => void;
  onEndContract: (contractId: string) => void;
  onExtendContract: (contractId: string, currentEndDate: string) => void;
}

/**
 * Bảng người ở của một khu.
 *
 * Tách khỏi OccupantsView vì file đó vượt 600 dòng sau khi thêm luồng
 * "người ở cùng" (CLAUDE.md §8.2).
 */
export function OccupancyTable({
  loading,
  occupancies,
  property,
  contractById,
  isReadOnly,
  onOpenLinkModal,
  onAddCoOccupant,
  onEndContract,
  onExtendContract,
}: OccupancyTableProps) {
  return (
    <>
        {loading ? (
          <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, textAlign: "center", padding: "32px 0" }}>
            Đang tải thông tin người ở...
          </p>
        ) : occupancies.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 16px", border: `1px dashed ${C.border}`, borderRadius: 12 }}>
            <Users size={32} color={C.textSecondary} style={{ marginBottom: 8 }} />
            <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 4px" }}>
              Chưa có người ở nào được ghi nhận
            </p>
            <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>
              Nhấp "Thêm người ở" để tạo đợt ở mới và lập hợp đồng thuê phòng.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr style={{ background: C.caramelSoft }}>
                  {["Phòng", "Họ và tên", "SĐT", "Số người", "Thời hạn HĐ", "Tiền cọc", "Giá thuê", "Tài khoản Renter", "Thao tác"].map((h) => (
                    <th key={h} style={{ fontFamily: font, fontSize: 11.5, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", padding: "10px 12px", textAlign: "left" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {occupancies.map((occ) => {
                  const room = property?.rooms.find((r) => r.id === occ.room_id);
                  // Người ở CÙNG không được `contracts.occupancy_id` trỏ tới (cột đó trỏ
                  // người đại diện) nên embed của họ rỗng — tra ngược qua `occ.contract_id`.
                  const ownContract = occ.contracts?.find((c) => c.status === "Active") || occ.contracts?.[0];
                  const activeContract = ownContract || contractById.get(occ.contract_id ?? "");

                  return (
                    <tr key={occ.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary, padding: "12px" }}>
                        {room?.code || "Phòng"}
                      </td>
                      <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: C.textPrimary, padding: "12px" }}>
                        {occ.full_name}
                        {occ.is_primary === false && (
                          <span
                            title="Ở cùng, đứng tên chung hợp đồng với người đại diện"
                            style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: C.secondary, background: C.cream, borderRadius: 999, padding: "1px 7px", marginLeft: 6 }}
                          >
                            ở cùng
                          </span>
                        )}
                      </td>
                      <td style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, padding: "12px" }}>
                        {occ.phone_number || "—"}
                      </td>
                      <td style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, padding: "12px" }}>
                        {occ.occupant_count} người
                      </td>
                      <td style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, padding: "12px" }}>
                        {activeContract ? `${activeContract.start_date} → ${activeContract.end_date}` : occ.start_date}
                      </td>
                      <td style={{ fontFamily: font, fontSize: 13, color: C.textPrimary, padding: "12px" }}>
                        {activeContract ? `${Number(activeContract.deposit || 0).toLocaleString("vi-VN")}đ` : "—"}
                      </td>
                      <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.primary, padding: "12px" }}>
                        {activeContract ? `${Number(activeContract.rent_price || 0).toLocaleString("vi-VN")}đ` : "—"}
                      </td>
                      <td style={{ fontFamily: font, fontSize: 12.5, padding: "12px" }}>
                        {occ.link_status === "Confirmed" ? (
                          <span style={{ color: C.success, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <CheckCircle size={12} /> Đã liên kết
                          </span>
                        ) : occ.link_status === "Pending" ? (
                          <span style={{ color: C.repairing, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }} title="Đang chờ Renter xác nhận (BR-029)">
                            <Clock size={12} /> Chờ xác nhận
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => onOpenLinkModal(occ)}
                            style={{ background: "none", border: "none", color: C.primary, fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                          >
                            Gắn email
                          </button>
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {activeContract && activeContract.status === "Active" && occ.is_primary !== false && (
                          <button
                            type="button"
                            disabled={isReadOnly}
                            title="Thêm người ở cùng vào hợp đồng này"
                            data-testid="add-co-occupant-btn"
                            onClick={() =>
                              onAddCoOccupant({
                                contractId: activeContract.id,
                                roomLabel: room?.code || "Phòng",
                                primaryName: occ.full_name,
                              })
                            }
                            style={{
                              padding: "5px 10px",
                              marginRight: 6,
                              background: C.white,
                              color: C.primary,
                              border: `1px solid ${C.border}`,
                              borderRadius: 6,
                              fontFamily: font,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isReadOnly ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <UserPlus size={12} /> Người ở cùng
                          </button>
                        )}
                        {activeContract && activeContract.status === "Active" && occ.is_primary !== false && (
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => onExtendContract(activeContract.id, activeContract.end_date)}
                            data-testid="extend-contract-btn"
                            style={{
                              padding: "5px 10px",
                              background: C.white,
                              color: C.primary,
                              border: `1px solid ${C.border}`,
                              borderRadius: 6,
                              fontFamily: font,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isReadOnly ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <CalendarPlus size={12} /> Gia hạn HĐ
                          </button>
                        )}
                        {activeContract && activeContract.status === "Active" && occ.is_primary !== false && (
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => onEndContract(activeContract.id)}
                            data-testid="end-contract-btn"
                            style={{
                              padding: "5px 10px",
                              background: C.cream,
                              color: C.error,
                              border: `1px solid ${C.error}`,
                              borderRadius: 6,
                              fontFamily: font,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isReadOnly ? "not-allowed" : "pointer",
                            }}
                          >
                            Kết thúc HĐ
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
}
