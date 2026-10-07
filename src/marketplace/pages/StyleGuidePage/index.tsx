import { useNavigate } from "react-router";
import { Heart, X, ArrowLeft } from "lucide-react";
import { StyleSection } from "../../../shared/components/StyleSection";
import { C, font } from "../../../shared/theme";
import { Button, Badge, Card, Table, EmptyState, Pagination, Toast, Skeleton } from "../../../shared/components/common";
import { type BtnVariant, row, col, Tag, Btn, BtnSwatch, PALETTE, STATUS_COLORS, ColorSwatch, TYPE_SCALE, SPACINGS, RADII, ICONS } from "./atoms";
import { SAMPLE_ROOMS, RoomCard, OwnerContactCard, StatCard, FormShowcase, TopNavbarDemo, BottomTabBarDemo, BottomSheetDemo } from "./demos";

/* ══════════════════════════════════════════
   STYLE GUIDE PAGE
══════════════════════════════════════════ */
export function StyleGuidePage() {
  const navigate = useNavigate();
  const onBack = () => navigate(-1);
  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: font }}>

      {/* Demo Banner */}
      <div style={{ background: C.cream, borderBottom: `1px solid ${C.border}`, height: 34,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: font, fontSize: 12, color: C.primaryDark, fontWeight: 500 }}>
          Đây là sản phẩm demo để lấy feedback, tối ưu nhất khi xem trên giao diện web.
        </span>
      </div>

      {/* Header */}
      <div style={{ background: C.primaryDark, padding: "28px 0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
          <button onClick={onBack} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 8, padding: "6px 14px", cursor: "pointer",
              fontFamily: font, fontSize: 13, fontWeight: 600, color: C.cream, marginBottom: 16,
            }}>
              <ArrowLeft size={13} /> Trang chủ
            </button>
          <div style={row({ gap: 14, flexWrap: "wrap" })}>
            <span style={{ fontFamily: font, fontSize: 26, fontWeight: 800, color: C.cream }}>Trọ Nhanh</span>
            <span style={{ fontFamily: font, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Design System · v2.0 · Style Guide</span>
          </div>
          <p style={{ fontFamily: font, fontSize: 14, color: "rgba(255,255,255,0.55)", margin: "8px 0 20px" }}>
            Hệ thống thiết kế — tông màu cát ấm, thân thiện &amp; đáng tin cậy.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["1. Màu sắc","2. Chữ","3. Khoảng cách","4. Biểu tượng","5. Components","6. Navigation","7. Overlays","8. Primitives"].map(n => (
              <a key={n} href={`#sec-${n[0]}`}
                style={{ fontFamily: font, fontSize: 11, color: "rgba(255,255,255,0.6)",
                  padding: "4px 12px", border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 999, textDecoration: "none", whiteSpace: "nowrap" }}>{n}</a>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 32px 80px" }}>

        {/* ── 1. COLOR PALETTE ── */}
        <StyleSection title="1 · Bảng Màu Sắc" id="sec-1">
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 20px" }}>
            Tất cả cặp text/nền đảm bảo WCAG AA (≥ 4.5:1). Brand trên nav tối dùng cream — không dùng primary.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
            {PALETTE.map(p => <ColorSwatch key={p.hex} {...p} />)}
          </div>
          <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: "0 0 12px" }}>
            Màu trạng thái &amp; ngữ nghĩa
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {STATUS_COLORS.map(s => (
              <div key={s.hex} style={row({ gap: 10, background: C.white, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "10px 14px", minWidth: 200 })}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: s.hex, flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{s.label}</p>
                  <p style={{ fontFamily: font, fontSize: 10, color: C.textSecondary, margin: "2px 0 0" }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </StyleSection>

        {/* ── 2. TYPOGRAPHY ── */}
        <StyleSection title="2 · Chữ / Typography" id="sec-2">
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 20px" }}>
            Font: <strong>Be Vietnam Pro</strong> — đầy đủ dấu tiếng Việt. Fallback: Inter, system-ui, sans-serif.
          </p>
          <div style={col({ gap: 0 })}>
            {TYPE_SCALE.map(t => (
              <div key={t.name} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 16,
                alignItems: "start", borderBottom: `1px solid ${C.border}`, padding: "16px 0" }}>
                <div>
                  <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: 0 }}>{t.name}</p>
                  <p style={{ fontFamily: font, fontSize: 10, color: C.sand, margin: "3px 0 0" }}>{t.size} · w{t.weight} · lh{t.lh}</p>
                </div>
                <p style={{ fontFamily: font, fontSize: t.size, fontWeight: t.weight, color: t.color, lineHeight: t.lh, margin: 0 }}>
                  {t.sample}
                </p>
              </div>
            ))}
          </div>
        </StyleSection>

        {/* ── 3. SPACING & LAYOUT ── */}
        <StyleSection title="3 · Khoảng Cách &amp; Bố Cục" id="sec-3">
          <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 12px" }}>
            Spacing scale (8px base)
          </p>
          <div style={row({ flexWrap: "wrap", gap: 24, alignItems: "flex-end", marginBottom: 32 })}>
            {SPACINGS.map(s => (
              <div key={s} style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", height: 40, marginBottom: 4 }}>
                  <div style={{ width: s, height: s, background: C.primary, borderRadius: 3 }} />
                </div>
                <span style={{ fontFamily: font, fontSize: 10, color: C.textSecondary }}>{s}px</span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 12px" }}>
            Corner radius scale
          </p>
          <div style={row({ flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 32 })}>
            {RADII.map(r => (
              <div key={r.label} style={{ textAlign: "center" }}>
                <div style={{ width: r.w, height: r.h, borderRadius: r.r, background: C.cream, border: `1.5px solid ${C.border}` }} />
                <span style={{ fontFamily: font, fontSize: 10, color: C.textSecondary, display: "block", marginTop: 6 }}>{r.label}</span>
              </div>
            ))}
          </div>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 10px" }}>Responsive grid</p>
            {[
              { label: "Desktop ≥ 1024px", desc: "Top navbar + 4-col room grid + left sidebar filters" },
              { label: "Tablet 768–1023px", desc: "2-col room grid, sidebar collapses" },
              { label: "Mobile < 768px",    desc: "Bottom tab bar + 1-col list + bottom-sheet filters + sticky CTA" },
            ].map(g => (
              <div key={g.label} style={row({ gap: 12, padding: "9px 14px", background: C.bg, borderRadius: 8, marginBottom: 6 })}>
                <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary, minWidth: 170, flexShrink: 0 }}>{g.label}</span>
                <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>{g.desc}</span>
              </div>
            ))}
          </div>
        </StyleSection>

        {/* ── 4. ICONOGRAPHY ── */}
        <StyleSection title="4 · Biểu Tượng / Iconography" id="sec-4">
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 16px" }}>
            Phong cách duy nhất: <strong>outline</strong> · Lucide React · strokeWidth 1.8–2.
            Kích thước: 16px (inline), 20px (action), 22px (tab bar).
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {ICONS.map(({ Icon, label }) => (
              <div key={label} style={col({ alignItems: "center", gap: 6, width: 64 })}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: C.cream,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={20} color={C.primary} strokeWidth={1.8} />
                </div>
                <span style={{ fontFamily: font, fontSize: 9, color: C.textSecondary, textAlign: "center", lineHeight: 1.3 }}>{label}</span>
              </div>
            ))}
          </div>
        </StyleSection>

        {/* ── 5. CORE COMPONENTS ── */}
        <StyleSection title="5 · Components" id="sec-5">

          {/* 5a. Buttons — interactive */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>5a · Buttons — tương tác thật</p>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 16px" }}>
              Di chuột / nhấn để thấy thay đổi màu. Mỗi trạng thái tối hơn rõ ràng.
            </p>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={row({ gap: 12, flexWrap: "wrap" })}>
                <Btn variant="primary"   label="Nút chính" />
                <Btn variant="secondary" label="Nút phụ" />
                <Btn variant="outline"   label="Outline" />
                <Btn variant="ghost"     label="Ghost" />
                <Btn variant="primary"   label="Vô hiệu" disabled />
              </div>
            </div>

            {/* Frozen state comparison */}
            <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 12px" }}>
              So sánh trạng thái — mỗi bước tối hơn rõ ràng
            </p>
            {(["primary","secondary","outline","ghost"] as BtnVariant[]).map(v => {
              const titles: Record<BtnVariant, string> = {
                primary:   "Primary · #8A6A45 → #73572F → #5C4632",
                secondary: "Secondary · #B08D63 → #9A784F → #836237",
                outline:   "Outline · transparent → #F0E7D6 fill → border #5C4632",
                ghost:     "Ghost · transparent → cream fill → border",
              };
              return (
                <div key={v} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 10 }}>
                  <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary,
                    textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>{titles[v]}</p>
                  <div style={row({ gap: 20, flexWrap: "wrap" })}>
                    {(["default","hover","pressed","disabled"] as const).map(s => (
                      <BtnSwatch key={s} variant={v} state={s} label={
                        s === "default" ? "Mặc định" : s === "hover" ? "Hover" : s === "pressed" ? "Nhấn" : "Vô hiệu"
                      } />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5b. Form components */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 16px" }}>
              5b · Form Components
            </p>
            <FormShowcase />
          </div>

          {/* 5c. Cards & surfaces */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 16px" }}>
              5c · Card / Surface
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {[
                { bg: C.white,  label: "White — thẻ nội dung chính", hex: "#FFFFFF" },
                { bg: C.cream,  label: "Cream — nền thẻ phụ", hex: "#E8DEC9" },
                { bg: C.bg,     label: "Background — nền trang", hex: "#F5EFE4" },
              ].map(s => (
                <div key={s.hex} style={{ padding: 20, borderRadius: 12, border: `1px solid ${C.border}`,
                  background: s.bg, minWidth: 200, boxShadow: "0 2px 8px rgba(92,70,50,0.06)" }}>
                  <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 4px" }}>{s.label}</p>
                  <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: 0 }}>{s.hex}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 5d. Room Card */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
              5d · Room Card (Thẻ phòng)
            </p>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 16px" }}>
              Thumbnail · Status chip · Giá màu primary · Diện tích & khu vực · 3 amenity icons · Heart save toggle
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {SAMPLE_ROOMS.map(r => <RoomCard key={r.title} room={r} />)}
            </div>
          </div>

          {/* 5e. Status Chips */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 12px" }}>
              5e · Status Chip
            </p>
            <div style={row({ gap: 10, flexWrap: "wrap" })}>
              {[
                { label: "Trống",    bg: C.available },
                { label: "Đã thuê", bg: C.rented },
                { label: "Đã ẩn",   bg: C.repairing },
              ].map(c => (
                <span key={c.label} style={{ fontFamily: font, fontSize: 12, fontWeight: 700,
                  padding: "5px 14px", borderRadius: 999, background: c.bg, color: "#fff" }}>{c.label}</span>
              ))}
            </div>
          </div>

          {/* 5f. Owner Contact Card */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
              5f · Owner Contact Card (Liên hệ chủ trọ)
            </p>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 16px" }}>
              Dùng trên màn chi tiết phòng. Người thuê nhắn tin trong nền tảng hoặc gọi điện — <strong>không có đặt lịch trong app</strong>.
            </p>
            <OwnerContactCard />
          </div>

          {/* 5g. Stat Card large */}
          <div>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
              5g · Stat Card lớn (Dashboard chủ trọ)
            </p>
            <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 16px" }}>
              "Số phòng trống" là thông tin chính — luôn hiển thị. Tổng phòng &amp; số khách là toggle mặc định TẮT.
            </p>
            <div style={row({ flexWrap: "wrap", gap: 16 })}>
              <StatCard />
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, minWidth: 260 }}>
                <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 14px" }}>
                  Tùy chọn hiển thị
                </p>
                {["Hiển thị Tổng số phòng","Hiển thị Số khách đang ở"].map(t => (
                  <div key={t} style={row({ justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` })}>
                    <span style={{ fontFamily: font, fontSize: 13, color: C.textPrimary }}>{t}</span>
                    <div style={{ width: 40, height: 22, borderRadius: 999, background: C.border, position: "relative" }}>
                      <div style={{ width: 16, height: 16, borderRadius: 999, background: "#fff", position: "absolute", top: 3, left: 3 }} />
                    </div>
                  </div>
                ))}
                <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: "10px 0 0" }}>
                  Mặc định TẮT — chủ trọ tự bật mới thấy.
                </p>
              </div>
            </div>
          </div>
        </StyleSection>

        {/* ── 6. NAVIGATION ── */}
        <StyleSection title="6 · Navigation" id="sec-6">
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 6px" }}>
              Top Navbar (Web) — Brand "Trọ Nhanh" dùng cream #E8DEC9 trên nền espresso #5C4632
            </p>
            <p style={{ fontFamily: font, fontSize: 12, color: C.error, margin: "0 0 12px" }}>
              ⚠ KHÔNG dùng #8A6A45 cho brand ở đây — màu đó bị chìm vào nền tối.
            </p>
            <TopNavbarDemo />
          </div>

          <div>
            <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 12px" }}>
              Bottom Tab Bar (Mobile) — active #8A6A45, inactive #9B8C78
            </p>
            <div style={{ maxWidth: 390, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", background: C.bg }}>
              <div style={{ height: 80, background: C.cream, display: "flex", alignItems: "center",
                justifyContent: "center" }}>
                <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>Nội dung màn hình</span>
              </div>
              <BottomTabBarDemo />
            </div>
          </div>
        </StyleSection>

        {/* ── 7. OVERLAYS ── */}
        <StyleSection title="7 · Overlays" id="sec-7">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 28 }}>
            <div>
              <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 12px" }}>
                Bottom Sheet (Mobile filter)
              </p>
              <div style={{ background: C.bg, borderRadius: 14, overflow: "hidden", paddingTop: 60,
                border: `1px solid ${C.border}`, maxWidth: 390 }}>
                <BottomSheetDemo />
              </div>
            </div>
            <div>
              <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 12px" }}>
                Demo Banner — xuất hiện trên mọi trang
              </p>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ background: C.cream, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: font, fontSize: 12, color: C.primaryDark, fontWeight: 500 }}>
                    Đây là sản phẩm demo để lấy feedback, tối ưu nhất khi xem trên giao diện web.
                  </span>
                </div>
                <div style={{ padding: 16, background: C.white }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1, height: 40, background: C.bg, borderRadius: 8 }} />
                    <div style={{ flex: 2, height: 40, background: C.bg, borderRadius: 8 }} />
                    <div style={{ flex: 1, height: 40, background: C.bg, borderRadius: 8 }} />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 12px" }}>
                  Modal (Web) — xác nhận &amp; form
                </p>
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24,
                  boxShadow: "0 8px 40px rgba(92,70,50,0.14)" }}>
                  <div style={row({ justifyContent: "space-between", marginBottom: 20 })}>
                    <span style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: C.textPrimary }}>Xác nhận</span>
                    <button style={{ background: "none", border: "none", cursor: "pointer" }}>
                      <X size={18} color={C.textSecondary} />
                    </button>
                  </div>
                  <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: "0 0 20px", lineHeight: 1.6 }}>
                    Bạn có chắc muốn tiếp tục không?
                  </p>
                  <div style={row({ gap: 10 })}>
                    <Btn variant="ghost" label="Hủy" fullWidth />
                    <Btn variant="primary" label="Xác nhận" fullWidth />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </StyleSection>

        {/* ── 8. UI PRIMITIVES (T08) ── */}
        <StyleSection title="8 · UI Primitives (Common)" id="sec-8">
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 20px" }}>
            Bộ 8 primitive dùng chung trong <code>src/shared/components/common/</code>.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Button */}
            <div>
              <Tag>Button Primitive</Tag>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="primary" loading>Loading</Button>
                <Button variant="primary" disabled>Disabled</Button>
              </div>
            </div>

            {/* Badge */}
            <div>
              <Tag>Badge Primitive (statusMaps integration)</Tag>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Badge kind="room" status="available" />
                <Badge kind="room" status="rented" />
                <Badge kind="room" status="deposited" />
                <Badge kind="listing" status="active" />
                <Badge kind="listing" status="pendingApproval" />
                <Badge kind="listing" status="rejected" />
                <Badge kind="invoice" status="paid" />
                <Badge kind="invoice" status="unpaid" />
                <Badge kind="contract" status="active" />
              </div>
            </div>

            {/* Card */}
            <div>
              <Tag>Card Primitive</Tag>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                <Card hoverable>
                  <p style={{ margin: 0, fontWeight: 600, color: C.textPrimary }}>Hoverable Card</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textSecondary }}>Di chuột để xem hiệu ứng viền & bóng.</p>
                </Card>
                <Card>
                  <p style={{ margin: 0, fontWeight: 600, color: C.textPrimary }}>Standard Card</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textSecondary }}>Nền trắng bo góc chuẩn.</p>
                </Card>
              </div>
            </div>

            {/* Table */}
            <div>
              <Tag>Table Primitive</Tag>
              {/* `Record<string, string>` chứ không để suy ra: `renderCell` nhận
                  `key: string` (nó phải nhận được mọi cột), nên `row[key]` cần
                  một kiểu index được. Không khai thì noImplicitAny báo lỗi ở
                  đúng dòng đó. */}
              <Table<Record<string, string>>
                columns={[
                  { key: "room", label: "Phòng", width: "30%" },
                  { key: "price", label: "Giá thuê" },
                  { key: "status", label: "Trạng thái" },
                ]}
                rows={[
                  { id: "1", room: "Phòng 101", price: "3.500.000 đ", status: "available" },
                  { id: "2", room: "Phòng 102", price: "4.000.000 đ", status: "rented" },
                ]}
                renderCell={(row, key) => key === "status" ? <Badge kind="room" status={row.status} /> : row[key]}
              />
            </div>

            {/* Pagination & Toast & Skeleton & EmptyState */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div>
                <Tag>Pagination Primitive</Tag>
                <Pagination page={1} pageSize={10} total={35} onChange={() => {}} />
              </div>
              <div>
                <Tag>Toast Primitive</Tag>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Toast message="Cập nhật thông tin thành công" variant="success" />
                  <Toast message="Đã xảy ra lỗi kết nối" variant="error" />
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div>
                <Tag>EmptyState Primitive</Tag>
                <Card style={{ padding: 12 }}>
                  <EmptyState title="Chưa có thông báo" description="Bạn đã xem hết tất cả thông báo." />
                </Card>
              </div>
              <div>
                <Tag>Skeleton Primitive</Tag>
                <Card style={{ padding: 16 }}>
                  <Skeleton variant="text" count={3} />
                </Card>
              </div>
            </div>
          </div>
        </StyleSection>


      </div>

      {/* Footer */}
      <div style={{ background: C.primaryDark, padding: "22px 32px", textAlign: "center" }}>
        <span style={{ fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
          Trọ Nhanh Design System · v2.0 · Sản phẩm demo — chỉ dùng để thu thập feedback
        </span>
      </div>
    </div>
  );
}
