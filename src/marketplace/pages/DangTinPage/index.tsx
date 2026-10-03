import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams, useBlocker } from "react-router";
import { ArrowLeft, ArrowRight, Check, CheckCircle, AlertCircle } from "lucide-react";
import { C, font } from "../../../shared/theme";
import { useBreakpoint } from "../../../shared/components/useBreakpoint";
import { PublicNavbar } from "../../../shared/components/PublicNavbar";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { config } from "../../../shared/config";
import { canShowBoostAction } from "../../../../supabase/functions/_shared/boost-access.mjs";
import { Step1Basic } from "./Step1Basic";
import { Step2Amenities } from "./Step2Amenities";
import { Step3Photos } from "./Step3Photos";
import { Step4Costs } from "./Step4Costs";
import { Step5Visibility } from "./Step5Visibility";
import { useListingForm } from "./useListingForm";

const LISTING_STEPS = [
  "Thông tin cơ bản",
  "Tiện ích & mô tả",
  "Hình ảnh",
  "Chi phí",
  "Gói hiển thị",
];

function Toast({ show, message }: { show: boolean; message: string }) {
  return (
    <div style={{ position: "fixed", bottom: 32, left: "50%", transform: `translateX(-50%) translateY(${show ? 0 : 20}px)`, opacity: show ? 1 : 0, transition: "all 0.25s", zIndex: 600, background: C.primaryDark, borderRadius: 10, padding: "12px 22px", pointerEvents: "none" }}>
      <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.cream }}>{message}</span>
    </div>
  );
}

