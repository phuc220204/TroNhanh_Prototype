import React, { useEffect, useState } from "react";
import { Home, Users, FileText, Wallet, Zap, AlertTriangle, History } from "lucide-react";
import { C, font, radius, space } from "../../shared/theme";
import { ROOM_STATUS_META } from "../../shared/utils/statusMaps";
import { toUserMessage } from "../../shared/services/supabase-error";
import {
  getRoomHistory,
  daysSince,
  type RoomHistory,
  type UtilityType,
} from "../services/room-history-service";
import type { RoomStatus } from "../../shared/types/status";

/**
 * Drawer "Chi tiết phòng" dạng tab.
 *
 * Bản cũ chỉ hiển thị MỘT tháng (`room.bill`) và MỘT hợp đồng, trong khi DB đã
 * lưu đầy đủ nhiều kỳ. Chủ trọ cần nhìn nhiều tháng để đối chiếu tiêu thụ và
 * theo dõi công nợ, nên chia 4 tab thay vì một trang cuộn dài.
 */

type TabId = "overview" | "utility" | "invoices" | "history";

const TABS: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "overview", label: "Tổng quan", icon: Home },
  { id: "utility", label: "Điện nước", icon: Zap },
  { id: "invoices", label: "Hóa đơn", icon: Wallet },
  { id: "history", label: "Lịch sử ở", icon: History },
];

const vnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const num = (n: number) => n.toLocaleString("vi-VN");

/** "2026-07" → "Tháng 7/2026" */
const periodLabel = (period: string) => {
  const [y, m] = period.split("-");
  return m ? `Tháng ${Number(m)}/${y}` : period;
};

const dateLabel = (d: string | null) => {
  if (!d) return "—";
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString("vi-VN");
};

export interface RoomDetailTabsRoom {
  id: string;
  code: string;
  floor: string;
  area: string;
  price: string;
  status: RoomStatus;
  amenities: string[];
  note: string;
}

