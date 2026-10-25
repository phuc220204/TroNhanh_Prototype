import { useEffect } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { C, font, radius } from "../theme";
import { logError } from "../services/supabase-error";

/**
 * Sau mỗi lần deploy, tên file chunk đổi. Tab đang mở từ bản cũ bấm sang trang
 * lazy-load sẽ xin file không còn tồn tại ⇒ lỗi import động. Tải lại trang là hết.
 */
function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /dynamically imported module|importing a module script failed|failed to fetch dynamically|error loading dynamically/i.test(message);
}

/**
 * `ErrorBoundary` của route gốc. Không có nó, React Router hiện màn mặc định
 * tiếng Anh "Unexpected Application Error!" kèm stack trace — lộ chi tiết kỹ
 * thuật ra UI (CLAUDE.md §7).
 */
export function RouteErrorScreen() {
  const error = useRouteError();
  const isStale = isStaleChunkError(error);

  useEffect(() => {
    logError("RouteErrorScreen", error);
  }, [error]);

  const title = isStale
    ? "Trọ Nhanh vừa được cập nhật"
    : isRouteErrorResponse(error) && error.status === 404
      ? "Không tìm thấy trang"
      : "Đã có lỗi xảy ra";
  const description = isStale
    ? "Trang bạn đang mở thuộc phiên bản cũ. Tải lại để dùng phiên bản mới nhất."
    : "Xin lỗi vì sự bất tiện. Bạn thử tải lại trang hoặc quay về trang chủ.";

  return (
    <div data-testid="route-error-screen" style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 420, width: "100%", background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: "32px 28px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          {isStale ? <RefreshCw size={26} color={C.primary} /> : <TriangleAlert size={26} color={C.primary} />}
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: "0 0 8px" }}>{title}</h1>
        <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: "0 0 22px" }}>{description}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, padding: "10px 20px", background: C.primary, color: C.white, border: "none", borderRadius: radius.md, fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Tải lại trang
          </button>
          {/* <a> + full reload thay vì navigate: router có thể đang ở trạng thái lỗi. */}
          <a href="/#/" style={{ minHeight: 44, boxSizing: "border-box", display: "inline-flex", alignItems: "center", padding: "10px 20px", background: C.white, color: C.primary, border: `1.5px solid ${C.border}`, borderRadius: radius.md, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            Về trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}
