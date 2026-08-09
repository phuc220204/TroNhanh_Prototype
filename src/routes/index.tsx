import { createHashRouter, redirect } from "react-router";
import { RequireAuth } from "../shared/components/RequireAuth";
import { RequireAdminOrModerator } from "../shared/components/RequireRole";

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
      { path: "khu-tro/:slug", lazy: async () => ({ Component: (await import("../marketplace/pages/PropertyDetailPage")).PropertyDetailPage }) },
      { path: "tin-nhu-cau", lazy: async () => ({ Component: (await import("../marketplace/pages/DemandListPage")).DemandListPage }) },
      { path: "tin-nhu-cau/:id", lazy: async () => ({ Component: (await import("../marketplace/pages/DemandDetailPage")).DemandDetailPage }) },
      { path: "dang-tin-nhu-cau", lazy: async () => ({ Component: (await import("../marketplace/pages/PostDemandPage")).PostDemandPage }) },
      { path: "styleguide", lazy: async () => ({ Component: (await import("../marketplace/pages/StyleGuidePage")).StyleGuidePage }) },
      { path: "dang-nhap", lazy: async () => ({ Component: (await import("../marketplace/pages/LoginPage")).LoginPage }) },
      { path: "dang-ky", lazy: async () => ({ Component: (await import("../marketplace/pages/RegisterPage")).RegisterPage }) },

      // Redirects for backward compatibility & aliases
      { path: "search", loader: () => redirect("/tim-phong") },
      { path: "listings", loader: () => redirect("/tat-ca-phong") },
      { path: "room/:id", loader: ({ params }) => redirect(`/phong/${params.id}`) },
      { path: "dang-tin", loader: () => redirect("/chu-tro/dang-tin") },
      { path: "danh-gia", loader: () => redirect("/tai-khoan/danh-gia") },
      { path: "admin", loader: () => redirect("/quan-tri") },

      // Protected Routes (Require Auth)
      {
        lazy: async () => ({ Component: RequireAuth }),
        children: [
          // Unified Messaging
          { path: "tin-nhan", lazy: async () => ({ Component: (await import("../shared/pages/InboxPage")).InboxPage }) },
          { path: "tin-nhan/:conversationId", lazy: async () => ({ Component: (await import("../shared/pages/InboxPage")).InboxPage }) },

          // Renter Account Routes
          { path: "tai-khoan", lazy: async () => ({ Component: (await import("../shared/pages/AccountPage")).AccountPage }) },
          { path: "tai-khoan/phong-cua-toi", lazy: async () => ({ Component: (await import("../marketplace/pages/MyStaysPage")).MyStaysPage }) },
          { path: "tai-khoan/danh-gia", lazy: async () => ({ Component: (await import("../marketplace/pages/MyReviewsPage")).MyReviewsPage }) },
          { path: "tai-khoan/hop-dong", lazy: async () => ({ Component: (await import("../shared/pages/AccountPage")).AccountContractsPage }) },
          { path: "tai-khoan/cai-dat", lazy: async () => ({ Component: (await import("../shared/pages/AccountPage")).AccountSettingsPage }) },
          { path: "tai-khoan/tin-nhu-cau", lazy: async () => ({ Component: (await import("../marketplace/pages/MyDemandPostsPage")).MyDemandPostsPage }) },

          // Tin đã lưu / yêu thích — MỘT trang cho cả hai nhãn.
          { path: "yeu-thich", lazy: async () => ({ Component: (await import("../marketplace/pages/SavedListingsPage")).SavedListingsPage }) },
          { path: "tai-khoan/tin-da-luu", loader: () => redirect("/yeu-thich") },

          // Landlord SaaS Workspace Routes
          { path: "chu-tro", lazy: async () => ({ Component: (await import("../workspace/pages/ChuTroDashboardPage")).ChuTroDashboardPage }) },
          { path: "chu-tro/tin-dang", lazy: async () => ({ Component: (await import("../marketplace/pages/QuanLyPage")).QuanLyPage }) },
          { path: "chu-tro/quan-ly", loader: () => redirect("/chu-tro/tin-dang") },
          { path: "chu-tro/dang-tin", lazy: async () => ({ Component: (await import("../marketplace/pages/DangTinPage")).DangTinPage }) },
          { path: "chu-tro/dang-tin/:id", lazy: async () => ({ Component: (await import("../marketplace/pages/DangTinPage")).DangTinPage }) },
          { path: "chu-tro/quan-ly-phong", lazy: async () => ({ Component: (await import("../workspace/pages/QuanLyPhongPage")).QuanLyPhongPage }) },
          { path: "chu-tro/tim-nguoi-thue", lazy: async () => ({ Component: (await import("../marketplace/pages/FindRenterPage")).FindRenterPage }) },
          { path: "chu-tro/danh-gia", lazy: async () => ({ Component: (await import("../marketplace/pages/LandlordReviewsPage")).LandlordReviewsPage }) },
          { path: "chu-tro/hoa-don", lazy: async () => ({ Component: (await import("../workspace/pages/LandlordBillingPage")).LandlordBillingPage }) },

          // Admin / Moderator Routes (Require Role Admin or Moderator)
          {
            lazy: async () => ({ Component: RequireAdminOrModerator }),
            children: [
              { path: "quan-tri", lazy: async () => ({ Component: (await import("../admin/pages/AdminDashboardPage")).AdminDashboardPage }) },
              { path: "quan-tri/kiem-duyet-tin", lazy: async () => ({ Component: (await import("../admin/pages/ListingModerationPage")).ListingModerationPage }) },
              { path: "quan-tri/danh-gia", lazy: async () => ({ Component: (await import("../admin/pages/ReviewModerationPage")).ReviewModerationPage }) },
              { path: "quan-tri/nguoi-dung", lazy: async () => ({ Component: (await import("../admin/pages/UserManagementPage")).UserManagementPage }) },
              { path: "quan-tri/cai-dat", lazy: async () => ({ Component: (await import("../admin/pages/PlatformSettingsPage")).PlatformSettingsPage }) },
            ],
          },
        ],
      },

      // Fallback
      { path: "*", loader: () => redirect("/") },
    ],
  },
]);
