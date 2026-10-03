import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight, Building2, CreditCard, Headphones, Home, Mail, MessageSquare,
  Search, ShieldCheck, Users,
} from "lucide-react";
import { C, font } from "../../../shared/theme";
import { ModalShell } from "../../../shared/components/common/ModalShell";
import { EmptyState, Skeleton } from "../../../shared/components/common";
import { logError } from "../../../shared/services/supabase-error";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { startConversation } from "../../../shared/services/messaging-service";
import { DemandPostCard } from "../../components/DemandPostCard";

const FEATURES = [
  {
    Icon: ShieldCheck, title: "Thông tin rõ ràng",
    desc: "Giá thuê, chi phí sinh hoạt và trạng thái tin được trình bày thống nhất để bạn dễ kiểm tra trước khi liên hệ.",
  },
  {
    Icon: CreditCard, title: "Thanh toán an toàn",
    desc: "Chuyển khoản trực tiếp qua VietQR trên hóa đơn — không qua trung gian, không phí ẩn.",
  },
  {
    Icon: MessageSquare, title: "Kết nối trực tiếp",
    desc: "Hệ thống chat tích hợp giúp bạn liên hệ trực tiếp với chủ nhà không qua trung gian.",
  },
  {
    Icon: Headphones, title: "Hỗ trợ qua Email",
    desc: "Giải đáp thắc mắc và hỗ trợ chủ trọ cùng người ở qua email chính thức của Trọ Nhanh.",
  },
];

/* ══════════════════════════════════════════
   PRIMITIVES
   ══════════════════════════════════════════ */
function Btn({
  variant = "primary", label, icon, fullWidth, size = "md", onClick,
}: {
  variant?: "primary" | "outline" | "ghost"; label: string;
  icon?: React.ReactNode; fullWidth?: boolean; size?: "sm" | "md" | "lg";
  onClick?: () => void;
}) {
  const [s, setS] = useState<"idle" | "hover" | "pressed">("idle");
  const map: Record<string, Record<string, React.CSSProperties>> = {
    primary: {
      idle:    { background: C.primary,      color: C.white, border: "none" },
      hover:   { background: C.primaryHover, color: C.white, border: "none" },
      pressed: { background: C.primaryPress, color: C.white, border: "none" },
    },
    outline: {
      idle:    { background: "transparent", color: C.primary,      border: `1.5px solid ${C.primary}` },
      hover:   { background: "#F0E7D6",     color: C.primary,      border: `1.5px solid ${C.primary}` },
      pressed: { background: "#F0E7D6",     color: C.primaryPress, border: `1.5px solid ${C.primaryPress}` },
    },
    ghost: {
      idle:    { background: "transparent", color: C.textSecondary, border: "none" },
      hover:   { background: C.cream,       color: C.primaryDark,   border: "none" },
      pressed: { background: C.border,      color: C.primaryDark,   border: "none" },
    },
  };
  const pad = size === "sm" ? "7px 16px" : size === "lg" ? "13px 26px" : "10px 22px";
  const fs  = size === "sm" ? 13 : size === "lg" ? 15 : 14;
  return (
    <button onClick={onClick}
      style={{ fontFamily: font, fontSize: fs, fontWeight: 600, borderRadius: 10, padding: pad,
        width: fullWidth ? "100%" : undefined, justifyContent: fullWidth ? "center" : undefined,
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
        transition: "background 0.12s, color 0.12s", ...map[variant][s] }}
      onMouseEnter={() => setS("hover")} onMouseLeave={() => setS("idle")}
      onMouseDown={() => setS("pressed")} onMouseUp={() => setS("hover")}
    >{icon}{label}</button>
  );
}

export type HomeModalContent = { title: string; description: string } | null;


/* ══════════════════════════════════════════
   MARKETPLACE SECTIONS
   ══════════════════════════════════════════ */
