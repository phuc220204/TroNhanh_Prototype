import { CalendarX2, CalendarClock, FileWarning, ReceiptText, Megaphone, ListChecks, type LucideIcon } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { Button } from "../../../shared/components/common";
import { CONTRACT_STATUS_META, INVOICE_STATUS_META, LISTING_META } from "../../../shared/utils/statusMaps";
import { formatPeriod, formatVnd } from "../../../shared/utils/format";
import { CONTRACT_EXPIRING_SOON_DAYS, formatContractEndLabel } from "../../services/contract-due";
import type { ContractTodo, LandlordTodos, RoomTodo } from "../../services/landlord-todos";

/** Số phòng nêu tên trong một mục; còn lại gộp thành "+N phòng khác". */
const MAX_NAMED_ROOMS = 3;

export interface TodoItem {
  id: string;
  Icon: LucideIcon;
  tone: { color: string; bg: string };
  title: string;
  detail: string;
  cta: string;
  onAction: () => void;
}

export interface TodoActions {
  /** Tab Người ở & hợp đồng của khu chứa hợp đồng đầu tiên trong danh sách. */
  onOpenContracts: (propertyId: string) => void;
  /** Tab Phòng của khu — nơi ghi điện nước và lập hóa đơn. */
  onOpenRooms: (propertyId: string) => void;
  onOpenOverdueInvoices: () => void;
  onOpenExpiredListings: () => void;
}

const roomLabel = (room: RoomTodo) => (room.propertyName ? `${room.roomCode} (${room.propertyName})` : room.roomCode);

function describeRooms<T extends RoomTodo>(rooms: T[], suffix?: (room: T) => string): string {
  const named = rooms.slice(0, MAX_NAMED_ROOMS).map((room) => (suffix ? `${roomLabel(room)} · ${suffix(room)}` : roomLabel(room)));
  const rest = rooms.length - named.length;
  return rest > 0 ? `${named.join("; ")}; +${rest} phòng khác` : named.join("; ");
}

/**
 * Dựng danh sách việc theo thứ tự gấp: hợp đồng đã hết hạn → hóa đơn quá hạn →
 * chưa lập hóa đơn kỳ này → hợp đồng sắp hết hạn → tin hết hạn.
 * Danh sách rỗng ⇒ dashboard mới được nói "Mọi thứ trong tầm kiểm soát".
 */
export function buildTodoItems(input: {
  todos: LandlordTodos;
  overdueInvoiceCount: number;
  overdueInvoiceAmount: number;
  /** `null` = chưa biết (đang tải / lỗi) ⇒ bỏ qua mục này. */
  expiredListingCount: number | null;
  actions: TodoActions;
}): TodoItem[] {
  const { todos, overdueInvoiceCount, overdueInvoiceAmount, expiredListingCount, actions } = input;
  const items: TodoItem[] = [];
  const endLabel = (contract: ContractTodo) => formatContractEndLabel(contract.daysUntilEnd);

  if (todos.expiredContracts.length > 0) {
    items.push({
      id: "expired-contracts",
      Icon: CalendarX2,
      tone: CONTRACT_STATUS_META.expired,
      title: `${todos.expiredContracts.length} hợp đồng đã hết hạn`,
      detail: `${describeRooms(todos.expiredContracts, endLabel)}. Gia hạn hoặc kết thúc để phòng phản ánh đúng thực tế.`,
      cta: "Gia hạn / kết thúc",
      onAction: () => actions.onOpenContracts(todos.expiredContracts[0]!.propertyId),
    });
  }

  if (overdueInvoiceCount > 0) {
    items.push({
      id: "overdue-invoices",
      Icon: FileWarning,
      tone: INVOICE_STATUS_META.overdue,
      title: `${overdueInvoiceCount} hóa đơn quá hạn`,
      detail: `Còn phải thu ${formatVnd(overdueInvoiceAmount)}.`,
      cta: "Xem & nhắc nợ",
      onAction: actions.onOpenOverdueInvoices,
    });
  }

  if (todos.roomsWithoutInvoice.length > 0) {
    items.push({
      id: "rooms-without-invoice",
      Icon: ReceiptText,
      tone: INVOICE_STATUS_META.partiallyPaid,
      title: `${todos.roomsWithoutInvoice.length} phòng đang thuê chưa có hóa đơn kỳ ${formatPeriod(todos.period).toLowerCase()}`,
      detail: `${describeRooms(todos.roomsWithoutInvoice)}. Ghi điện nước rồi lập hóa đơn từ thẻ phòng.`,
      cta: "Lập hóa đơn",
      onAction: () => actions.onOpenRooms(todos.roomsWithoutInvoice[0]!.propertyId),
    });
  }

  if (todos.expiringContracts.length > 0) {
    items.push({
      id: "expiring-contracts",
      Icon: CalendarClock,
      tone: INVOICE_STATUS_META.partiallyPaid,
      title: `${todos.expiringContracts.length} hợp đồng sắp hết hạn (${CONTRACT_EXPIRING_SOON_DAYS} ngày)`,
      detail: describeRooms(todos.expiringContracts, endLabel),
      cta: "Xem hợp đồng",
      onAction: () => actions.onOpenContracts(todos.expiringContracts[0]!.propertyId),
    });
  }

  if (expiredListingCount != null && expiredListingCount > 0) {
    items.push({
      id: "expired-listings",
      Icon: Megaphone,
      tone: LISTING_META.expired,
      title: `${expiredListingCount} tin cho thuê đã hết hạn`,
      detail: "Tin hết hạn không còn hiện với người tìm phòng. Gia hạn nếu phòng vẫn trống.",
      cta: "Gia hạn tin",
      onAction: actions.onOpenExpiredListings,
    });
  }

  return items;
}

/** Khối "Việc cần làm" — chỉ render khi có việc. */
export function TodoPanel({ items, isMobile }: { items: TodoItem[]; isMobile?: boolean }) {
  if (items.length === 0) return null;
  return (
    <section
      data-testid="dashboard-todo-panel"
      style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: isMobile ? "16px" : "18px 20px", marginBottom: 24 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <ListChecks size={18} color={C.primary} />
        <h2 style={{ fontFamily: font, fontSize: 15.5, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Việc cần làm</h2>
        <span style={{ fontFamily: font, fontSize: 12, fontWeight: 800, color: C.white, background: C.primary, borderRadius: radius.pill, padding: "1px 8px" }}>{items.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => (
          <div
            key={item.id}
            data-testid={`dashboard-todo-${item.id}`}
            style={{
              display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center",
              gap: isMobile ? 10 : 14, padding: "12px 14px", borderRadius: radius.md, background: item.tone.bg,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
              <item.Icon size={18} color={item.tone.color} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: item.tone.color, margin: 0 }}>{item.title}</p>
                <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: "3px 0 0", lineHeight: 1.45 }}>{item.detail}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={item.onAction} data-testid={`dashboard-todo-${item.id}-btn`}>
              {item.cta}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
