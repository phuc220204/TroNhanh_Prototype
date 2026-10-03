// payOS payment-request signatures: alphabetically sorted key=value pairs,
// HMAC-SHA256 with the channel Checksum Key. Never import this into the browser.

function sortNested(value) {
  if (Array.isArray(value)) return value.map(sortNested);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, sortNested(value[key])]),
    );
  }
  return value;
}

function signatureValue(value) {
  if (value == null || value === "undefined" || value === "null") return "";
  if (typeof value === "object") return JSON.stringify(sortNested(value));
  return String(value);
}

export function canonicalPayosData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError("Invalid payOS signature data");
  }
  return Object.keys(data)
    .sort()
    .filter((key) => data[key] !== undefined)
    .map((key) => `${key}=${signatureValue(data[key])}`)
    .join("&");
}

export async function signPayosData(data, checksumKey) {
  if (!checksumKey) throw new TypeError("Missing payOS Checksum Key");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(checksumKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(canonicalPayosData(data)));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyPayosData(data, expectedSignature, checksumKey) {
  if (typeof expectedSignature !== "string" || !/^[0-9a-f]{64}$/i.test(expectedSignature)) return false;
  const actual = await signPayosData(data, checksumKey);
  let difference = 0;
  for (let i = 0; i < actual.length; i += 1) {
    difference |= actual.charCodeAt(i) ^ expectedSignature.toLowerCase().charCodeAt(i);
  }
  return difference === 0;
}

export async function signPaymentLinkRequest(request, checksumKey) {
  return signPayosData({
    amount: request.amount,
    cancelUrl: request.cancelUrl,
    description: request.description,
    orderCode: request.orderCode,
    returnUrl: request.returnUrl,
  }, checksumKey);
}
