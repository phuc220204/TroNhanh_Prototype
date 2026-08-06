import { supabase } from "../supabaseClient";
import { logError } from "./supabase-error";

/**
 * Đọc cấu hình nền tảng dùng chung.
 *
 * Đặt ở `shared/services` theo CLAUDE.md §2.1 (`platform_settings` thuộc shared).
 * `admin/services/admin-settings-service.ts` là đường GHI của Moderator; đây là
 * đường ĐỌC cho marketplace — marketplace không được import từ `admin/`.
 */

/** Gói đẩy tin: `days[i]` ↔ `price[i]`. */
export interface BoostPackage {
  days: number;
  price: number;
}

/** Dùng khi DB chưa có `boost_config` — khớp giá trị seed trong migration. */
const FALLBACK_BOOST_PACKAGES: BoostPackage[] = [
  { days: 7, price: 20000 },
  { days: 15, price: 35000 },
  { days: 30, price: 60000 },
];

/**
 * Các gói đẩy tin từ `platform_settings.boost_config`.
 *
 * ⚠️ Giá ở đây chỉ để HIỂN THỊ. RPC `boost_listing()` tra lại giá từ cùng config
 * và ghi `payments` theo giá server — client không gửi giá lên. Nếu hai bên lệch
 * nhau thì server đúng.
 */
export async function getBoostPackages(): Promise<BoostPackage[]> {
  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "boost_config")
      .maybeSingle();

    if (error) throw error;

    const config = data?.value as { days?: unknown; price?: unknown } | null;
    const days = Array.isArray(config?.days) ? config.days : null;
    const prices = Array.isArray(config?.price) ? config.price : null;
    if (!days || !prices) return FALLBACK_BOOST_PACKAGES;

    const packages = days
      .map((d, i) => ({ days: Number(d), price: Number(prices[i]) }))
      .filter((p) => Number.isFinite(p.days) && p.days > 0 && Number.isFinite(p.price));

    return packages.length > 0 ? packages : FALLBACK_BOOST_PACKAGES;
  } catch (err) {
    logError("platform-settings-service.getBoostPackages", err);
    return FALLBACK_BOOST_PACKAGES;
  }
}
