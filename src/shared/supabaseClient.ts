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
