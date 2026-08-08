import { VN_PROVINCES, type VnProvince } from "../constants/vn-provinces.generated";
import type { VnWardTuple } from "../constants/vn-wards.generated";

/**
 * Tra cứu đơn vị hành chính Việt Nam (sau sáp nhập 01/07/2025).
 *
 * Đây là lối vào DUY NHẤT tới dữ liệu phường/xã. Hai file `*.generated.ts` do
 * `scripts/gen-vn-regions.mjs` sinh ra — đừng import thẳng `vn-wards.generated`
 * ở component, vì làm vậy là kéo 117KB vào bundle chính.
 */

export type { VnProvince, VnWardTuple };

export interface VnWard {
  readonly code: number;
  readonly name: string;
  readonly provinceCode: number;
}

export { VN_PROVINCES };

/** Tra tên tỉnh theo mã. `null` khi mã không tồn tại (dữ liệu cũ / hỏng). */
export function provinceName(code: number | null | undefined): string | null {
  if (code == null) return null;
  return VN_PROVINCES.find((p) => p.code === code)?.name ?? null;
}

// ── Nạp lười danh sách phường/xã ───────────────────────────────────────────
// 3.321 phần tử ≈ 117KB. Phần lớn khách vào xem tin không bao giờ mở ô chọn
// khu vực, nên `import()` động để Vite tách thành chunk riêng. Promise được giữ
// lại nên mở picker lần thứ hai không tải lại.
let wardsPromise: Promise<readonly VnWard[]> | null = null;

export function loadVnWards(): Promise<readonly VnWard[]> {
  if (!wardsPromise) {
    wardsPromise = import("../constants/vn-wards.generated")
      .then((m) =>
        m.VN_WARDS.map(
          (t: VnWardTuple): VnWard => ({ code: t[0], name: t[1], provinceCode: t[2] }),
        ),
      )
      .catch((err) => {
        // Cho phép thử lại: giữ promise hỏng thì mọi lần mở picker sau đều
        // fail dù mạng đã có lại.
        wardsPromise = null;
        throw err;
      });
  }
  return wardsPromise;
}

/**
 * Bỏ dấu và hạ chữ thường để so khớp khi gõ.
 *
 * Người dùng gõ "thu duc" phải ra "Phường Thủ Đức". `NFD` tách dấu thành ký tự
 * tổ hợp riêng rồi xóa chúng; `đ`/`Đ` KHÔNG phải chữ có dấu tổ hợp nên phải xử
 * lý riêng, thiếu bước này thì gõ "da nang" không ra "Đà Nẵng".
 */
export function normalizeVi(input: string): string {
  return input
    .normalize("NFD")
    // `\p{Diacritic}` thay vì dán dải ký tự tổ hợp vào lớp ký tự: ký tự tổ hợp
    // không hiện lên trong editor nên một lần copy-paste hỏng sẽ chẳng ai thấy.
    // Cần cờ `u`. Target là ES2022 nên thuộc tính Unicode dùng được.
    .replace(/\p{Diacritic}/gu, "")
    // `đ` KHÔNG phải chữ có dấu tổ hợp — NFD không tách nó ra, nên phải xử lý
    // riêng. Thiếu hai dòng này thì gõ "da nang" không ra "Đà Nẵng".
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Lọc phường/xã theo từ khóa, trong phạm vi một tỉnh nếu có.
 *
 * `limit` để cắt kết quả: gõ một chữ cái có thể khớp hàng trăm đơn vị, mà render
 * hết chúng vào dropdown thì trình duyệt khựng và người dùng cũng không đọc nổi.
 */
export function searchWards(
  wards: readonly VnWard[],
  query: string,
  provinceCode: number | null,
  limit = 50,
): VnWard[] {
  const scoped = provinceCode == null ? wards : wards.filter((w) => w.provinceCode === provinceCode);
  const q = normalizeVi(query);
  if (!q) return scoped.slice(0, limit);

  const out: VnWard[] = [];
  for (const w of scoped) {
    if (normalizeVi(w.name).includes(q)) {
      out.push(w);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Nhãn đầy đủ để hiển thị: "Phường Bến Nghé, Thành phố Hồ Chí Minh". */
export function formatWardLabel(ward: VnWard): string {
  const province = provinceName(ward.provinceCode);
  return province ? `${ward.name}, ${province}` : ward.name;
}
