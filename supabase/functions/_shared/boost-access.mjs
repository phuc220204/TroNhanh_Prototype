/**
 * CORS cho các Edge Function payOS: chỉ chấp nhận đúng origin của site
 * (`PAYOS_SITE_ORIGIN`). Request không có Origin (server-to-server) dùng site.
 *
 * Bật/tắt Boost cho toàn hệ thống chỉ bằng secret `PAYOS_CHECKOUT_ENABLED`;
 * frontend đọc trạng thái đó qua `payos-boost-packages`, không còn cờ riêng.
 */
export function getPayosCorsOrigin(requestOrigin, siteOrigin) {
  if (!requestOrigin || requestOrigin === siteOrigin) return siteOrigin;
  return null;
}
