import { Sparkles } from "lucide-react";
import { C, font } from "../../theme";

/* ══════════════════════════════════════════
   DEMO / PROTOTYPE NOTICE BAR — Trọ Nhanh
   Thanh thông báo "bản demo" dùng chung cho mọi
   public page và landlord shell. Nổi bật hơn nhưng
   vẫn theo tone warm beige/brown, không phải alert.
   Nằm ngay dưới navbar; giữ nguyên flow (không sticky).
══════════════════════════════════════════ */
const BANNER_BG = "#F0E2C8"; // warm beige, đậm hơn cream để nổi bật

export function DemoBanner({ mobile }: { mobile?: boolean }) {
  return (
    <div
      style={{
        background: BANNER_BG,
        borderBottom: `1px solid ${C.border}`,
        minHeight: mobile ? undefined : 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        padding: mobile ? "9px 14px" : "0 16px",
        flexShrink: 0,
        textAlign: "center",
      }}
    >
      {/* Badge DEMO */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          flexShrink: 0,
          background: C.primary,
          color: "#fff",
          fontFamily: font,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          padding: "3px 8px",
          borderRadius: 999,
        }}
      >
        <Sparkles size={11} strokeWidth={2.4} />
        Demo
      </span>

      {/* Nội dung */}
      <span
        style={{
          fontFamily: font,
          fontSize: mobile ? 12 : 13.5,
          color: C.primaryDark,
          fontWeight: 500,
          lineHeight: 1.4,
        }}
      >
        {mobile ? (
          <>
            <b style={{ fontWeight: 700 }}>Demo Prototype</b> — đang lấy khảo sát &amp; feedback. Tối ưu nhất trên laptop/desktop.
          </>
        ) : (
          <>
            Đây là bản <b style={{ fontWeight: 700 }}>Demo Prototype</b> để lấy khảo sát &amp; feedback. Trải nghiệm tối ưu nhất khi xem trên laptop/desktop.
          </>
        )}
      </span>
    </div>
  );
}
