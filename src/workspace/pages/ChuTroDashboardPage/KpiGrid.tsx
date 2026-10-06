import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";

export interface DashboardKpi {
  label: string;
  value: number | string;
  unit: string;
  hint?: string;
  /** Dòng phụ luôn hiện (vd. tên kỳ), không bị che như `hint`. */
  caption?: string;
  accent: string;
  Icon: LucideIcon;
  /** BR-012: `true` = mặc định ẩn, chỉ hiện khi bấm "Hiện số liệu ẩn". */
  secret: boolean;
  testId?: string;
}

interface KpiGridProps {
  kpis: DashboardKpi[];
  isRevealed: boolean;
  onToggleReveal: () => void;
  isMobile?: boolean;
}

/** Lưới "Chỉ số vận hành" + nút ẩn/hiện số liệu nhạy cảm (BR-012). */
export function KpiGrid({ kpis, isRevealed, onToggleReveal, isMobile }: KpiGridProps) {
  const toggle = (
    <button
      onClick={onToggleReveal}
      data-testid="dashboard-kpi-toggle"
      style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.primary, fontFamily: font, fontSize: isMobile ? 12 : 13, fontWeight: 700, cursor: "pointer" }}>
      {isRevealed ? <EyeOff size={isMobile ? 14 : 15} /> : <Eye size={isMobile ? 14 : 15} />}
      {isMobile ? (isRevealed ? "Ẩn số liệu" : "Hiện số liệu") : (isRevealed ? "Ẩn số liệu nhạy cảm" : "Hiện số liệu ẩn")}
    </button>
  );

  if (isMobile) {
    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Chỉ số vận hành</p>
          {toggle}
        </div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, marginBottom: 22 }}>
          {kpis.map(k => {
            const isSecret = k.secret && !isRevealed;
            return (
              <div key={k.label} data-testid={k.testId} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.md, padding: "13px 16px", minWidth: 120, flexShrink: 0 }}>
                <p style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: C.textSecondary, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</p>
                <span style={{ fontFamily: font, fontSize: 26, fontWeight: 900, color: k.accent, lineHeight: 1 }}>{isSecret ? "•••" : k.value}</span>
                {k.hint && <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: "5px 0 0" }}>{isSecret ? "••••" : k.hint}</p>}
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontFamily: font, fontSize: 13, fontWeight: 800, color: C.textSecondary, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Chỉ số vận hành</h2>
        {toggle}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12, marginBottom: 28 }}>
        {kpis.map(k => {
          const isSecret = k.secret && !isRevealed;
          const { Icon } = k;
          return (
            <div key={k.label} data-testid={k.testId} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</p>
                <span style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, lineHeight: 1 }}>
                  {isSecret ? "••••••" : k.value}
                  {!isSecret && k.unit && <span style={{ fontSize: 12, fontWeight: 500, color: C.textSecondary, marginLeft: 4 }}>{k.unit}</span>}
                </span>
                {k.hint && <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: "4px 0 0" }}>{isSecret ? "••••" : k.hint}</p>}
                {k.caption && <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: "4px 0 0" }}>{k.caption}</p>}
              </div>
              <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", color: k.accent }}>
                <Icon size={18} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
