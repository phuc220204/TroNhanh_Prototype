import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

/**
 * Cấu hình nền tảng.
 * Đọc: policy "Anyone reads settings" cho phép mọi role SELECT.
 * Ghi: BẮT BUỘC qua RPC `set_platform_setting` — chỉ Admin, không có policy
 * INSERT/UPDATE nào trên bảng.
 */

export interface PlatformSettings {
  /** true = tin hiển thị ngay. false = phải được duyệt trước (BR-001). */
  autoApproveListings: boolean;
  /** Số ngày tin được duyệt còn hiệu lực (BR-026). */
  listingTtlDays: number;
}

const DEFAULTS: PlatformSettings = { autoApproveListings: true, listingTtlDays: 60 };

export async function getSettings(): Promise<PlatformSettings> {
  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["auto_approve_listings", "listing_ttl_days"]);
    if (error) throw error;

    const map = new Map((data || []).map((row) => [row.key, row.value]));
    return {
      autoApproveListings: parseBoolean(map.get("auto_approve_listings"), DEFAULTS.autoApproveListings),
      listingTtlDays: parseNumber(map.get("listing_ttl_days"), DEFAULTS.listingTtlDays),
    };
  } catch (err) {
    logError("admin-settings-service.getSettings", err);
    throw err;
  }
}

export async function setAutoApproveListings(enabled: boolean): Promise<void> {
  try {
    const { error } = await supabase.rpc("set_platform_setting", {
      p_key: "auto_approve_listings",
      p_value: enabled as unknown as never,
    });
    if (error) throw error;
  } catch (err) {
    logError("admin-settings-service.setAutoApproveListings", err);
    throw err;
  }
}

/** `value` là jsonb nên có thể ra boolean thật hoặc chuỗi "true". */
function parseBoolean(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") return raw === "true";
  return fallback;
}

function parseNumber(raw: unknown, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
