import { createHashRouter, redirect } from "react-router";

export const router = createHashRouter([
  {
    path: "/",
    HydrateFallback: () => null,
    lazy: async () => ({ Component: (await import("./Root")).default }),
    children: [
      { index: true, lazy: async () => ({ Component: (await import("./pages/HomePage")).HomePage }) },
      { path: "search", lazy: async () => ({ Component: (await import("./pages/SearchResultsPage")).SearchResultsPage }) },
      { path: "listings", lazy: async () => ({ Component: (await import("./pages/AllListingsPage")).AllListingsPage }) },
      { path: "room/:id", lazy: async () => ({ Component: (await import("./pages/RoomDetailPage")).RoomDetailPage }) },
      { path: "dang-tin", lazy: async () => ({ Component: (await import("./pages/DangTinPage")).DangTinPage }) },
      { path: "chu-tro", lazy: async () => ({ Component: (await import("./pages/ChuTroDashboardPage")).ChuTroDashboardPage }) },
      { path: "chu-tro/quan-ly", lazy: async () => ({ Component: (await import("./pages/QuanLyPage")).QuanLyPage }) },
      { path: "chu-tro/quan-ly-phong", lazy: async () => ({ Component: (await import("./pages/QuanLyPhongPage")).QuanLyPhongPage }) },
      { path: "styleguide", lazy: async () => ({ Component: (await import("./pages/StyleGuidePage")).StyleGuidePage }) },
      { path: "*", loader: () => redirect("/") },
    ],
  },
]);