export function DangTinPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const { isMobile } = useBreakpoint();
  const { profile, user } = useAuth();
  const boostChoiceAvailable = canShowBoostAction(
    config.payments.boostCheckoutEnabled,
    config.payments.boostTestMode,
    config.payments.boostTestSellerId,
    user?.id,
  );
  const isPayosTestMode = config.payments.boostTestMode === "true";
  const prefill = (location.state as { prefill?: any } | null)?.prefill ?? {};

  const [toast, setToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  const {
    step,
    next,
    prev,
    formik,
    photos,
    setPhotos,
    uploadProgress,
    isSubmitting,
    success,
    newRoomId,
    handlePostSubmit,
    isLoadingListing,
    notFound,
    updatedStatus,
    listingStatus,
    legacyDepositText,
    legacyDepositCleared,
    setLegacyDepositCleared,
    isEditMode,
    selectedBoostDays,
    setSelectedBoostDays,
    boostCheckoutError,
    shouldShowBoostStep,
  } = useListingForm(prefill, showToast, id, boostChoiceAvailable);

  const steps = shouldShowBoostStep ? LISTING_STEPS : LISTING_STEPS.slice(0, 4);
  const finalStep = steps.length - 1;

  const hasUnsavedChanges = !success && !isSubmitting && (formik.dirty || legacyDepositCleared || photos.some((photo) => Boolean(photo.file)));
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("Bạn có thay đổi chưa lưu. Rời trang sẽ làm mất dữ liệu vừa nhập.")) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  if (isLoadingListing) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", flexDirection: "column" }}>
        <PublicNavbar />
        <div style={{ flex: 1, maxWidth: 640, margin: "60px auto", width: "100%", padding: "0 20px", boxSizing: "border-box" }}>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40, textAlign: "center", color: C.textSecondary }}>
            Đang tải dữ liệu tin đăng...
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", flexDirection: "column" }}>
        <PublicNavbar />
        <div style={{ flex: 1, maxWidth: 640, margin: "60px auto", width: "100%", padding: "0 20px", boxSizing: "border-box" }}>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 24, padding: "48px 36px", textAlign: "center", boxShadow: "0 8px 32px rgba(92,70,50,0.08)" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", color: C.primary, margin: "0 auto 20px" }}>
              <AlertCircle size={36} strokeWidth={2} />
            </div>
            <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: "0 0 10px" }}>
              Không tìm thấy tin đăng
            </h1>
            <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: "0 0 28px", lineHeight: 1.6 }}>
              Tin đăng không tồn tại, đã bị xóa hoặc bạn không có quyền chỉnh sửa.
            </p>
            <button
              type="button"
              onClick={() => navigate("/tai-khoan/tin-cho-thue")}
              style={{ padding: "12px 24px", background: C.primary, color: "white", border: "none", borderRadius: 12, fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Quản lý tin đăng
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    const successTitle = updatedStatus === "Draft"
      ? "Đã lưu bản nháp thành công!"
      : isEditMode
        ? (updatedStatus === "PendingApproval" ? "Cập nhật & Đã gửi duyệt lại!" : "Cập nhật tin thành công!")
        : "Đã tiếp nhận tin đăng!";

    const successDesc = updatedStatus === "Draft"
      ? "Tin đăng của bạn đã được lưu dưới dạng Bản nháp. Bạn có thể mở lại để chỉnh sửa và gửi duyệt sau từ trang Quản lý tin đăng."
      : boostCheckoutError
        ? `${boostCheckoutError} Tin vẫn đang chờ duyệt; sau khi thanh toán thành công, Boost chỉ bắt đầu khi moderator duyệt tin.`
      : isEditMode
        ? (updatedStatus === "PendingApproval"
          ? "Tin của bạn đã được cập nhật và cần duyệt lại trước khi hiển thị."
          : updatedStatus === "Active"
            ? "Tin đăng của bạn đã được cập nhật thành công và đang hiển thị."
            : "Tin đăng của bạn đã được cập nhật thành công. Hãy kiểm tra trạng thái trong Quản lý tin đăng.")
        : selectedBoostDays !== null
          ? `Tin đã được gửi duyệt. Bạn sẽ được chuyển đến payOS để thanh toán gói Boost ${selectedBoostDays} ngày; thời hạn Boost chỉ bắt đầu khi moderator duyệt tin.`
          : "Tin đã được lưu. Hãy kiểm tra trạng thái duyệt trong Quản lý tin đăng.";

    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", flexDirection: "column" }}>
        <PublicNavbar />
        <div style={{ flex: 1, maxWidth: 640, margin: "60px auto", width: "100%", padding: "0 20px", boxSizing: "border-box" }}>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 24, padding: "48px 36px", textAlign: "center", boxShadow: "0 8px 32px rgba(92,70,50,0.08)" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#E8F5E1", display: "flex", alignItems: "center", justifyContent: "center", color: "#4A7A34", margin: "0 auto 20px" }}>
              <CheckCircle size={36} strokeWidth={2.5} />
            </div>
            <h1 data-testid="listing-success" style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: C.textPrimary, margin: "0 0 10px" }}>
              {successTitle}
            </h1>
            <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: "0 0 28px", lineHeight: 1.6 }}>
              {successDesc}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => navigate("/tai-khoan/tin-cho-thue")}
                style={{ padding: "12px 24px", background: C.primary, color: "white", border: "none", borderRadius: 12, fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                Quản lý tin đăng
              </button>
              {updatedStatus === "Active" && (
                <button
                  type="button"
                  onClick={() => navigate(newRoomId ? `/phong/${newRoomId}` : "/tat-ca-phong")}
                  style={{ padding: "12px 24px", background: C.white, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 12, fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                >
                  Xem tin đăng
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", flexDirection: "column" }}>
      <PublicNavbar />

      <div style={{ flex: 1, maxWidth: 960, margin: "0 auto", width: "100%", padding: isMobile ? "16px 16px 80px" : "32px 24px 80px", boxSizing: "border-box" }}>
        {/* Top Stepper Bar */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: isMobile ? 16 : 24, marginBottom: 24, boxShadow: "0 4px 16px rgba(42,26,12,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {steps.map((s, idx) => {
              const active = step === idx;
              const done = step > idx;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 8, flex: 1, justifyContent: idx === steps.length - 1 ? "flex-end" : "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: "50%", background: done ? "#4A7A34" : active ? C.primary : C.bg, border: `1.5px solid ${done ? "#4A7A34" : active ? C.primary : C.border}`, color: done || active ? "white" : C.textSecondary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, fontSize: 12.5, fontWeight: 700 }}>
                      {done ? <Check size={14} strokeWidth={3} /> : idx + 1}
                    </div>
                    {!isMobile && (
                      <span style={{ fontFamily: font, fontSize: 13, fontWeight: active ? 750 : 500, color: active ? C.primary : done ? C.textPrimary : C.textSecondary }}>
                        {s}
                      </span>
                    )}
                  </div>
                  {idx < steps.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: done ? "#4A7A34" : C.border, margin: isMobile ? "0 4px" : "0 12px" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Step Form Card */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: isMobile ? 20 : 36, boxShadow: "0 4px 20px rgba(42,26,12,0.02)", display: "flex", flexDirection: "column", gap: 24 }}>
          {step === 0 && <Step1Basic formik={formik} />}
          {step === 1 && <Step2Amenities formik={formik} />}
          {step === 2 && (
            <Step3Photos
              photos={photos}
              setPhotos={setPhotos}
              uploadProgress={uploadProgress}
            />
          )}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <Step4Costs
                formik={formik}
                legacyDepositText={legacyDepositText}
                legacyDepositCleared={legacyDepositCleared}
                onToggleLegacyDeposit={() => setLegacyDepositCleared((current) => !current)}
              />
            </div>
          )}
          {step === 4 && shouldShowBoostStep && (
            <Step5Visibility
              boostAvailable={boostChoiceAvailable}
              isTestMode={isPayosTestMode}
              selectedBoostDays={selectedBoostDays}
              onSelectBoostDays={setSelectedBoostDays}
            />
          )}

          {/* Stepper Footer Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.border}`, paddingTop: 20, marginTop: 12 }}>
            <button
              type="button"
              data-testid="listing-prev-btn"
              disabled={step === 0 || isSubmitting}
              onClick={prev}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 600, color: C.textSecondary, cursor: step === 0 || isSubmitting ? "not-allowed" : "pointer", opacity: step === 0 ? 0.5 : 1 }}
            >
              <ArrowLeft size={16} /> Quay lại
            </button>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {shouldShowBoostStep && (
                <button
                  type="button"
                  data-testid="listing-draft-btn"
                  disabled={isSubmitting}
                  onClick={() => handlePostSubmit(true, boostChoiceAvailable ? selectedBoostDays : null)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 600, color: C.textPrimary, cursor: isSubmitting ? "not-allowed" : "pointer" }}
                >
                  Lưu nháp
                </button>
              )}

              {step < finalStep ? (
                <button
                  type="button"
                  data-testid="listing-next-btn"
                  disabled={isSubmitting}
                  onClick={next}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", background: isSubmitting ? "#C9B09A" : C.primary, color: "white", border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer" }}
                >
                  Tiếp tục <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="listing-submit-btn"
                  disabled={isSubmitting}
                  onClick={next}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 28px", background: isSubmitting ? "#C9B09A" : C.primary, color: "white", border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 800, cursor: isSubmitting ? "not-allowed" : "pointer" }}
                >
                  {isSubmitting
                    ? "Đang xử lý..."
                    : boostChoiceAvailable && selectedBoostDays !== null && shouldShowBoostStep
                      ? (isEditMode ? "Gửi duyệt & thanh toán Boost" : "Gửi tin & thanh toán Boost")
                      : isEditMode && listingStatus === "Draft"
                        ? "Gửi duyệt"
                        : isEditMode
                          ? "Lưu thay đổi"
                          : "Đăng tin thường"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Toast show={toast} message={toastMsg} />
    </div>
  );
}

export default DangTinPage;
