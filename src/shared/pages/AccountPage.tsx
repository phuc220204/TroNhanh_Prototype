import { RenterShell, type RenterNavId } from "../components/RenterShell";
import { EmptyState } from "../components/common/EmptyState";
import { User, Star, FileText, Settings } from "lucide-react";
import { C, font } from "../theme";

interface AccountPageProps {
  activeTab?: RenterNavId;
}

export function AccountPage({ activeTab = "account" }: AccountPageProps) {
  const getTabConfig = () => {
    switch (activeTab) {
      case "reviews":
        return {
          title: "Đánh giá của tôi",
          desc: "Quản lý và xem lại các nhận xét, đánh giá khu trọ bạn đã từng ở.",
          icon: Star,
        };
      case "contracts":
        return {
          title: "Hợp đồng thuê phòng",
          desc: "Theo dõi trạng thái hợp đồng, ngày hết hạn và phòng bạn đang ở.",
          icon: FileText,
        };
      case "settings":
        return {
          title: "Cài đặt tài khoản",
          desc: "Cập nhật thông tin cá nhân, mật khẩu và thông báo.",
          icon: Settings,
        };
      default:
        return {
          title: "Tổng quan tài khoản",
          desc: "Xem thông tin cá nhân và quản lý các hoạt động tìm trọ của bạn.",
          icon: User,
        };
    }
  };

  const config = getTabConfig();

  return (
    <RenterShell active={activeTab}>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px 32px" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>
          {config.title}
        </h1>
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 24px" }}>
          {config.desc}
        </p>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 32 }}>
          <EmptyState
            icon={config.icon}
            title={`Dữ liệu ${config.title.toLowerCase()} rỗng`}
            description="Chưa có dữ liệu nào cho mục này. Chức năng đang được cập nhật."
          />
        </div>
      </div>
    </RenterShell>
  );
}

export function AccountReviewsPage() {
  return <AccountPage activeTab="reviews" />;
}

export function AccountContractsPage() {
  return <AccountPage activeTab="contracts" />;
}

export function AccountSettingsPage() {
  return <AccountPage activeTab="settings" />;
}

export default AccountPage;
