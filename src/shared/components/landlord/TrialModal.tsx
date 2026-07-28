import { useState, useEffect } from "react";
import { Building2, X, CreditCard } from "lucide-react";
import { C, font } from "../../theme";

export function TrialRegisterModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(20,10,4,0.5)", zIndex: 600, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 601, background: C.white, borderRadius: 20, padding: "32px 36px", maxWidth: 440, width: "calc(100vw - 48px)", textAlign: "center", boxShadow: "0 20px 60px rgba(20,10,4,0.25)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FEF6EC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Building2 size={30} color={C.primary} />
        </div>
        <h3 style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: "0 0 10px" }}>
          Kích hoạt Gói Quản lý vận hành (SaaS)
        </h3>
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 24px", lineHeight: 1.6 }}>
          Tính năng này thuộc gói dịch vụ Quản lý vận hành. Hãy bắt đầu dùng thử miễn phí trong <strong style={{ color: C.primary }}>30 ngày</strong> để tự động quản lý phòng, khách thuê, điện nước và hóa đơn tự động!
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: "13px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>
            Để sau
          </button>
          <button onClick={onConfirm}
            style={{ flex: 2, padding: "13px", background: C.primary, border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 2px 10px rgba(138,106,69,0.3)" }}>
            Bắt đầu dùng thử (30 ngày)
          </button>
        </div>
      </div>
    </>
  );
}

