import { checkCode, makeSession, setCookie, revokedList } from "../lib/access.js";

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
  const r = await checkCode(env.ACCESS_SECRET, body?.email, body?.code);
  if (!r.error && r.email && revokedList(env.REVOKED_EMAILS).includes(r.email)) r.error = "revoked";
  if (r.error) return res.status(r.error === "not_configured" ? 503 : 401).json({ error: r.error, message: MSG[r.error] });
  const s = await makeSession(env.ACCESS_SECRET, r);
  res.setHeader("Set-Cookie", setCookie(s.value, s.maxAge));
  res.status(200).json({ ok: true, kind: r.kind, email: r.email, until: new Date(Date.now() + s.maxAge * 1000).toISOString() });
}
