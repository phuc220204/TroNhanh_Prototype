import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import { signPaymentLinkRequest, verifyPayosData } from "../_shared/payos-signature.mjs";
import { canPayosSellerCheckout, getPayosCorsOrigin } from "../_shared/boost-access.mjs";

const PAYOS_API_URL = "https://api-merchant.payos.vn/v2/payment-requests";

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
  const corsOrigin = getPayosCorsOrigin(requestOrigin, siteOrigin, Deno.env.get("PAYOS_TEST_MODE")) ?? siteOrigin;
  if (requestOrigin && corsOrigin !== requestOrigin) {
    return new Response("Forbidden origin", { status: 403 });
  }
  if (request.method === "OPTIONS") return json({}, 200, corsOrigin);
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405, corsOrigin);
  // Keep link creation closed even if secrets/functions are deployed early.
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

  let input: { listingId?: unknown; days?: unknown };
  try {
    input = await request.json();
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400, corsOrigin);
  }
  if (typeof input?.listingId !== "string"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.listingId)
      || typeof input.days !== "number" || !Number.isInteger(input.days)) {
    return json({ error: "INVALID_REQUEST" }, 400, corsOrigin);
  }

  const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "AUTH_REQUIRED" }, 401, corsOrigin);
  const testMode = Deno.env.get("PAYOS_TEST_MODE");
  const testSellerId = Deno.env.get("PAYOS_TEST_SELLER_ID");
  if (testMode !== "true" && testMode !== "false") {
    return json({ error: "PAYMENT_MODE_NOT_CONFIGURED" }, 503, corsOrigin);
  }
  if (testMode === "true" && !testSellerId) {
    return json({ error: "TEST_SELLER_NOT_CONFIGURED" }, 503, corsOrigin);
  }
  if (!canPayosSellerCheckout(testMode, testSellerId, userData.user.id)) {
    return json({ error: "TEST_SELLER_ONLY" }, 403, corsOrigin);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: orderRows, error: orderError } = await adminClient.rpc("begin_boost_checkout", {
    p_seller_id: userData.user.id,
    p_listing_id: input.listingId,
    p_days: input.days,
  });
  if (orderError || !Array.isArray(orderRows) || orderRows.length !== 1) {
    return json({ error: "BOOST_ORDER_REJECTED" }, 400, corsOrigin);
  }
  const order = orderRows[0] as { order_code: number; amount: number };
  if (!Number.isSafeInteger(order.order_code) || !Number.isInteger(order.amount)) {
    return json({ error: "BOOST_ORDER_INVALID" }, 500, corsOrigin);
  }

  // `begin_boost_checkout` reuses an existing open order. Resume its known
  // payment link instead of issuing a second payOS request. A paid held order
  // is deliberately not payable again while its listing awaits moderation.
  const { data: savedOrder, error: savedOrderError } = await adminClient
    .from("boost_orders")
    .select("status, checkout_url, days")
    .eq("order_code", order.order_code)
    .maybeSingle();
  if (savedOrderError || !savedOrder) {
    return json({ error: "BOOST_ORDER_NOT_READY" }, 502, corsOrigin);
  }
  if (savedOrder.status === "PAID_PENDING_APPROVAL") {
    return json({ error: "BOOST_ALREADY_PAID_PENDING_APPROVAL" }, 409, corsOrigin);
  }
  if (savedOrder.status === "PAID") {
    return json({ error: "BOOST_ORDER_ALREADY_PAID" }, 409, corsOrigin);
  }
  if (savedOrder.status === "NEEDS_REVIEW") {
    return json({ error: "BOOST_ORDER_NEEDS_REVIEW" }, 409, corsOrigin);
  }
  // The database deliberately reuses one open order for a listing so a retry
  // cannot create two payable payOS links. Do not silently return a checkout
  // for a different package if the seller changes the radio selection later.
  if ((savedOrder.status === "PENDING" || savedOrder.status === "LINKED")
      && savedOrder.days !== input.days) {
    return json({ error: "BOOST_OPEN_ORDER_PACKAGE_MISMATCH" }, 409, corsOrigin);
  }
  if (savedOrder.status === "LINKED" && typeof savedOrder.checkout_url === "string") {
    try {
      const storedUrl = new URL(savedOrder.checkout_url);
      if (storedUrl.protocol === "https:" && storedUrl.hostname === "pay.payos.vn") {
        return json({ checkoutUrl: storedUrl.toString(), orderCode: order.order_code, amount: order.amount }, 200, corsOrigin);
      }
    } catch {
      // A bad stored URL must never be returned to the browser. The order stays
      // reconcilable; a support operator can inspect it instead of a redirect.
    }
    return json({ error: "BOOST_ORDER_NOT_READY" }, 502, corsOrigin);
  }

  const paymentRequest = {
    orderCode: order.order_code,
    amount: order.amount,
    // PayOS caps the description for some bank-transfer flows. Keep it within
    // nine ASCII characters while the full immutable order code remains in
    // orderCode and in the database for reconciliation.
    description: `BOOST${String(order.order_code).slice(-4)}`,
    returnUrl: `${siteOrigin}/?boost=return&orderCode=${order.order_code}`,
    cancelUrl: `${siteOrigin}/?boost=cancel&orderCode=${order.order_code}`,
  };
  const signature = await signPaymentLinkRequest(paymentRequest, checksumKey);
  let payosResponse: Response;
  try {
    payosResponse = await fetch(PAYOS_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-client-id": clientId, "x-api-key": apiKey },
      body: JSON.stringify({ ...paymentRequest, signature }),
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
  const { error: attachError } = await adminClient.rpc("attach_boost_checkout_link", {
    p_order_code: order.order_code,
    p_payment_link_id: link.paymentLinkId,
    p_checkout_url: checkoutUrl.toString(),
  });
  if (attachError) return json({ error: "BOOST_ORDER_NOT_READY" }, 502, corsOrigin);

  return json({ checkoutUrl: checkoutUrl.toString(), orderCode: order.order_code, amount: order.amount }, 200, corsOrigin);
});