export function SaaSPaymentModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [step, setStep] = useState<"SELECT" | "PAYMENT_METHOD" | "QR" | "PROCESSING" | "SUCCESS">("SELECT");
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; name: string; price: string; rawPrice: number; duration: string; desc: string; recommended?: boolean } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"VietQR" | "MoMo" | "Card">("VietQR");

  const PLANS = [
    { id: "1y", name: "Gói 1 Năm (12 tháng)", price: "350.000 đ", rawPrice: 350000, duration: "1 năm", desc: "Phù hợp cho quản lý ngắn hạn với chi phí tiết kiệm." },
    { id: "3y", name: "Gói Siêu Cấp 3 Năm (36 tháng)", price: "600.000 đ", rawPrice: 600000, duration: "3 năm", desc: "Tiết kiệm đến 450.000 đ so với mua lẻ từng năm. Khuyên dùng!", recommended: true },
  ];

  useEffect(() => {
    if (open) {
      setStep("SELECT");
      setSelectedPlan(PLANS[1]);
    }
  }, [open]);

  useEffect(() => {
    if (step === "PROCESSING") {
      const timer = setTimeout(() => {
        setStep("SUCCESS");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  if (!open) return null;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(20,10,4,0.5)", zIndex: 600, backdropFilter: "blur(3px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 601, background: C.white, borderRadius: 20,
        maxWidth: 580, width: "calc(100vw - 32px)", overflow: "hidden",
        boxShadow: "0 20px 60px rgba(20,10,4,0.25)",
        display: "flex", flexDirection: "column",
        maxHeight: "90vh",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary }}>
            {step === "SELECT" && "1. Chọn gói SaaS Quản lý vận hành"}
            {step === "PAYMENT_METHOD" && "2. Chọn phương thức thanh toán"}
            {step === "QR" && "3. Tiến hành thanh toán"}
            {step === "PROCESSING" && "Đang xác thực giao dịch"}
            {step === "SUCCESS" && "Nâng cấp thành công"}
          </span>
          {step !== "PROCESSING" && step !== "SUCCESS" && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <X size={20} color={C.textSecondary} />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1, textAlign: "left" }} className="tn-scroll-y">
          {/* STEP 1: Select Plan */}
          {step === "SELECT" && (
            <div>
              <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 16px", lineHeight: 1.6 }}>
                Chọn chu kỳ thanh toán phù hợp nhất cho công việc quản lý trọ của bạn. Toàn bộ các tính năng (Khu trọ, Phòng, Người thuê, Hóa đơn VietQR) sẽ được kích hoạt ngay lập tức.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                {PLANS.map(p => {
                  const isSel = selectedPlan?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlan(p)}
                      style={{
                        padding: "16px", borderRadius: 12, border: `2px solid ${isSel ? C.primary : C.border}`,
                        background: isSel ? "rgba(138,74,32,0.02)" : C.white,
                        cursor: "pointer", position: "relative",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {p.recommended && (
                        <span style={{ position: "absolute", top: 12, right: 12, background: C.available, color: C.white, fontSize: 9.5, fontWeight: 800, padding: "3px 8px", borderRadius: 999 }}>
                          KHUYÊN DÙNG
                        </span>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${isSel ? C.primary : "#9B8C78"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {isSel && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.primary }} />}
                        </div>
                        <h4 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{p.name}</h4>
                      </div>
                      <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: "4px 0 8px 28px", paddingRight: 40 }}>{p.desc}</p>
                      <div style={{ marginLeft: 28 }}>
                        <span style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.primary }}>{p.price}</span>
                        <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}> / {p.duration}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Feature List */}
              <div style={{ background: C.bg, padding: 14, borderRadius: 10, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontFamily: font, fontSize: 12, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Quyền lợi đi kèm gói SaaS:</p>
                {[
                  "Quản lý không giới hạn số lượng khu trọ & phòng",
                  "Ghi số điện nước & Tự động gửi hóa đơn Zalo/SMS cho người thuê",
                  "Cổng thanh toán tự động kiểm tra giao dịch qua mã VietQR",
                  "Hỗ trợ kỹ thuật ưu tiên 24/7",
                ].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(79,122,74,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 9, color: C.available, fontWeight: 900 }}>✓</span>
                    </div>
                    <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Select Payment Method */}
          {step === "PAYMENT_METHOD" && (
            <div>
              <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 16px" }}>
                Vui lòng chọn phương thức thanh toán phù hợp cho gói <strong style={{ color: C.textPrimary }}>{selectedPlan?.name}</strong> trị giá <strong style={{ color: C.primary }}>{selectedPlan?.price}</strong>:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { id: "VietQR", title: "Quét mã VietQR chuyển khoản (Khuyên dùng)", sub: "Xử lý & kích hoạt tự động sau 30 giây", icon: "⚡" },
                  { id: "MoMo", title: "Cổng thanh toán Ví MoMo", sub: "Thanh toán tiện lợi qua điện thoại", icon: "🍑" },
                  { id: "Card", title: "Thẻ ATM Nội địa / Visa / Mastercard", sub: "Liên kết qua cổng Napas an toàn", icon: "💳" },
                ].map(m => {
                  const isSel = paymentMethod === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                        borderRadius: 12, border: `2px solid ${isSel ? C.primary : C.border}`,
                        background: isSel ? "rgba(138,74,32,0.02)" : C.white,
                        cursor: "pointer", transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${isSel ? C.primary : "#9B8C78"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isSel && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.primary }} />}
                      </div>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{m.icon}</span>
                      <div>
                        <h4 style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{m.title}</h4>
                        <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "2px 0 0" }}>{m.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: QR scan or Payment simulation */}
          {step === "QR" && (
            <div>
              {paymentMethod === "VietQR" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20, alignItems: "center" }}>
                  {/* Left: QR simulation */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#FAF7F2", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "16px", textAlign: "center" }}>
                    <div style={{ position: "relative", width: 150, height: 150, background: C.white, borderRadius: 8, padding: 8, border: "1px dashed #C99B65", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: "100%", height: "100%", opacity: 0.85, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ width: 24, height: 24, border: "4px solid #3E240E" }} />
                          <div style={{ width: 24, height: 24, border: "4px solid #3E240E" }} />
                        </div>
                        <div style={{ width: 44, height: 44, background: C.primary, opacity: 0.15, alignSelf: "center", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: C.primary }}>SAAS</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ width: 24, height: 24, border: "4px solid #3E240E" }} />
                          <div style={{ width: 12, height: 12, background: "#3E240E" }} />
                        </div>
                      </div>
                      <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: C.primary, boxShadow: "0 0 8px #8A4A20", animation: "tnScannerLine 2.2s infinite ease-in-out" }} />
                    </div>
                    <span style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: C.primary, marginTop: 10, textTransform: "uppercase" }}>VIETQR LIÊN KẾT NHANH</span>
                  </div>

                  {/* Right: Transfer details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                    <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
                      <span style={{ color: C.textSecondary, display: "block", fontSize: 11 }}>Ngân hàng</span>
                      <strong style={{ color: C.textPrimary }}>MB Bank (Ngân hàng Quân Đội)</strong>
                    </div>
                    <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
                      <span style={{ color: C.textSecondary, display: "block", fontSize: 11 }}>Số tài khoản</span>
                      <strong style={{ color: C.textPrimary, fontSize: 15 }}>8888 6789 9999</strong>
                    </div>
                    <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
                      <span style={{ color: C.textSecondary, display: "block", fontSize: 11 }}>Số tiền</span>
                      <strong style={{ color: C.primary, fontSize: 15 }}>{selectedPlan?.price}</strong>
                    </div>
                    <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
                      <span style={{ color: C.textSecondary, display: "block", fontSize: 11 }}>Nội dung chuyển khoản</span>
                      <strong style={{ color: C.textPrimary, letterSpacing: "0.02em" }}>TRONHANH SAAS PRO</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#FBF8F1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <CreditCard size={24} color={C.primary} />
                  </div>
                  <h4 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>Chuyển hướng đến cổng thanh toán {paymentMethod}</h4>
                  <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>Hệ thống đang thiết lập liên kết bảo mật. Vui lòng bấm xác nhận để tiến hành thanh toán giả lập.</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Processing simulation */}
          {step === "PROCESSING" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ display: "inline-block", width: 44, height: 44, border: `3.5px solid ${C.border}`, borderTopColor: C.primary, borderRadius: "50%", animation: "tnSpin 0.8s infinite linear", marginBottom: 16 }} />
              <h3 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: "0 0 8px" }}>Đang đối soát giao dịch...</h3>
              <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0, lineHeight: 1.6, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
                Hệ thống đang tự động xác nhận số tiền chuyển khoản từ MB Bank. Vui lòng không đóng cửa sổ này, quá trình này mất khoảng 2-3 giây.
              </p>
            </div>
          )}

          {/* STEP 5: Success screen */}
          {step === "SUCCESS" && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(79,122,74,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <span style={{ fontSize: 32, color: C.available, fontWeight: 900 }}>✓</span>
              </div>
              <h3 style={{ fontFamily: font, fontSize: 20, fontWeight: 900, color: C.textPrimary, margin: "0 0 8px" }}>Kích hoạt gói SaaS thành công!</h3>
              <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 16px", lineHeight: 1.6 }}>
                Giao dịch của bạn đã được đối soát thành công. Tài khoản của bạn đã được chuyển đổi sang trạng thái <strong style={{ color: "#4A7A34" }}>Kích hoạt (ACTIVE)</strong> và có thời hạn sử dụng 1 năm kể me từ hôm nay.
              </p>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", display: "inline-flex", flexDirection: "column", gap: 4, background: C.bg, fontSize: 12.5, color: C.textSecondary, width: "100%", maxWidth: 340, margin: "0 auto", textAlign: "left" }}>
                <div>• Gói: <strong style={{ color: C.textPrimary }}>{selectedPlan?.name}</strong></div>
                <div>• Phương thức: <strong style={{ color: C.textPrimary }}>{paymentMethod}</strong></div>
                <div>• Trạng thái tài khoản: <strong style={{ color: C.available }}>Kích hoạt (ACTIVE)</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, justifyContent: "flex-end", background: "#FAF7F2" }}>
          {step === "SELECT" && (
            <>
              <button onClick={onClose} style={{ padding: "10px 18px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>Hủy bỏ</button>
              <button onClick={() => setStep("PAYMENT_METHOD")} style={{ padding: "10px 22px", background: C.primary, color: C.white, border: "none", borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Tiếp tục</button>
            </>
          )}
          {step === "PAYMENT_METHOD" && (
            <>
              <button onClick={() => setStep("SELECT")} style={{ padding: "10px 18px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>Quay lại</button>
              <button onClick={() => setStep("QR")} style={{ padding: "10px 22px", background: C.primary, color: C.white, border: "none", borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Tiến hành thanh toán</button>
            </>
          )}
          {step === "QR" && (
            <>
              <button onClick={() => setStep("PAYMENT_METHOD")} style={{ padding: "10px 18px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>Quay lại</button>
              <button onClick={() => setStep("PROCESSING")} style={{ padding: "10px 22px", background: C.primary, color: C.white, border: "none", borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Tôi đã chuyển khoản thành công</button>
            </>
          )}
          {step === "SUCCESS" && (
            <button onClick={() => { onConfirm(); onClose(); }} style={{ width: "100%", padding: "12px", background: C.primary, color: C.white, border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Bắt đầu trải nghiệm ngay</button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes tnScannerLine {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes tnSpin {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
