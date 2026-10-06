import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import { verifyPayosData } from "../_shared/payos-signature.mjs";

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  if (Number(request.headers.get("content-length") ?? 0) > 16_384) {
    return json({ error: "PAYLOAD_TOO_LARGE" }, 413);
  }
  const checksumKey = Deno.env.get("PAYOS_CHECKSUM_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!checksumKey || !supabaseUrl || !serviceKey) {
    return json({ error: "PAYMENT_NOT_CONFIGURED" }, 503);
  }

  let payload: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 16_384) return json({ error: "PAYLOAD_TOO_LARGE" }, 413);
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }
  const data = payload.data as Record<string, unknown> | undefined;
  let validSignature = false;
  try {
    validSignature = !!data && !Array.isArray(data)
      && typeof payload.signature === "string"
      && await verifyPayosData(data, payload.signature, checksumKey);
  } catch {
    validSignature = false;
  }
  if (!validSignature) {
    return json({ error: "INVALID_SIGNATURE" }, 400);
  }
  if (payload.success !== true || payload.code !== "00" || data.code !== "00") {
    return json({ status: "IGNORED" }, 200);
  }
  if (!Number.isSafeInteger(data.orderCode) || !Number.isInteger(data.amount)
      || data.currency !== "VND" || typeof data.paymentLinkId !== "string") {
    return json({ error: "INVALID_PAYMENT_DATA" }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const paymentArgs = {
    p_order_code: data.orderCode,
    p_amount: data.amount,
    p_payment_link_id: data.paymentLinkId,
    p_reference: typeof data.reference === "string" ? data.reference : "",
  };
  // Một webhook cho mọi đơn payOS: thử đơn Boost trước, không có thì đơn gói SaaS
  // (hai bảng dùng hai dải order_code riêng nên không trùng).
  let { data: result, error } = await adminClient.rpc("complete_verified_boost_payment", paymentArgs);
  if (!error && result === "UNKNOWN_ORDER") {
    ({ data: result, error } = await adminClient.rpc("complete_verified_saas_payment", paymentArgs));
  }
  // A 5xx asks payOS to retry. Do not acknowledge an unrecorded payment.
  if (error) return json({ error: "PAYMENT_RECONCILIATION_FAILED" }, 503);
  if (result === "UNKNOWN_ORDER") {
    // payOS verifies a new webhook URL with its documented signed sample.
    // Any other unknown paid order needs investigation, not a silent 2xx.
    if (data.orderCode === 123 && data.amount === 3000) {
      return json({ status: "SAMPLE_ACCEPTED" }, 200);
    }
    return json({ error: "UNKNOWN_PAYMENT_ORDER" }, 503);
  }
  return json({ status: result }, 200);
});
