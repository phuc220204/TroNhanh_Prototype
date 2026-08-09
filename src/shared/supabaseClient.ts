import { createClient } from "@supabase/supabase-js";
import { config } from "./config";
import type { Database } from "./types/database.types";

/**
 * Supabase client dùng chung cho toàn app. Chỉ dùng anon key; RLS là cơ chế
 * multi-tenant thật sự (CLAUDE.md §3).
 *
 * Generic <Database> KHÔNG phải trang trí: nó là thứ biến
 *   .eq("id", user.id)        trên profiles   (đúng phải là user_id)
 *   status: "Inactive"        trên rental_listings
 *   .from("ten_bang_sai")
 * thành LỖI BIÊN DỊCH thay vì bug im lặng lúc chạy — vì cột status được sinh ra
 * dưới dạng literal union suy từ CHECK constraint.
 *
 * Sau mỗi migration phải chạy lại `pnpm db:types`, nếu không type sẽ lệch DB.
 */
export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

declare global {
  interface Window {
    /** Chỉ có ở dev — xem ghi chú bên dưới. */
    __sb?: typeof supabase;
  }
}

/**
 * Phơi client ra `window.__sb` CHỈ Ở DEV, để kiểm RLS và trigger từ đúng góc độ
 * của kẻ tấn công: một người đã đăng nhập, gọi thẳng PostgREST bằng anon key.
 *
 * Vì sao cần: mọi lớp bảo vệ thật của app này nằm ở tầng DB (RLS policy, trigger
 * `trg_guard_boost_expire_at`, assert ownership trong RPC). Bấm nút trên UI
 * KHÔNG kiểm được chúng — UI chỉ đi đường hợp lệ. Muốn biết trigger có chặn thật
 * hay không thì phải thử đúng cái mà nó phải chặn:
 *
 *   await window.__sb.from("rental_listings")
 *     .update({ boost_expire_at: "2030-01-01T00:00:00Z" })
 *     .eq("id", "<id tin của mình>").select()
 *   // phải trả về error BOOST_REQUIRES_PAYMENT
 *
 * `import.meta.env.DEV` là hằng số biên dịch của Vite ⇒ nhánh này bị loại khỏi
 * bundle production, không phải chỉ bị bỏ qua lúc chạy. Và dù có lọt ra thì nó
 * cũng chỉ là client anon key + RLS — đúng thứ mọi trang web đã có sẵn; nó không
 * cấp thêm quyền nào.
 */
if (import.meta.env.DEV) {
  window.__sb = supabase;
}
