import { C, font } from "../../theme";

/* ══════════════════════════════════════════
   SHARED FORM FIELDS
   Label + input/textarea, và select field.
   Dùng chung trong các modal landlord.
══════════════════════════════════════════ */
const fieldBase = { fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", boxSizing: "border-box" as const, background: C.white, outline: "none" };

export function Field({ label, placeholder, textarea, rows = 2 }: { label: string; placeholder?: string; textarea?: boolean; rows?: number }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{label}</span>
      {textarea
        ? <textarea placeholder={placeholder} rows={rows} style={{ ...fieldBase, resize: "vertical" }} />
        : <input placeholder={placeholder} style={fieldBase} />}
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
