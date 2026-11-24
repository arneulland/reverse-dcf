import { fundamentals, search } from "../lib/yahoo.js";
import { MOAT_TYPES, roicRows } from "../lib/moat.js";

export default async function handler(req, res) {
  const symbol = String(req.query?.symbol ?? "").trim().toUpperCase().replace(/^\$/, "");
  if (!/^[A-Z0-9][A-Z0-9.\-=^]{0,14}$/.test(symbol)) return res.status(400).json({ error: "bad_symbol" });
  try {
    const rows = roicRows(await fundamentals(symbol, MOAT_TYPES));
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).json({ symbol, rows });
  } catch (e) {
    res.status(502).json({ error: "data_unavailable", detail: String(e.message || e) });
  }
}
