import { loadEnv } from "vite";

/**
 * Môi trường Supabase mà bộ E2E đang nhắm tới, và cái chốt chặn ghi nhầm lên
 * production.
 *
 * Đọc env bằng chính `loadEnv` của Vite (mode `development`, giống `pnpm dev`
 * mà `webServer` khởi động) để guard nhìn ĐÚNG database mà app trong trình
 * duyệt đang ghi vào — tự parse `.env` thì sẽ lệch khi có `.env.local` hay biến
 * môi trường đè.
 */

/**
 * Project ref của Supabase production. Thêm vào đây nếu dựng thêm môi trường
 * thật; KHÔNG thêm project test riêng của E2E.
 */
export const PRODUCTION_PROJECT_REFS = ["ropzrnlasbkznoxqaqtp"] as const;

/** Cờ bắt buộc để cho phép spec ghi dữ liệu chạy trên production. */
export const ALLOW_PROD_WRITES_FLAG = "E2E_ALLOW_PROD_WRITES";

export interface E2eSupabaseEnv {
  url: string;
  anonKey: string;
}

export function getE2eSupabaseEnv(): E2eSupabaseEnv {
  const env = loadEnv("development", process.cwd(), "VITE_");
  return {
    url: env.VITE_SUPABASE_URL ?? "",
    anonKey: env.VITE_SUPABASE_ANON_KEY ?? "",
  };
}

export function isProductionTarget(url: string): boolean {
  return PRODUCTION_PROJECT_REFS.some((ref) => url.includes(ref));
}

/** `true` khi spec ghi dữ liệu được phép chạy với env hiện tại. */
export function canWriteToTarget(): boolean {
  const { url } = getE2eSupabaseEnv();
  if (!isProductionTarget(url)) return true;
  return process.env[ALLOW_PROD_WRITES_FLAG] === "1";
}

/**
 * Gọi trong `test.beforeAll` của MỌI spec ghi dữ liệu thật. Throw (không
 * `skip`) để lần chạy đỏ rõ ràng thay vì xanh giả vì bị bỏ qua.
 */
export function assertWritesAllowed(): void {
  if (canWriteToTarget()) return;
  throw new Error(
    [
      "Spec này GHI dữ liệu nhưng VITE_SUPABASE_URL đang trỏ vào Supabase PRODUCTION.",
      "Dùng một Supabase project riêng cho E2E (docs/cp4/DEMO_ACCOUNTS.md §6),",
      `hoặc nếu thật sự cố ý thì chạy lại với ${ALLOW_PROD_WRITES_FLAG}=1.`,
    ].join(" "),
  );
}
