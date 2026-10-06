/** StyleGuide (chỉ bản dev): các khối demo thành phần. */
import { useState } from "react";
import { Heart, MapPin, Wifi, Wind, Car, Home, Search, Bell, User, Phone, MessageCircle, X } from "lucide-react";
import { C, font } from "../../../shared/theme";
import { Card } from "../../../shared/components/common";
import { row, col, Tag, Btn } from "./atoms";

/* ══════════════════════════════════════════
   SECTION 5 — CORE COMPONENTS
══════════════════════════════════════════ */

/* Room card sample data */
export const SAMPLE_ROOMS = [
  { title: "Phòng trọ cao cấp, full nội thất, gần ĐH Bách Khoa", price: "3.200.000", area: 25, loc: "Quận 10", status: "available", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=480&q=80" },
  { title: "Căn hộ dịch vụ ban công đẹp, thang máy, 1PN", price: "6.500.000", area: 38, loc: "Bình Thạnh", status: "rented", img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=480&q=80" },
  { title: "Phòng gác lửng thoáng mát, WC riêng, giờ tự do", price: "2.400.000", area: 22, loc: "Quận 12", status: "hidden", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=480&q=80" },
];

export const STATUS_META: Record<string, { label: string; color: string }> = {
  available: { label: "Trống",    color: C.available },
  rented:    { label: "Đã thuê", color: C.rented },
  hidden:    { label: "Đã ẩn",   color: C.repairing },
};

export function RoomCard({ room }: { room: typeof SAMPLE_ROOMS[0] }) {
  const [saved, setSaved] = useState(false);
  const s = STATUS_META[room.status];
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14,
      overflow: "hidden", boxShadow: "0 2px 10px rgba(92,70,50,0.08)" }}>
      <div style={{ position: "relative" }}>
        <img src={room.img} alt={room.title}
          style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
        <button onClick={() => setSaved(v => !v)}
          style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.92)",
            border: "none", borderRadius: 999, width: 34, height: 34,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            boxShadow: "0 1px 6px rgba(0,0,0,0.1)" }}>
          <Heart size={16} color={saved ? C.repairing : C.secondary} fill={saved ? C.repairing : "none"} strokeWidth={2} />
        </button>
        <span style={{ position: "absolute", top: 10, left: 10, background: s.color, color: "#fff",
          fontFamily: font, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 10px" }}>
          {s.label}
        </span>
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary,
          margin: "0 0 5px", lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {room.title}
        </p>
        <p style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: C.primary, margin: "0 0 4px" }}>
          {room.price} đ<span style={{ fontSize: 12, fontWeight: 400, color: C.textSecondary }}>/tháng</span>
        </p>
        <div style={row({ gap: 4, marginBottom: 10 })}>
          <MapPin size={12} color={C.textSecondary} />
          <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>{room.area} m² · {room.loc}</span>
        </div>
        <div style={row({ gap: 12 })}>
          {[{ I: Wifi, l: "Wifi" }, { I: Wind, l: "Máy lạnh" }, { I: Car, l: "Để xe" }].map(({ I, l }) => (
            <div key={l} style={row({ gap: 3 })}>
              <I size={12} color={C.secondary} />
              <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Owner Contact Card */
export function OwnerContactCard() {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20,
      boxShadow: "0 2px 10px rgba(92,70,50,0.08)", maxWidth: 320 }}>
      <div style={row({ gap: 12, marginBottom: 16, padding: "10px 12px", background: C.bg, borderRadius: 10 })}>
        <div style={{ width: 44, height: 44, borderRadius: 999, background: C.sand,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <User size={20} color={C.primaryDark} />
        </div>
        <div>
          <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: 0 }}>Chủ trọ</p>
          <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "2px 0 0" }}>Anh Minh</p>
          <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "1px 0 0" }}>Phản hồi nhanh · Online</p>
        </div>
      </div>
      <div style={col({ gap: 10 })}>
        <Btn variant="primary" label="Gửi tin nhắn" icon={<MessageCircle size={15} />} fullWidth />
        <Btn variant="outline" label="Gọi 0912 345 678" icon={<Phone size={15} />} fullWidth />
      </div>
      <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, textAlign: "center", margin: "10px 0 0" }}>
        Nhắn tin trong nền tảng hoặc gọi điện trực tiếp
      </p>
    </div>
  );
}

