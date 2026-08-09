import { QueryClient } from "@tanstack/react-query";

/**
 * QueryClient dùng chung. Mount ở App.tsx, NGOÀI AuthProvider.
 *
 * Vì sao có React Query trong dự án này (không phải sở thích chung):
 * 9 page đang tự viết `useEffect` + loading + error + "refetch sau mutation",
 * và CP4 thêm ~12 screen nữa. Quan trọng hơn: nó tách `isPending` / `isError` /
 * `data.length === 0` thành 3 state RIÊNG BIỆT — đúng cái mà các mock fallback
 * (HomePage.tsx:1219, QuanLyPhongPage.tsx:1898, ChuTroDashboardPage.tsx:643)
 * đang che, và là thứ khiến "DB rỗng → EmptyState" (PRD AC#1) làm được mà
 * không phải viết tay một máy trạng thái 3 nhánh ở 9 chỗ.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      // Tắt: mọi lần alt-tab sẽ refetch toàn bộ → nhiễu khi demo.
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/** Bật/tắt Realtime cho inbox. Mạng hội trường có thể chặn websocket. */
export const USE_REALTIME_MESSAGING = true;

/** Fallback polling khi Realtime không dùng được. */
export const MESSAGING_POLL_INTERVAL_MS = 15_000;
