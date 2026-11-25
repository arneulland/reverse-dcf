import { readSession, cookieValue, revokedList, isAdminSession } from "../lib/access.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const s = await readSession(process.env.ACCESS_SECRET, cookieValue(req.headers?.cookie), Date.now(), revokedList(process.env.REVOKED_EMAILS));
  res.status(200).json(s ? { member: true, admin: isAdminSession(s, process.env), kind: s.kind, email: s.email, until: new Date(s.exp).toISOString() } : { member: false });
}
