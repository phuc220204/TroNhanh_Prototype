import { useState, useEffect } from "react";
import { Sparkles, Database } from "lucide-react";
import { C, font } from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabaseClient";
import { seedMockDataForUser } from "../../utils/dbSeeder";

import { logError } from "../../services/supabase-error";

/* ══════════════════════════════════════════
   DEMO / PROTOTYPE NOTICE BAR — Trọ Nhanh
   Thanh thông báo "bản demo" dùng chung cho mọi
   public page và landlord shell. Nổi bật hơn nhưng
   vẫn theo tone warm beige/brown, không phải alert.
   Nằm ngay dưới navbar; giữ nguyên flow (không sticky).
   Tự động phát hiện khi tài khoản thật chưa có dữ liệu
   và hiển thị nút Khởi tạo dữ liệu mẫu trực tiếp.
   ══════════════════════════════════════════ */
const BANNER_BG = "#F0E2C8"; // warm beige, đậm hơn cream để nổi bật

export function DemoBanner({ mobile }: { mobile?: boolean }) {
  const { user, profile } = useAuth();
  const [hasProperties, setHasProperties] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasProperties(true); // Don't show seeding for guests
      return;
    }
    const checkProperties = async () => {
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("id")
          .eq("owner_id", user.id)
          .limit(1);
        if (!error) {
          setHasProperties(data && data.length > 0);
        }
      } catch (e) {
        logError("DemoBanner.checkProperties", e);
      }
    };
    checkProperties();
  }, [user]);

  const handleSeedClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const confirm = window.confirm("Hệ thống sẽ tạo 3 khu trọ mẫu kèm danh sách phòng, người ở, hợp đồng và hóa đơn mẫu vào tài khoản của bạn. Bạn muốn tiếp tục?");
    if (!confirm) return;

    try {
      setSeeding(true);
      await seedMockDataForUser(user, profile);
      alert("Khởi tạo dữ liệu mẫu thành công! Trình duyệt sẽ tải lại trang.");
      window.location.reload();
    } catch (err: any) {
      logError("DemoBanner.handleSeedClick", err);
      alert("Lỗi khi khởi tạo dữ liệu mẫu: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

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
        flexWrap: "wrap",
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
        {user && !hasProperties ? (
          <>
            Bạn đang xem <b style={{ fontWeight: 700 }}>Dữ liệu mẫu (Demo)</b>. Tài khoản của bạn chưa có dữ liệu thực.
          </>
        ) : mobile ? (
          <>
            <b style={{ fontWeight: 700 }}>Demo Prototype</b> — đang lấy khảo sát &amp; feedback. Tối ưu nhất trên laptop/desktop.
          </>
        ) : (
          <>
            Đây là bản <b style={{ fontWeight: 700 }}>Demo Prototype</b> để lấy khảo sát &amp; feedback. Trải nghiệm tối ưu nhất khi xem trên laptop/desktop.
          </>
        )}
      </span>

      {user && !hasProperties && (
        <button
          onClick={handleSeedClick}
          disabled={seeding}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            background: C.primary,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontFamily: font,
            fontSize: 11.5,
            fontWeight: 700,
            cursor: seeding ? "not-allowed" : "pointer",
            marginLeft: 8,
            boxShadow: "0 2px 6px rgba(138, 74, 32, 0.15)",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => { if (!seeding) e.currentTarget.style.background = C.primaryHover; }}
          onMouseLeave={e => { if (!seeding) e.currentTarget.style.background = C.primary; }}
        >
          <Database size={11} />
          {seeding ? "Đang khởi tạo..." : "Khởi tạo Dữ liệu thực vào tài khoản"}
        </button>
      )}
    </div>
  );
}
