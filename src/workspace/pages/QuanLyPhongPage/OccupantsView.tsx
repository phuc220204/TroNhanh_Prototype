import { useState, useEffect } from "react";
import { Plus, AlertCircle, X, CheckCircle } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { Button, ModalShell } from "../../../shared/components/common";
import type { Property } from "../../types/room";
import {
  listOccupancies,
  endOccupancy,
  linkRenterAccount,
  addOccupantToContract,
  type OccupancyItem,
} from "../../services/occupancy-service";
import { extendContract } from "../../services/contract-service";
import { ExtendContractModal } from "./ExtendContractModal";
import { toUserMessage } from "../../../shared/services/supabase-error";
import { AddCoOccupantModal } from "./AddCoOccupantModal";
import { AddOccupantModal } from "./AddOccupantModal";
import { EndContractModal } from "./EndContractModal";
import { OccupancyTable } from "./OccupancyTable";
import { toLocalISODate, formatDate } from "../../../shared/utils/format";

interface OccupantsViewProps {
  property: Property | null;
  mobile?: boolean;
  isReadOnly?: boolean;
  onRefreshData?: () => void;
}

type ContractTarget = { contractId: string; roomLabel: string; occupantName: string };

export function OccupantsView({ property, mobile, isReadOnly, onRefreshData }: OccupantsViewProps) {
  const [occupancies, setOccupancies] = useState<OccupancyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState<OccupancyItem | null>(null);
  const [linkEmailInput, setLinkEmailInput] = useState("");
  const [coOccupantTarget, setCoOccupantTarget] = useState<{ contractId: string; roomLabel: string; primaryName: string } | null>(null);
  const [extendTarget, setExtendTarget] = useState<(ContractTarget & { currentEndDate: string }) | null>(null);
  const [endTarget, setEndTarget] = useState<(ContractTarget & { startDate: string | null }) | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  // Lỗi tải danh sách — tách khỏi lỗi trong modal để lỗi mạng không trông như "Chưa có người ở".
  const [loadError, setLoadError] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  const fetchOccupanciesData = async () => {
    if (!property || !property.rooms || property.rooms.length === 0) {
      setOccupancies([]);
      setLoadError("");
      return;
    }
    try {
      setLoading(true);
      setLoadError("");
      // KHÔNG `.catch(() => [])` từng phòng: một phòng lỗi sẽ bị nuốt và danh sách
      // hiện thiếu người mà không ai biết. Lỗi thì báo lỗi, cho thử lại.
      const allResults = await Promise.all(property.rooms.map((r) => listOccupancies(r.id)));
      setOccupancies(allResults.flat());
    } catch (err: unknown) {
      setLoadError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOccupanciesData();
  }, [property]);

  const refreshAfterWrite = (message: string) => {
    showToast(message);
    void fetchOccupanciesData();
    onRefreshData?.();
  };

  /** Tra người ở + phòng theo hợp đồng (hàng của người ở cùng không có embed contracts). */
  const describeContract = (contractId: string): ContractTarget & { startDate: string | null } => {
    const occ = occupancies.find((o) => (o.contracts?.[0]?.id ?? o.contract_id) === contractId);
    const contract = occ?.contracts?.find((c) => c.id === contractId);
    const room = property?.rooms.find((r) => r.id === occ?.room_id);
    return { contractId, roomLabel: room?.code ?? "Phòng", occupantName: occ?.full_name ?? "người ở", startDate: contract?.start_date ?? null };
  };

  /** Người ở cùng vào hợp đồng đang có — KHÔNG tạo hợp đồng mới nên BR-006 không bị đụng. */
  const handleAddCoOccupant = async (input: { full_name: string; phone_number?: string }) => {
    if (isReadOnly || !coOccupantTarget) return;
    try {
      setSubmitting(true);
      setErrorMsg("");
      await addOccupantToContract(coOccupantTarget.contractId, { full_name: input.full_name, phone_number: input.phone_number, start_date: toLocalISODate() });
      setCoOccupantTarget(null);
      refreshAfterWrite("Đã thêm người ở cùng vào hợp đồng.");
    } catch (err: unknown) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExtendContract = async (newEndDate: string) => {
    if (isReadOnly || !extendTarget) return;
    try {
      setSubmitting(true);
      setErrorMsg("");
      await extendContract(extendTarget.contractId, newEndDate);
      setExtendTarget(null);
      refreshAfterWrite(`Đã gia hạn hợp đồng đến ${formatDate(newEndDate)}.`);
    } catch (err: unknown) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndContract = async (endDate: string) => {
    if (isReadOnly || !endTarget) return;
    try {
      setSubmitting(true);
      setErrorMsg("");
      await endOccupancy(endTarget.contractId, endDate);
      setEndTarget(null);
      refreshAfterWrite(`Đã kết thúc hợp đồng phòng ${endTarget.roomLabel}. Phòng hiện đã trống.`);
    } catch (err: unknown) {
      setErrorMsg(`Chưa kết thúc được hợp đồng: ${toUserMessage(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isReadOnly || !linkTarget || !linkEmailInput.trim()) return;
    try {
      setSubmitting(true);
      setErrorMsg("");
      await linkRenterAccount(linkTarget.id, linkEmailInput.trim());
      setLinkTarget(null);
      refreshAfterWrite(`Đã gửi yêu cầu liên kết tới ${linkEmailInput.trim()}. Người ở cần xác nhận để hoàn tất.`);
      setLinkEmailInput("");
    } catch (err: unknown) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Gom hợp đồng theo id để hàng của người ở cùng tra ngược được.
  const contractById = new Map<string, NonNullable<OccupancyItem["contracts"]>[number]>();
  for (const item of occupancies) {
    for (const c of item.contracts ?? []) contractById.set(c.id, c);
  }

  const closeModals = () => {
    setErrorMsg("");
    setLinkTarget(null);
    setCoOccupantTarget(null);
    setExtendTarget(null);
    setEndTarget(null);
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: mobile ? 16 : 22 }}>
      {toastMsg && (
        <div data-testid="occupancy-toast" role="status" style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, color: C.success, padding: "10px 16px", borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{toastMsg}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setToastMsg("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
            <X size={16} color={C.success} />
          </button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: mobile ? "stretch" : "center", flexDirection: mobile ? "column" : "row", gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>Người ở &amp; hợp đồng thuê</h2>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>
            Hợp đồng đang hiệu lực, thông tin người ở và liên kết tài khoản Trọ Nhanh của người ở.
          </p>
        </div>
        <Button variant="primary" requiresWrite icon={<Plus size={16} />} onClick={() => { setErrorMsg(""); setIsAddOpen(true); }} data-testid="add-occupant-btn">
          Thêm người ở
        </Button>
      </div>

      {loadError ? (
        <div data-testid="occupancy-load-error" role="alert" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 16px", textAlign: "center", background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 12 }}>
          <p style={{ fontFamily: font, fontSize: 14, color: C.error, fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
            Không tải được danh sách người ở. {loadError}
          </p>
          <Button variant="outline" size="sm" onClick={() => void fetchOccupanciesData()} data-testid="occupancy-retry-btn">Thử lại</Button>
        </div>
      ) : (
        <OccupancyTable
          loading={loading}
          occupancies={occupancies}
          property={property}
          contractById={contractById}
          mobile={mobile}
          onOpenLinkModal={(occ) => { setErrorMsg(""); setLinkEmailInput(""); setLinkTarget(occ); }}
          onAddCoOccupant={(target) => { setErrorMsg(""); setCoOccupantTarget(target); }}
          onEndContract={(contractId) => { setErrorMsg(""); setEndTarget(describeContract(contractId)); }}
          onExtendContract={(contractId, currentEndDate) => { setErrorMsg(""); setExtendTarget({ ...describeContract(contractId), currentEndDate }); }}
        />
      )}

      {isAddOpen && (
        <AddOccupantModal
          property={property}
          mobile={mobile}
          onClose={() => setIsAddOpen(false)}
          onCreated={(message) => { setIsAddOpen(false); refreshAfterWrite(message); }}
        />
      )}

      {linkTarget && (
        <ModalShell
          title={`Gắn tài khoản cho ${linkTarget.full_name}`}
          onClose={() => { if (!submitting) closeModals(); }}
          footer={
            <>
              <Button variant="outline" onClick={closeModals} disabled={submitting}>Hủy</Button>
              <Button variant="primary" requiresWrite loading={submitting} disabled={!linkEmailInput.trim()} onClick={(e) => void handleLinkAccount(e as unknown as React.FormEvent)} data-testid="link-renter-submit-btn">
                Gửi yêu cầu liên kết
              </Button>
            </>
          }
        >
          <form onSubmit={handleLinkAccount} style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: font }}>
            {errorMsg && (
              <div role="alert" style={{ display: "flex", alignItems: "center", gap: 6, background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error, padding: "10px 14px", borderRadius: radius.sm, fontSize: 13 }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} /> {errorMsg}
              </div>
            )}
            <label htmlFor="link-account-email" style={{ fontSize: 12.5, fontWeight: 700, color: C.textPrimary }}>Email tài khoản Trọ Nhanh của người ở</label>
            <input
              id="link-account-email"
              type="email"
              required
              placeholder="VD: ten@email.com"
              value={linkEmailInput}
              onChange={(e) => setLinkEmailInput(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: radius.sm, boxSizing: "border-box" }}
            />
            <p style={{ margin: 0, fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>
              Người ở nhận yêu cầu và tự xác nhận trong trang cá nhân. Sau khi xác nhận, họ xem được hóa đơn và đánh giá được khu trọ.
            </p>
          </form>
        </ModalShell>
      )}

      {extendTarget && (
        <ExtendContractModal
          currentEndDate={extendTarget.currentEndDate}
          occupantName={extendTarget.occupantName}
          roomLabel={extendTarget.roomLabel}
          submitting={submitting}
          errorMessage={errorMsg || null}
          onCancel={closeModals}
          onSubmit={handleExtendContract}
        />
      )}

      {endTarget && (
        <EndContractModal
          roomLabel={endTarget.roomLabel}
          occupantName={endTarget.occupantName}
          contractStartDate={endTarget.startDate}
          submitting={submitting}
          errorMessage={errorMsg || null}
          onCancel={closeModals}
          onConfirm={handleEndContract}
        />
      )}

      {coOccupantTarget && (
        <AddCoOccupantModal
          roomLabel={coOccupantTarget.roomLabel}
          primaryName={coOccupantTarget.primaryName}
          submitting={submitting}
          errorMessage={errorMsg || null}
          onCancel={closeModals}
          onSubmit={handleAddCoOccupant}
        />
      )}
    </div>
  );
}
