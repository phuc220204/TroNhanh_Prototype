import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import { getPayosCorsOrigin } from "../_shared/boost-access.mjs";

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
  if (requestOrigin && corsOrigin !== requestOrigin) return new Response("Forbidden origin", { status: 403 });
  if (request.method === "OPTIONS") return json({}, 200, corsOrigin);
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405, corsOrigin);

  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return json({ error: "AUTH_REQUIRED" }, 401, corsOrigin);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "PAYMENT_NOT_CONFIGURED" }, 503, corsOrigin);

  let orderCode: unknown;
  try {
    ({ orderCode } = await request.json());
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400, corsOrigin);
  }
  if (!Number.isSafeInteger(orderCode)) return json({ error: "INVALID_REQUEST" }, 400, corsOrigin);

  const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "AUTH_REQUIRED" }, 401, corsOrigin);

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: order, error } = await adminClient
    .from("boost_orders")
    .select("order_code, listing_id, days, amount, status, paid_at")
    .eq("order_code", orderCode as number)
    .eq("seller_id", userData.user.id)
    .maybeSingle();
  if (error) return json({ error: "PAYMENT_STATUS_UNAVAILABLE" }, 503, corsOrigin);
  if (!order) return json({ error: "BOOST_ORDER_NOT_FOUND" }, 404, corsOrigin);
  return json({ order }, 200, corsOrigin);
});
