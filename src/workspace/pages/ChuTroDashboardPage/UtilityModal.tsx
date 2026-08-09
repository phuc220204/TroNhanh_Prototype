import { useState, useEffect } from "react";
import { C, font } from "../../../shared/theme";
import { ModalShell } from "../../../shared/components/common/ModalShell";
import { Field } from "../../../shared/components/common/FormField";
import { logError, toUserMessage } from "../../../shared/services/supabase-error";
import { useCanWrite, useWriteBlockReason } from "../../../shared/contexts/SubscriptionContext";
import { getRoomsByProperty } from "../../services/room-service";
import { getLatestReading, recordUtilityReading } from "../../services/billing-service";
import { PrimaryBtn, GhostBtn } from "./atoms";

/**
 * Ghi nhanh chỉ số điện + nước cho một phòng.
 *
 * BR-015: modal TỰ đọc `useCanWrite()` thay vì nhận prop `isReadOnly`. Trước
 * đây trạng thái khóa được truyền xuống bằng prop — nghĩa là chỗ nào quên
 * truyền thì modal mở khóa, và không có gì báo. Tự đọc thì không thể quên.
 */
export function UtilityModal({ onClose, properties, onSave }: { onClose: () => void; properties: any[]; onSave: () => void }) {
  const canWrite = useCanWrite();
  const blockReason = useWriteBlockReason();

  const [propId, setPropId] = useState(properties[0]?.id || "");
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomId, setRoomId] = useState("");
  const [electric, setElectric] = useState("");
  const [water, setWater] = useState("");
  const [saving, setSaving] = useState(false);
  const [previousElec, setPreviousElec] = useState(0);
  const [previousWater, setPreviousWater] = useState(0);
  const [formError, setFormError] = useState("");

  const selectedProp = properties.find(p => p.id === propId);
  const elecPrice = Number(selectedProp?.electricity_unit_price) || 3500;
  const waterPrice = Number(selectedProp?.water_unit_price) || 15000;

  useEffect(() => {
    if (properties.length > 0 && !propId) {
      setPropId(properties[0].id);
    }
  }, [properties]);

  useEffect(() => {
    if (!propId) return;
    const fetchRooms = async () => {
      try {
        const data = await getRoomsByProperty(propId);
        setRooms(data || []);
        if (data && data.length > 0) {
          setRoomId(data[0].id);
        } else {
          setRoomId("");
        }
      } catch (e) {
        logError("ChuTroDashboardPage.UtilityModal.fetchRooms", e);
      }
    };
    fetchRooms();
  }, [propId]);

  useEffect(() => {
    if (!roomId) {
      setPreviousElec(0);
      setPreviousWater(0);
      return;
    }
    const fetchPrevious = async () => {
      try {
        const elec = await getLatestReading(roomId, "Electricity");
        const wat = await getLatestReading(roomId, "Water");
        setPreviousElec(elec?.value ? Number(elec.value) : 0);
        setPreviousWater(wat?.value ? Number(wat.value) : 0);
      } catch (e) {
        logError("ChuTroDashboardPage.UtilityModal.fetchPrevious", e);
      }
    };
    fetchPrevious();
  }, [roomId]);

  const elecDiff = electric ? Math.max(0, Number(electric) - previousElec) : 0;
  const waterDiff = water ? Math.max(0, Number(water) - previousWater) : 0;
  const elecCost = elecDiff * elecPrice;
  const waterCost = waterDiff * waterPrice;

  const handleSave = async () => {
    if (!canWrite) return;
    setFormError("");

    if (!roomId) {
      setFormError("Vui lòng chọn phòng trọ.");
      return;
    }
    if (!electric || !water) {
      setFormError("Vui lòng điền cả chỉ số điện và chỉ số nước.");
      return;
    }

    const currElec = Number(electric);
    const currWater = Number(water);

    if (currElec < previousElec) {
      setFormError("Chỉ số điện mới phải lớn hơn hoặc bằng chỉ số cũ.");
      return;
    }
    if (currWater < previousWater) {
      setFormError("Chỉ số nước mới phải lớn hơn hoặc bằng chỉ số cũ.");
      return;
    }

    try {
      setSaving(true);
      const period = new Date().toISOString().substring(0, 7);
      await recordUtilityReading(roomId, "Electricity", period, currElec);
      await recordUtilityReading(roomId, "Water", period, currWater);
      onSave();
      onClose();
    } catch (err: unknown) {
      logError("ChuTroDashboardPage.UtilityModal.handleSave", err);
      setFormError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Ghi điện nước nhanh" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn disabled={saving} requiresWrite onClick={handleSave} data-testid="utility-save-btn">{saving ? "Đang lưu..." : "Lưu chỉ số"}</PrimaryBtn></>}>
      {!canWrite && (
        <div data-testid="utility-readonly-banner" style={{ background: "#FCECEC", color: C.repairing, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          ⚠️ {blockReason}
        </div>
      )}
      {formError && (
        <div data-testid="utility-form-error" style={{ background: "#FCECEC", color: C.error, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {formError}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Chọn khu trọ *</span>
          <select value={propId} onChange={e => setPropId(e.target.value)} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Chọn phòng *</span>
          <select value={roomId} onChange={e => setRoomId(e.target.value)} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}>
            {rooms.length === 0 && <option value="">Không có phòng nào</option>}
            {rooms.map(r => <option key={r.id} value={r.id}>{r.room_code}</option>)}
          </select>
        </label>
      </div>

      {roomId && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "0 0 6px" }}>Chỉ số điện cũ: <strong>{previousElec} kWh</strong></p>
            <Field label="Chỉ số điện mới *" value={electric} onChange={setElectric} placeholder="VD: 1280" />
            {electric && (
              <p style={{ fontFamily: font, fontSize: 11, color: C.primary, margin: "4px 0 0", fontWeight: 600 }}>
                Tiêu thụ: {elecDiff} kWh ({elecPrice.toLocaleString("vi-VN")}đ/kWh) = {elecCost.toLocaleString("vi-VN")}đ
              </p>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "0 0 6px" }}>Chỉ số nước cũ: <strong>{previousWater} m³</strong></p>
            <Field label="Chỉ số nước mới *" value={water} onChange={setWater} placeholder="VD: 42" />
            {water && (
              <p style={{ fontFamily: font, fontSize: 11, color: C.primary, margin: "4px 0 0", fontWeight: 600 }}>
                Tiêu thụ: {waterDiff} m³ ({waterPrice.toLocaleString("vi-VN")}đ/m³) = {waterCost.toLocaleString("vi-VN")}đ
              </p>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
}
