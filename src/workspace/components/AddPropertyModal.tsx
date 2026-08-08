import { useState } from "react";
import { C, font, radius } from "../../shared/theme";
import { ModalShell } from "../../shared/components/common/ModalShell";
import { Button } from "../../shared/components/common";
import { Field } from "../../shared/components/common/FormField";
import { AreaSelect } from "../../shared/components/common";
import { toUserMessage } from "../../shared/services/supabase-error";
import { createProperty } from "../services/property-service";

interface AddPropertyModalProps {
  onClose: () => void;
  /** Nhận id khu vừa tạo để caller chọn ngay khu đó. */
  onCreated: (propertyId: string) => void;
}

/**
 * Tạo khu trọ mới.
 *
 * Trước khi có modal này, KHÔNG có đường nào tạo khu trọ bằng tay: không service,
 * không UI. Nút "Tạo khu trọ đầu tiên" ở dashboard chỉ điều hướng sang
 * `/chu-tro/quan-ly-phong`, nơi cũng không có nút tạo khu — vòng lặp chết. Cách
 * duy nhất có khu là bấm "Khởi tạo dữ liệu mẫu", tức là chủ trọ thật không dùng
 * được module SaaS.
 *
 * Cố ý CHỈ hỏi ba thông tin nhận dạng. Đơn giá điện/nước/dịch vụ và tài khoản
 * ngân hàng nhập ở tab **Cài đặt khu trọ** — nơi có validate ("> 0") và có xem
 * trước mã VietQR. Nhồi hết vào đây thì bước đầu tiên của người dùng mới thành
 * một form dài, và họ sẽ điền số bừa cho xong.
 */
export function AddPropertyModal({ onClose, onCreated }: AddPropertyModalProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState<string>("");
  const [area, setArea] = useState<{ provinceCode: number | null; wardCode: number | null }>({
    provinceCode: null,
    wardCode: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = name.trim().length >= 2 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setErrorMsg("");
    try {
      setSubmitting(true);
      const id = await createProperty({
        name,
        address,
        district,
        provinceCode: area.provinceCode,
        wardCode: area.wardCode,
      });
      onCreated(id);
    } catch (err: unknown) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title="Tạo khu trọ mới"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button
            variant="primary"
            requiresWrite
            loading={submitting}
            disabled={!canSubmit}
            onClick={handleSubmit}
            data-testid="add-property-submit"
          >
            Tạo khu trọ
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0, lineHeight: 1.55 }}>
          Khu trọ là nơi chứa các phòng của bạn. Sau khi tạo, bạn thêm phòng vào khu
          và nhập đơn giá điện nước ở tab <strong>Cài đặt khu trọ</strong>.
        </p>

        {errorMsg && (
          <div
            data-testid="add-property-error"
            style={{ background: C.white, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.sm, padding: "10px 14px", fontFamily: font, fontSize: 13, fontWeight: 600 }}
          >
            {errorMsg}
          </div>
        )}

        <Field
          label="Tên khu trọ *"
          data-testid="add-property-name"
          value={name}
          onChange={setName}
          placeholder="VD: Nhà trọ Hoàng Diệu"
        />

        <Field
          label="Địa chỉ"
          data-testid="add-property-address"
          value={address}
          onChange={setAddress}
          placeholder="VD: 123 Hoàng Diệu, Phường 9"
        />

        {/* Khu vực dùng để ghép nối khu trọ với tin nhu cầu (`scoreDemandMatch`),
            nên phải lưu MÃ chứ không chỉ tên. */}
        <AreaSelect
          value={area}
          onChange={(a) => {
            setArea({ provinceCode: a.provinceCode, wardCode: a.wardCode });
            setDistrict(a.wardName ?? "");
          }}
          testIdPrefix="add-property-area"
        />
      </div>
    </ModalShell>
  );
}
