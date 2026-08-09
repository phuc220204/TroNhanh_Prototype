import { useState, useMemo, createContext, useContext, ReactNode, Children, isValidElement, cloneElement, ReactElement } from "react";
import { useLocation } from "react-router";
import { ChevronRight, Lock } from "lucide-react";
import { C, font } from "../theme";
import { useBreakpoint } from "./useBreakpoint";
import { DemoBanner } from "./common/DemoBanner";
import { useSubscriptionContext } from "../contexts/SubscriptionContext";
import { SubscriptionBanner } from "./landlord/SubscriptionBanner";
import { Sidebar, MobileHeader, MobileTabBar, type LandlordNavId } from "./landlord/SidebarNav";
import { TrialRegisterModal, SaaSPaymentModal } from "./landlord/TrialModal";

export type { LandlordNavId };

interface LandlordShellContextType {
  subStatus: "NONE" | "TRIAL" | "ACTIVE" | "READ_ONLY";
  activeTab: LandlordNavId;
}

export const LandlordShellContext = createContext<LandlordShellContextType>({
  subStatus: "NONE",
  activeTab: "overview",
});

export const useLandlordShell = () => useContext(LandlordShellContext);

export function LandlordBreadcrumb({ trail }: { trail: string[] }) {
  const navigate = useLocation();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
      {trail.map((t, i) => {
        const last = i === trail.length - 1;
        return (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              style={{
                fontFamily: font,
                fontSize: 13,
                fontWeight: last ? 700 : 600,
                color: last ? C.primary : C.textSecondary,
              }}
            >
              {t}
            </span>
            {!last && <ChevronRight size={15} color={C.textSecondary} />}
          </span>
        );
      })}
    </div>
  );
}

export function LandlordShell({
  active,
  mobileTitle,
  children,
}: {
  active: LandlordNavId;
  mobileTitle: string;
  children: ReactNode;
}) {
  const { isMobile } = useBreakpoint();
  const location = useLocation();
  const { status: subStatus, trialDaysLeft, activateTrial, setDemoStatus } = useSubscriptionContext();

  const [showTrialRegister, setShowTrialRegister] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const activeTab = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tab = params.get("tab");
      if (tab) return tab as LandlordNavId;
    } catch {
      // ignore search param parse failure
    }
    return active;
  }, [location.search, active]);

  const handleSaaSAccess = () => {
    setShowTrialRegister(true);
  };

  // Inject subStatus and activeTab to child components if they expect props
  const childrenWithProps = Children.map(children, child => {
    if (isValidElement(child) && typeof child.type !== "string") {
      return cloneElement(child as ReactElement, { subStatus, activeTab } as any);
    }
    return child;
  });

  // "overview" nằm trong danh sách từ 2026-08-09: sau khi "Quản lý tin đăng"
  // chuyển sang `/tai-khoan/tin-cho-thue`, khu vực `/chu-tro/*` KHÔNG còn tính
  // năng miễn phí nào — nó thuần là module SaaS. Để dashboard mở tự do thì
  // người chưa có gói vào chỉ thấy một trang số liệu rỗng, không hiểu vì sao;
  // màn khóa dưới đây giải thích và mời dùng thử.
  const isSaaSTab = ["overview", "rooms", "occupants", "payments", "settings"].includes(activeTab);
  const isSaaSBlocked = subStatus === "NONE" && isSaaSTab;

  const renderContent = () => {
    if (isSaaSBlocked) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 160px)",
            padding: 32,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: C.caramelSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Lock size={28} color={C.primary} />
          </div>
          <h2
            style={{
              fontFamily: font,
              fontSize: 22,
              fontWeight: 800,
              color: C.textPrimary,
              margin: "0 0 8px",
            }}
          >
            Tính năng dành riêng cho gói SaaS
          </h2>
          <p
            style={{
              fontFamily: font,
              fontSize: 14,
              color: C.textSecondary,
              margin: "0 0 24px",
              maxWidth: 440,
              lineHeight: 1.6,
            }}
          >
            Quản lý khu trọ, ghi nhận chỉ số điện nước, và tự động tạo hóa đơn thanh toán qua VietQR.
            Đăng ký dùng thử 30 ngày hoàn toàn miễn phí ngay!
          </p>
          <button
            onClick={handleSaaSAccess}
            style={{
              padding: "12px 24px",
              background: C.primary,
              color: C.white,
              border: "none",
              borderRadius: 12,
              fontFamily: font,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(138,106,69,0.3)",
            }}
          >
            Bắt đầu dùng thử miễn phí
          </button>
        </div>
      );
    }
    return childrenWithProps;
  };

  if (isMobile) {
    return (
      <LandlordShellContext.Provider value={{ subStatus, activeTab }}>
        <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <MobileHeader title={mobileTitle} />
          <DemoBanner mobile />
          <SubscriptionBanner
            status={subStatus}
            trialDaysLeft={trialDaysLeft}
            onUpgrade={() => setShowPaymentModal(true)}
          />
          <div style={{ flex: 1, overflowY: "auto" }}>{renderContent()}</div>
          <MobileTabBar active={activeTab} onSaaSAccess={handleSaaSAccess} />
          <TrialRegisterModal
            open={showTrialRegister}
            onCancel={() => setShowTrialRegister(false)}
            onConfirm={async () => {
              await activateTrial();
              setShowTrialRegister(false);
            }}
          />
          <SaaSPaymentModal
            open={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            onConfirm={async () => setDemoStatus("ACTIVE")}
          />
        </div>
      </LandlordShellContext.Provider>
    );
  }

  return (
    <LandlordShellContext.Provider value={{ subStatus, activeTab }}>
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex" }}>
        <Sidebar active={activeTab} onSaaSAccess={handleSaaSAccess} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <DemoBanner />
          <SubscriptionBanner
            status={subStatus}
            trialDaysLeft={trialDaysLeft}
            onUpgrade={() => setShowPaymentModal(true)}
          />
          <main style={{ flex: 1, overflowY: "auto" }}>{renderContent()}</main>
        </div>
        <TrialRegisterModal
          open={showTrialRegister}
          onCancel={() => setShowTrialRegister(false)}
          onConfirm={async () => {
            await activateTrial();
            setShowTrialRegister(false);
          }}
        />
        <SaaSPaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={async () => setDemoStatus("ACTIVE")}
        />
      </div>
    </LandlordShellContext.Provider>
  );
}
