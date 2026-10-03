import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";
import type { Json } from "../../shared/types/database.types";

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
  /** Cấu hình gói Boost được đọc bởi checkout phía server. */
  boostConfig: BoostConfig;
}

export interface BoostConfig {
  days: number[];
  price: number[];
}

const DEFAULT_BOOST_CONFIG: BoostConfig = {
  days: [7, 15, 30],
  price: [20_000, 35_000, 60_000],
};

const DEFAULTS = { autoApproveListings: true, listingTtlDays: 60 };

export async function getSettings(): Promise<PlatformSettings> {
  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["auto_approve_listings", "listing_ttl_days", "boost_config"]);
    if (error) throw error;

    const map = new Map((data || []).map((row) => [row.key, row.value]));
    return {
      autoApproveListings: parseBoolean(map.get("auto_approve_listings"), DEFAULTS.autoApproveListings),
      listingTtlDays: parseNumber(map.get("listing_ttl_days"), DEFAULTS.listingTtlDays),
      boostConfig: parseBoostConfig(map.get("boost_config")),
    };
  } catch (err) {
    logError("admin-settings-service.getSettings", err);
    throw err;
  }
}

export async function setBoostConfig(config: BoostConfig): Promise<void> {
  try {
    if (!isValidBoostConfig(config)) throw new Error("Cấu hình giá gói Boost không hợp lệ.");

    const { error } = await supabase.rpc("set_platform_setting", {
      p_key: "boost_config",
      p_value: { days: config.days, price: config.price } as Json,
    });
    if (error) throw error;
  } catch (err) {
    logError("admin-settings-service.setBoostConfig", err);
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

function parseBoostConfig(raw: unknown): BoostConfig {
  if (isValidBoostConfig(raw)) return { days: [...raw.days], price: [...raw.price] };
  return { days: [...DEFAULT_BOOST_CONFIG.days], price: [...DEFAULT_BOOST_CONFIG.price] };
}

function isValidBoostConfig(value: unknown): value is BoostConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const config = value as Record<string, unknown>;
  if (!Array.isArray(config.days) || !Array.isArray(config.price)
    || config.days.length === 0 || config.days.length !== config.price.length) return false;

  const days = config.days as unknown[];
  const prices = config.price as unknown[];
  return days.every((day) => Number.isSafeInteger(day) && Number(day) >= 1 && Number(day) <= 365)
    && new Set(days).size === days.length
    && prices.every((price) => Number.isSafeInteger(price) && Number(price) > 0 && Number(price) <= 1_000_000_000);
}
