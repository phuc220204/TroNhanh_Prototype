/**
 * Sinh `src/shared/constants/vn-regions.generated.ts` từ dữ liệu hành chính
 * Việt Nam sau sáp nhập 01/07/2025 (34 tỉnh/thành, mô hình 2 cấp).
 *
 * Chạy TAY khi cần cập nhật:
 *   node scripts/gen-vn-regions.mjs
 *
 * ⚠️ KHÔNG gọi API này lúc chạy ứng dụng. Danh mục hành chính nhiều năm mới đổi
 * một lần; biến nó thành request runtime nghĩa là thêm một điểm chết mạng vào
 * trang tìm kiếm, làm E2E phụ thuộc dịch vụ bên thứ ba, và bắt người dùng chờ
 * một vòng mạng chỉ để vẽ cái dropdown. Tải một lần, commit kết quả.
 *
 * ⚠️ NGUỒN LÀ DỰ ÁN CỘNG ĐỒNG, không phải cơ quan nhà nước. Đã đối chiếu:
 * TP.HCM ra đúng 168 đơn vị cấp xã như Nghị quyết 1685/NQ-UBTVQH15. Nếu cần
 * khẳng định "chuẩn hành chính" ở mức pháp lý thì đối chiếu thêm với bản của
 * Cục Thống kê: https://danhmuchanhchinh.nso.gov.vn
 */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://provinces.open-api.vn/api/v2/?depth=2";
const DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../src/shared/constants");
const OUT_PROVINCES = resolve(DIR, "vn-provinces.generated.ts");
const OUT_WARDS = resolve(DIR, "vn-wards.generated.ts");

/** Số đơn vị cấp xã của TP.HCM theo Nghị quyết 1685 — dùng làm chốt kiểm. */
const HCMC_CODE = 79;
const HCMC_EXPECTED_WARDS = 168;
const EXPECTED_PROVINCES = 34;

const res = await fetch(API);
if (!res.ok) throw new Error(`Tải dữ liệu thất bại: HTTP ${res.status}`);
const raw = await res.json();

// ── Chốt kiểm trước khi ghi ────────────────────────────────────────────────
// Nguồn là API bên thứ ba: nó có thể đổi schema, rollback về dữ liệu trước sáp
// nhập, hoặc trả một phần. Ghi đè file constants bằng dữ liệu hỏng mà không ai
// biết là kiểu lỗi tệ nhất — bộ lọc vẫn chạy, chỉ là sai địa danh.
if (!Array.isArray(raw)) throw new Error("Dữ liệu trả về không phải mảng");
if (raw.length !== EXPECTED_PROVINCES) {
  throw new Error(
    `Mong đợi ${EXPECTED_PROVINCES} tỉnh/thành (mô hình sau 01/07/2025), nhận được ${raw.length}. ` +
    `Nếu ra 63 thì API đã rơi về dữ liệu TRƯỚC sáp nhập — dừng lại, đừng ghi đè.`,
  );
}
const hcmc = raw.find((p) => p.code === HCMC_CODE);
if (!hcmc) throw new Error("Không tìm thấy TP.HCM (code 79)");
if (hcmc.wards?.length !== HCMC_EXPECTED_WARDS) {
  throw new Error(
    `TP.HCM phải có ${HCMC_EXPECTED_WARDS} đơn vị cấp xã, nhận được ${hcmc.wards?.length}. ` +
    `Số này khớp Nghị quyết 1685; lệch nghĩa là nguồn không đáng tin.`,
  );
}

const provinces = raw
  .map((p) => ({ code: p.code, name: p.name }))
  .sort((a, b) => a.name.localeCompare(b.name, "vi"));

const wards = [];
for (const p of raw) {
  for (const w of p.wards ?? []) {
    if (typeof w.code !== "number" || typeof w.name !== "string") {
      throw new Error(`Đơn vị cấp xã hỏng trong ${p.name}: ${JSON.stringify(w)}`);
    }
    wards.push([w.code, w.name, p.code]);
  }
}
wards.sort((a, b) => a[2] - b[2] || a[1].localeCompare(b[1], "vi"));

const dupes = wards.length - new Set(wards.map((w) => w[0])).size;
if (dupes > 0) throw new Error(`${dupes} mã phường/xã bị trùng — mã phải là duy nhất toàn quốc`);

const esc = (s) => JSON.stringify(s);
const stamp = new Date().toISOString().slice(0, 10);
const header = (what) => `// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  FILE SINH TỰ ĐỘNG — ĐỪNG SỬA TAY                                     ║
// ║  Sinh lại:  node scripts/gen-vn-regions.mjs                           ║
// ╚═══════════════════════════════════════════════════════════════════════╝
//
// Đơn vị hành chính Việt Nam sau sáp nhập 01/07/2025 (Nghị quyết
// 1685/NQ-UBTVQH15): mô hình 2 cấp tỉnh/thành → phường/xã, KHÔNG còn cấp
// quận/huyện.
//
// ${what} · sinh ngày ${stamp}
`;

// ── Hai file, cố ý ─────────────────────────────────────────────────────────
// Danh sách tỉnh chỉ ~1KB và cần ngay khi vẽ bộ lọc. Danh sách phường/xã hơn
// 100KB và phần lớn người xem không bao giờ mở tới. Gộp chung một file thì mọi
// khách vào trang chủ đều tải cả 3.321 phường — nên tách để `vn-wards` nằm ở
// một chunk riêng, chỉ nạp khi người dùng thực sự mở ô chọn khu vực.
writeFileSync(OUT_PROVINCES, `${header(`${provinces.length} tỉnh/thành`)}
/** Một tỉnh hoặc thành phố trực thuộc trung ương. */
export interface VnProvince {
  /** Mã của Cục Thống kê. Ổn định hơn tên — dùng làm khóa lưu xuống DB. */
  readonly code: number;
  readonly name: string;
}

export const VN_PROVINCES: readonly VnProvince[] = [
${provinces.map((p) => `  { code: ${p.code}, name: ${esc(p.name)} },`).join("\n")}
];
`, "utf8");

writeFileSync(OUT_WARDS, `${header(`${wards.length} phường/xã`)}
/**
 * Một phường / xã / đặc khu, dạng tuple cho gọn.
 * \`[mã, tên, mã tỉnh]\` — ${wards.length} phần tử; tuple nhẹ hơn object khoảng
 * một nửa, và file này là thứ nặng nhất trong \`constants/\`.
 *
 * ⚠️ ĐỪNG import trực tiếp module này. Dùng \`loadVnWards()\` ở
 * \`shared/utils/vn-regions.ts\` — nó \`import()\` động nên Vite tách được
 * thành chunk riêng.
 */
export type VnWardTuple = readonly [code: number, name: string, provinceCode: number];

export const VN_WARDS: readonly VnWardTuple[] = [
${wards.map((w) => `  [${w[0]}, ${esc(w[1])}, ${w[2]}],`).join("\n")}
];
`, "utf8");

console.log(`OK: ${provinces.length} tinh/thanh -> ${OUT_PROVINCES}`);
console.log(`OK: ${wards.length} phuong/xa -> ${OUT_WARDS}`);
