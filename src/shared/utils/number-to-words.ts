/**
 * Đọc số tiền thành chữ tiếng Việt — "Ba triệu tám trăm nghìn đồng".
 * Dùng cho hợp đồng in (T43). Có unit test: tests/unit/number-to-words.test.mjs.
 *
 * Quy tắc đọc:
 *  - "linh" cho hàng chục 0 khi có hàng trăm/nhóm trước: 105 → "một trăm linh năm".
 *  - "mười" cho 10–19; "mươi" cho 20–90.
 *  - "mốt" khi hàng đơn vị 1 và hàng chục ≥ 2: 21 → "hai mươi mốt".
 *  - "lăm" khi hàng đơn vị 5 và hàng chục ≥ 1: 15 → "mười lăm", 25 → "hai mươi lăm".
 *  - "tư" khi hàng đơn vị 4 và hàng chục ≥ 2: 24 → "hai mươi tư".
 *  - Nhóm giữa bằng 0 bị bỏ; nhóm sau một nhóm lớn hơn đọc đủ "không trăm": 1.005.000 → "một triệu không trăm linh năm nghìn".
 */

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const SCALES = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

function readTriple(n: number, full: boolean): string {
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const units = n % 10;
  const words: string[] = [];

  if (full || hundreds > 0) {
    words.push(DIGITS[hundreds]!, "trăm");
  }

  if (tens === 0) {
    if (units > 0 && (full || hundreds > 0)) words.push("linh");
  } else if (tens === 1) {
    words.push("mười");
  } else {
    words.push(DIGITS[tens]!, "mươi");
  }

  if (units > 0) {
    if (units === 1 && tens >= 2) words.push("mốt");
    else if (units === 5 && tens >= 1) words.push("lăm");
    else if (units === 4 && tens >= 2) words.push("tư");
    else words.push(DIGITS[units]!);
  }
  return words.join(" ");
}

/** Số nguyên không âm → chữ (chữ thường). 0 → "không". */
export function numberToVietnameseWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "không";

  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const group = groups[i]!;
    if (group === 0) continue;
    // Nhóm không phải nhóm cao nhất ⇒ đọc đủ "không trăm (linh)".
    const isLeading = i === groups.length - 1;
    parts.push(readTriple(group, !isLeading));
    if (SCALES[i]) parts.push(SCALES[i]!);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** "Ba triệu tám trăm nghìn đồng" — viết hoa chữ đầu, thêm "đồng". */
export function vndToWords(amount: number): string {
  const words = numberToVietnameseWords(amount);
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} đồng`;
}
