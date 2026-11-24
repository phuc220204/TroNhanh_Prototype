import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ChevronDown, Search, SearchX } from "lucide-react";
import { C, font, radius, space } from "../../theme";
import { useBreakpoint } from "../../components/useBreakpoint";
import { PublicNavbar } from "../../components/PublicNavbar";
import { EmptyState } from "../../components/common/EmptyState";
import { LEGAL_ROUTES, SUPPORT_EMAIL } from "../../constants/legal";
import { HELP_GROUPS, type HelpGroup, type HelpItem } from "./content";

const ALL_GROUPS = "all";

/** Bỏ dấu + chữ thường: gõ "thu ho" vẫn khớp "Thu hộ". */
function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase();
}

function itemMatches(item: HelpItem, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const haystack = [item.question, ...item.paragraphs, ...(item.bullets ?? [])].join(" ");
  return normalizeText(haystack).includes(normalizedQuery);
}

/** Hash dạng "#phi-dich-vu" → id câu hỏi hoặc id nhóm (nếu có). */
function readHashTarget(hash: string): { itemId: string | null; groupId: string | null } {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return { itemId: null, groupId: null };
  if (HELP_GROUPS.some((g) => g.id === id)) return { itemId: null, groupId: id };
  if (HELP_GROUPS.some((g) => g.items.some((i) => i.id === id))) return { itemId: id, groupId: null };
  return { itemId: null, groupId: null };
}

