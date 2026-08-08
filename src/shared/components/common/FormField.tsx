import { C, font } from "../../theme";

/* ══════════════════════════════════════════
   SHARED FORM FIELDS
   Label + input/textarea, và select field.
   Dùng chung trong các modal landlord.
══════════════════════════════════════════ */
const fieldBase = { fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", boxSizing: "border-box" as const, background: C.white, outline: "none" };

/**
 * `data-testid` đặt trên chính ô nhập, không phải trên `<label>` bọc ngoài.
 * Codebase có zero `className` (§8.1) nên testid là selector E2E duy nhất; đặt
 * nó ở label thì `fill()` không dùng được vì label không phải input.
 */
export function Field({ label, placeholder, textarea, rows = 2, value, onChange, "data-testid": testId }: { label: string; placeholder?: string; textarea?: boolean; rows?: number; value?: string; onChange?: (val: string) => void; "data-testid"?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{label}</span>
      {textarea
        ? <textarea data-testid={testId} placeholder={placeholder} value={value} onChange={e => onChange?.(e.target.value)} rows={rows} style={{ ...fieldBase, resize: "vertical" }} />
        : <input data-testid={testId} placeholder={placeholder} value={value} onChange={e => onChange?.(e.target.value)} style={fieldBase} />}
    </label>
  );
}

export function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{label}</span>
      <select style={fieldBase}>{options.map(o => <option key={o}>{o}</option>)}</select>
    </label>
  );
}
