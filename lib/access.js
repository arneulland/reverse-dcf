// Member access for Members' Corner. Stateless: every code and session is
// signed with ACCESS_SECRET, so there's no database. Uses Web Crypto only, so
// the same file runs in the Vercel middleware and in the API functions.
//
// Two kinds of access code:
//   Personal  TC-2712-ABCD-EFGH-JKLM   tied to one email, valid to the end of
//             the month in the code (here December 2027). You hand these out.
//   Monthly   TCM-2612-ABCD-EFGH-JKLM  one code for everyone, valid during that
//             month plus the first week of the next. Use it once paid
//             subscriptions are on: put the current code in a paid post or perk.
//
// Change ACCESS_SECRET and every code and session stops working at once.

// Pages and APIs that need a member session. Everything else stays open.
export const GATED = ["/reverse-dcf", "/attention", "/compounding", "/api/attention", "/api/company", "/api/search"];
export const COOKIE = "tc_member";
// Only these paths need an admin session: email in ADMIN_EMAIL, signed in with ADMIN_KEY.
export const ADMIN_PATHS = ["/admin", "/api/admin"];
export function isAdminPath(pathname) {
  const p = pathname.replace(/\/index\.html$/, "").replace(/\.html$/, "").replace(/\/+$/, "") || "/";
  return ADMIN_PATHS.some((g) => p === g || p.startsWith(g + "/"));
}
export function isAdminEmail(email, env) {
  const list = String(env?.ADMIN_EMAIL || "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(String(email).trim().toLowerCase());
}
export const isAdminSession = (s, env) => !!s && s.kind === "admin" && isAdminEmail(s.email, env);

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
const enc = new TextEncoder();
const DAY = 864e5;

export function isGated(pathname) {
  const p = pathname.replace(/\/index\.html$/, "").replace(/\.html$/, "").replace(/\/+$/, "") || "/";
  return GATED.some((g) => p === g || p.startsWith(g + "/"));
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
function base32(bytes, len) {
  let out = "", bits = 0, val = 0;
  for (const b of bytes) {
    val = (val << 8) | b; bits += 8;
    while (bits >= 5) { out += ALPHA[(val >>> (bits - 5)) & 31]; bits -= 5; }
    if (out.length >= len) break;
  }
  return out.slice(0, len);
}
export function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const group = (s) => s.match(/.{4}/g).join("-");
export const normEmail = (e) => String(e || "").trim().toLowerCase();
export function normCode(c) {
  const s = String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  let m = s.match(/^TCM(\d{4})([A-Z2-9]{12})$/);
  if (m) return `TCM-${m[1]}-${group(m[2])}`;
  m = s.match(/^TC(\d{4})([A-Z2-9]{12})$/);
  if (m) return `TC-${m[1]}-${group(m[2])}`;
  return null;
}
// "2712" -> first moment after December 2027 (UTC)
const endOfMonth = (yymm) => Date.UTC(2000 + +yymm.slice(0, 2), +yymm.slice(2), 1);
export const yymmOf = (t) => { const d = new Date(t); return String(d.getUTCFullYear() % 100).padStart(2, "0") + String(d.getUTCMonth() + 1).padStart(2, "0"); };
export function addMonths(t, n) { const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1); }

// ---- codes ------------------------------------------------------------------
export async function personalCode(secret, email, yymm) {
  const sig = base32(await hmac(secret, `member|${normEmail(email)}|${yymm}`), 12);
  return `TC-${yymm}-${group(sig)}`;
}
export async function monthlyCode(secret, yymm) {
  const sig = base32(await hmac(secret, `monthly|${yymm}`), 12);
  return `TCM-${yymm}-${group(sig)}`;
}

// Checks an email + code. Returns { kind, email, exp } or { error }.
export async function checkCode(secret, email, code, now = Date.now()) {
  if (!secret) return { error: "not_configured" };
  const c = normCode(code), e = normEmail(email);
  if (!c) return { error: "bad_code" };
  const yymm = c.match(/\d{4}/)[0];
  if (c.startsWith("TCM-")) {
    // valid during its month and the first 7 days after
    const start = addMonths(endOfMonth(yymm), -1), grace = endOfMonth(yymm) + 7 * DAY;
    if (now < start) return { error: "bad_code" };
    if (now >= grace) return { error: "expired" };
    if (!same(c, await monthlyCode(secret, yymm))) return { error: "bad_code" };
    return { kind: "monthly", email: e || null, exp: grace };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { error: "bad_email" };
  if (!same(c, await personalCode(secret, e, yymm))) return { error: "bad_code" };
  const exp = endOfMonth(yymm);
  if (now >= exp) return { error: "expired" };
  return { kind: "member", email: e, exp };
}

// ---- sessions ---------------------------------------------------------------
const b64u = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

export async function makeSession(secret, { kind, email, exp }, now = Date.now()) {
  const x = Math.min(exp, now + 180 * DAY);
  const body = b64u(JSON.stringify({ k: kind, e: email, x }));
  const sig = base32(await hmac(secret, "session|" + body), 32);
  return { value: body + "." + sig, maxAge: Math.max(0, Math.floor((x - now) / 1000)) };
}
export async function readSession(secret, value, now = Date.now(), revoked = []) {
  if (!secret || !value) return null;
  const [body, sig] = String(value).split(".");
  if (!body || !sig || !same(sig, base32(await hmac(secret, "session|" + body), 32))) return null;
  let s;
  try { s = JSON.parse(unb64u(body)); } catch { return null; }
  if (!(s.x > now)) return null;
  if (s.e && revoked.includes(s.e)) return null;
  return { kind: s.k, email: s.e, exp: s.x };
}

export function cookieValue(header, name = COOKIE) {
  const m = String(header || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}
export function setCookie(value, maxAge) {
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export const revokedList = (env) => String(env || "").split(/[\s,;]+/).map(normEmail).filter(Boolean);

// The gate itself, shared by middleware.js and the local dev server.
// Returns null to let the request through, or a Response to send instead.
export async function gate(request, env) {
  const url = new URL(request.url);
  const admin = isAdminPath(url.pathname);
  if (!admin && !isGated(url.pathname)) return null;
  const s = await readSession(env.ACCESS_SECRET, cookieValue(request.headers.get("cookie")), Date.now(), revokedList(env.REVOKED_EMAILS));
  if (admin ? isAdminSession(s, env) : s) return null;
  if (url.pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ error: "members_only" }), { status: 401, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  }
  const to = new URL("/join", url);
  to.searchParams.set("next", url.pathname + url.search);
  return new Response(null, { status: 302, headers: { Location: to.pathname + to.search, "cache-control": "no-store" } });
}