export function RoomDetailTabs({
  room,
  electricityUnitPrice,
  waterUnitPrice,
  serviceFee,
}: {
  room: RoomDetailTabsRoom;
  electricityUnitPrice?: number;
  waterUnitPrice?: number;
  serviceFee?: number;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const [history, setHistory] = useState<RoomHistory | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsPending(true);
    setErrorMessage(null);

    getRoomHistory(room.id)
      .then((data) => { if (!cancelled) setHistory(data); })
      .catch((e) => { if (!cancelled) setErrorMessage(toUserMessage(e)); })
      .finally(() => { if (!cancelled) setIsPending(false); });

    return () => { cancelled = true; };
  }, [room.id]);

  const activeOccupancy = history?.occupancies.find((o) => o.isActive) ?? null;
  const activeContract = history?.contracts.find((c) => c.status === "Active") ?? null;

  return (
    <div data-testid="room-detail-tabs">
      {/* ── Dải cảnh báo công nợ: thứ chủ trọ cần thấy đầu tiên ───────────── */}
      {history && history.totalOutstanding > 0 && (
        <div
          data-testid="room-outstanding-banner"
          style={{
            display: "flex", alignItems: "center", gap: space[2],
            background: "#FBEDE9", border: `1px solid #EBC9C0`,
            borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`,
            marginBottom: space[4],
          }}
        >
          <AlertTriangle size={16} color={C.error} style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: font, fontSize: 13, color: C.error, fontWeight: 700 }}>
            Còn nợ {vnd(history.totalOutstanding)} qua{" "}
            {history.invoices.filter((i) => i.remaining > 0).length} kỳ
          </span>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        style={{
          display: "flex", gap: space[1], borderBottom: `1px solid ${C.border}`,
          marginBottom: space[4], overflowX: "auto",
        }}
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`room-tab-${id}`}
              onClick={() => setTab(id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: `${space[2]}px ${space[3]}px`,
                background: "transparent", border: "none",
                borderBottom: `2px solid ${active ? C.primary : "transparent"}`,
                color: active ? C.primary : C.textSecondary,
                fontFamily: font, fontSize: 13, fontWeight: active ? 800 : 600,
                cursor: "pointer", whiteSpace: "nowrap", marginBottom: -1,
              }}
            >
              <Icon size={14} /> {label}
            </button>
          );
        })}
      </div>

      {isPending && <Loading />}
      {!isPending && errorMessage && <ErrorBox message={errorMessage} />}

      {!isPending && !errorMessage && history && (
        <>
          {tab === "overview" && (
            <OverviewTab
              room={room}
              history={history}
              activeOccupancy={activeOccupancy}
              activeContract={activeContract}
              electricityUnitPrice={electricityUnitPrice}
              waterUnitPrice={waterUnitPrice}
              serviceFee={serviceFee}
            />
          )}
          {tab === "utility" && <UtilityTab history={history} />}
          {tab === "invoices" && <InvoicesTab history={history} />}
          {tab === "history" && <StayHistoryTab history={history} />}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 1 — TỔNG QUAN
   ══════════════════════════════════════════════════════════════════════════ */
function OverviewTab({
  room, history, activeOccupancy, activeContract,
  electricityUnitPrice, waterUnitPrice, serviceFee,
}: {
  room: RoomDetailTabsRoom;
  history: RoomHistory;
  activeOccupancy: RoomHistory["occupancies"][number] | null;
  activeContract: RoomHistory["contracts"][number] | null;
  electricityUnitPrice?: number;
  waterUnitPrice?: number;
  serviceFee?: number;
}) {
  const meta = ROOM_STATUS_META[room.status];
  const latestInvoice = history.invoices[0] ?? null;

  return (
    <div>
      <Section icon={<Home size={16} color={C.primary} />} title="Thông tin phòng">
        <Row k="Mã phòng" v={room.code} />
        <Row k="Tầng / khu" v={room.floor} />
        <Row k="Diện tích" v={room.area} />
        <Row k="Giá thuê" v={room.price} strong />
        <Row k="Nội thất / tiện ích" v={room.amenities.length ? room.amenities.join(", ") : "Chưa khai báo"} />
        <RowNode k="Trạng thái">
          <span style={{
            fontFamily: font, fontSize: 11, fontWeight: 700, color: C.white,
            background: meta?.color ?? C.textSecondary, borderRadius: radius.pill, padding: "2px 9px",
          }}>
            {meta?.label ?? room.status}
          </span>
        </RowNode>
      </Section>

      <Section icon={<Zap size={16} color={C.primary} />} title="Đơn giá đang áp dụng">
        <Row k="Điện" v={electricityUnitPrice != null ? `${vnd(electricityUnitPrice)} / kWh` : "Chưa cấu hình"} />
        <Row k="Nước" v={waterUnitPrice != null ? `${vnd(waterUnitPrice)} / m³` : "Chưa cấu hình"} />
        <Row k="Phí dịch vụ" v={serviceFee != null ? `${vnd(serviceFee)} / tháng` : "Chưa cấu hình"} />
        <Row k="Chốt số điện gần nhất" v={history.lastReadingPeriod.Electricity ? periodLabel(history.lastReadingPeriod.Electricity) : "Chưa ghi"} />
        <Row k="Chốt số nước gần nhất" v={history.lastReadingPeriod.Water ? periodLabel(history.lastReadingPeriod.Water) : "Chưa ghi"} />
      </Section>

      <Section icon={<Users size={16} color={C.primary} />} title="Người ở hiện tại">
        {activeOccupancy ? (
          <>
            <Row k="Họ tên" v={activeOccupancy.fullName} />
            <Row k="Số điện thoại" v={activeOccupancy.phoneNumber || "—"} />
            <Row k="Ngày bắt đầu ở" v={dateLabel(activeOccupancy.startDate)} />
            <Row k="Đã ở" v={`${num(daysSince(activeOccupancy.startDate))} ngày`} />
            <Row k="Số người ở" v={`${activeOccupancy.occupantCount} người`} />
            <RowNode k="Tài khoản người ở">
              <LinkStatusBadge status={activeOccupancy.linkStatus} />
            </RowNode>
          </>
        ) : <Empty text="Phòng chưa có người ở." />}
      </Section>

      <Section icon={<FileText size={16} color={C.primary} />} title="Hợp đồng hiện tại">
        {activeContract ? (
          <>
            <Row k="Từ ngày" v={dateLabel(activeContract.startDate)} />
            <Row k="Đến ngày" v={dateLabel(activeContract.endDate)} />
            <RowNode k="Thời hạn còn lại">
              <span style={{
                fontFamily: font, fontSize: 13, fontWeight: 800,
                color: activeContract.daysRemaining < 0 ? C.error
                  : activeContract.daysRemaining <= 30 ? C.warning : C.textPrimary,
              }}>
                {activeContract.daysRemaining < 0
                  ? `Quá hạn ${num(-activeContract.daysRemaining)} ngày`
                  : `${num(activeContract.daysRemaining)} ngày`}
              </span>
            </RowNode>
            <Row k="Tiền thuê" v={vnd(activeContract.rentPrice)} />
            <Row k="Tiền cọc đang giữ" v={vnd(activeContract.deposit)} />
          </>
        ) : <Empty text="Phòng chưa có hợp đồng còn hiệu lực." />}
      </Section>

      <Section icon={<Wallet size={16} color={C.primary} />} title="Kỳ gần nhất">
        {latestInvoice ? (
          <>
            <Row k="Kỳ" v={periodLabel(latestInvoice.period)} />
            {latestInvoice.items.map((it, i) => (
              <Row key={i} k={it.description || it.type} v={vnd(it.amount)} />
            ))}
            <div style={{ borderTop: `1px dashed ${C.border}`, marginTop: space[2], paddingTop: space[2] }}>
              <Row k="Tổng cần thu" v={vnd(latestInvoice.totalAmount)} strong />
              <Row k="Đã thu" v={vnd(latestInvoice.paidAmount)} />
              {latestInvoice.remaining > 0 && (
                <RowNode k="Còn nợ">
                  <span style={{ fontFamily: font, fontSize: 13, fontWeight: 800, color: C.error }}>
                    {vnd(latestInvoice.remaining)}
                  </span>
                </RowNode>
              )}
            </div>
          </>
        ) : <Empty text="Chưa phát sinh hóa đơn." />}
      </Section>

      <Section icon={<FileText size={16} color={C.primary} />} title="Ghi chú & bảo trì">
        <p style={{ fontFamily: font, fontSize: 13, color: C.textPrimary, margin: 0, lineHeight: 1.6 }}>
          {room.note || "Không có ghi chú."}
        </p>
      </Section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 2 — ĐIỆN NƯỚC (nhiều kỳ)
   ══════════════════════════════════════════════════════════════════════════ */
function UtilityTab({ history }: { history: RoomHistory }) {
  const [type, setType] = useState<UtilityType>("Electricity");
  const rows = history.readings.filter((r) => r.type === type);
  const unit = type === "Electricity" ? "kWh" : "m³";

  return (
    <div>
      <div style={{ display: "flex", gap: space[2], marginBottom: space[4] }}>
        {(["Electricity", "Water"] as UtilityType[]).map((t) => {
          const active = type === t;
          return (
            <button
              key={t}
              type="button"
              data-testid={`utility-type-${t}`}
              onClick={() => setType(t)}
              style={{
                padding: `6px ${space[3]}px`, borderRadius: radius.pill,
                border: `1.5px solid ${active ? C.primary : C.border}`,
                background: active ? C.primary : C.white,
                color: active ? C.white : C.textSecondary,
                fontFamily: font, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              }}
            >
              {t === "Electricity" ? "Điện" : "Nước"}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <Empty text={`Chưa ghi chỉ số ${type === "Electricity" ? "điện" : "nước"} kỳ nào.`} />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
            <thead>
              <tr>
                {["Kỳ", "Chỉ số cũ", "Chỉ số mới", `Tiêu thụ (${unit})`, "Thành tiền"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody data-testid="utility-history-table">
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={td}>{periodLabel(r.period)}</td>
                  <td style={{ ...td, color: C.textSecondary }}>{num(r.previousReading)}</td>
                  <td style={td}>{num(r.currentReading)}</td>
                  <td style={td}>
                    <span style={{ fontWeight: 700 }}>{num(r.consumption)}</span>
                    {r.deltaPercent != null && r.deltaPercent !== 0 && (
                      <span style={{
                        marginLeft: 6, fontSize: 11, fontWeight: 700,
                        color: r.deltaPercent > 0 ? C.error : C.success,
                      }}>
                        {r.deltaPercent > 0 ? "▲" : "▼"} {Math.abs(r.deltaPercent)}%
                      </span>
                    )}
                  </td>
                  <td style={{ ...td, fontWeight: 700 }}>{vnd(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 3 — HÓA ĐƠN & CÔNG NỢ (nhiều kỳ)
   ══════════════════════════════════════════════════════════════════════════ */
function InvoicesTab({ history }: { history: RoomHistory }) {
  if (history.invoices.length === 0) return <Empty text="Chưa phát sinh hóa đơn nào." />;

  const totalBilled = history.invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = history.invoices.reduce((s, i) => s + i.paidAmount, 0);

  return (
    <div>
      <div style={{ display: "flex", gap: space[2], marginBottom: space[4], flexWrap: "wrap" }}>
        <Stat label="Tổng đã xuất" value={vnd(totalBilled)} />
        <Stat label="Đã thu" value={vnd(totalPaid)} color={C.success} />
        <Stat label="Còn nợ" value={vnd(history.totalOutstanding)}
              color={history.totalOutstanding > 0 ? C.error : C.textPrimary} />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr>
              {["Kỳ", "Tổng tiền", "Đã thu", "Còn lại", "Hạn thu", "Trạng thái"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody data-testid="invoice-history-table">
            {history.invoices.map((inv) => (
              <tr key={inv.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={td}>{periodLabel(inv.period)}</td>
                <td style={td}>{vnd(inv.totalAmount)}</td>
                <td style={{ ...td, color: C.success }}>{vnd(inv.paidAmount)}</td>
                <td style={{ ...td, fontWeight: 700, color: inv.remaining > 0 ? C.error : C.textSecondary }}>
                  {inv.remaining > 0 ? vnd(inv.remaining) : "—"}
                </td>
                <td style={{ ...td, color: inv.isOverdue ? C.error : C.textSecondary }}>
                  {dateLabel(inv.dueDate)}
                </td>
                <td style={td}><InvoiceStatusBadge status={inv.status} isOverdue={inv.isOverdue} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 4 — LỊCH SỬ Ở & HỢP ĐỒNG
   ══════════════════════════════════════════════════════════════════════════ */
function StayHistoryTab({ history }: { history: RoomHistory }) {
  return (
    <div>
      <Section icon={<Users size={16} color={C.primary} />} title={`Người ở (${history.occupancies.length})`}>
        {history.occupancies.length === 0 ? <Empty text="Chưa có ai từng ở phòng này." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            {history.occupancies.map((o) => (
              <div key={o.id} data-testid="occupancy-history-item" style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>
                    {o.fullName}
                  </span>
                  <span style={{
                    fontFamily: font, fontSize: 11, fontWeight: 700,
                    color: o.isActive ? C.success : C.textSecondary,
                  }}>
                    {o.isActive ? "Đang ở" : "Đã rời"}
                  </span>
                </div>
                <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0 }}>
                  {dateLabel(o.startDate)} → {o.endDate ? dateLabel(o.endDate) : "nay"} ·{" "}
                  {o.occupantCount} người · {o.phoneNumber || "chưa có SĐT"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={<FileText size={16} color={C.primary} />} title={`Hợp đồng (${history.contracts.length})`}>
        {history.contracts.length === 0 ? <Empty text="Chưa có hợp đồng nào." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            {history.contracts.map((c) => (
              <div key={c.id} data-testid="contract-history-item" style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>
                    {vnd(c.rentPrice)}/tháng
                  </span>
                  <span style={{
                    fontFamily: font, fontSize: 11, fontWeight: 700,
                    color: c.status === "Active" ? C.success : C.textSecondary,
                  }}>
                    {c.status === "Active" ? "Đang hiệu lực"
                      : c.status === "Expired" ? "Hết hạn"
                      : c.status === "Terminated" ? "Đã chấm dứt" : c.status}
                  </span>
                </div>
                <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0 }}>
                  {dateLabel(c.startDate)} → {dateLabel(c.endDate)} · cọc {vnd(c.deposit)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PRIMITIVES CỤC BỘ
   ══════════════════════════════════════════════════════════════════════════ */
const th: React.CSSProperties = {
  fontFamily: font, fontSize: 11.5, fontWeight: 700, color: C.textSecondary,
  textAlign: "left", padding: `${space[2]}px 6px`, whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  fontFamily: font, fontSize: 12.5, color: C.textPrimary,
  padding: `${space[2]}px 6px`, whiteSpace: "nowrap",
};
const card: React.CSSProperties = {
  background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: radius.md, padding: `${space[2]}px ${space[3]}px`,
};

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: space[4], marginTop: space[4] }}>
      <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: space[3] }}>
        {icon}
        <span style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <RowNode k={k}>
      <span style={{
        fontFamily: font, fontSize: 13, fontWeight: strong ? 800 : 600,
        color: C.textPrimary, textAlign: "right",
      }}>{v}</span>
    </RowNode>
  );
}

function RowNode({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", gap: space[3] }}>
      <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>{k}</span>
      {children}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 120 }}>
      <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: "0 0 2px" }}>{label}</p>
      <p style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: color ?? C.textPrimary, margin: 0 }}>{value}</p>
    </div>
  );
}

function LinkStatusBadge({ status }: { status: string | null }) {
  // BR-029: chủ trọ gắn tài khoản -> Pending; chỉ Renter tự xác nhận mới thành Confirmed.
  const meta: Record<string, { label: string; color: string }> = {
    Pending: { label: "Chờ xác nhận", color: C.warning },
    Confirmed: { label: "Đã xác nhận", color: C.success },
    Rejected: { label: "Đã từ chối", color: C.error },
  };
  const m = status ? meta[status] : undefined;
  return (
    <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: m?.color ?? C.textSecondary }}>
      {m?.label ?? "Chưa gắn tài khoản"}
    </span>
  );
}

function InvoiceStatusBadge({ status, isOverdue }: { status: string; isOverdue: boolean }) {
  const label = isOverdue ? "Quá hạn"
    : status === "Paid" ? "Đã thu"
    : status === "PartiallyPaid" ? "Thu một phần"
    : status === "Overdue" ? "Quá hạn" : "Chưa thu";
  const color = label === "Đã thu" ? C.success
    : label === "Thu một phần" ? C.warning : C.error;
  return <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color }}>{label}</span>;
}

function Empty({ text }: { text: string }) {
  return <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>{text}</p>;
}

function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          height: 44, background: C.cream, borderRadius: radius.md,
          opacity: 1 - i * 0.25,
        }} />
      ))}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      background: "#FBEDE9", border: `1px solid #EBC9C0`, borderRadius: radius.md,
      padding: `${space[3]}px ${space[4]}px`,
    }}>
      <p style={{ fontFamily: font, fontSize: 13, color: C.error, margin: 0 }}>{message}</p>
    </div>
  );
}
