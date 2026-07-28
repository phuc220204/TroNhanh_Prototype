import { useState, useEffect } from "react";
import { Plus, Users, UserCheck, AlertCircle, X, CheckCircle, Clock } from "lucide-react";
import { C, font } from "../../../shared/theme";
import type { Property, Room } from "../../types/room";
import {
  listOccupancies,
  createOccupancyWithContract,
  endOccupancy,
  linkRenterAccount,
  type OccupancyItem,
} from "../../services/occupancy-service";
import { toUserMessage } from "../../../shared/services/supabase-error";

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
      const allResults = await Promise.all(
        roomIds.map((id) => listOccupancies(id).catch(() => []))
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

      {/* Occupancies Table */}
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
                const activeContract = occ.contracts?.find((c) => c.status === "Active") || occ.contracts?.[0];

                return (
                  <tr key={occ.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary, padding: "12px" }}>
                      {room?.code || "Phòng"}
                    </td>
                    <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: C.textPrimary, padding: "12px" }}>
                      {occ.full_name}
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
                          onClick={() => {
                            setLinkModalOpen(occ);
                            setLinkEmailInput("");
                            setErrorMsg("");
                          }}
                          style={{ background: "none", border: "none", color: C.primary, fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                        >
                          Gắn email
                        </button>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {activeContract && activeContract.status === "Active" && (
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => handleEndContract(activeContract.id)}
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
                <button type="button" onClick={() => setLinkModalOpen(null)} style={{ padding: "10px 16px", background: "none", border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: font, fontSize: 13.5, color: C.textSecondary, cursor: "pointer" }}>Hủy</button>
                <button type="submit" disabled={submitting} style={{ padding: "10px 18px", background: C.primary, color: "white", border: "none", borderRadius: 8, fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Gửi yêu cầu liên kết</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
