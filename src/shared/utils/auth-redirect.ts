const POST_AUTH_REDIRECT_KEY = "tronhanh.post-auth-redirect";
const POST_AUTH_REDIRECT_TTL_MS = 15 * 60 * 1000;

interface StoredRedirect {
  path: string;
  createdAt: number;
}

/**
 * Chỉ cho phép đường dẫn nội bộ của HashRouter. Giá trị có thể đã được
 * `URLSearchParams` giải mã một lần, nên hàm chấp nhận cả dạng thô lẫn encoded.
 */
export function toSafeRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return null;
  }

  const parsed = new URL(value, "https://tronhanh.local");
  if (parsed.origin !== "https://tronhanh.local") return null;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function withAuthRedirect(path: string, redirect: string | null): string {
  return redirect ? `${path}?redirect=${encodeURIComponent(redirect)}` : path;
}

/** Lưu duy nhất đích điều hướng sau OAuth; Supabase vẫn tự quản auth session. */
export function storePostAuthRedirect(redirect: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const safe = toSafeRedirect(redirect);
    if (!safe) {
      window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
      return;
    }
    const value: StoredRedirect = { path: safe, createdAt: Date.now() };
    window.sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, JSON.stringify(value));
  } catch {
    // Một số chế độ riêng tư chặn storage; OAuth vẫn tiếp tục về trang chủ.
  }
}

export function clearPostAuthRedirect(): void {
  if (typeof window !== "undefined") {
    try { window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY); } catch { /* storage unavailable */ }
  }
}

export function consumePostAuthRedirect(): string | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
    window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<StoredRedirect>;
    if (
      typeof value.path !== "string" ||
      typeof value.createdAt !== "number" ||
      Date.now() - value.createdAt > POST_AUTH_REDIRECT_TTL_MS
    ) {
      return null;
    }
    return toSafeRedirect(value.path);
  } catch {
    return null;
  }
}
