// Issues access codes. Protected by ADMIN_KEY. Used by /admin.
import { personalCode, monthlyCode, normEmail, yymmOf, addMonths, readSession, cookieValue, isAdminSession } from "../lib/access.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const secret = process.env.ACCESS_SECRET;
  if (!secret) return res.status(503).json({ error: "not_configured", message: "Set ACCESS_SECRET in Vercel first." });
  // The middleware already checks this; checked again so the API is safe on its own.
  const s = await readSession(secret, cookieValue(req.headers?.cookie));
  if (!isAdminSession(s, process.env)) return res.status(401).json({ error: "not_admin", message: "Sign in as admin first." });

  const now = Date.now();
  const out = {
    monthly: [
      { month: yymmOf(now), code: await monthlyCode(secret, yymmOf(now)) },
      { month: yymmOf(addMonths(now, 1)), code: await monthlyCode(secret, yymmOf(addMonths(now, 1))) },
    ],
  };
  const email = normEmail(body?.email);
  if (email) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "bad_email", message: "That doesn't look like an email address." });
    // Either "valid through" a given month (YYMM, for codes already sent) or `months` from now.
    let yymm = /^\d{4}$/.test(String(body?.yymm || "")) ? String(body.yymm) : null;
    if (!yymm) {
      const months = Math.min(36, Math.max(1, parseInt(body?.months, 10) || 12));
      yymm = yymmOf(addMonths(now, months - 1));
    }
    const end = Date.UTC(2000 + +yymm.slice(0, 2), +yymm.slice(2), 1) - 1; // last moment of that month
    out.personal = { email, code: await personalCode(secret, email, yymm), validThrough: new Date(end).toISOString().slice(0, 10) };
  }
  res.status(200).json(out);
}
