import { useState, useEffect } from "react";
import { C, font } from "../../../shared/theme";
import { ModalShell } from "../../../shared/components/common/ModalShell";
import { Field } from "../../../shared/components/common/FormField";
import { logError, toUserMessage } from "../../../shared/services/supabase-error";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useCanWrite, useWriteBlockReason } from "../../../shared/contexts/SubscriptionContext";
import { supabase } from "../../../shared/supabaseClient";
import { PrimaryBtn, GhostBtn } from "./atoms";

/**
 * Thêm phòng mới vào một khu.
 *
 * BR-015: tự đọc `useCanWrite()`, không nhận prop `isReadOnly` (xem ghi chú
 * cùng loại ở `UtilityModal`).
 * BR-002: 4 trạng thái phòng hợp lệ, không có "Repairing".
 */
export function AddRoomModal({ onClose, properties, onSave }: { onClose: () => void; properties: any[]; onSave: () => void }) {
  const { user } = useAuth();
  const canWrite = useCanWrite();
  const blockReason = useWriteBlockReason();

  const [propId, setPropId] = useState(properties[0]?.id || "");
  const [code, setCode] = useState("");
  const [floor, setFloor] = useState("");
  const [area, setArea] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("Available");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (properties.length > 0 && !propId) {
      setPropId(properties[0].id);
    }
  }, [properties]);

  const handleSave = async () => {
    if (!canWrite) return;
    setFormError("");

    if (!propId) {
      setFormError("Vui lòng chọn khu trọ.");
      return;
    }
    if (!code || !area || !price) {
      setFormError("Vui lòng nhập Mã phòng, Diện tích và Giá thuê.");
      return;
    }

    try {
      setSaving(true);
      const cleanPrice = Number(price.replace(/\D/g, ""));
      const cleanArea = Number(area.replace(/\D/g, ""));
      const cleanFloor = Number(floor) || 1;

      const { error } = await supabase
        .from("rooms")
        .insert({
          property_id: propId,
          owner_id: user?.id,
          room_code: code,
          floor: cleanFloor,
          area: cleanArea,
          price: cleanPrice,
          status,
          description: notes
        });

      if (error) throw error;
      onSave();
      onClose();
    } catch (e: unknown) {
      logError("ChuTroDashboardPage.AddRoomModal.handleSave", e);
      setFormError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Thêm phòng mới" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn disabled={saving} requiresWrite onClick={handleSave} data-testid="add-room-save-btn">{saving ? "Đang lưu..." : "Lưu phòng"}</PrimaryBtn></>}>
      {!canWrite && (
        <div data-testid="add-room-readonly-banner" style={{ background: "#FCECEC", color: C.repairing, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          ⚠️ {blockReason}
        </div>
      )}
      {formError && (
        <div data-testid="add-room-form-error" style={{ background: "#FCECEC", color: C.error, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {formError}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Chọn khu trọ *</span>
          <select value={propId} onChange={e => setPropId(e.target.value)} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <Field label="Mã phòng *" value={code} onChange={setCode} placeholder="VD: P101" />
        <Field label="Số tầng (nhập số)" value={floor} onChange={setFloor} placeholder="VD: 1" />
        <Field label="Diện tích (m²)" value={area} onChange={setArea} placeholder="VD: 25" />
        <Field label="Giá thuê (đ/tháng)" value={price} onChange={setPrice} placeholder="VD: 3.200.000" />

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Trạng thái ban đầu</span>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}>
            <option value="Available">Trống</option>
            <option value="Rented">Đang thuê</option>
            <option value="Deposited">Đã cọc</option>
            <option value="Hidden">Đã ẩn</option>
          </select>
        </label>

        <Field label="Ghi chú nội bộ" value={notes} onChange={setNotes} placeholder="Ghi chú về phòng này" textarea rows={3} />
      </div>
    </ModalShell>
  );
}