export function MarketplaceSections({
  roomWants, roommateWants, loading, mobile, tablet, onInfo,
}: { roomWants: any[]; roommateWants: any[]; loading: boolean; mobile?: boolean; tablet?: boolean; onInfo: (content: HomeModalContent) => void }) {
  const [activeTab, setActiveTab] = useState<"RoomWanted" | "RoommateWanted">("RoomWanted");

  // Landing chỉ là khối GIỚI THIỆU: hiển thị đúng 1 hàng, xem đầy đủ thì bấm
  // "Xem tất cả nhu cầu". Trước đây render toàn bộ danh sách (24 + 16 card) làm
  // trang chủ dài lê thê và lấn át các khối bên dưới.
  const PREVIEW_LIMIT = 4;

  const cols = mobile ? 1 : tablet ? 2 : PREVIEW_LIMIT;
  const fullList = activeTab === "RoomWanted" ? roomWants : roommateWants;
  const list = fullList.slice(0, PREVIEW_LIMIT);

  const navigate = useNavigate();
  const { user } = useAuth();

  const handleMessage = async (post: any) => {
    if (!user) {
      navigate("/dang-nhap");
      return;
    }
    if (post.renter_id === user.id) return;
    try {
      const convId = await startConversation("DemandPost", post.id);
      navigate(`/tin-nhan/${convId}`);
    } catch (err: any) {
      logError("HomePage.handleMessage", err);
    }
  };

  return (
    <section style={{ background: C.caramelSoft, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "48px 16px" : "64px 32px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: mobile ? "flex-start" : "flex-end", flexDirection: mobile ? "column" : "row", gap: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left" }}>
            <Home size={28} color={C.primary} style={{ flexShrink: 0, marginTop: 4 }} />
            <div>
              <h2 style={{ fontFamily: font, fontSize: mobile ? 22 : 30, fontWeight: 900, color: C.textPrimary, margin: 0 }}>
                Nhu cầu khách thuê &amp; Ở ghép
              </h2>
              <p style={{ fontFamily: font, fontSize: mobile ? 13 : 15, color: C.textSecondary, margin: "4px 0 0", lineHeight: 1.5 }}>
                Tìm kiếm khách thuê đang tìm phòng hoặc các tin tìm người ở ghép cùng chia sẻ chi phí.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => navigate("/tin-nhu-cau")}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, minHeight: 44, padding: "0 4px", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            Xem tất cả nhu cầu →
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "rgba(138,106,69,0.06)", padding: 4, borderRadius: 12, width: mobile ? "100%" : "fit-content" }}>
          <button
            onClick={() => setActiveTab("RoomWanted")}
            style={{
              flex: mobile ? 1 : "none", padding: "10px 20px",
              fontFamily: font, fontSize: 13.5, fontWeight: 700,
              color: activeTab === "RoomWanted" ? C.primary : C.textSecondary,
              background: activeTab === "RoomWanted" ? C.white : "transparent",
              border: "none", borderRadius: 10, cursor: "pointer",
              boxShadow: activeTab === "RoomWanted" ? "0 2px 8px rgba(92,70,50,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Khách tìm phòng ({roomWants.length})
          </button>
          <button
            onClick={() => setActiveTab("RoommateWanted")}
            style={{
              flex: mobile ? 1 : "none", padding: "10px 20px",
              fontFamily: font, fontSize: 13.5, fontWeight: 700,
              color: activeTab === "RoommateWanted" ? C.primary : C.textSecondary,
              background: activeTab === "RoommateWanted" ? C.white : "transparent",
              border: "none", borderRadius: 10, cursor: "pointer",
              boxShadow: activeTab === "RoommateWanted" ? "0 2px 8px rgba(92,70,50,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Tìm bạn ở ghép ({roommateWants.length})
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <Skeleton variant="row" count={3} data-testid="home-demands-loading" />
        ) : list.length === 0 ? (
          <EmptyState
            title={activeTab === "RoomWanted" ? "Chưa có nhu cầu tìm phòng nào" : "Chưa có nhu cầu tìm bạn ở ghép nào"}
            description="Hiện chưa có tin đăng nhu cầu nào thuộc danh mục này."
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: mobile ? 14 : 16 }}>
            {list.map(post => (
              <DemandPostCard
                key={post.id}
                post={post}
                kind={activeTab}
                onMessage={() => handleMessage(post)}
                onView={() => navigate(`/tin-nhu-cau/${post.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   POSTING CTA SECTION
   ══════════════════════════════════════════ */
export function PostingCTASection({
  mobile, onRenterPost, onLandlordPost,
}: { mobile?: boolean; onRenterPost?: () => void; onLandlordPost?: () => void }) {
  const cards = [
    {
      Icon: Building2, title: "Tôi có phòng cho thuê",
      description: "Đăng phòng trống, quản lý danh sách phòng, xuất hóa đơn điện nước và kết nối nhanh chóng với khách hàng.",
      button: "Đăng tin cho thuê", onClick: onLandlordPost, primary: true,
    },
    {
      Icon: Search, title: "Tôi đang tìm phòng",
      description: "Đăng nhu cầu tìm phòng hoặc tìm bạn ở ghép để chủ nhà và các thành viên khác chủ động liên hệ.",
      button: "Đăng tin tìm phòng", onClick: onRenterPost, primary: false,
    },
  ];

  return (
    <section style={{ background: C.white, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "52px 16px" : "72px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: mobile ? 24 : 32 }}>
          <h2 style={{ fontFamily: font, fontSize: mobile ? 22 : 30, fontWeight: 900, color: C.textPrimary, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Bạn muốn đăng tin?</h2>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Chọn nhu cầu phù hợp để bắt đầu kết nối trên Trọ Nhanh.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 14 : 20, maxWidth: 920, margin: "0 auto" }}>
          {cards.map(({ Icon, title, description, button, onClick, primary }) => (
            <div key={title} style={{
              background: primary ? "#FBF8F1" : C.white,
              border: `1.5px solid ${C.border}`, borderRadius: 20,
              padding: mobile ? "24px" : "32px",
              display: "flex", flexDirection: "column", gap: 20, textAlign: "left",
            }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: primary ? C.primary : C.cream, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={22} color={primary ? C.white : C.primary} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: "0 0 7px" }}>{title}</h3>
                <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 20px", lineHeight: 1.65 }}>{description}</p>
                <button type="button" onClick={onClick}
                  style={{
                    minHeight: 44, padding: "11px 22px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: primary ? C.primary : "transparent",
                    color: primary ? C.white : C.primary,
                    border: primary ? "none" : `1.5px solid ${C.primary}`,
                    borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                    transition: "background 0.15s",
                    boxShadow: primary ? "0 2px 8px rgba(138,74,32,0.2)" : "none",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = primary ? C.primaryHover : "rgba(138,74,32,0.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = primary ? C.primary : "transparent"; }}
                >
                  {button} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   MODALS
   ══════════════════════════════════════════ */
export function InfoModal({ content, onClose }: { content: HomeModalContent; onClose: () => void }) {
  if (!content) return null;
  return (
    <ModalShell
      title={content.title}
      onClose={onClose}
      footer={<Btn label="Đã hiểu" onClick={onClose} />}
    >
      <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>{content.description}</p>
    </ModalShell>
  );
}

export function PostTypeModal({ onClose, onSelect }: { onClose: () => void; onSelect: (type: string) => void }) {
  return (
    <ModalShell
      title="Chọn loại tin muốn đăng"
      onClose={onClose}
      footer={<Btn variant="ghost" label="Đóng" onClick={onClose} />}
    >
      <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, lineHeight: 1.65, margin: 0 }}>Người thuê có thể đăng nhu cầu tìm phòng hoặc tìm người phù hợp để ở ghép.</p>
      {[
        { Icon: Search, title: "Đăng nhu cầu tìm phòng", desc: "Cho chủ trọ biết khu vực, ngân sách và loại phòng bạn cần." },
        { Icon: Users, title: "Đăng tin tìm người ở ghép", desc: "Tìm người phù hợp để cùng chia sẻ phòng và chi phí thuê." },
      ].map(({ Icon, title, desc }) => (
        <button type="button" key={title} onClick={() => onSelect(title)}
          style={{ width: "100%", minHeight: 72, display: "flex", alignItems: "center", gap: 12, padding: "14px", textAlign: "left", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={18} color={C.primary} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: "0 0 3px" }}>{title}</p>
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>{desc}</p>
          </div>
          <ArrowRight size={16} color={C.secondary} style={{ flexShrink: 0 }} />
        </button>
      ))}
    </ModalShell>
  );
}

/* ══════════════════════════════════════════
   HERO SEARCH BOX
   ══════════════════════════════════════════ */

export function WhyUsSection({ mobile }: { mobile?: boolean }) {
  const navigate = useNavigate();
  return (
    <section style={{ background: C.caramelSoft, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "52px 20px" : "80px 32px", display: "flex", flexDirection: mobile ? "column" : "row", gap: mobile ? 40 : 64, alignItems: mobile ? "flex-start" : "center" }}>
        {/* Left text */}
        <div style={{ flex: mobile ? "none" : "0 0 340px", textAlign: "left" }}>
          <p style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: C.secondary, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            LÝ DO CHỌN TRỌ NHANH
          </p>
          <h2 style={{ fontFamily: font, fontSize: mobile ? 24 : 32, fontWeight: 900, color: C.textPrimary, margin: "0 0 16px", lineHeight: 1.25, letterSpacing: "-0.02em" }}>
            Tại sao nên chọn{" "}
            <span style={{ color: C.primary }}>Trọ Nhanh?</span>
          </h2>
          <p style={{ fontFamily: font, fontSize: 15, color: C.textSecondary, margin: "0 0 28px", lineHeight: 1.7 }}>
            Chúng tôi tối ưu hóa quy trình tìm phòng, giúp bạn tiết kiệm thời gian và công sức.
          </p>
          <Btn variant="outline" label="Bắt đầu tìm phòng" icon={<ArrowRight size={15} />} onClick={() => navigate("/tim-phong")} />
        </div>

        {/* Right 2×2 feature grid */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          {FEATURES.map(({ Icon, title, desc }) => (
            <div key={title} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 22px 24px", textAlign: "left" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Icon size={20} color={C.primary} strokeWidth={1.8} />
              </div>
              <h4 style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px" }}>{title}</h4>
              <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0, lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   LANDLORD CTA BANNER
   ══════════════════════════════════════════ */
export function LandlordCTA({ mobile, onPost }: { mobile?: boolean; onPost?: () => void }) {
  return (
    <section style={{
      background: C.white,
      padding: mobile ? "40px 16px" : "48px 32px",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        background: `linear-gradient(135deg, #3E240E 0%, ${C.primaryDark} 50%, #4A2E14 100%)`,
        borderRadius: 24, padding: mobile ? "36px 24px" : "48px 60px",
        display: "flex", flexDirection: mobile ? "column" : "row",
        alignItems: "center", justifyContent: "space-between", gap: 32,
        position: "relative", overflow: "hidden",
        boxShadow: "0 12px 30px rgba(47,27,14,0.2)"
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: -40, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 20, textAlign: "left", flex: 1 }}>
          {!mobile && (
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Home size={28} color={C.secondary} />
            </div>
          )}
          <div>
            <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: "rgba(232,222,201,0.6)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Dành cho chủ nhà
            </p>
            <h2 style={{ fontFamily: font, fontSize: mobile ? 22 : 28, fontWeight: 900, color: C.cream, margin: "0 0 8px", lineHeight: 1.25, letterSpacing: "-0.02em" }}>
              Bạn có phòng cho thuê?
            </h2>
            <p style={{ fontFamily: font, fontSize: mobile ? 13.5 : 14.5, color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.6, maxWidth: 580 }}>
              Tham gia cùng hàng ngàn chủ nhà khác để tiếp cận lượng khách hàng tiềm năng thông qua nền tảng này.
            </p>
          </div>
        </div>

        <button onClick={onPost} style={{
          padding: "14px 30px", background: C.white, color: C.primary,
          border: "none", borderRadius: 12, fontFamily: font, fontSize: 14.5, fontWeight: 700,
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
          boxShadow: "0 4px 10px rgba(0,0,0,0.15)", transition: "all 0.2s ease", zIndex: 2, whiteSpace: "nowrap"
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)"; }}>
          Đăng tin miễn phí ngay
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   SITE FOOTER (Light background, matching third image mockup)
   ══════════════════════════════════════════ */
export function SiteFooter({ mobile }: { mobile?: boolean }) {
  const navigate = useNavigate();
  const cols = mobile ? 1 : 3;
  return (
    <footer style={{ background: "#FAF7F2", borderTop: `1.5px solid ${C.border}`, padding: mobile ? "48px 16px 32px" : "64px 32px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: mobile ? 36 : 48, marginBottom: 48, textAlign: "left" }}>
          {/* Col 1: Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <Home size={22} color={C.primary} />
              <span style={{ fontFamily: font, fontSize: 22, fontWeight: 900, color: C.textPrimary, display: "block" }}>Trọ Nhanh</span>
            </div>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, lineHeight: 1.75, margin: "0 0 20px", maxWidth: 260 }}>
              Nền tảng tìm kiếm và quản lý phòng trọ tại Việt Nam. Mang lại giải pháp an toàn và hiệu quả cho sinh viên và người lao động.
            </p>
          </div>

          {/* Col 2: Khám phá */}
          <div>
            <p style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: C.textPrimary, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Khám phá</p>
            {[
              { label: "Tìm phòng trọ", to: "/tim-phong?type=Phòng%20trọ" },
              { label: "Căn hộ dịch vụ", to: "/tim-phong?type=Căn%20hộ%20dịch%20vụ" },
              { label: "Nhà nguyên căn", to: "/tim-phong?type=Nhà%20nguyên%20căn" },
              { label: "Tin tìm phòng & ở ghép", to: "/tin-nhu-cau" },
            ].map(({ label, to }) => (
              <button type="button" key={label} onClick={() => navigate(to)} style={{ display: "block", fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 10px", cursor: "pointer", background: "none", border: "none", padding: 0, textAlign: "left" }}>{label}</button>
            ))}
          </div>

          {/* Col 3: Liên hệ */}
          <div>
            <p style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: C.textPrimary, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Liên hệ</p>
            <a href="mailto:tronhanh2026@gmail.com" style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: font, fontSize: 13.5, color: C.textSecondary, textDecoration: "none" }}>
              <Mail size={14} color={C.secondary} /> tronhanh2026@gmail.com
            </a>
            <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: "12px 0 0", lineHeight: 1.6 }}>Thông tin pháp lý, số điện thoại và địa chỉ sẽ được công bố sau khi hoàn tất xác minh doanh nghiệp.</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>
            © {new Date().getFullYear()} Trọ Nhanh Platform. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
