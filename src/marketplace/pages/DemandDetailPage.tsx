import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { PublicNavbar } from "../../shared/components/PublicNavbar";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { MapPin, Banknote, Building2, Users, Calendar, MessageSquare, ArrowLeft, User, Shield } from "lucide-react";
import { C, font } from "../../shared/theme";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { useAuth } from "../../shared/contexts/AuthContext";
import { getDemandPostById, type DemandPostItem } from "../services/demand-post-service";
import { startConversation } from "../../shared/services/messaging-service";

export function DemandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { user } = useAuth();

  const [post, setPost] = useState<DemandPostItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await getDemandPostById(id);
        setPost(data);
      } catch (_) {
        setPost(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleMessage = async () => {
    if (!post) return;
    if (!user) {
      navigate(`/dang-nhap?redirect=/tin-nhu-cau/${post.id}`);
      return;
    }
    if (post.renter_id === user.id) return;
    try {
      const convId = await startConversation("DemandPost", post.id);
      navigate(`/tin-nhan/${convId}`);
    } catch (_) {
      // Handled
    }
  };

  const isOwner = Boolean(user && post?.renter_id === user.id);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font }}>
        <PublicNavbar />
        <div style={{ maxWidth: 800, margin: "40px auto", padding: 20, textAlign: "center", color: C.textSecondary }}>
          Đang tải chi tiết tin nhu cầu...
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font }}>
        <PublicNavbar />
        <div style={{ maxWidth: 800, margin: "40px auto", padding: 20 }}>
          <EmptyState
            title="Không tìm thấy tin nhu cầu"
            description="Tin nhu cầu này có thể đã bị gỡ hoặc không tồn tại."
            action={
              <button onClick={() => navigate("/tin-nhu-cau")} style={{ padding: "10px 20px", background: C.primary, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700 }}>
                Xem danh sách tin nhu cầu
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const isWanted = post.kind === "RoomWanted";
  const districtsText = post.desired_districts?.length
    ? post.desired_districts.join(", ")
    : post.district || "TP. Hồ Chí Minh";

  const priceText = isWanted
    ? post.price_min && post.price_max
      ? `${Number(post.price_min).toLocaleString("vi-VN")}đ - ${Number(post.price_max).toLocaleString("vi-VN")}đ`
      : post.price_max
      ? `Dưới ${Number(post.price_max).toLocaleString("vi-VN")}đ`
      : "Thỏa thuận"
    : post.share_price
    ? `${Number(post.share_price).toLocaleString("vi-VN")}đ/tháng`
    : "Thỏa thuận";

  const tags = isWanted
    ? post.desired_amenities || []
    : post.requirements || [];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font }}>
      <PublicNavbar />

      <div style={{ maxWidth: 840, margin: "0 auto", padding: isMobile ? 16 : "32px 24px 60px" }}>
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate("/tin-nhu-cau")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: font, fontSize: 13.5, color: C.textSecondary, marginBottom: 16 }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>

        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: isMobile ? 20 : 32, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          {/* Header & Badges */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
            <span
              style={{
                fontFamily: font,
                fontSize: 12,
                fontWeight: 700,
                color: isWanted ? C.primaryDark : C.secondary,
                background: isWanted ? C.caramelSoft : C.cream,
                borderRadius: 999,
                padding: "4px 12px",
                border: `1px solid ${isWanted ? "rgba(138,106,69,0.2)" : "rgba(210,199,183,0.3)"}`,
              }}
            >
              {isWanted ? "Tìm phòng trọ" : "Tìm bạn ở ghép"}
            </span>

            <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>
              Đăng ngày {new Date(post.created_at).toLocaleDateString("vi-VN")}
            </span>
          </div>

          <h1 style={{ fontFamily: font, fontSize: isMobile ? 20 : 24, fontWeight: 900, color: C.textPrimary, margin: "0 0 20px", lineHeight: 1.35 }}>
            {post.title}
          </h1>

          {/* User Card */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: C.caramelSoft, borderRadius: 14, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${C.primary}, ${C.sand})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontFamily: font, fontSize: 16, fontWeight: 800 }}>
              {post.initials || "KT"}
            </div>
            <div>
              <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 2px" }}>
                {post.name || "Khách thuê"}
              </p>
              <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0 }}>
                {isWanted ? "Người tìm phòng" : "Người đăng tìm bạn ở ghép"}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24, padding: 18, border: `1px solid ${C.border}`, borderRadius: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <MapPin size={18} color={C.secondary} />
              <div>
                <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: "0 0 2px" }}>Khu vực</p>
                <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{districtsText}</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Banknote size={18} color={C.primary} />
              <div>
                <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: "0 0 2px" }}>Ngân sách / Giá</p>
                <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.primary, margin: 0 }}>{priceText}</p>
              </div>
            </div>

            {isWanted ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Building2 size={18} color={C.secondary} />
                  <div>
                    <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: "0 0 2px" }}>Loại hình</p>
                    <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{post.property_type || "Phòng trọ"}</p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Calendar size={18} color={C.secondary} />
                  <div>
                    <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: "0 0 2px" }}>Ngày dọn vào</p>
                    <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{post.move_in_date || "Dọn vào ngay"}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Users size={18} color={C.secondary} />
                  <div>
                    <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: "0 0 2px" }}>Số người cần tìm</p>
                    <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Cần {post.needed_count || 1} người</p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <User size={18} color={C.secondary} />
                  <div>
                    <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: "0 0 2px" }}>Yêu cầu giới tính</p>
                    <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
                      {post.gender_requirement === "Male" ? "Nam" : post.gender_requirement === "Female" ? "Nữ" : "Nam/Nữ đều được"}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Amenities or Requirements Tags */}
          {tags.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>
                {isWanted ? "Tiện ích mong muốn" : "Yêu cầu ở ghép"}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {tags.map((t) => (
                  <span key={t} style={{ background: C.caramelSoft, color: C.primary, fontFamily: font, fontSize: 12.5, fontWeight: 600, padding: "5px 12px", borderRadius: 8 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {post.description && (
            <div style={{ marginBottom: 28, borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
              <h3 style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>
                Mô tả chi tiết
              </h3>
              <p style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
                {post.description}
              </p>
            </div>
          )}

          {/* CTA Bar */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              disabled={isOwner}
              onClick={handleMessage}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                background: isOwner ? C.border : C.primary,
                color: isOwner ? C.textSecondary : "white",
                border: "none",
                borderRadius: 12,
                fontFamily: font,
                fontSize: 15,
                fontWeight: 700,
                cursor: isOwner ? "not-allowed" : "pointer",
                boxShadow: isOwner ? "none" : "0 4px 14px rgba(138,106,69,0.25)",
              }}
            >
              <MessageSquare size={18} /> {isOwner ? "Tin nhu cầu của bạn" : "Nhắn tin trực tiếp"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DemandDetailPage;
