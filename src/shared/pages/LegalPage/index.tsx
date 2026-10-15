import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { C, font, radius, space } from "../../theme";
import { useBreakpoint } from "../../components/useBreakpoint";
import { PublicNavbar } from "../../components/PublicNavbar";
import { LEGAL_ROUTES, LEGAL_VERSION, SUPPORT_EMAIL, type LegalDocKind } from "../../constants/legal";
import { LEGAL_DOCS } from "./content";

const DOC_ORDER: LegalDocKind[] = ["terms", "privacy", "refund"];

function formatEffectiveDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN");
}

/** Một khung chung cho 3 trang chính sách; nội dung ở `content.ts`. */
function LegalPage({ kind }: { kind: LegalDocKind }) {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const doc = LEGAL_DOCS[kind];

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [kind]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicNavbar onSearch={() => navigate("/tim-phong")} />

      <main
        data-testid={`legal-page-${kind}`}
        style={{ flex: 1, width: "100%", maxWidth: 780, margin: "0 auto", padding: isMobile ? `${space[6]}px ${space[4]}px ${space[10]}px` : `${space[10]}px ${space[8]}px 64px`, boxSizing: "border-box", fontFamily: font }}
      >
        <nav aria-label="Các chính sách" style={{ display: "flex", flexWrap: "wrap", gap: space[2], marginBottom: space[6] }}>
          {DOC_ORDER.map((item) => {
            const isCurrent = item === kind;
            return (
              <Link
                key={item}
                to={LEGAL_ROUTES[item]}
                aria-current={isCurrent ? "page" : undefined}
                style={{
                  padding: "6px 14px", borderRadius: radius.pill, fontSize: 13, fontWeight: 700, textDecoration: "none",
                  background: isCurrent ? C.primary : C.white,
                  color: isCurrent ? C.white : C.textSecondary,
                  border: `1px solid ${isCurrent ? C.primary : C.border}`,
                }}
              >
                {LEGAL_DOCS[item].title}
              </Link>
            );
          })}
        </nav>

        <h1 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[2]}px` }}>{doc.title}</h1>
        <p style={{ fontSize: 13, color: C.textSecondary, margin: `0 0 ${space[5]}px` }}>Hiệu lực từ ngày {formatEffectiveDate(LEGAL_VERSION)}</p>
        <p style={{ fontSize: 15, color: C.textPrimary, lineHeight: 1.75, margin: `0 0 ${space[8]}px` }}>{doc.intro}</p>

        {doc.sections.map((section) => (
          <section key={section.heading} style={{ marginBottom: space[6] }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[3]}px` }}>{section.heading}</h2>
            {section.paragraphs?.map((text) => (
              <p key={text} style={{ fontSize: 14.5, color: C.textPrimary, lineHeight: 1.75, margin: `0 0 ${space[2]}px` }}>{text}</p>
            ))}
            {section.bullets && (
              <ul style={{ margin: 0, paddingLeft: space[5], display: "flex", flexDirection: "column", gap: space[2] }}>
                {section.bullets.map((text) => (
                  <li key={text} style={{ fontSize: 14.5, color: C.textPrimary, lineHeight: 1.7 }}>{text}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <p style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.7, marginTop: space[8], paddingTop: space[5], borderTop: `1px solid ${C.border}` }}>
          Câu hỏi về chính sách: <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.primary, fontWeight: 700 }}>{SUPPORT_EMAIL}</a>
        </p>
      </main>
    </div>
  );
}

export function TermsPage() {
  return <LegalPage kind="terms" />;
}

export function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}

export function RefundPolicyPage() {
  return <LegalPage kind="refund" />;
}
