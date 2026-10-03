import { normalizeVietnamPhone } from "../utils/phone.ts";

export interface RegistrationInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface NormalizedRegistrationInput {
  fullName: string;
  email: string;
  phone: string | null;
  password: string;
}

export interface RegistrationAuthClient {
  signUp(credentials: ({
    email: string;
    phone?: never;
  } | {
    phone: string;
    email?: never;
  }) & {
    password: string;
    options: { data: Record<string, string> };
  }): Promise<{
    data: { user: { id: string } | null; session: unknown | null };
    error: unknown | null;
  }>;
  updateUser(attributes: { email: string }): Promise<{ error: unknown | null }>;
}

export class RegistrationInputError extends Error {}

export function normalizeRegistrationInput(input: RegistrationInput): NormalizedRegistrationInput {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const rawPhone = input.phone.trim();
  const phone = rawPhone ? normalizeVietnamPhone(rawPhone) : null;

  if (!fullName) throw new RegistrationInputError("Vui lòng nhập họ và tên.");
  if (!email && !rawPhone) {
    throw new RegistrationInputError("Hãy nhập ít nhất email hoặc số điện thoại để đăng nhập.");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RegistrationInputError("Địa chỉ email chưa đúng định dạng.");
  }
  if (rawPhone && !phone) {
    throw new RegistrationInputError("Số điện thoại Việt Nam chưa hợp lệ, ví dụ 0912345678.");
  }
  if (input.password.length < 6) {
    throw new RegistrationInputError("Mật khẩu phải chứa ít nhất 6 ký tự.");
  }

  return { fullName, email, phone, password: input.password };
}

/**
 * Creates the primary Auth identity and, when both are supplied, attaches the
 * email to the newly-created phone account. It never merges existing accounts.
 */
export async function registerWithCredentials(
  auth: RegistrationAuthClient,
  input: RegistrationInput,
) {
  const normalized = normalizeRegistrationInput(input);
  const primaryIsPhone = Boolean(normalized.phone);
  const { data, error } = await auth.signUp({
    ...(normalized.phone ? { phone: normalized.phone } : { email: normalized.email }),
    password: normalized.password,
    options: {
      data: primaryIsPhone
        ? { full_name: normalized.fullName, contact_phone: normalized.phone! }
        : { full_name: normalized.fullName },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error("Supabase không trả về tài khoản mới. Hãy thử lại.");
  if (!data.session) {
    throw new Error(
      "Supabase chưa cấp phiên đăng nhập. Hãy tắt xác nhận Email và Phone trong Auth trước khi đăng ký; nếu định danh đã có tài khoản, hãy đăng nhập tài khoản đó.",
    );
  }

  let secondaryEmailError: unknown | null = null;
  if (normalized.phone && normalized.email) {
    const result = await auth.updateUser({ email: normalized.email });
    secondaryEmailError = result.error;
  }

  return {
    user: data.user,
    primary: primaryIsPhone ? "phone" as const : "email" as const,
    secondaryEmailLinked: Boolean(normalized.phone && normalized.email && !secondaryEmailError),
    secondaryEmailError,
    normalized,
  };
}
