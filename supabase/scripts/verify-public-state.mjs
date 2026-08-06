/**
 * Kiểm trạng thái dữ liệu CÔNG KHAI của DB remote — chạy trước và sau khi dọn.
 *
 *   node supabase/scripts/verify-public-state.mjs
 *
 * VÌ SAO CHỈ KIỂM ĐƯỢC MỘT PHẦN: script này dùng `anon` key (khóa duy nhất có
 * trong `.env`, và đúng như vậy — §4 cấm để `service_role` ở phía client). Anon
 * chỉ đọc được những gì RLS cho phép khách xem:
 *
 *   ĐỌC ĐƯỢC   rental_listings (Active) · demand_posts (qua view) ·
 *              platform_settings · subscription_plans
 *   KHÔNG ĐỌC  properties · rooms · occupancies · contracts · invoices ·
 *              payments · profiles  → owner-only, anon bị RLS lọc hết
 *
 * Phần "không đọc được" phải đếm bằng truy vấn SQL ở cuối
 * `reset-demo-data.sql`, chạy trong Supabase SQL Editor.
 *
 * Nói cách khác: script này chứng minh MARKETPLACE CÔNG KHAI đã sạch và CẤU HÌNH
 * HỆ THỐNG còn nguyên. Nó không thay thế được truy vấn SQL kia.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnv() {
  const raw = readFileSync(new URL("../../.env", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = readEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong .env");
  process.exit(1);
}

const supabase = createClient(url, key);

/** Đếm số dòng anon đọc được của một bảng/view. */
async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) return { count: null, note: error.message.slice(0, 60) };
  return { count: count ?? 0, note: "" };
}

const CHECKS = [
  { table: "rental_listings", expect: "rỗng sau khi dọn" },
  { table: "demand_posts", expect: "rỗng sau khi dọn" },
  { table: "listing_media", expect: "rỗng sau khi dọn" },
  { table: "reviews", expect: "rỗng sau khi dọn" },
  { table: "platform_settings", expect: "PHẢI CÒN (cấu hình)" },
  { table: "subscription_plans", expect: "PHẢI CÒN (gói dịch vụ)" },
];

console.log("");
console.log("Trạng thái dữ liệu công khai (đọc bằng anon key + RLS)");
console.log("═".repeat(64));

let publicBusinessRows = 0;
for (const check of CHECKS) {
  const { count, note } = await countRows(check.table);
  const shown = count === null ? `lỗi: ${note}` : String(count);
  console.log(`  ${check.table.padEnd(20)} ${shown.padStart(6)}   ${check.expect}`);
  if (count !== null && check.expect.startsWith("rỗng")) publicBusinessRows += count;
}

console.log("═".repeat(64));

const { count: boostCount } = await supabase
  .from("rental_listings")
  .select("*", { count: "exact", head: true })
  .not("boost_expire_at", "is", null);

if (boostCount) {
  console.log(`  Còn ${boostCount} tin có boost_expire_at — sau khi dọn phải là 0.`);
}

console.log("");
console.log(
  publicBusinessRows === 0
    ? "✓ Marketplace công khai đã sạch."
    : `→ Còn ${publicBusinessRows} dòng dữ liệu nghiệp vụ công khai.`
);
console.log("");
console.log("CHƯA kiểm được ở đây (anon không đọc nổi vì RLS owner-only):");
console.log("  properties · rooms · occupancies · contracts · invoices · payments · profiles");
console.log("  → chạy truy vấn ở cuối supabase/scripts/reset-demo-data.sql trong SQL Editor.");
console.log("");
