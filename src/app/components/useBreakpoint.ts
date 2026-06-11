import { useState, useEffect } from "react";

/**
 * useBreakpoint — responsive helper cho prototype (client-only).
 *
 * Đọc trực tiếp `window.innerWidth` nên CHỈ an toàn khi chạy trong
 * trình duyệt (app này là SPA + HashRouter, không SSR). Nếu sau này
 * chuyển sang SSR/Next.js, cần guard `typeof window !== "undefined"`
 * và set width mặc định trước khi hydrate để tránh lệch markup.
 *
 * Breakpoints: mobile < 768 ≤ tablet < 1024 ≤ desktop.
 */
export function useBreakpoint() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    width,
  };
}
