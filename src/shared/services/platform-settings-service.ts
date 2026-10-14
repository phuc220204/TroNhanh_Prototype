import { supabase } from "../supabaseClient";
import { logError } from "./supabase-error";

/**
 * Đọc một cấu hình công khai trong `platform_settings` (bảng shared, CLAUDE.md §2.1).
 * Policy "Anyone reads settings" cho phép anon/authenticated SELECT; ghi chỉ qua
 * RPC admin `set_platform_setting`.
 */
export async function getPlatformSettingValue(key: string): Promise<unknown> {
  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return data?.value ?? null;
  } catch (err) {
    logError("platform-settings-service.getPlatformSettingValue", err);
    throw err;
  }
}
