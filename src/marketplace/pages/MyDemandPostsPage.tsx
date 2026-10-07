import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
// Nằm trong khu vực TÀI KHOẢN nên dùng chung shell — trước đây trang này tự
// dựng layout riêng, nên bấm "Tin nhu cầu của tôi" từ sidebar là sidebar biến
// mất và người dùng mất luôn đường quay lại các mục khác.
import { RenterShell } from "../../shared/components/RenterShell";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { FileText, Plus, Edit, Eye, EyeOff, Trash2, CheckCircle, Clock } from "lucide-react";
import { C, font } from "../../shared/theme";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { useAuth } from "../../shared/contexts/AuthContext";
import { listMyDemandPosts, setDemandPostStatus, deleteDemandPost, type DemandPostItem } from "../services/demand-post-service";
import { Button, ModalShell } from "../../shared/components/common";
import { useToast } from "../../shared/contexts/ToastContext";
import { toUserMessage } from "../../shared/services/supabase-error";

export function MyDemandPostsPage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { user } = useAuth();

  const [posts, setPosts] = useState<DemandPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Lỗi tải tách khỏi "chưa có tin": trước đây lỗi mạng hiện "Bạn chưa có tin nhu cầu nào".
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DemandPostItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const list = await listMyDemandPosts();
      setPosts(list);
    } catch (err) {
      setLoadError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPosts();
  }, [user]);

  const handleToggleStatus = async (post: DemandPostItem) => {
    const nextStatus = post.status === "Active" ? "Hidden" : "Active";
    try {
      await setDemandPostStatus(post.id, nextStatus);
      showToast(`Đã ${nextStatus === "Active" ? "hiển thị" : "ẩn"} tin đăng.`);
      fetchMyPosts();
    } catch (err) {
      showToast(`Chưa đổi được trạng thái tin: ${toUserMessage(err)}`, { variant: "error" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteDemandPost(deleteTarget.id);
      showToast("Đã xóa tin nhu cầu.");
      setDeleteTarget(null);
      fetchMyPosts();
    } catch (err) {
      showToast(`Chưa xóa được tin: ${toUserMessage(err)}`, { variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <RenterShell active="demands">
      <div style={{ boxSizing: "border-box" }}>
        {deleteTarget && (
          <ModalShell
            title="Xóa tin nhu cầu?"
            size="sm"
            onClose={() => setDeleteTarget(null)}
            footer={
              <>
                <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Hủy</Button>
                <Button variant="danger" loading={isDeleting} onClick={() => void confirmDelete()} data-testid="demand-delete-confirm">Xóa tin</Button>
              </>
            }
          >
            <p style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, margin: 0 }}>
              Tin “{deleteTarget.title}” sẽ bị gỡ khỏi danh sách tin nhu cầu. Thao tác này không hoàn tác được.
            </p>
          </ModalShell>
        )}

        {/* Header Bar */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: font, fontSize: isMobile ? 22 : 26, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>
              Tin nhu cầu của tôi
            </h1>
            <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: 0 }}>
              Quản lý danh sách các tin nhu cầu tìm phòng hoặc tìm bạn ở ghép bạn đã đăng tải.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dang-tin-nhu-cau")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: C.primary,
              color: "white",
              border: "none",
              borderRadius: 12,
              fontFamily: font,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Plus size={16} /> Đăng tin nhu cầu mới
          </button>
        </div>

        {/* Posts Table or Empty State */}
        {loading ? (
          <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, textAlign: "center", padding: "48px 0" }}>
            Đang tải tin đăng của bạn...
          </p>
        ) : loadError ? (
          <div role="alert" style={{ background: C.white, border: `1px solid ${C.errorBorder}`, borderRadius: 16, padding: "48px 24px" }}>
            <EmptyState
              title="Chưa tải được tin nhu cầu của bạn"
              description={loadError}
              action={<Button variant="outline" onClick={() => void fetchMyPosts()}>Thử lại</Button>}
            />
          </div>
        ) : posts.length === 0 ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px" }}>
            <EmptyState
              icon={FileText}
              title="Bạn chưa có tin nhu cầu nào"
              description="Hãy đăng tin nhu cầu tìm phòng hoặc tìm người ở ghép để tìm kiếm sự kết nối nhanh nhất."
              action={
                <button onClick={() => navigate("/dang-tin-nhu-cau")} style={{ padding: "10px 20px", background: C.primary, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700 }}>
                  Đăng tin ngay
                </button>
              }
            />
          </div>
        ) : (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr style={{ background: C.caramelSoft }}>
                    {["Loại tin", "Tiêu đề", "Ngày đăng", "Trạng thái", "Thao tác"].map((h) => (
                      <th key={h} style={{ fontFamily: font, fontSize: 11.5, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", padding: "12px 16px", textAlign: "left" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {posts.map((p) => (
                    <tr key={p.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color: p.kind === "RoomWanted" ? C.primary : C.secondary, background: p.kind === "RoomWanted" ? C.caramelSoft : C.cream, padding: "3px 10px", borderRadius: 999 }}>
                          {p.kind === "RoomWanted" ? "Tìm phòng" : "Ở ghép"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>
                        <div style={{ maxWidth: 320, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.title}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", fontFamily: font, fontSize: 13, color: C.textSecondary }}>
                        {new Date(p.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {p.status === "Active" ? (
                          <span style={{ color: C.success, fontWeight: 700, fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <CheckCircle size={13} /> Hiển thị
                          </span>
                        ) : (
                          <span style={{ color: C.textSecondary, fontWeight: 600, fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <EyeOff size={13} /> {p.status}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            title="Sửa tin"
                            onClick={() => navigate(`/dang-tin-nhu-cau?edit=${p.id}`)}
                            style={{ padding: "6px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer" }}
                          >
                            <Edit size={14} color={C.textPrimary} />
                          </button>
                          <button
                            type="button"
                            title={p.status === "Active" ? "Ẩn tin" : "Hiện tin"}
                            onClick={() => handleToggleStatus(p)}
                            style={{ padding: "6px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer" }}
                          >
                            {p.status === "Active" ? <EyeOff size={14} color={C.textSecondary} /> : <Eye size={14} color={C.primary} />}
                          </button>
                          <button
                            type="button"
                            title="Xóa tin"
                            onClick={() => setDeleteTarget(p)}
                            style={{ padding: "6px", background: C.cream, border: `1px solid ${C.error}`, borderRadius: 6, cursor: "pointer" }}
                          >
                            <Trash2 size={14} color={C.error} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </RenterShell>
  );
}

export default MyDemandPostsPage;
