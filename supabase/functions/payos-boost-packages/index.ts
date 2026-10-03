import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import { canPayosSellerCheckout, getPayosCorsOrigin } from "../_shared/boost-access.mjs";

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "PAYMENT_NOT_CONFIGURED" }, 503, corsOrigin);

  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return json({ error: "AUTH_REQUIRED" }, 401, corsOrigin);
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
  const { data: setting, error } = await adminClient
    .from("platform_settings")
    .select("value")
    .eq("key", "boost_config")
    .maybeSingle();
  if (error || !setting?.value || typeof setting.value !== "object") {
    return json({ error: "BOOST_CONFIG_MISSING" }, 503, corsOrigin);
  }

  const config = setting.value as { days?: unknown; price?: unknown };
  if (!Array.isArray(config.days) || !Array.isArray(config.price) || config.days.length !== config.price.length) {
    return json({ error: "BOOST_CONFIG_INVALID" }, 503, corsOrigin);
  }
  const prices = config.price as unknown[];
  const packages = config.days.map((days, index) => ({ days, amount: prices[index] }));
  if (packages.some((item) => typeof item.days !== "number" || !Number.isInteger(item.days)
    || typeof item.amount !== "number" || !Number.isInteger(item.amount)
    || Number(item.days) < 1 || Number(item.days) > 365 || Number(item.amount) <= 0)) {
    return json({ error: "BOOST_CONFIG_INVALID" }, 503, corsOrigin);
  }
  return json({ packages }, 200, corsOrigin);
});
