import { C, font, radius } from "../../../../shared/theme";

const inputBase: React.CSSProperties = {
  width: "100%", padding: "9px 12px", fontFamily: font, fontSize: 14, color: C.textPrimary,
  border: `1px solid ${C.border}`, borderRadius: radius.sm, outline: "none", boxSizing: "border-box", background: C.white,
};

/** Ô nhập có nhãn nhỏ phía trên (text / date). */
export function TextInput({ label, value, onChange, type = "text", placeholder, maxLength, inputMode, invalid, testId }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "tel";
  placeholder?: string;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  invalid?: boolean;
  testId?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: font, fontSize: 12, fontWeight: 600, color: C.textSecondary, minWidth: 0 }}>
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputBase, borderColor: invalid ? C.error : C.border }}
        data-testid={testId}
      />
    </label>
  );
}

/** Công tắc bật/tắt kèm mô tả (kiểu "Đã đăng ký tạm trú"). */
export function Toggle({ label, description, checked, onChange, testId }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      data-testid={testId}
      style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%", textAlign: "left", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: radius.md, background: C.bg, cursor: "pointer", fontFamily: font }}
    >
      <span aria-hidden style={{ flexShrink: 0, width: 38, height: 22, borderRadius: 999, background: checked ? C.success : C.border, position: "relative", transition: "background 0.15s" }}>
        <span style={{ position: "absolute", top: 3, left: checked ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: C.white, transition: "left 0.15s" }} />
      </span>
      <span>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>{label}</span>
        <span style={{ display: "block", fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{description}</span>
      </span>
    </button>
  );
}

/** Khung một nhóm trường. */
export function ProfileSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, padding: 14, display: "flex", flexDirection: "column", gap: 10, background: C.white }}>
      <div>
        <div style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary }}>{title}</div>
        {subtitle && <div style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}

export const twoColumns: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 };
