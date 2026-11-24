import { C, font, radius } from "../../../../shared/theme";

/** Thẻ chọn một phương án (radio dạng thẻ) — dùng trong form dịch vụ. */
export function ChoiceCard({
  selected, disabled, onSelect, title, description, "data-testid": testId,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  "data-testid"?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      data-testid={testId}
      style={{
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: radius.sm,
        border: `1.5px solid ${selected ? C.primary : C.border}`,
        background: selected ? C.cream : C.white,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: font,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>{title}</div>
      <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 3, lineHeight: 1.45 }}>{description}</div>
    </button>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>{title}</div>
      {subtitle && <div style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}
