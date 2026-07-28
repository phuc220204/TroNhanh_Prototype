/* ══════════════════════════════════════════
   DESIGN TOKENS — Trọ Nhanh
   ⚠️  NGUỒN CHÂN LÝ DUY NHẤT cho màu / font / bán kính / khoảng cách.

   Trước CP4 có BA bộ token xung đột:
     - file này               (primary #8A4A20)  ← thứ ĐANG render
     - src/styles/theme.css   (--tn-primary #8A6A45)  → đã XÓA (24 khai báo dead)
     - StyleGuidePage local C (primary #8A6A45)       → đã chuyển sang import file này

   Giữ giá trị của file này làm chuẩn vì đó là thứ app đang thật sự hiển thị;
   đổi sang bộ kia sẽ đổi giao diện — không ai yêu cầu điều đó.

   LUẬT CHO CODE MỚI (CLAUDE.md §8.1):
     ✅ import { C, font, radius, space } from "shared/theme"
     ❌ không hex literal mới · không className · không thêm biến --tn-*

   Warm brown / caramel / cream. Không bao giờ dùng xanh dương làm màu chính.
══════════════════════════════════════════ */
export const C = {
  primary:       "#8A4A20",
  primaryHover:  "#713B19",
  primaryPress:  "#5C2D0F",
  primaryDark:   "#5C2D0F",
  secondary:     "#C99B65",
  secondaryHover:"#B08D63",
  secondaryPress:"#9A784F",
  sand:          "#C99B65",
  cream:         "#F7EFE2",
  caramelSoft:   "#F7EFE2",
  bg:            "#FFFCF7",
  textPrimary:   "#2F2118",
  textSecondary: "#7D6A5B",
  border:        "#EADCCB",
  white:         "#FFFFFF",

  /* ── Trạng thái phòng (BR-002) ──────────────────────────────────── */
  available:     "#4F7A4A",
  deposited:     "#C8861A",
  rented:        "#9B8C78",
  /** Màu nhấn cam. LƯU Ý: đây là TOKEN MÀU, không phải một RoomStatus —
   *  "Repairing" không tồn tại trong BR-002. Dùng cho cảnh báo/bảo trì/đăng xuất. */
  repairing:     "#C07B4A",

  /* ── Ngữ nghĩa (gộp từ theme.css cũ) ────────────────────────────── */
  error:         "#B5503C",
  warning:       "#C8861A",
  success:       "#4A7A34",
};

export const font = "'Be Vietnam Pro', Inter, system-ui, sans-serif";

/** Bán kính bo góc chuẩn. Dùng thay số rời rạc. */
export const radius = { sm: 8, md: 12, lg: 14, xl: 16, pill: 999 } as const;

/** Thang khoảng cách (px). space[4] = 16px. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 } as const;
