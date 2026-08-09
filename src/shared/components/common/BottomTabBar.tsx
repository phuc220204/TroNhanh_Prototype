import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Home, Search, MessageSquare, User } from "lucide-react";
import { C, font } from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import { getTotalUnreadCount } from "../../services/messaging-service";

/**
 * Thanh tab dưới cùng của bản mobile.
 *
 * TRƯỚC ĐÂY LÀ BA BẢN SAO — `HomePage`, `SearchResultsPage` và
 * `AllListingsPage` mỗi trang một bản gần giống nhau, và chúng đã trôi khỏi
 * nhau đúng như §8.1 cảnh báo:
 *   • `AllListingsPage`: KHÔNG có `onClick` nào cả — bốn nút đều chết
 *   • hai trang kia: "Thông báo" và "Tài khoản" thiếu `to` nên `onClick` là
 *     `undefined`, bấm không có gì xảy ra
 *
 * "Thông báo" bị thay bằng "Tin nhắn": sản phẩm KHÔNG có tính năng thông báo,
 * nên đó là nút chết cho một thứ không tồn tại. Nhắn tin thì có thật, có badge
 * chưa đọc, mà trên mobile trước giờ phải mở menu hamburger mới tới được.
 */

interface Tab {
  Icon: typeof Home;
  label: string;
  /** Đích khi ĐÃ đăng nhập. */
  to: string;
  /** `true` = khách chưa đăng nhập bấm vào thì đưa sang trang đăng nhập. */
  requiresAuth?: boolean;
  /** Hiện số tin nhắn chưa đọc. */
  showsUnread?: boolean;
}

const TABS: Tab[] = [
  { Icon: Home, label: "Trang chủ", to: "/" },
  { Icon: Search, label: "Tìm phòng", to: "/tim-phong" },
  { Icon: MessageSquare, label: "Tin nhắn", to: "/tin-nhan", requiresAuth: true, showsUnread: true },
  { Icon: User, label: "Tài khoản", to: "/tai-khoan", requiresAuth: true },
];

/** Tab nào đang mở, suy từ URL. */
function activeIndex(pathname: string): number {
  if (pathname === "/" || pathname === "") return 0;
  if (pathname.startsWith("/tim-phong") || pathname.startsWith("/tat-ca-phong")) return 1;
  if (pathname.startsWith("/tin-nhan")) return 2;
  if (pathname.startsWith("/tai-khoan") || pathname.startsWith("/yeu-thich")) return 3;
  return -1;
}

export function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  // Suy tab đang mở từ URL thay vì nhận prop `active={1}`: ba trang trước đây
  // tự truyền số, nên thêm route mới là quên cập nhật và tab sáng sai chỗ.
  const active = activeIndex(location.pathname);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    getTotalUnreadCount()
      .then((n) => { if (!cancelled) setUnread(n); })
      .catch(() => { if (!cancelled) setUnread(0); });
    return () => { cancelled = true; };
  }, [user, location.pathname]);

  return (
    <nav
      data-testid="mobile-tab-bar"
      style={{
        background: C.white,
        borderTop: `1px solid ${C.border}`,
        height: 60,
        display: "flex",
        position: "sticky",
        bottom: 0,
        zIndex: 100,
        boxShadow: "0 -2px 12px rgba(92,70,50,0.08)",
        flexShrink: 0,
      }}
    >
      {TABS.map(({ Icon, label, to, requiresAuth, showsUnread }, i) => {
        const isActive = active === i;
        const badge = showsUnread && user && unread > 0 ? unread : 0;
        return (
          <button
            key={label}
            type="button"
            data-testid={`mobile-tab-${to === "/" ? "home" : to.slice(1)}`}
            onClick={() => {
              // Khách bấm tab cần đăng nhập → đưa sang /dang-nhap kèm `?redirect=`
              // để sau khi đăng nhập quay lại đúng chỗ họ định vào.
              if (requiresAuth && !user) {
                navigate(`/dang-nhap?redirect=${encodeURIComponent(to)}`);
                return;
              }
              navigate(to);
            }}
            style={{
              flex: 1,
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              background: "none",
              border: "none",
              cursor: "pointer",
              // Vùng chạm tối thiểu 44px — thanh cao 60px nên đã đạt, nhưng ghi
              // rõ để lần sau ai đổi chiều cao thì biết đây là ràng buộc.
              minHeight: 44,
            }}
          >
            <Icon size={22} color={isActive ? C.primary : "#9B8C78"} strokeWidth={isActive ? 2.5 : 1.8} />
            <span style={{ fontFamily: font, fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? C.primary : "#9B8C78" }}>
              {label}
            </span>

            {badge > 0 && (
              <span
                data-testid="mobile-tab-unread"
                style={{
                  position: "absolute",
                  top: 6,
                  left: "calc(50% + 6px)",
                  background: C.repairing,
                  color: C.white,
                  fontFamily: font,
                  fontSize: 10,
                  fontWeight: 800,
                  borderRadius: 999,
                  padding: "0 5px",
                  minWidth: 16,
                  lineHeight: "16px",
                  textAlign: "center",
                }}
              >
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
