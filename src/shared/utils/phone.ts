/** Chuẩn hoá số di động Việt Nam về E.164 để Supabase Auth nhận dạng ổn định. */
export function normalizeVietnamPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  let national: string;

  if (digits.startsWith("0084")) national = `0${digits.slice(4)}`;
  else if (digits.startsWith("84")) national = `0${digits.slice(2)}`;
  else national = digits;

  if (!/^0(?:3|5|7|8|9)\d{8}$/.test(national)) return null;
  return `+84${national.slice(1)}`;
}

export function isEmailIdentifier(value: string): boolean {
  return value.includes("@");
}
