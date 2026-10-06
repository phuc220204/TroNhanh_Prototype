import { Users, UserPlus, CalendarPlus } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { Badge, Button } from "../../../shared/components/common";
import { formatDate, formatVnd } from "../../../shared/utils/format";
import type { Property } from "../../types/room";
import type { OccupancyItem } from "../../services/occupancy-service";

type ContractRow = NonNullable<OccupancyItem["contracts"]>[number];

interface OccupancyTableProps {
  loading: boolean;
  occupancies: OccupancyItem[];
  property: Property | null;
  contractById: Map<string, ContractRow>;
  /** Điện thoại: hiện dạng thẻ thay vì bảng 9 cột phải kéo ngang (nút thao tác bị khuất). */
  mobile?: boolean;
  onOpenLinkModal: (occ: OccupancyItem) => void;
  /** Hủy yêu cầu liên kết đang chờ. */
  onCancelLink: (occ: OccupancyItem) => void;
  onAddCoOccupant: (target: { contractId: string; roomLabel: string; primaryName: string }) => void;
  onEndContract: (contractId: string) => void;
  onExtendContract: (contractId: string, currentEndDate: string) => void;
}

interface OccupancyRow {
  occ: OccupancyItem;
  roomLabel: string;
  contract: ContractRow | undefined;
  /** Hợp đồng còn hiệu lực và đây là người đại diện ⇒ được gia hạn/kết thúc/thêm người ở cùng. */
  canManageContract: boolean;
}

function toRow(occ: OccupancyItem, property: Property | null, contractById: Map<string, ContractRow>): OccupancyRow {
  const room = property?.rooms.find((r) => r.id === occ.room_id);
  // Người ở CÙNG không được `contracts.occupancy_id` trỏ tới (cột đó trỏ người đại
  // diện) nên embed của họ rỗng — tra ngược qua `occ.contract_id`.
  const ownContract = occ.contracts?.find((c) => c.status === "Active") || occ.contracts?.[0];
  const contract = ownContract || contractById.get(occ.contract_id ?? "");
  return {
    occ,
    roomLabel: room?.code || "Phòng",
    contract,
    canManageContract: Boolean(contract && contract.status === "Active" && occ.is_primary !== false),
  };
}

function contractPeriod(row: OccupancyRow): string {
  return row.contract
    ? `${formatDate(row.contract.start_date)} → ${formatDate(row.contract.end_date)}`
    : formatDate(row.occ.start_date);
}

function LinkStatus({ row, onOpenLinkModal, onCancelLink }: {
  row: OccupancyRow;
  onOpenLinkModal: (occ: OccupancyItem) => void;
  onCancelLink: (occ: OccupancyItem) => void;
}) {
  const status = row.occ.link_status;
  if (status === "Confirmed") {
    return <Badge kind="link" status={status} data-testid="occupancy-link-confirmed" />;
  }
  if (!row.occ.is_active) return <span style={{ fontSize: 12.5, color: C.textSecondary }}>—</span>;
  if (status === "Pending") {
    // Gõ nhầm email thì trước đây kẹt "Chờ xác nhận" mãi — giờ đổi email hoặc hủy được.
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
        <Badge kind="link" status={status} data-testid="occupancy-link-pending" />
        <div style={{ display: "flex", gap: 4 }}>
          <Button variant="ghost" size="sm" requiresWrite onClick={() => onOpenLinkModal(row.occ)} data-testid="link-change-email-btn">Đổi email</Button>
          <Button variant="ghost" size="sm" requiresWrite onClick={() => onCancelLink(row.occ)} data-testid="link-cancel-btn">Hủy yêu cầu</Button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      {status === "Rejected" && <Badge kind="link" status={status} />}
      <Button variant="ghost" size="sm" requiresWrite onClick={() => onOpenLinkModal(row.occ)} data-testid="link-occupant-account-btn">
        {status === "Rejected" ? "Gắn lại" : "Gắn tài khoản"}
      </Button>
    </div>
  );
}

function ContractActions({ row, onAddCoOccupant, onEndContract, onExtendContract }: {
  row: OccupancyRow;
  onAddCoOccupant: OccupancyTableProps["onAddCoOccupant"];
  onEndContract: OccupancyTableProps["onEndContract"];
  onExtendContract: OccupancyTableProps["onExtendContract"];
}) {
  const { contract } = row;
  if (!row.canManageContract || !contract) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      <Button
        variant="outline"
        size="sm"
        requiresWrite
        data-testid="add-co-occupant-btn"
        icon={<UserPlus size={12} />}
        onClick={() => onAddCoOccupant({ contractId: contract.id, roomLabel: row.roomLabel, primaryName: row.occ.full_name })}
      >
        Người ở cùng
      </Button>
      <Button
        variant="outline"
        size="sm"
        requiresWrite
        data-testid="extend-contract-btn"
        icon={<CalendarPlus size={12} />}
        onClick={() => onExtendContract(contract.id, contract.end_date)}
      >
        Gia hạn HĐ
      </Button>
      <Button variant="danger" size="sm" requiresWrite data-testid="end-contract-btn" onClick={() => onEndContract(contract.id)}>
        Kết thúc HĐ
      </Button>
    </div>
  );
}

