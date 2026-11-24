import { C, font, radius } from "../../../../shared/theme";

/** Khung một phần của form lập hóa đơn: tiêu đề có vạch nhấn + mô tả ngắn. */
export function SectionCard({ title, subtitle, children, testId }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <section data-testid={testId} style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, padding: 14, background: C.white, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ borderLeft: `3px solid ${C.primary}`, paddingLeft: 8 }}>
        <div style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary }}>{title}</div>
        {subtitle && <div style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, marginTop: 2, lineHeight: 1.45 }}>{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}
