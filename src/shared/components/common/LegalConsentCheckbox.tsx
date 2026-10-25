import { C, font } from "../../theme";
import { LEGAL_ROUTES } from "../../constants/legal";

export interface LegalConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** "register": Điều khoản + Bảo mật. "payment": Điều khoản + Hoàn tiền. */
  variant: "register" | "payment";
  disabled?: boolean;
  "data-testid"?: string;
}

/**
 * Ô đồng ý chính sách — bắt buộc tick trước khi đăng ký hoặc mở payOS.
 * Link mở tab mới để người dùng không mất dữ liệu đang nhập trong form.
 */
export function LegalConsentCheckbox({ checked, onChange, variant, disabled, "data-testid": testId }: LegalConsentCheckboxProps) {
  const linkStyle = { color: C.primary, fontWeight: 700 };
  const second = variant === "register"
    ? { to: LEGAL_ROUTES.privacy, label: "Chính sách bảo mật" }
    : { to: LEGAL_ROUTES.refund, label: "Chính sách hoàn tiền" };

  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontFamily: font, fontSize: 13, color: C.textSecondary, lineHeight: 1.55, cursor: disabled ? "not-allowed" : "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        data-testid={testId}
        style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: C.primary }}
      />
      <span>
        Tôi đã đọc và đồng ý với{" "}
        <a href={`#${LEGAL_ROUTES.terms}`} target="_blank" rel="noopener noreferrer" style={linkStyle}>Điều khoản sử dụng</a>
        {" "}và{" "}
        <a href={`#${second.to}`} target="_blank" rel="noopener noreferrer" style={linkStyle}>{second.label}</a>
        {" "}của Trọ Nhanh.
      </span>
    </label>
  );
}
