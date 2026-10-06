import { useState } from "react";
import { Save, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "../../../shared/contexts/ToastContext";
import { C, font } from "../../../shared/theme";
import { ModalShell } from "../../../shared/components/common/ModalShell";
import { Button, VietQRBlock } from "../../../shared/components/common";
import { VIETNAM_BANKS } from "../../../shared/utils/vietqr-banks";
import type { Property } from "../../types/room";
import {
  updatePropertySettings,
  softDeleteProperty,
  countRentedRooms,
} from "../../services/property-service";
import { toUserMessage } from "../../../shared/services/supabase-error";

interface SettingsViewProps {
  property: Property | null;
  mobile?: boolean;
  isReadOnly?: boolean;
  onRefreshData?: () => void;
  /** Gọi sau khi xóa khu thành công — trang cha báo thành công và chuyển tab. */
  onDeleted?: (propertyName: string) => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontFamily: font,
  fontSize: 14,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: font,
  fontSize: 12.5,
  fontWeight: 700,
  color: C.textPrimary,
  marginBottom: 4,
};

/**
 * Kiểm tra dữ liệu cấu hình khu TRƯỚC khi ghi.
 *
 * Vì sao tách thành hàm thuần: bản cũ dùng `Number(elecPrice) || 3500`, nghĩa là
 * nhập `0` (hoặc chữ) thì **âm thầm** biến thành 3500đ/kWh và lưu luôn — chủ trọ
 * tin là đã đặt giá 0 nhưng hóa đơn tính 3.500. Sai kiểu đó không hiện ra ở đâu
 * cả cho tới lúc người ở thắc mắc hóa đơn.
 */
export function validatePropertySettings(input: {
  elecPrice: string;
  waterPrice: string;
  serviceFee: string;
  accountNumber: string;
  bankCode: string;
}): string | null {
  const elec = Number(input.elecPrice);
  const water = Number(input.waterPrice);
  const service = Number(input.serviceFee);

  // Ô trống phải báo riêng: `Number("")` là 0, nên phí dịch vụ để trống sẽ lọt
  // qua kiểm "không âm" và âm thầm lưu thành 0đ.
  if (input.elecPrice.trim() === "") return "Vui lòng nhập đơn giá điện.";
  if (input.waterPrice.trim() === "") return "Vui lòng nhập đơn giá nước.";
  if (input.serviceFee.trim() === "") {
    return "Vui lòng nhập phí dịch vụ (nhập 0 nếu khu không thu phí).";
  }

  if (!Number.isFinite(elec) || elec <= 0) {
    return "Đơn giá điện phải là một số lớn hơn 0.";
  }
  if (!Number.isFinite(water) || water <= 0) {
    return "Đơn giá nước phải là một số lớn hơn 0.";
  }
  if (!Number.isFinite(service) || service < 0) {
    return "Phí dịch vụ phải là một số không âm (nhập 0 nếu khu không thu phí).";
  }

  const account = input.accountNumber.trim();
  if (account !== "") {
    if (!/^\d+$/.test(account)) {
      return "Số tài khoản chỉ được chứa chữ số, không có dấu cách hay ký tự khác.";
    }
    if (account.length < 6 || account.length > 19) {
      return "Số tài khoản phải có từ 6 đến 19 chữ số.";
    }
    // Có STK mà không có ngân hàng thì hóa đơn không sinh được VietQR — và chỗ
    // duy nhất phát hiện ra là khi người ở mở hóa đơn ra và không thấy mã nào.
    if (input.bankCode.trim() === "") {
      return "Đã nhập số tài khoản thì phải chọn ngân hàng để tạo được mã VietQR.";
    }
  }

  return null;
}

/** Chưa khai ⇒ ô trống (hiện "Chưa cấu hình"), KHÔNG điền một mức giá bịa ra. */
const priceToInput = (value: number | null | undefined): string =>
  value === null || value === undefined ? "" : String(value);

/**
 * ⚠️ State form khởi tạo từ `property` MỘT lần. Nơi render PHẢI đặt
 * `key={property.id}` — nếu không, đổi khu vẫn giữ giá/STK của khu cũ và bấm
 * "Lưu" sẽ ghi đè chúng lên khu mới.
 */
export function SettingsView({ property, mobile, isReadOnly, onRefreshData, onDeleted }: SettingsViewProps) {
  const [elecPrice, setElecPrice] = useState(priceToInput(property?.electricity_unit_price));
  const [waterPrice, setWaterPrice] = useState(priceToInput(property?.water_unit_price));
  const [serviceFee, setServiceFee] = useState(priceToInput(property?.service_fee));
  const [bankName, setBankName] = useState(property?.bank_name || "");
  const [accountNum, setAccountNum] = useState(property?.bank_account_number || "");
  const [accountName, setAccountName] = useState(property?.bank_account_name || "");

  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const [errorMsg, setErrorMsg] = useState("");

  // ── BR-011: xóa khu ────────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rentedCount, setRentedCount] = useState(0);
  const [checkingRented, setCheckingRented] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || isReadOnly) return;

    setErrorMsg("");

    const validationError = validatePropertySettings({
      elecPrice, waterPrice, serviceFee, accountNumber: accountNum, bankCode: bankName,
    });
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    try {
      setSaving(true);
      await updatePropertySettings(property.id, {
        electricity_unit_price: Number(elecPrice),
        water_unit_price: Number(waterPrice),
        service_fee: Number(serviceFee),
        bank_name: bankName.trim(),
        bank_account_number: accountNum.trim(),
        bank_account_name: accountName.trim(),
      });

      showToast("Đã lưu cấu hình khu trọ.", { testId: "settings-success" });
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = async () => {
    if (!property || isReadOnly) return;
    setDeleteError("");
    setRentedCount(0);
    setCheckingRented(true);
    setConfirmOpen(true);
    // Chỉ để hiển thị. Guard thật nằm trong RPC `soft_delete_property`.
    try {
      const count = await countRentedRooms(property.id);
      setRentedCount(count);
    } catch (err: unknown) {
      // Không kẹt modal ở "Đang kiểm tra…": báo lỗi, vẫn cho bấm xóa vì RPC
      // tự chặn khi còn phòng đang thuê.
      setDeleteError(`Chưa kiểm tra được tình trạng phòng: ${toUserMessage(err)}`);
    } finally {
      setCheckingRented(false);
    }
  };

  const handleDelete = async () => {
    if (!property) return;
    setDeleteError("");
    try {
      setDeleting(true);
      await softDeleteProperty(property.id);
      setConfirmOpen(false);
      showToast(`Đã xóa khu "${property.name}".`);
      if (onDeleted) onDeleted(property.name);
      else if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      setDeleteError(toUserMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  // Theo giá trị ĐÃ LƯU của khu, không theo ô đang gõ.
  const missingSettings = [
    property?.electricity_unit_price == null && "đơn giá điện",
    property?.water_unit_price == null && "đơn giá nước",
    property?.service_fee == null && "phí dịch vụ",
    !property?.bank_account_number && "tài khoản nhận tiền",
  ].filter((item): item is string => typeof item === "string");

  const roomCount = property?.rooms?.length ?? 0;
  const gridColumns = mobile ? "1fr" : "1fr 1fr 1fr";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: mobile ? 16 : 22 }}>
        {errorMsg && (
          <div data-testid="settings-error" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error, padding: "10px 16px", borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            {errorMsg}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>
            Cấu hình khu trọ &amp; Đơn giá
          </h2>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>
            Cài đặt đơn giá điện, nước, dịch vụ và tài khoản nhận tiền cho {property?.name || "khu trọ"}.
          </p>
        </div>

        {missingSettings.length > 0 && (
          <div data-testid="settings-not-configured" style={{ background: C.warningBg, border: `1px solid ${C.warningBorder}`, color: C.textPrimary, padding: "10px 16px", borderRadius: 10, fontFamily: font, fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
            <strong>Chưa cấu hình:</strong> {missingSettings.join(", ")}. Hãy nhập và bấm
            “Lưu cài đặt” để hóa đơn tính đúng tiền và có mã VietQR.
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12 }}>
            <div>
              <label style={labelStyle} htmlFor="setting-elec-price">Đơn giá điện (VND/kWh) *</label>
              <input
                id="setting-elec-price"
                data-testid="setting-elec-price"
                type="number"
                min={1}
                value={elecPrice}
                placeholder="Chưa cấu hình"
                onChange={(e) => setElecPrice(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="setting-water-price">Đơn giá nước (VND/m³) *</label>
              <input
                id="setting-water-price"
                data-testid="setting-water-price"
                type="number"
                min={1}
                value={waterPrice}
                placeholder="Chưa cấu hình"
                onChange={(e) => setWaterPrice(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="setting-service-fee">Phí dịch vụ (VND/tháng)</label>
              <input
                id="setting-service-fee"
                data-testid="setting-service-fee"
                type="number"
                min={0}
                value={serviceFee}
                placeholder="Chưa cấu hình"
                onChange={(e) => setServiceFee(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <h3 style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
              Tài khoản ngân hàng nhận tiền thuê
            </h3>
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "0 0 12px", lineHeight: 1.45 }}>
              Đây là tài khoản sinh mã VietQR trên hóa đơn. Nền tảng không giữ tiền thuê —
              người ở chuyển khoản thẳng cho bạn.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12 }}>
              <div>
                <label style={labelStyle} htmlFor="setting-bank-name">Ngân hàng</label>
                {/*
                  Dropdown chứ không phải ô text: mã VietQR cần mã BIN 6 số của
                  ngân hàng. Ô text tự do ("mbbank", "Ngân hàng Quân Đội") lưu vẫn
                  thành công nhưng hóa đơn sau đó không sinh được QR nào.
                */}
                <select
                  id="setting-bank-name"
                  data-testid="setting-bank-name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">— Chọn ngân hàng —</option>
                  {VIETNAM_BANKS.map((b) => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle} htmlFor="setting-account-number">Số tài khoản</label>
                <input
                  id="setting-account-number"
                  data-testid="setting-account-number"
                  type="text"
                  inputMode="numeric"
                  value={accountNum}
                  onChange={(e) => setAccountNum(e.target.value)}
                  placeholder="VD: 0901234567"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="setting-account-name">Tên chủ tài khoản</label>
                <input
                  id="setting-account-name"
                  data-testid="setting-account-name"
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="VD: NGUYEN VAN A"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Xem trước mã QR ngay tại đây để chủ trọ quét thử bằng app ngân
                hàng TRƯỚC khi hóa đơn đầu tiên đến tay người ở. */}
            {accountNum.trim() !== "" && (
              <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
                <VietQRBlock
                  bankCode={bankName}
                  accountNumber={accountNum}
                  accountName={accountName}
                  purpose={`Tien phong ${property?.name ?? ""}`}
                  size={160}
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <Button
              type="submit"
              variant="primary"
              requiresWrite
              loading={saving}
              icon={<Save size={16} />}
              data-testid="settings-save-btn"
            >
              {saving ? "Đang lưu..." : "Lưu cài đặt"}
            </Button>
          </div>
        </form>
      </div>

      {/* ── BR-011: Vùng nguy hiểm ─────────────────────────────────────────── */}
      <div style={{ background: C.white, border: `1px solid ${C.error}`, borderRadius: 16, padding: mobile ? 16 : 22 }}>
        <h3 style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.error, margin: "0 0 4px" }}>
          Vùng nguy hiểm
        </h3>
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 14px", lineHeight: 1.5 }}>
          Xóa khu trọ sẽ ẩn khu này cùng toàn bộ {roomCount} phòng của nó khỏi hệ thống.
          Không xóa được khi vẫn còn phòng đang cho thuê.
        </p>
        <Button
          variant="danger"
          requiresWrite
          icon={<Trash2 size={15} />}
          onClick={openDeleteConfirm}
          data-testid="delete-property-btn"
        >
          Xóa khu trọ này
        </Button>
      </div>

      {confirmOpen && (
        <ModalShell
          title="Xóa khu trọ?"
          onClose={() => setConfirmOpen(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Hủy</Button>
              <Button
                variant="danger"
                requiresWrite
                loading={deleting}
                disabled={checkingRented || rentedCount > 0}
                onClick={handleDelete}
                data-testid="confirm-delete-property-btn"
              >
                {deleting ? "Đang xóa..." : "Xóa khu trọ"}
              </Button>
            </>
          }
        >
          {deleteError && (
            <div data-testid="delete-property-error" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              {deleteError}
            </div>
          )}

          {checkingRented ? (
            <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: 0 }}>
              Đang kiểm tra tình trạng phòng...
            </p>
          ) : rentedCount > 0 ? (
            <div data-testid="delete-blocked-notice" style={{ display: "flex", gap: 12, alignItems: "flex-start", background: C.errorBg, borderRadius: 10, padding: "12px 14px" }}>
              <AlertTriangle size={20} color={C.error} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, margin: 0, lineHeight: 1.5 }}>
                Khu <strong>{property?.name}</strong> còn <strong>{rentedCount} phòng đang cho thuê</strong>.
                Hãy kết thúc hợp đồng của các phòng đó trước khi xóa khu.
              </p>
            </div>
          ) : (
            <p style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, margin: 0, lineHeight: 1.55 }}>
              Bạn sắp xóa khu <strong>{property?.name}</strong> cùng {roomCount} phòng thuộc khu này.
              Dữ liệu hóa đơn và hợp đồng cũ vẫn được giữ lại trong hệ thống, nhưng khu sẽ
              không còn xuất hiện ở màn quản lý. Bạn có chắc không?
            </p>
          )}
        </ModalShell>
      )}
    </div>
  );
}
