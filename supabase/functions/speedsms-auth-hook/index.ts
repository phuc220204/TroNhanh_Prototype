import { Webhook } from "npm:standardwebhooks@1.0.0";

const SPEEDSMS_URL = "https://api.speedsms.vn/index.php/sms/send";

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const signingSecret = Deno.env.get("SEND_SMS_HOOK_SECRET");
  const accessToken = Deno.env.get("SPEEDSMS_ACCESS_TOKEN");
  if (!signingSecret || !accessToken) {
    console.error("Send SMS hook is missing server configuration");
    return new Response(JSON.stringify({ error: { http_code: 500, message: "SMS provider is not configured" } }), { status: 500 });
  }

  let event: { user?: { phone?: string }; sms?: { otp?: string } } | null = null;
  try {
    const rawBody = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    const secrets = signingSecret.split("|").map((secret) => secret.trim().replace(/^v1,whsec_/, ""));
    let verified = false;
    for (const secret of secrets) {
      try {
        event = new Webhook(secret).verify(rawBody, headers) as typeof event;
        verified = true;
        break;
      } catch {
        // Try the next signing secret during key rotation.
      }
    }
    if (!verified || !event) return new Response(JSON.stringify({ error: { http_code: 401, message: "Invalid hook signature" } }), { status: 401 });
  } catch (error) {
    console.error("Could not verify the Supabase SMS hook", error);
    return new Response(JSON.stringify({ error: { http_code: 400, message: "Invalid hook payload" } }), { status: 400 });
  }

  const phone = event.user?.phone;
  const otp = event.sms?.otp;
  if (!phone || !/^\+84(?:3|5|7|8|9)\d{8}$/.test(phone) || !otp || !/^\d{4,8}$/.test(otp)) {
    return new Response(JSON.stringify({ error: { http_code: 400, message: "Missing or invalid phone OTP" } }), { status: 400 });
  }

  try {
    // Supabase Auth owns code generation and expiry; SpeedSMS is only the delivery channel.
    const content = `Ma xac minh Tro Nhanh cua ban: ${otp}. Ma chi dung mot lan.`;
    const response = await fetch(SPEEDSMS_URL, {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${accessToken}:`)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ to: [phone], content, sms_type: 2, sender: "" }),
      signal: AbortSignal.timeout(4_000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.status !== "success" || result?.code !== "00" || result?.data?.invalidPhone?.includes(phone)) {
      console.error("SpeedSMS send failed", { httpStatus: response.status, providerCode: result?.code });
      return new Response(JSON.stringify({ error: { http_code: 502, message: "SMS could not be delivered" } }), { status: 502 });
    }
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("SpeedSMS request failed", error);
    return new Response(JSON.stringify({ error: { http_code: 502, message: "SMS provider is temporarily unavailable" } }), { status: 502 });
  }
});
