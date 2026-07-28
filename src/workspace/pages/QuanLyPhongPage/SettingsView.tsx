import { useState } from "react";
import { Settings, Save, AlertCircle } from "lucide-react";
import { C, font } from "../../../shared/theme";
import type { Property } from "../../types/room";
import { updatePropertySettings } from "../../services/property-service";
import { toUserMessage } from "../../../shared/services/supabase-error";

interface SettingsViewProps {
  property: Property | null;
  mobile?: boolean;
  isReadOnly?: boolean;
  onRefreshData?: () => void;
}

export function SettingsView({ property, mobile, isReadOnly, onRefreshData }: SettingsViewProps) {
  const [elecPrice, setElecPrice] = useState(String(property?.electricity_unit_price || 3500));
  const [waterPrice, setWaterPrice] = useState(String(property?.water_unit_price || 15000));
  const [serviceFee, setServiceFee] = useState(String(property?.service_fee || 100000));
  const [bankName, setBankName] = useState(property?.bank_name || "MB");
  const [accountNum, setAccountNum] = useState(property?.bank_account_number || "");
  const [accountName, setAccountName] = useState(property?.bank_account_name || "");

  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || isReadOnly) return;

    try {
      setSaving(true);
      await updatePropertySettings(property.id, {
        electricity_unit_price: Number(elecPrice) || 3500,
        water_unit_price: Number(waterPrice) || 15000,
        service_fee: Number(serviceFee) || 100000,
        bank_name: bankName,
        bank_account_number: accountNum,
        bank_account_name: accountName,
      });

      setToastMsg("Đã cập nhật cấu hình khu trọ thành công!");
      setTimeout(() => setToastMsg(""), 3000);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setToastMsg("Lỗi khi lưu cấu hình: " + toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: mobile ? 16 : 22, maxWidth: 640 }}>
      {toastMsg && (
        <div style={{ background: "#E8F5E1", border: "1px solid #B4E1A2", color: "#2E5B1E", padding: "10px 16px", borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {toastMsg}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>
          Cấu hình khu trọ & Đơn giá
        </h2>
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>
          Cài đặt đơn giá điện, nước, dịch vụ và thông tin tài khoản nhận tiền cho {property?.name || "khu trọ"}.
        </p>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
              Đơn giá điện (VND/kWh)
            </label>
            <input
              type="number"
              value={elecPrice}
              onChange={(e) => setElecPrice(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
              Đơn giá nước (VND/m³)
            </label>
            <input
              type="number"
              value={waterPrice}
              onChange={(e) => setWaterPrice(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
              Phí dịch vụ (VND/tháng)
            </label>
            <input
              type="number"
              value={serviceFee}
              onChange={(e) => setServiceFee(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          <h3 style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, marginBottom: 12 }}>
            Tài khoản ngân hàng nhận tiền thuê
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                Ngân hàng
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="VD: MB, Vietcombank"
                style={{ width: "100%", padding: "9px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                Số tài khoản
              </label>
              <input
                type="text"
                value={accountNum}
                onChange={(e) => setAccountNum(e.target.value)}
                placeholder="VD: 0901234567"
                style={{ width: "100%", padding: "9px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
                Tên chủ tài khoản
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="VD: NGUYEN VAN A"
                style={{ width: "100%", padding: "9px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button
            type="submit"
            disabled={saving || isReadOnly}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 22px",
              background: isReadOnly ? C.border : C.primary,
              color: isReadOnly ? C.textSecondary : "white",
              border: "none",
              borderRadius: 8,
              fontFamily: font,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: isReadOnly ? "not-allowed" : "pointer",
            }}
          >
            <Save size={16} /> {saving ? "Đang lưu..." : "Lưu cài đặt"}
          </button>
        </div>
      </form>
    </div>
  );
}
