import { MapPin, Banknote, Building2, Users, Calendar, MessageSquare } from "lucide-react";
import { C, font } from "../../shared/theme";
import type { DemandPostItem } from "../services/demand-post-service";

interface DemandPostCardProps {
  post: DemandPostItem;
  kind?: "RoomWanted" | "RoommateWanted";
  onMessage?: () => void;
  onView?: () => void;
}

function formatMoveInDate(dateStr?: string | null): string {
  if (!dateStr) return "Dọn vào ngay";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Dọn vào ngay";
    return `Dọn vào ${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch {
    return "Dọn vào ngay";
  }
}

function formatGenderReq(gender?: string | null): string {
  if (gender === "Male") return "Nam";
  if (gender === "Female") return "Nữ";
  return "Nam/Nữ";
}

export function DemandPostCard({ post, kind, onMessage, onView }: DemandPostCardProps) {
  const postKind = kind || post.kind || "RoomWanted";
  const isWanted = postKind === "RoomWanted";

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
    <article
      data-testid="demand-post-card"
      style={{
        background: `linear-gradient(160deg, ${C.white} 0%, ${C.bg} 100%)`,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 3px 14px rgba(92,70,50,0.05)",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(92,70,50,0.09)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 3px 14px rgba(92,70,50,0.05)";
      }}
    >
      {/* User Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.primary}, ${C.sand})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: font, fontSize: 12, fontWeight: 800, color: C.white }}>
            {post.initials || "KT"}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: 0, lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {post.name || "Khách thuê"}
          </p>
          <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: "2px 0 0" }}>
            Người thuê
          </p>
        </div>
        <span
          data-testid="demand-kind-badge"
          style={{
            fontFamily: font,
            fontSize: 10.5,
            fontWeight: 700,
            color: isWanted ? C.primaryDark : C.secondary,
            background: isWanted ? C.caramelSoft : C.cream,
            borderRadius: 999,
            padding: "4px 9px",
            whiteSpace: "nowrap",
            border: `1px solid ${isWanted ? "rgba(138,106,69,0.2)" : "rgba(210,199,183,0.3)"}`,
          }}
        >
          {isWanted ? "Tìm phòng" : "Ở ghép"}
        </span>
      </div>

      {/* Post Title */}
      <h3 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary, margin: "0 0 12px", lineHeight: 1.45, minHeight: 44 }}>
        {post.title}
      </h3>

      {/* Structured Details from Real DB Columns */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
          <MapPin size={13} color={C.secondary} strokeWidth={1.9} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, lineHeight: 1.45 }}>
            {districtsText}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
          <Banknote size={13} color={C.secondary} strokeWidth={1.9} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.primary, lineHeight: 1.45 }}>
            {priceText}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
          {isWanted ? (
            <>
              <Building2 size={13} color={C.secondary} strokeWidth={1.9} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, lineHeight: 1.45 }}>
                {post.property_type || "Phòng trọ"} • {formatMoveInDate(post.move_in_date)}
              </span>
            </>
          ) : (
            <>
              <Users size={13} color={C.secondary} strokeWidth={1.9} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, lineHeight: 1.45 }}>
                Cần {post.needed_count || 1} người • {formatGenderReq(post.gender_requirement)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Chips / Tags */}
      {tags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, marginTop: "auto" }}>
          {tags.slice(0, 3).map((item: string) => (
            <span
              key={item}
              style={{
                fontFamily: font,
                fontSize: 10,
                fontWeight: 600,
                color: C.textSecondary,
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "4px 8px",
              }}
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: tags.length === 0 ? "auto" : 0 }}>
        {onMessage && (
          <button
            type="button"
            onClick={onMessage}
            data-testid="demand-contact-btn"
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px",
              background: C.primary,
              color: C.white,
              border: "none",
              borderRadius: 10,
              fontFamily: font,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.primaryHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.primary)}
          >
            <MessageSquare size={13} /> Nhắn tin
          </button>
        )}

        {onView && (
          <button
            type="button"
            onClick={onView}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 38,
              padding: "8px",
              background: "transparent",
              color: C.primary,
              border: `1.5px solid ${C.primary}`,
              borderRadius: 10,
              fontFamily: font,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.caramelSoft)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Xem chi tiết
          </button>
        )}
      </div>
    </article>
  );
}
