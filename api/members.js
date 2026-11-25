// The admin's list of members: who got a code, when it was sent, and when it expires.
// Admin session only. Stored in Upstash Redis when it's connected in Vercel; without it the
// admin page keeps the list in the admin's own browser instead (see /admin).
import { readSession, cookieValue, isAdminSession, normEmail } from "../lib/access.js";
import { storeConfig, listMembers, saveMember, deleteMember } from "../lib/store.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const env = process.env;
  const s = await readSession(env.ACCESS_SECRET, cookieValue(req.headers?.cookie));
  if (!isAdminSession(s, env)) return res.status(401).json({ error: "not_admin", message: "Sign in as admin first." });
  const cfg = storeConfig(env);
  if (!cfg) return res.status(200).json({ storage: false, members: [] });
  try {
    if (req.method === "GET") return res.status(200).json({ storage: true, members: await listMembers(cfg) });
    if (req.method !== "POST") return res.status(405).json({ error: "method" });
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    const list = Array.isArray(body?.members) ? body.members : body?.member ? [body.member] : [];
    if (body?.action === "delete") { await deleteMember(cfg, normEmail(body.email)); return res.status(200).json({ ok: true }); }
    for (const m of list) {
      const email = normEmail(m?.email);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue;
      await saveMember(cfg, { email, name: String(m.name || "").slice(0, 120), code: String(m.code || ""), validThrough: String(m.validThrough || ""), issuedAt: m.issuedAt || null, sentAt: m.sentAt || null, note: String(m.note || "").slice(0, 300) });
    }
    return res.status(200).json({ ok: true, storage: true, members: await listMembers(cfg) });
  } catch (e) {
    return res.status(502).json({ error: "store", message: "Couldn't reach the member database. Try again." });
  }
}