function LeftTag() {
  return (
    <span data-testid="occupancy-left-tag" style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: C.textSecondary, background: C.bg, border: `1px solid ${C.border}`, borderRadius: radius.pill, padding: "1px 7px", marginLeft: 6 }}>
      đã rời
    </span>
  );
}

function CoOccupantTag() {
  return (
    <span
      title="Ở cùng, đứng tên chung hợp đồng với người đại diện"
      style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: C.secondary, background: C.cream, borderRadius: radius.pill, padding: "1px 7px", marginLeft: 6 }}
    >
      ở cùng
    </span>
  );
}

/**
 * Danh sách người ở của một khu: bảng trên máy tính, thẻ trên điện thoại.
 * Tách khỏi OccupantsView vì file đó vượt 600 dòng (CLAUDE.md §8.2).
 */
export function OccupancyTable({
  loading,
  occupancies,
  property,
  contractById,
  mobile,
  onOpenLinkModal,
  onCancelLink,
  onAddCoOccupant,
  onEndContract,
  onExtendContract,
}: OccupancyTableProps) {
  if (loading) {
    return (
      <p role="status" style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, textAlign: "center", padding: "32px 0" }}>
        Đang tải thông tin người ở...
      </p>
    );
  }

  if (occupancies.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 16px", border: `1px dashed ${C.border}`, borderRadius: 12 }}>
        <Users size={32} color={C.textSecondary} style={{ marginBottom: 8 }} />
        <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 4px" }}>
          Chưa có người ở nào được ghi nhận
        </p>
        <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>
          Nhấp "Thêm người ở" để tạo đợt ở mới và lập hợp đồng thuê phòng.
        </p>
      </div>
    );
  }

  const rows = occupancies.map((occ) => toRow(occ, property, contractById));
  const actionProps = { onAddCoOccupant, onEndContract, onExtendContract };

  if (mobile) {
    return (
      <div data-testid="occupancy-card-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((row) => (
          <div key={row.occ.id} style={{ border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: "12px 14px", fontFamily: font }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: C.textPrimary }}>
                  {row.occ.full_name}
                  {row.occ.is_primary === false && <CoOccupantTag />}
                  {!row.occ.is_active && <LeftTag />}
                </div>
                <div style={{ fontSize: 12.5, color: C.textSecondary, marginTop: 2 }}>
                  Phòng {row.roomLabel} · {row.occ.occupant_count} người{row.occ.phone_number ? ` · ${row.occ.phone_number}` : ""}
                </div>
              </div>
              <LinkStatus row={row} onOpenLinkModal={onOpenLinkModal} onCancelLink={onCancelLink} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 8, fontSize: 12.5, color: C.textSecondary }}>
              <span>{contractPeriod(row)}</span>
              {row.contract && <strong style={{ color: C.primary }}>{formatVnd(row.contract.rent_price)}/tháng</strong>}
            </div>
            {row.canManageContract && (
              <div style={{ marginTop: 10 }}>
                <ContractActions row={row} {...actionProps} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  const cellStyle: React.CSSProperties = { fontFamily: font, fontSize: 13, color: C.textSecondary, padding: "12px" };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
        <thead>
          <tr style={{ background: C.caramelSoft }}>
            {["Phòng", "Họ và tên", "SĐT", "Số người", "Thời hạn HĐ", "Tiền cọc", "Giá thuê", "Tài khoản người ở", "Thao tác"].map((h) => (
              <th key={h} style={{ fontFamily: font, fontSize: 11.5, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", padding: "10px 12px", textAlign: "left" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.occ.id} style={{ borderTop: `1px solid ${C.border}` }}>
              <td style={{ ...cellStyle, fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>{row.roomLabel}</td>
              <td style={{ ...cellStyle, fontSize: 13.5, fontWeight: 600, color: C.textPrimary }}>
                {row.occ.full_name}
                {row.occ.is_primary === false && <CoOccupantTag />}
                {!row.occ.is_active && <LeftTag />}
              </td>
              <td style={cellStyle}>{row.occ.phone_number || "—"}</td>
              <td style={cellStyle}>{row.occ.occupant_count} người</td>
              <td style={{ ...cellStyle, fontSize: 12.5 }}>{contractPeriod(row)}</td>
              <td style={{ ...cellStyle, color: C.textPrimary }}>{row.contract ? formatVnd(row.contract.deposit) : "—"}</td>
              <td style={{ ...cellStyle, fontSize: 13.5, fontWeight: 700, color: C.primary }}>{row.contract ? formatVnd(row.contract.rent_price) : "—"}</td>
              <td style={cellStyle}><LinkStatus row={row} onOpenLinkModal={onOpenLinkModal} onCancelLink={onCancelLink} /></td>
              <td style={cellStyle}><ContractActions row={row} {...actionProps} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
