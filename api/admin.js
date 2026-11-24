// Issues access codes. Protected by ADMIN_KEY. Used by /admin.
import { personalCode, monthlyCode, normEmail, yymmOf, addMonths, same } from "../lib/access.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const { ACCESS_SECRET: secret, ADMIN_KEY: admin } = process.env;
  if (!secret || !admin) return res.status(503).json({ error: "not_configured", message: "Set ACCESS_SECRET and ADMIN_KEY in Vercel first." });
  if (!same(String(body?.key || ""), admin)) return res.status(401).json({ error: "bad_key", message: "Wrong admin key." });

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
    const months = Math.min(36, Math.max(1, parseInt(body?.months, 10) || 12));
    // valid through the end of the month, `months` months from now
    const yymm = yymmOf(addMonths(now, months - 1));
    out.personal = { email, code: await personalCode(secret, email, yymm), validThrough: new Date(addMonths(now, months) - 1).toISOString().slice(0, 10) };
  }
  res.status(200).json(out);
}
