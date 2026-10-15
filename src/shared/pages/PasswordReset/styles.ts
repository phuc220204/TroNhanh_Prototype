import type React from "react";
import { C, font, radius } from "../../theme";

export const labelStyle: React.CSSProperties = { fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary };

export const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", fontFamily: font, fontSize: 14, color: C.textPrimary,
  padding: "11px 14px", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: "none",
};
