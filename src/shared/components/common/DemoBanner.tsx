import { useState, useEffect } from "react";
import { Database } from "lucide-react";
import { C, font } from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabaseClient";
import { seedMockDataForUser } from "../../utils/dbSeeder";
import { logError, toUserMessage } from "../../services/supabase-error";
import { Toast } from "./Toast";

const BANNER_BG = "#F0E2C8"; // warm beige

export function DemoBanner({ mobile }: { mobile?: boolean }) {
  const { user, profile } = useAuth();
  const [hasProperties, setHasProperties] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!user) {
      setHasProperties(true);
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

  // If not logged in, or already has properties, do not render banner at all
  if (!user || hasProperties) {
    return toast ? (
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000 }}>
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      </div>
    ) : null;
  }

  const handleSeedClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const confirm = window.confirm(
      "Hệ thống sẽ tạo 3 khu trọ mẫu kèm danh sách phòng, người ở, hợp đồng và hóa đơn mẫu vào tài khoản của bạn. Bạn muốn tiếp tục?"
    );
    if (!confirm) return;

    try {
      setSeeding(true);
      await seedMockDataForUser(user, profile);
      setToast({ message: "Khởi tạo dữ liệu mẫu thành công! Trình duyệt sẽ tải lại trang.", variant: "success" });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: unknown) {
      logError("DemoBanner.handleSeedClick", err);
      // §7: `err.message` là văn bản Postgres thô (tên cột, constraint, có khi cả
      // câu SQL) — không được ghép vào chuỗi hiển thị cho người dùng.
      setToast({ message: toUserMessage(err), variant: "error" });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <>
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
        <span
          style={{
            fontFamily: font,
            fontSize: mobile ? 12 : 13.5,
            color: C.primaryDark,
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          Tài khoản của bạn chưa có khu trọ nào. Tạo dữ liệu mẫu để dùng thử ngay.
        </span>

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
          onMouseEnter={(e) => {
            if (!seeding) e.currentTarget.style.background = C.primaryHover;
          }}
          onMouseLeave={(e) => {
            if (!seeding) e.currentTarget.style.background = C.primary;
          }}
        >
          <Database size={11} />
          {seeding ? "Đang khởi tạo..." : "Khởi tạo Dữ liệu mẫu"}
        </button>
      </div>

      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000 }}>
          <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
        </div>
      )}
    </>
  );
}
