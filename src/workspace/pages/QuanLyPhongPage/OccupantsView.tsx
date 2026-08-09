import { useState, useEffect } from "react";
import { Plus, UserCheck, AlertCircle, X, CheckCircle } from "lucide-react";
import { C, font } from "../../../shared/theme";
import { Button } from "../../../shared/components/common";
import type { Property, Room } from "../../types/room";
import {
  listOccupancies,
  createOccupancyWithContract,
  endOccupancy,
  linkRenterAccount,
  addOccupantToContract,
  type OccupancyItem,
} from "../../services/occupancy-service";
import { extendContract } from "../../services/contract-service";
import { ExtendContractModal } from "./ExtendContractModal";
import { toUserMessage } from "../../../shared/services/supabase-error";
import { AddCoOccupantModal } from "./AddCoOccupantModal";
import { OccupancyTable } from "./OccupancyTable";

interface OccupantsViewProps {
  property: Property | null;
  mobile?: boolean;
  isReadOnly?: boolean;
  onRefreshData?: () => void;
}

export function OccupantsView({
  property,
  mobile,
  isReadOnly,
  onRefreshData,
}: OccupantsViewProps) {
  const [occupancies, setOccupancies] = useState<OccupancyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState<OccupancyItem | null>(null);

  // Form State for "Thêm người ở"
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [occupantCount, setOccupantCount] = useState("1");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0] || "");
  
  // Default end date: 1 year from today
  const defaultEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] || "";
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [rentPrice, setRentPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [renterEmail, setRenterEmail] = useState("");

  const [linkEmailInput, setLinkEmailInput] = useState("");
  const [coOccupantTarget, setCoOccupantTarget] = useState<{ contractId: string; roomLabel: string; primaryName: string } | null>(null);
  const [coOccupantSubmitting, setCoOccupantSubmitting] = useState(false);
  const [extendTarget, setExtendTarget] = useState<{ contractId: string; currentEndDate: string; roomLabel: string; occupantName: string } | null>(null);
  const [extendSubmitting, setExtendSubmitting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const fetchOccupanciesData = async () => {
    if (!property || !property.rooms || property.rooms.length === 0) {
      setOccupancies([]);
      return;
    }
    try {
      setLoading(true);
      const roomIds = property.rooms.map((r) => r.id);
      // `(): OccupancyItem[] => []` chứ không `() => []`: mảng rỗng không có kiểu
      // phần tử, nên `allResults` sẽ là `any[][]` và `setOccupancies(flattened)`
      // hết kiểm kiểu — đúng chỗ mà một field đổi tên sẽ trôi qua im lặng.
      const allResults = await Promise.all(
        roomIds.map((id) => listOccupancies(id).catch((): OccupancyItem[] => []))
      );
      const flattened = allResults.flat();
      setOccupancies(flattened);
    } catch (err: any) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOccupanciesData();
  }, [property]);

  const handleOpenAddModal = () => {
    if (isReadOnly) return;
    setErrorMsg("");
    const availableRoom = property?.rooms.find((r) => r.status === "available") || property?.rooms[0];
    if (availableRoom) {
      setSelectedRoomId(availableRoom.id);
      const priceClean = Number(availableRoom.price.replace(/[^\d]/g, "")) || 0;
      setRentPrice(priceClean ? String(priceClean) : "");
      setDeposit(priceClean ? String(priceClean) : "");
    }
    setFullName("");
    setPhoneNumber("");
    setOccupantCount("1");
    setRenterEmail("");
    setModalOpen(true);
  };

  const handleRoomSelectChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const targetRoom = property?.rooms.find((r) => r.id === roomId);
    if (targetRoom) {
      const priceClean = Number(targetRoom.price.replace(/[^\d]/g, "")) || 0;
      setRentPrice(priceClean ? String(priceClean) : "");
      setDeposit(priceClean ? String(priceClean) : "");
    }
  };

  const handleSubmitOccupant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return; // BR-015
    if (!selectedRoomId || !fullName.trim() || !startDate || !endDate || !rentPrice) {
      setErrorMsg("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      // 1. Single atomic RPC call to create occupancy + contract + update room status to Rented
      const result = await createOccupancyWithContract(
        selectedRoomId,
        {
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim() || undefined,
          occupant_count: Number(occupantCount) || 1,
          start_date: startDate,
          end_date: endDate,
        },
        {
          start_date: startDate,
          end_date: endDate,
          rent_price: Number(rentPrice) || 0,
          deposit: Number(deposit) || 0,
        }
      );

      // 2. Attach Renter Account via email if provided
      if (renterEmail.trim()) {
        try {
          await linkRenterAccount(result.occupancyId, renterEmail.trim());
          showToast(`Đã gửi yêu cầu xác nhận tới ${renterEmail.trim()}. Người ở cần xác nhận để hoàn tất liên kết.`);
        } catch (linkErr: any) {
          showToast(`Thêm người ở thành công nhưng chưa thể liên kết email: ${toUserMessage(linkErr)}`);
        }
      } else {
        showToast("Thêm người ở và tạo hợp đồng thành công!");
      }

      setModalOpen(false);
      fetchOccupanciesData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      // BR-006: ROOM_HAS_ACTIVE_CONTRACT and other RPC errors
      setErrorMsg(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Thêm người ở cùng vào hợp đồng đang có — KHÔNG tạo hợp đồng mới nên BR-006
   * không bị đụng. Số người trong phòng không giới hạn, tuỳ chủ trọ và diện tích.
   */
  const handleAddCoOccupant = async (input: { full_name: string; phone_number?: string }) => {
    if (isReadOnly) return; // BR-015
    if (!coOccupantTarget) return;
    try {
      setCoOccupantSubmitting(true);
      setErrorMsg("");
      await addOccupantToContract(coOccupantTarget.contractId, {
        full_name: input.full_name,
        phone_number: input.phone_number,
        start_date: new Date().toISOString().split("T")[0] || "",
      });
      setCoOccupantTarget(null);
      showToast("Đã thêm người ở cùng vào hợp đồng.");
      fetchOccupanciesData();
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setCoOccupantSubmitting(false);
    }
  };

  const handleExtendContract = async (newEndDate: string) => {
    if (isReadOnly || !extendTarget) return;
    setErrorMsg("");
    try {
      setExtendSubmitting(true);
      await extendContract(extendTarget.contractId, newEndDate);
      setExtendTarget(null);
      showToast(`Đã gia hạn hợp đồng đến ${newEndDate}.`);
      fetchOccupanciesData();
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setExtendSubmitting(false);
    }
  };

  const handleEndContract = async (contractId: string) => {
    if (isReadOnly) return;
    if (!window.confirm("Bạn có chắc chắn muốn kết thúc hợp đồng này? Phòng sẽ quay về trạng thái Trống.")) {
      return;
    }
    try {
      setLoading(true);
      await endOccupancy(contractId);
      showToast("Đã kết thúc hợp đồng thành công. Phòng hiện đã trống.");
      fetchOccupanciesData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast("Lỗi khi kết thúc hợp đồng: " + toUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLinkRenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return; // BR-015 — gắn tài khoản Renter cũng là thao tác ghi
    if (!linkModalOpen || !linkEmailInput.trim()) return;

    try {
      setSubmitting(true);
      await linkRenterAccount(linkModalOpen.id, linkEmailInput.trim());
      showToast(`Đã gửi yêu cầu xác nhận tới ${linkEmailInput.trim()}. Người ở cần xác nhận để hoàn tất liên kết.`);
      setLinkModalOpen(null);
      setLinkEmailInput("");
      fetchOccupanciesData();
    } catch (err: any) {
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

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: mobile ? 16 : 22 }}>
      {/* Toast Banner */}
      {toastMsg && (
        <div style={{ background: C.cream, border: `1px solid ${C.success}`, color: C.success, padding: "10px 16px", borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={16} />
          {toastMsg}
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>
            Người ở & Hợp đồng thuê
          </h2>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>
            Quản lý hợp đồng đang hiệu lực, thông tin người ở và liên kết tài khoản Renter.
          </p>
        </div>

        <button
          type="button"
          disabled={isReadOnly}
          onClick={handleOpenAddModal}
          data-testid="add-occupant-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 18px",
            background: isReadOnly ? C.border : C.primary,
            color: isReadOnly ? C.textSecondary : "white",
            border: "none",
            borderRadius: 10,
            fontFamily: font,
            fontSize: 13.5,
            fontWeight: 700,
            cursor: isReadOnly ? "not-allowed" : "pointer",
          }}
        >
          <Plus size={16} /> Thêm người ở
        </button>
      </div>

      {/* Bảng người ở — tách ra OccupancyTable.tsx (§8.2) */}
      <OccupancyTable
        loading={loading}
        occupancies={occupancies}
        property={property}
        contractById={contractById}
        isReadOnly={isReadOnly}
        onOpenLinkModal={(occ) => { setLinkModalOpen(occ); setLinkEmailInput(""); setErrorMsg(""); }}
        onAddCoOccupant={setCoOccupantTarget}
        onEndContract={handleEndContract}
        onExtendContract={(contractId, currentEndDate) => {
          const occ = occupancies.find((o) => (o.contracts?.[0]?.id ?? o.contract_id) === contractId);
          const room = property?.rooms.find((r) => r.id === occ?.room_id);
          setErrorMsg("");
          setExtendTarget({
            contractId,
            currentEndDate,
            roomLabel: room?.code ?? "Phòng",
            occupantName: occ?.full_name ?? "người ở",
          });
        }}
      />

      {/* Modal "Thêm người ở" */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.white, borderRadius: 16, width: "100%", maxWidth: 520, padding: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
                Thêm người ở & Tạo hợp đồng
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} color={C.textSecondary} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ background: C.cream, border: `1px solid ${C.error}`, color: C.error, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontFamily: font, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitOccupant} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                  Chọn phòng thuê <span style={{ color: C.repairing }}>*</span>
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => handleRoomSelectChange(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none" }}
                >
                  {property?.rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Phòng {r.code} ({r.price}) - Trạng thái: {r.status}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                    Họ và tên người ở <span style={{ color: C.repairing }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="occupant-name-input"
                    placeholder="VD: Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 0901234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                    Số người ở
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={occupantCount}
                    onChange={(e) => setOccupantCount(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                    Ngày bắt đầu <span style={{ color: C.repairing }}>*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: "100%", padding: "10px 8px", fontFamily: font, fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                    Hết hạn HĐ <span style={{ color: C.repairing }}>*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: "100%", padding: "10px 8px", fontFamily: font, fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                    Giá thuê (VND/tháng) <span style={{ color: C.repairing }}>*</span>
                  </label>
                  <input
                    type="number"
                    required
                    data-testid="contract-rent-input"
                    placeholder="VD: 3500000"
                    value={rentPrice}
                    onChange={(e) => setRentPrice(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                    Tiền cọc (VND)
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 3500000"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                  Email tài khoản Renter (Tùy chọn)
                </label>
                <input
                  type="email"
                  placeholder="VD: renter.a@tronhanh.demo"
                  value={renterEmail}
                  onChange={(e) => setRenterEmail(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
                />
                <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: "4px 0 0" }}>
                  Hệ thống sẽ gửi yêu cầu liên kết ở trạng thái <strong>Pending</strong>. Người ở phải tự xác nhận từ trang cá nhân (BR-029).
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: "10px 18px", background: "none", border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: font, fontSize: 13.5, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="occupancy-submit-btn"
                  style={{ padding: "10px 20px", background: C.primary, color: "white", border: "none", borderRadius: 8, fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}
                >
                  {submitting ? "Đang xử lý..." : "Lưu người ở & Hợp đồng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gắn Email */}
      {linkModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.white, borderRadius: 16, width: "100%", maxWidth: 440, padding: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
                Gắn tài khoản Renter cho {linkModalOpen.full_name}
              </h3>
              <button type="button" onClick={() => setLinkModalOpen(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} color={C.textSecondary} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ background: C.cream, border: `1px solid ${C.error}`, color: C.error, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontFamily: font, marginBottom: 16 }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLinkRenter} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                  Nhập email Renter
                </label>
                <input
                  type="email"
                  required
                  placeholder="VD: renter.a@tronhanh.demo"
                  value={linkEmailInput}
                  onChange={(e) => setLinkEmailInput(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={() => setLinkModalOpen(null)}>Hủy</Button>
                <Button type="submit" variant="primary" requiresWrite loading={submitting} data-testid="link-renter-submit-btn">Gửi yêu cầu liên kết</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {extendTarget && (
        <ExtendContractModal
          currentEndDate={extendTarget.currentEndDate}
          occupantName={extendTarget.occupantName}
          roomLabel={extendTarget.roomLabel}
          submitting={extendSubmitting}
          errorMessage={errorMsg || null}
          onCancel={() => { setExtendTarget(null); setErrorMsg(""); }}
          onSubmit={handleExtendContract}
        />
      )}

      {coOccupantTarget && (
        <AddCoOccupantModal
          roomLabel={coOccupantTarget.roomLabel}
          primaryName={coOccupantTarget.primaryName}
          submitting={coOccupantSubmitting}
          errorMessage={errorMsg || null}
          onCancel={() => { setCoOccupantTarget(null); setErrorMsg(""); }}
          onSubmit={handleAddCoOccupant}
        />
      )}
    </div>
  );
}
