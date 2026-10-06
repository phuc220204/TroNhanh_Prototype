import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import { signPaymentLinkRequest, verifyPayosData } from "../_shared/payos-signature.mjs";
import { getPayosCorsOrigin } from "../_shared/boost-access.mjs";

/**
 * Tạo link payOS để mua / gia hạn gói SaaS. Cùng khuôn với payos-create-checkout
 * (Boost): giá và loại đơn (mua mới / gia hạn) do RPC `begin_saas_checkout` quyết
 * định từ `subscription_plans`; client chỉ gửi `planId`.
 */
const PAYOS_API_URL = "https://api-merchant.payos.vn/v2/payment-requests";
// Link sống 15 phút; DB chỉ dùng lại đơn mở < 10 phút ⇒ link trả lại còn ≥ 5 phút.
// Không chủ động hủy link cũ: khách có thể đang chuyển khoản dở (mất tiền, không webhook).
const PAYMENT_LINK_TTL_SECONDS = 15 * 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: object, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin,
      "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
      "access-control-allow-methods": "POST, OPTIONS",
      vary: "Origin",
    },
  });
}

Deno.serve(async (request) => {
  const siteOrigin = Deno.env.get("PAYOS_SITE_ORIGIN")?.replace(/\/$/, "");
  let siteUrl: URL;
  try {
    siteUrl = new URL(siteOrigin ?? "");
  } catch {
    return new Response("Payment is not configured", { status: 503 });
  }
  if (!siteOrigin || siteUrl.protocol !== "https:" || siteUrl.origin !== siteOrigin) {
    return new Response("Payment is not configured", { status: 503 });
  }
  const requestOrigin = request.headers.get("origin");
  const corsOrigin = getPayosCorsOrigin(requestOrigin, siteOrigin) ?? siteOrigin;
  if (requestOrigin && corsOrigin !== requestOrigin) return new Response("Forbidden origin", { status: 403 });
  if (request.method === "OPTIONS") return json({}, 200, corsOrigin);
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405, corsOrigin);
  // Cùng công tắc với Boost: tắt thanh toán payOS là tắt cả mua gói.
  if (Deno.env.get("PAYOS_CHECKOUT_ENABLED") !== "true") {
    return json({ error: "PAYMENT_NOT_AVAILABLE" }, 503, corsOrigin);
  }

  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return json({ error: "AUTH_REQUIRED" }, 401, corsOrigin);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clientId = Deno.env.get("PAYOS_CLIENT_ID");
  const apiKey = Deno.env.get("PAYOS_API_KEY");
  const checksumKey = Deno.env.get("PAYOS_CHECKSUM_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey || !clientId || !apiKey || !checksumKey) {
    return json({ error: "PAYMENT_NOT_CONFIGURED" }, 503, corsOrigin);
  }

  let input: { planId?: unknown };
  try {
    input = await request.json();
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400, corsOrigin);
  }
  if (typeof input?.planId !== "string" || !UUID_PATTERN.test(input.planId)) {
    return json({ error: "INVALID_REQUEST" }, 400, corsOrigin);
  }

  const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "AUTH_REQUIRED" }, 401, corsOrigin);

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: orderRows, error: orderError } = await adminClient.rpc("begin_saas_checkout", {
    p_seller_id: userData.user.id,
    p_plan_id: input.planId,
  });
  if (orderError || !Array.isArray(orderRows) || orderRows.length !== 1) {
    return json({ error: "SAAS_ORDER_REJECTED" }, 400, corsOrigin);
  }
  const order = orderRows[0] as { order_code: number; amount: number; is_renewal: boolean };
  if (!Number.isSafeInteger(order.order_code) || !Number.isInteger(order.amount)) {
    return json({ error: "SAAS_ORDER_INVALID" }, 500, corsOrigin);
  }

  // Đơn mở được tái dùng: trả lại link đã có thay vì xin link payOS thứ hai.
  const { data: savedOrder, error: savedOrderError } = await adminClient
    .from("saas_orders")
    .select("status, checkout_url")
    .eq("order_code", order.order_code)
    .maybeSingle();
  if (savedOrderError || !savedOrder) return json({ error: "SAAS_ORDER_NOT_READY" }, 502, corsOrigin);
  if (savedOrder.status === "LINKED" && typeof savedOrder.checkout_url === "string") {
    try {
      const storedUrl = new URL(savedOrder.checkout_url);
      if (storedUrl.protocol === "https:" && storedUrl.hostname === "pay.payos.vn") {
        return json({ checkoutUrl: storedUrl.toString(), orderCode: order.order_code, amount: order.amount }, 200, corsOrigin);
      }
    } catch {
      // URL lưu sai thì không trả về trình duyệt.
    }
    return json({ error: "SAAS_ORDER_NOT_READY" }, 502, corsOrigin);
  }

  const paymentRequest = {
    orderCode: order.order_code,
    amount: order.amount,
    // payOS giới hạn mô tả ở một số luồng chuyển khoản — giữ ≤ 9 ký tự ASCII.
    description: `GOI${String(order.order_code).slice(-6)}`,
    returnUrl: `${siteOrigin}/chu-tro/goi-dich-vu?saas=return&orderCode=${order.order_code}`,
    cancelUrl: `${siteOrigin}/chu-tro/goi-dich-vu?saas=cancel&orderCode=${order.order_code}`,
  };
  const signature = await signPaymentLinkRequest(paymentRequest, checksumKey);
  // `expiredAt` không nằm trong chữ ký (payOS chỉ ký 5 trường ở paymentRequest).
  const expiredAt = Math.floor(Date.now() / 1000) + PAYMENT_LINK_TTL_SECONDS;
  let payosResponse: Response;
  try {
    payosResponse = await fetch(PAYOS_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-client-id": clientId, "x-api-key": apiKey },
      body: JSON.stringify({ ...paymentRequest, expiredAt, signature }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return json({ error: "PAYOS_UNAVAILABLE" }, 502, corsOrigin);
  }
  if (!payosResponse.ok) return json({ error: "PAYOS_UNAVAILABLE" }, 502, corsOrigin);

  let payosBody: Record<string, unknown>;
  try {
    payosBody = await payosResponse.json();
  } catch {
    return json({ error: "PAYOS_INVALID_RESPONSE" }, 502, corsOrigin);
  }
  const link = payosBody.data as Record<string, unknown> | undefined;
  if (payosBody.code !== "00" || !link || typeof payosBody.signature !== "string"
      || !await verifyPayosData(link, payosBody.signature, checksumKey)
      || link.orderCode !== order.order_code || link.amount !== order.amount
      || typeof link.paymentLinkId !== "string" || typeof link.checkoutUrl !== "string") {
    return json({ error: "PAYOS_INVALID_RESPONSE" }, 502, corsOrigin);
  }
  let checkoutUrl: URL;
  try {
    checkoutUrl = new URL(link.checkoutUrl);
  } catch {
    return json({ error: "PAYOS_INVALID_RESPONSE" }, 502, corsOrigin);
  }
  if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "pay.payos.vn") {
    return json({ error: "PAYOS_INVALID_RESPONSE" }, 502, corsOrigin);
  }
  const { error: attachError } = await adminClient.rpc("attach_saas_checkout_link", {
    p_order_code: order.order_code,
    p_payment_link_id: link.paymentLinkId,
    p_checkout_url: checkoutUrl.toString(),
  });
  if (attachError) return json({ error: "SAAS_ORDER_NOT_READY" }, 502, corsOrigin);

  return json({ checkoutUrl: checkoutUrl.toString(), orderCode: order.order_code, amount: order.amount }, 200, corsOrigin);
});
