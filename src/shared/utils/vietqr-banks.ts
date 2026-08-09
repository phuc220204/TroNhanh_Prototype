/**
 * Danh sách ngân hàng + mã BIN (NAPAS) để sinh mã VietQR.
 *
 * VÌ SAO CẦN FILE NÀY: chuỗi VietQR chuẩn EMVCo bắt buộc có **mã BIN 6 chữ số**
 * của ngân hàng thụ hưởng. Trước đây `properties.bank_name` là ô text tự do —
 * chủ trọ gõ "MB", "mbbank", "Ngân hàng Quân Đội" đều được, và không giá trị nào
 * trong số đó sinh được QR. Nên ô đó giờ là dropdown chọn từ bảng dưới đây.
 *
 * `properties.bank_name` lưu `code` (VD "MB"), KHÔNG lưu BIN và không lưu tên
 * đầy đủ. Lý do: dữ liệu cũ trong DB đang là "MB" (giá trị mặc định của form cũ)
 * nên khớp sẵn, không cần migration backfill.
 *
 * ⚠️ Nếu thiếu ngân hàng nào, thêm một dòng vào đây — đừng sửa `bank_name` thành
 * text tự do trở lại, QR sẽ chết im lặng.
 *
 * ⚠️ Mã BIN phải khớp với NAPAS. Trước khi tin bảng này, hãy quét thử một mã
 * bằng app ngân hàng thật (xem "Cách test" của T27).
 */

export interface BankInfo {
  /** Giá trị lưu vào `properties.bank_name`. */
  code: string;
  /** Mã BIN 6 số dùng trong chuỗi EMVCo. */
  bin: string;
  /** Tên hiển thị cho người dùng chọn. */
  name: string;
}

export const VIETNAM_BANKS: readonly BankInfo[] = [
  { code: "VCB", bin: "970436", name: "Vietcombank" },
  { code: "CTG", bin: "970415", name: "VietinBank" },
  { code: "BIDV", bin: "970418", name: "BIDV" },
  { code: "AGR", bin: "970405", name: "Agribank" },
  { code: "TCB", bin: "970407", name: "Techcombank" },
  { code: "MB", bin: "970422", name: "MB Bank" },
  { code: "ACB", bin: "970416", name: "ACB" },
  { code: "VPB", bin: "970432", name: "VPBank" },
  { code: "TPB", bin: "970423", name: "TPBank" },
  { code: "STB", bin: "970403", name: "Sacombank" },
  { code: "HDB", bin: "970437", name: "HDBank" },
  { code: "VIB", bin: "970441", name: "VIB" },
  { code: "SHB", bin: "970443", name: "SHB" },
  { code: "EIB", bin: "970431", name: "Eximbank" },
  { code: "MSB", bin: "970426", name: "MSB" },
  { code: "OCB", bin: "970448", name: "OCB" },
  { code: "SEAB", bin: "970440", name: "SeABank" },
  { code: "NAB", bin: "970428", name: "Nam A Bank" },
  { code: "ABB", bin: "970425", name: "ABBANK" },
  { code: "BAB", bin: "970409", name: "Bac A Bank" },
  { code: "PVCB", bin: "970412", name: "PVcomBank" },
  { code: "VAB", bin: "970427", name: "VietABank" },
  { code: "LPB", bin: "970449", name: "LPBank" },
  { code: "SGICB", bin: "970400", name: "SaigonBank" },
  { code: "KLB", bin: "970452", name: "KienLongBank" },
  { code: "NCB", bin: "970419", name: "NCB" },
  { code: "VRB", bin: "970421", name: "VRB" },
  { code: "BVB", bin: "970454", name: "BVBank" },
] as const;

/** Tra ngân hàng theo `code` đã lưu. `null` nếu không nhận ra. */
export function findBankByCode(code: string | null | undefined): BankInfo | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return VIETNAM_BANKS.find((b) => b.code.toUpperCase() === normalized) ?? null;
}