function HelpAccordionItem({ item, isOpen, onToggle }: { item: HelpItem; isOpen: boolean; onToggle: () => void }) {
  const panelId = `${item.id}-panel`;
  return (
    <div id={item.id} data-testid={`help-item-${item.id}`} style={{ borderBottom: `1px solid ${C.border}`, scrollMarginTop: 88 }}>
      <h3 style={{ margin: 0 }}>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3],
            padding: `${space[4]}px 0`, background: "none", border: "none", cursor: "pointer", textAlign: "left",
            fontFamily: font, fontSize: 15, fontWeight: 700, color: isOpen ? C.primary : C.textPrimary, lineHeight: 1.45,
          }}
        >
          <span style={{ minWidth: 0 }}>{item.question}</span>
          <ChevronDown size={18} color={C.textSecondary} style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </button>
      </h3>
      {isOpen && (
        <div id={panelId} role="region" aria-label={item.question} style={{ padding: `0 0 ${space[4]}px`, fontFamily: font }}>
          {item.paragraphs.map((text) => (
            <p key={text} style={{ fontSize: 14.5, color: C.textPrimary, lineHeight: 1.75, margin: `0 0 ${space[2]}px` }}>{text}</p>
          ))}
          {item.bullets && (
            <ul style={{ margin: 0, paddingLeft: space[5], display: "flex", flexDirection: "column", gap: space[1] }}>
              {item.bullets.map((text) => (
                <li key={text} style={{ fontSize: 14.5, color: C.textPrimary, lineHeight: 1.7 }}>{text}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function GroupChip({ label, isActive, onClick, testId }: { label: string; isActive: boolean; onClick: () => void; testId: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      data-testid={testId}
      style={{
        padding: "6px 14px", borderRadius: radius.pill, fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
        background: isActive ? C.primary : C.white,
        color: isActive ? C.white : C.textSecondary,
        border: `1px solid ${isActive ? C.primary : C.border}`,
      }}
    >
      {label}
    </button>
  );
}

/** Trang Hướng dẫn sử dụng / câu hỏi thường gặp — công khai, nội dung ở `content.ts`. */
export function HelpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useBreakpoint();
  const [query, setQuery] = useState("");
  const [activeGroupId, setActiveGroupId] = useState<string>(ALL_GROUPS);
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const { itemId } = readHashTarget(location.hash);
    return new Set(itemId ? [itemId] : []);
  });

  // Mở sẵn và cuộn tới mục theo hash (`/huong-dan#lap-hoa-don`), kể cả khi hash đổi lúc đang ở trang.
  useEffect(() => {
    const { itemId, groupId } = readHashTarget(location.hash);
    const targetId = itemId ?? groupId;
    if (!targetId) {
      window.scrollTo({ top: 0 });
      return;
    }
    setQuery("");
    setActiveGroupId(ALL_GROUPS);
    if (itemId) setOpenIds((prev) => new Set(prev).add(itemId));
    // setTimeout thay vì requestAnimationFrame: rAF bị dừng khi tab chạy nền.
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: "start" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const normalizedQuery = normalizeText(query.trim());
  const visibleGroups = useMemo<HelpGroup[]>(
    () => HELP_GROUPS
      .filter((group) => activeGroupId === ALL_GROUPS || group.id === activeGroupId)
      .map((group) => ({ ...group, items: group.items.filter((item) => itemMatches(item, normalizedQuery)) }))
      .filter((group) => group.items.length > 0),
    [activeGroupId, normalizedQuery],
  );

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicNavbar onSearch={() => navigate("/tim-phong")} />

      <main
        data-testid="help-page"
        style={{ flex: 1, width: "100%", maxWidth: 780, margin: "0 auto", padding: isMobile ? `${space[6]}px ${space[4]}px ${space[10]}px` : `${space[10]}px ${space[8]}px 64px`, boxSizing: "border-box", fontFamily: font }}
      >
        <h1 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[2]}px` }}>Hướng dẫn sử dụng</h1>
        <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.7, margin: `0 0 ${space[6]}px` }}>
          Câu hỏi thường gặp về đăng tin, quản lý khu trọ, lập hóa đơn và tiền thuê trên Trọ Nhanh.
        </p>

        <label style={{ position: "relative", display: "block", marginBottom: space[4] }}>
          <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Tìm câu hỏi</span>
          <Search size={18} color={C.textSecondary} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm: thu hộ, hóa đơn, tính theo ngày…"
            data-testid="help-search"
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px 12px 42px", borderRadius: radius.md, border: `1px solid ${C.border}`, background: C.white, fontFamily: font, fontSize: 15, color: C.textPrimary, outline: "none" }}
          />
        </label>

        <div role="group" aria-label="Lọc theo nhóm" style={{ display: "flex", flexWrap: "wrap", gap: space[2], marginBottom: space[6] }}>
          <GroupChip label="Tất cả" isActive={activeGroupId === ALL_GROUPS} onClick={() => setActiveGroupId(ALL_GROUPS)} testId="help-group-chip-all" />
          {HELP_GROUPS.map((group) => (
            <GroupChip key={group.id} label={group.title} isActive={activeGroupId === group.id} onClick={() => setActiveGroupId(group.id)} testId={`help-group-chip-${group.id}`} />
          ))}
        </div>

        {visibleGroups.length === 0 ? (
          <EmptyState icon={SearchX} title="Không tìm thấy câu hỏi phù hợp" description={`Thử từ khóa khác, hoặc gửi câu hỏi về ${SUPPORT_EMAIL}.`} />
        ) : (
          visibleGroups.map((group) => (
            <section key={group.id} id={group.id} data-testid={`help-group-${group.id}`} style={{ marginBottom: space[8], scrollMarginTop: 88 }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", margin: `0 0 ${space[1]}px` }}>{group.title}</h2>
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.md, padding: `0 ${isMobile ? space[4] : space[5]}px` }}>
                {group.items.map((item) => (
                  <HelpAccordionItem key={item.id} item={item} isOpen={openIds.has(item.id)} onToggle={() => toggleItem(item.id)} />
                ))}
              </div>
            </section>
          ))
        )}

        <p style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.8, marginTop: space[8], paddingTop: space[5], borderTop: `1px solid ${C.border}` }}>
          Nội dung hướng dẫn chỉ để tham khảo, không phải tư vấn thuế, kế toán hay pháp lý. Quy định chính thức xem tại{" "}
          <Link to={LEGAL_ROUTES.terms} data-testid="help-link-terms" style={{ color: C.primary, fontWeight: 700 }}>Điều khoản sử dụng</Link>,{" "}
          <Link to={LEGAL_ROUTES.privacy} style={{ color: C.primary, fontWeight: 700 }}>Chính sách bảo mật</Link> và{" "}
          <Link to={LEGAL_ROUTES.refund} style={{ color: C.primary, fontWeight: 700 }}>Chính sách hoàn tiền</Link>.
          <br />
          Cần hỗ trợ thêm: <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.primary, fontWeight: 700 }}>{SUPPORT_EMAIL}</a>
        </p>
      </main>
    </div>
  );
}
