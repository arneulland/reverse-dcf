import { checkCode, makeSession, setCookie, revokedList, isAdminEmail, normEmail, normCode, same } from "../lib/access.js";

const MSG = {
  not_configured: "Member access isn't set up yet.",
  bad_email: "Enter the email address the code was issued to.",
  bad_code: "That code doesn't match. Check the email address and the code.",
  expired: "That code has expired. Ask for a new one.",
  revoked: "This email no longer has access.",
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const env = process.env;
  // Admin sign-in: the admin email with ADMIN_KEY as password gives a 30-day admin session.
  // Also treat it as admin sign-in when the admin email is used with something that isn't an access code,
  // so signing in from /join works too.
  const adminTry = body?.admin || (isAdminEmail(body?.email, env) && !normCode(body?.code));
  if (adminTry) {
    const email = normEmail(body?.email);
    if (!env.ACCESS_SECRET || !env.ADMIN_KEY || !env.ADMIN_EMAIL) return res.status(503).json({ error: "not_configured", message: "Set ACCESS_SECRET, ADMIN_KEY and ADMIN_EMAIL in Vercel first." });
    if (!isAdminEmail(email, env) || !same(String(body?.code || "").trim(), String(env.ADMIN_KEY).trim())) {
      await new Promise((r) => setTimeout(r, 1200)); // slows down guessing
      return res.status(401).json({ error: "bad_admin", message: "Wrong email or password." });
    }
    const s = await makeSession(env.ACCESS_SECRET, { kind: "admin", email, exp: Date.now() + 30 * 864e5 });
    res.setHeader("Set-Cookie", setCookie(s.value, s.maxAge));
    return res.status(200).json({ ok: true, kind: "admin", email, until: new Date(Date.now() + s.maxAge * 1000).toISOString() });
  }
  const r = await checkCode(env.ACCESS_SECRET, body?.email, body?.code);
  if (!r.error && r.email && revokedList(env.REVOKED_EMAILS).includes(r.email)) r.error = "revoked";
  if (r.error) return res.status(r.error === "not_configured" ? 503 : 401).json({ error: r.error, message: MSG[r.error] });
  const s = await makeSession(env.ACCESS_SECRET, r);
  res.setHeader("Set-Cookie", setCookie(s.value, s.maxAge));
  res.status(200).json({ ok: true, kind: r.kind, email: r.email, until: new Date(Date.now() + s.maxAge * 1000).toISOString() });
}
