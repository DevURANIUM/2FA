const PERIOD_SECONDS = 30;
const DIGITS = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Mirrors main.py's normalize_secret(): uppercase, strip "=", pull out the
 * first run of 8+ Base32 characters, otherwise just strip whitespace.
 */
function normalizeSecret(secret) {
  const upper = secret.toUpperCase().replace(/=/g, "");
  const match = upper.match(/[A-Z2-7]{8,}/);
  if (match) return match[0];
  return upper.replace(/\s+/g, "");
}

/** Mirrors main.py's base32_to_bytes(). */
function base32ToBytes(secret) {
  let bits = "";
  for (const char of secret) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error("Secret must be a valid Base32 value.");
    }
    bits += value.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  if (bytes.length === 0) {
    throw new Error("Secret is too short.");
  }

  return new Uint8Array(bytes);
}

/**
 * Mirrors main.py's generate_totp(): RFC 6238 TOTP using HMAC-SHA1, computed
 * with the Workers runtime's native Web Crypto API instead of Python's hmac.
 */
async function generateTotp(secret, now) {
  const normalized = normalizeSecret(secret);
  if (!normalized) {
    throw new Error("Secret is empty.");
  }

  const keyBytes = base32ToBytes(normalized);
  const currentTime = Math.floor(now);
  const counter = Math.floor(currentTime / PERIOD_SECONDS);

  // Pack counter as an 8-byte big-endian integer, like Python's struct.pack(">Q", counter)
  const message = new ArrayBuffer(8);
  const view = new DataView(message);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, message));

  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);

  const code = String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
  const remaining = PERIOD_SECONDS - (currentTime % PERIOD_SECONDS);
  return { code, remaining };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Mirrors main.py's POST /api/totp handler, same response shape as before. */
async function handleTotp(request) {
  const now = Math.floor(Date.now() / 1000);

  let payload = {};
  try {
    payload = await request.json();
  } catch {
    // fall through with an empty payload, same as an empty secret below
  }
  const secret = typeof payload.secret === "string" ? payload.secret : "";

  try {
    const { code, remaining } = await generateTotp(secret, now);
    const normalized = normalizeSecret(secret);
    return jsonResponse({
      ok: true,
      secret: normalized,
      code,
      display: `${normalized} | ${code}`,
      remaining,
      period: PERIOD_SECONDS,
      server_time: now,
      expires_at: now + remaining,
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      detail: error.message,
      secret: normalizeSecret(secret),
      code: "",
      display: "",
      remaining: 0,
      period: PERIOD_SECONDS,
      server_time: now,
      expires_at: now,
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/totp" && request.method === "POST") {
      return handleTotp(request);
    }

    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    // Anything else that didn't already match a static file in `public/`
    // (Wrangler serves matching static assets automatically without
    // invoking this Worker at all, so this is just the not-found fallback).
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not found", { status: 404 });
  },
};
