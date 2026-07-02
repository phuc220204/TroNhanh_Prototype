import { createHashRouter, redirect } from "react-router";
import { ProtectedRoute } from "../shared/components/ProtectedRoute";

export const router = createHashRouter([
  {
    path: "/",
    HydrateFallback: () => null,
    lazy: async () => ({ Component: (await import("./Root")).default }),
    children: [
      // Marketplace / Public Shell
      { index: true, lazy: async () => ({ Component: (await import("../marketplace/pages/HomePage")).HomePage }) },
      { path: "tim-phong", lazy: async () => ({ Component: (await import("../marketplace/pages/SearchResultsPage")).SearchResultsPage }) },
      { path: "tat-ca-phong", lazy: async () => ({ Component: (await import("../marketplace/pages/AllListingsPage")).AllListingsPage }) },
      { path: "phong/:id", lazy: async () => ({ Component: (await import("../marketplace/pages/RoomDetailPage")).RoomDetailPage }) },
      { path: "styleguide", lazy: async () => ({ Component: (await import("../marketplace/pages/StyleGuidePage")).StyleGuidePage }) },
      { path: "dang-nhap", lazy: async () => ({ Component: (await import("../marketplace/pages/LoginPage")).LoginPage }) },
      { path: "dang-ky", lazy: async () => ({ Component: (await import("../marketplace/pages/RegisterPage")).RegisterPage }) },

      // Redirects for old English routes (backward compat)
      { path: "search", loader: () => redirect("/tim-phong") },
      { path: "listings", loader: () => redirect("/tat-ca-phong") },
      { path: "room/:id", loader: ({ params }) => redirect(`/phong/${params.id}`) },
      { path: "dang-tin", loader: () => redirect("/chu-tro/dang-tin") },

      // Protected Workspace / SaaS Shell
      {
        lazy: async () => ({ Component: ProtectedRoute }),
        children: [
          { path: "chu-tro", lazy: async () => ({ Component: (await import("../workspace/pages/ChuTroDashboardPage")).ChuTroDashboardPage }) },
          { path: "chu-tro/tin-dang", lazy: async () => ({ Component: (await import("../workspace/pages/QuanLyPage")).QuanLyPage }) },
          { path: "chu-tro/quan-ly", loader: () => redirect("/chu-tro/tin-dang") },
          { path: "chu-tro/dang-tin", lazy: async () => ({ Component: (await import("../marketplace/pages/DangTinPage")).DangTinPage }) },
          { path: "chu-tro/quan-ly-phong", lazy: async () => ({ Component: (await import("../workspace/pages/QuanLyPhongPage")).QuanLyPhongPage }) },
        ],
      },

      // Fallback
      { path: "*", loader: () => redirect("/") },
    ],
  },
]);