/* Stat Card */
export function StatCard() {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28,
      boxShadow: "0 2px 10px rgba(92,70,50,0.08)", minWidth: 220 }}>
      <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary,
        margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Số phòng trống
      </p>
      <div style={row({ alignItems: "baseline", gap: 8 })}>
        <span style={{ fontFamily: font, fontSize: 52, fontWeight: 800, color: C.primary, lineHeight: 1 }}>3</span>
        <span style={{ fontFamily: font, fontSize: 16, color: C.textSecondary }}>/ 8 phòng</span>
      </div>
      <div style={{ marginTop: 16, background: C.bg, borderRadius: 8, height: 8, overflow: "hidden" }}>
        <div style={{ width: "37.5%", height: "100%", background: C.primary, borderRadius: 8 }} />
      </div>
      <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "8px 0 0" }}>
        37.5% số phòng đang trống
      </p>
    </div>
  );
}

/* Form components showcase */
export function FormShowcase() {
  const [checked1, setChecked1] = useState(true);
  const [checked2, setChecked2] = useState(true);
  const [checked3, setChecked3] = useState(false);
  const [radio, setRadio] = useState(1);
  const [chips, setChips] = useState(["Máy lạnh", "Wifi"]);
  const toggleChip = (c: string) => setChips(v => v.includes(c) ? v.filter(x => x !== c) : [...v, c]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 24 }}>
      {/* Text input */}
      <div>
        <Tag>Input — Bình thường</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 6px" }}>Tiêu đề tin</p>
        <input style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "9px 12px",
          fontFamily: font, fontSize: 14, color: C.textPrimary, background: C.white, outline: "none", boxSizing: "border-box" }}
          placeholder="Nhập tiêu đề bài đăng..." />
      </div>
      {/* Input error */}
      <div>
        <Tag>Input — Lỗi</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 6px" }}>
          Địa chỉ <span style={{ color: C.error }}>*</span>
        </p>
        <input defaultValue="123 đường" style={{ width: "100%", border: `1.5px solid ${C.error}`, borderRadius: 10,
          padding: "9px 12px", fontFamily: font, fontSize: 14, color: C.textPrimary, background: C.white,
          outline: "none", boxSizing: "border-box" }} />
        <p style={{ fontFamily: font, fontSize: 12, color: C.error, margin: "4px 0 0" }}>Địa chỉ không hợp lệ</p>
      </div>
      {/* Select */}
      <div>
        <Tag>Select</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 6px" }}>Khu vực</p>
        <select style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "9px 12px",
          fontFamily: font, fontSize: 14, color: C.textPrimary, background: C.white, outline: "none", boxSizing: "border-box" }}>
          <option>Chọn quận / huyện</option>
          <option>Quận 1</option><option>Quận 10</option><option>Bình Thạnh</option>
        </select>
      </div>
      {/* Textarea */}
      <div>
        <Tag>Textarea</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 6px" }}>Mô tả chi tiết</p>
        <textarea rows={3} placeholder="Mô tả phòng trọ của bạn..."
          style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "9px 12px",
            fontFamily: font, fontSize: 14, color: C.textPrimary, background: C.white, outline: "none",
            boxSizing: "border-box", resize: "vertical" }} />
      </div>
      {/* Range */}
      <div>
        <Tag>Range Slider</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 6px" }}>
          Khoảng giá: <span style={{ color: C.primary }}>1M – 5M đ</span>
        </p>
        <input type="range" min={0} max={10} defaultValue={5} style={{ width: "100%", accentColor: C.primary }} />
        <div style={row({ justifyContent: "space-between" })}>
          <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>1.000.000 đ</span>
          <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>10.000.000 đ</span>
        </div>
      </div>
      {/* Checkbox */}
      <div>
        <Tag>Checkbox</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 8px" }}>Tiện ích</p>
        <div style={col({ gap: 8 })}>
          {[{ l: "Máy lạnh", v: checked1, s: setChecked1 }, { l: "Wifi", v: checked2, s: setChecked2 }, { l: "Gác lửng", v: checked3, s: setChecked3 }].map(({ l, v, s }) => (
            <label key={l} onClick={() => s(!v)} style={row({ gap: 8, cursor: "pointer" })}>
              <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${v ? C.primary : C.border}`,
                background: v ? C.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {v && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontFamily: font, fontSize: 13, color: C.textPrimary }}>{l}</span>
            </label>
          ))}
        </div>
      </div>
      {/* Radio */}
      <div>
        <Tag>Radio</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 8px" }}>Loại hình</p>
        <div style={col({ gap: 8 })}>
          {["Tất cả", "Phòng trọ", "Căn hộ dịch vụ"].map((o, i) => (
            <label key={o} onClick={() => setRadio(i)} style={row({ gap: 8, cursor: "pointer" })}>
              <div style={{ width: 18, height: 18, borderRadius: 999, border: `2px solid ${radio === i ? C.primary : C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {radio === i && <div style={{ width: 8, height: 8, borderRadius: 999, background: C.primary }} />}
              </div>
              <span style={{ fontFamily: font, fontSize: 13, color: C.textPrimary }}>{o}</span>
            </label>
          ))}
        </div>
      </div>
      {/* Chips */}
      <div>
        <Tag>Chip Multi-select</Tag>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 8px" }}>Tiện ích</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["Máy lạnh", "Wifi", "WC riêng", "Để xe"].map(c => {
            const active = chips.includes(c);
            return (
              <button key={c} onClick={() => toggleChip(c)}
                style={{ fontFamily: font, fontSize: 12, fontWeight: active ? 700 : 500,
                  padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                  border: `1.5px solid ${active ? C.primary : C.border}`,
                  background: active ? "#F0E7D6" : C.white,
                  color: active ? C.primaryPress : C.textPrimary,
                  display: "inline-flex", alignItems: "center", gap: 4 }}>
                {active && <span style={{ fontSize: 10, fontWeight: 900 }}>✓</span>}
                {c}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SECTION 6 — NAVIGATION
══════════════════════════════════════════ */
export function TopNavbarDemo() {
  return (
    <div style={{ background: C.primaryDark, height: 64, display: "flex", alignItems: "center",
      padding: "0 28px", gap: 36, borderRadius: 12, boxShadow: "0 2px 12px rgba(42,26,12,0.2)" }}>
      <span style={{ fontFamily: font, fontSize: 21, fontWeight: 800, color: C.cream, letterSpacing: "-0.02em", flexShrink: 0 }}>
        Trọ Nhanh
      </span>
      <div style={{ flex: 1 }} />
      {["Tìm phòng", "Đăng tin", "Hỗ trợ"].map(t => (
        <span key={t} style={{ fontFamily: font, fontSize: 14, fontWeight: 500,
          color: "rgba(232,222,201,0.8)", cursor: "pointer", whiteSpace: "nowrap" }}>{t}</span>
      ))}
      <Btn variant="primary" label="Đăng nhập" size="sm" />
    </div>
  );
}

export function BottomTabBarDemo() {
  const [active, setActive] = useState(0);
  const tabs = [
    { Icon: Home, label: "Trang chủ" }, { Icon: Search, label: "Tìm phòng" },
    { Icon: Bell, label: "Thông báo" }, { Icon: User, label: "Tài khoản" },
  ];
  return (
    <div style={{ background: C.white, borderTop: `1px solid ${C.border}`, display: "flex",
      borderRadius: "0 0 14px 14px", padding: "6px 0" }}>
      {tabs.map(({ Icon, label }, i) => (
        <button key={label} onClick={() => setActive(i)}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
          <Icon size={22} color={active === i ? C.primary : "#9B8C78"} strokeWidth={active === i ? 2.5 : 1.8} />
          <span style={{ fontFamily: font, fontSize: 10, fontWeight: active === i ? 700 : 400,
            color: active === i ? C.primary : "#9B8C78" }}>{label}</span>
          {active === i && <div style={{ width: 4, height: 4, borderRadius: 999, background: C.primary }} />}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   SECTION 7 — OVERLAYS
══════════════════════════════════════════ */
export function BottomSheetDemo() {
  const [chips, setChips] = useState<string[]>([]);
  const toggle = (c: string) => setChips(v => v.includes(c) ? v.filter(x => x !== c) : [...v, c]);
  return (
    <div style={{ background: C.white, borderRadius: "16px 16px 0 0", padding: "0 20px 20px",
      border: `1px solid ${C.border}`, boxShadow: "0 -4px 24px rgba(92,70,50,0.12)" }}>
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, marginBottom: 16 }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: C.sand }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: C.textPrimary }}>Bộ lọc tìm kiếm</span>
        <button style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color={C.textSecondary} /></button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 8px" }}>Khoảng giá</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["1–3 triệu", "3–5 triệu", "5–8 triệu", "> 8 triệu"].map(r => (
            <span key={r} style={{ fontFamily: font, fontSize: 12, padding: "5px 12px",
              border: `1.5px solid ${C.border}`, borderRadius: 999, color: C.textPrimary, cursor: "pointer" }}>{r}</span>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 8px" }}>Tiện ích</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["Máy lạnh", "Wifi", "WC riêng", "Chỗ để xe"].map(a => (
            <button key={a} onClick={() => toggle(a)}
              style={{ fontFamily: font, fontSize: 12, padding: "5px 12px",
                background: chips.includes(a) ? "#F0E7D6" : C.cream,
                border: `1.5px solid ${chips.includes(a) ? C.primary : C.border}`,
                borderRadius: 999, color: chips.includes(a) ? C.primaryPress : C.textPrimary, cursor: "pointer" }}>
              {a}
            </button>
          ))}
        </div>
      </div>
      <div style={row({ gap: 10 })}>
        <Btn variant="outline" label="Xóa lọc" fullWidth />
        <Btn variant="primary" label="Xem kết quả" fullWidth />
      </div>
    </div>
  );
}
