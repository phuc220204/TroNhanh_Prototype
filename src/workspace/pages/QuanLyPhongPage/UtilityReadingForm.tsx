import { useState, useEffect } from "react";
import { X, Zap, Droplets, AlertCircle } from "lucide-react";
import { C, font } from "../../../shared/theme";
import type { Room } from "../../types/room";
import { getLatestReading, recordUtilityReading } from "../../services/billing-service";
import { toUserMessage } from "../../../shared/services/supabase-error";

interface UtilityReadingFormProps {
  room: Room | null;
  onClose: () => void;
  onSuccess?: () => void;
  isReadOnly?: boolean;
}

export function UtilityReadingForm({ room, onClose, onSuccess, isReadOnly }: UtilityReadingFormProps) {
  if (!room) return null;

  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [elecValue, setElecValue] = useState("");
  const [waterValue, setWaterValue] = useState("");
  const [lastElec, setLastElec] = useState<number | null>(null);
  const [lastWater, setLastWater] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const latestE = await getLatestReading(room.id, "Electricity");
        const latestW = await getLatestReading(room.id, "Water");
        if (latestE) setLastElec(Number(latestE.current_reading ?? latestE.value));
        if (latestW) setLastWater(Number(latestW.current_reading ?? latestW.value));
      } catch (err) {
        // Ignore fallback
      }
    };
    fetchLatest();
  }, [room.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!elecValue && !waterValue) {
      setErrorMsg("Vui lòng nhập ít nhất chỉ số điện hoặc chỉ số nước.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      if (elecValue) {
        await recordUtilityReading(room.id, "Electricity", period, Number(elecValue));
      }
      if (waterValue) {
        await recordUtilityReading(room.id, "Water", period, Number(waterValue));
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.white, borderRadius: 16, width: "100%", maxWidth: 440, padding: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
            Ghi chỉ số điện nước - Phòng {room.code}
          </h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={20} color={C.textSecondary} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: "#FDF2F0", border: "1px solid #F5C2B9", color: "#B5503C", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontFamily: font, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
              Kỳ ghi chỉ số (YYYY-MM)
            </label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
              <span>Chỉ số điện mới (kWh)</span>
              {lastElec !== null && <span style={{ color: C.textSecondary, fontWeight: 400 }}>Cụ: {lastElec}</span>}
            </label>
            <input
              type="number"
              placeholder={lastElec !== null ? `> ${lastElec}` : "Nhập chỉ số điện"}
              value={elecValue}
              onChange={(e) => setElecValue(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
              <span>Chỉ số nước mới (m³)</span>
              {lastWater !== null && <span style={{ color: C.textSecondary, fontWeight: 400 }}>Cũ: {lastWater}</span>}
            </label>
            <input
              type="number"
              placeholder={lastWater !== null ? `> ${lastWater}` : "Nhập chỉ số nước"}
              value={waterValue}
              onChange={(e) => setWaterValue(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 16px", background: "none", border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: font, fontSize: 13.5, color: C.textSecondary, cursor: "pointer" }}>Hủy</button>
            <button type="submit" disabled={loading || isReadOnly} style={{ padding: "10px 18px", background: C.primary, color: "white", border: "none", borderRadius: 8, fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: isReadOnly ? "not-allowed" : "pointer" }}>
              {loading ? "Đang lưu..." : "Lưu chỉ số"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
