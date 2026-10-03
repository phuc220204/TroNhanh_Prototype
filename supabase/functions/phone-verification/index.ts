import { createClient } from "npm:@supabase/supabase-js@2.110.0";

type Action = "send" | "verify";
type RpcResult = { ok: boolean; reason?: string; retry_after?: number };

const DEFAULT_ORIGINS = [
  "https://tronhanh.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

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

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  let national = digits;
  if (digits.startsWith("0084")) national = `0${digits.slice(4)}`;
  else if (digits.startsWith("84")) national = `0${digits.slice(2)}`;
  if (!/^0(?:3|5|7|8|9)\d{8}$/.test(national)) return null;
  return `+84${national.slice(1)}`;
}

function safeProviderMessage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted-phone]")
    .replace(/\b\d{4,8}\b/g, "[redacted-code]")
    .replace(/\b[A-Za-z0-9_+/=-]{24,}\b/g, "[redacted-token]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 180);
}

async function hashOtp(pepper: string, userId: string, phone: string, otp: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${pepper}:${userId}:${phone}:${otp}`),
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function makeOtp(): string {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(value).padStart(6, "0");
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  const allowedOrigins = (Deno.env.get("PHONE_VERIFICATION_ALLOWED_ORIGINS") ?? DEFAULT_ORIGINS.join(","))
    .split(",").map((item) => item.trim()).filter(Boolean);
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  if (origin && !allowedOrigins.includes(origin)) return json({ error: "FORBIDDEN_ORIGIN" }, 403, corsOrigin);
  if (request.method === "OPTIONS") return json({}, 200, corsOrigin);
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405, corsOrigin);
  if (Number(request.headers.get("content-length") ?? 0) > 4_096) return json({ error: "PAYLOAD_TOO_LARGE" }, 413, corsOrigin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const pepper = Deno.env.get("PHONE_OTP_PEPPER");
  const speedSmsToken = Deno.env.get("SPEEDSMS_ACCESS_TOKEN");
  if (!supabaseUrl || !anonKey || !serviceKey || !pepper || !speedSmsToken) {
    console.error("Phone verification service is missing server configuration");
    return json({ error: "PHONE_VERIFICATION_NOT_CONFIGURED" }, 503, corsOrigin);
  }

  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return json({ error: "AUTH_REQUIRED" }, 401, corsOrigin);
  const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "AUTH_REQUIRED" }, 401, corsOrigin);

  let body: { action?: Action; phone?: string; otp?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400, corsOrigin);
  }
  if (body.action !== "send" && body.action !== "verify") return json({ error: "INVALID_ACTION" }, 400, corsOrigin);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  if (body.action === "send") {
    const phone = normalizePhone(body.phone);
    if (!phone) return json({ ok: false, reason: "invalid_phone" }, 400, corsOrigin);
    const otp = makeOtp();
    const otpHash = await hashOtp(pepper, userData.user.id, phone, otp);
    const { data, error } = await admin.rpc("begin_contact_phone_verification", {
      p_user_id: userData.user.id,
      p_phone_e164: phone,
      p_otp_hash: otpHash,
    });
    if (error) {
      console.error("Could not start phone challenge", error.message);
      return json({ error: "PHONE_VERIFICATION_UNAVAILABLE" }, 503, corsOrigin);
    }
    const result = data as RpcResult;
    if (!result?.ok) {
      return json({ ok: false, reason: result?.reason ?? "unknown", retry_after: result?.retry_after }, result?.reason === "invalid_phone" ? 400 : 429, corsOrigin);
    }

    try {
      const smsResponse = await fetch("https://api.speedsms.vn/index.php/sms/send", {
        method: "POST",
        headers: {
          authorization: `Basic ${btoa(`${speedSmsToken}:`)}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          to: [phone],
          content: `Ma xac minh Tro Nhanh: ${otp}. Ma co hieu luc trong 5 phut.`,
          sms_type: 2,
          sender: "",
        }),
        signal: AbortSignal.timeout(4_000),
      });
      const responseContentType = smsResponse.headers.get("content-type") ?? "unknown";
      const responseText = await smsResponse.text();
      let parsedJson = false;
      let parsedResponse: unknown = null;
      try {
        parsedResponse = JSON.parse(responseText);
        parsedJson = true;
      } catch {
        // Keep only response metadata in logs; provider bodies may contain PII.
      }
      const provider = parsedResponse && typeof parsedResponse === "object" && !Array.isArray(parsedResponse)
        ? parsedResponse as Record<string, unknown>
        : null;
      const providerData = provider?.data && typeof provider.data === "object" && !Array.isArray(provider.data)
        ? provider.data as Record<string, unknown>
        : null;
      const invalidPhones = Array.isArray(providerData?.invalidPhone) ? providerData.invalidPhone : [];
      if (!smsResponse.ok || provider?.status !== "success" || provider?.code !== "00" || invalidPhones.includes(phone)) {
        await admin.rpc("invalidate_contact_phone_verification", { p_user_id: userData.user.id });
        const responseType = provider
          ? "json-object"
          : parsedJson
            ? "json-non-object"
            : responseText.trim()
              ? "non-json"
              : "empty";
        console.error("SpeedSMS verification send failed", {
          httpStatus: smsResponse.status,
          contentType: responseContentType,
          responseType,
          providerStatus: typeof provider?.status === "string" ? provider.status.slice(0, 32) : "missing",
          providerCode: typeof provider?.code === "string" || typeof provider?.code === "number" ? provider.code : "missing",
          providerCodeType: typeof provider?.code,
          responseKeys: provider ? Object.keys(provider).slice(0, 12) : [],
          dataKeys: providerData ? Object.keys(providerData).slice(0, 12) : [],
          hasProviderMessage: typeof provider?.message === "string",
          providerMessage: safeProviderMessage(provider?.message),
        });
        return json({ error: "SMS_DELIVERY_FAILED" }, 502, corsOrigin);
      }
      return json({ ok: true }, 200, corsOrigin);
    } catch (error) {
      await admin.rpc("invalidate_contact_phone_verification", { p_user_id: userData.user.id });
      console.error("SpeedSMS verification request failed", error);
      return json({ error: "SMS_PROVIDER_UNAVAILABLE" }, 502, corsOrigin);
    }
  }

  if (typeof body.otp !== "string" || !/^\d{6}$/.test(body.otp)) {
    return json({ ok: false, reason: "invalid_code" }, 400, corsOrigin);
  }
  // Look up the pending phone only through the service role, then bind the OTP
  // hash to that exact value to prevent swapping numbers during verification.
  const { data: challenge, error: challengeError } = await admin
    .from("phone_verification_challenges")
    .select("phone_e164")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (challengeError) return json({ error: "PHONE_VERIFICATION_UNAVAILABLE" }, 503, corsOrigin);
  if (!challenge?.phone_e164) return json({ ok: false, reason: "no_challenge" }, 400, corsOrigin);
  const otpHash = await hashOtp(pepper, userData.user.id, challenge.phone_e164, body.otp);
  const { data, error } = await admin.rpc("complete_contact_phone_verification", {
    p_user_id: userData.user.id,
    p_otp_hash: otpHash,
  });
  if (error) {
    console.error("Could not complete phone challenge", error.message);
    return json({ error: "PHONE_VERIFICATION_UNAVAILABLE" }, 503, corsOrigin);
  }
  const result = data as RpcResult;
  if (!result?.ok) {
    const status = result?.reason === "rate_limited" ? 429 : result?.reason === "phone_taken" ? 409 : 400;
    return json({ ok: false, reason: result?.reason ?? "unknown" }, status, corsOrigin);
  }
  return json({ ok: true }, 200, corsOrigin);
});
