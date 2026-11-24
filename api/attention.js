import { attention } from "../lib/attention.js";
import { search } from "../lib/yahoo.js";

export default async function handler(req, res) {
  const symbol = String(req.query?.symbol ?? "").trim().toUpperCase().slice(0, 20);
  let name = String(req.query?.name ?? "").trim().slice(0, 120);
  if (!/^[A-Z0-9.\-^=]{1,20}$/.test(symbol)) return res.status(400).json({ error: "bad_symbol" });
  try {
    if (!name) {
      const hit = (await search(symbol)).find((x) => x.symbol.toUpperCase() === symbol);
      if (!hit) return res.status(404).json({ error: "not_found" });
      name = hit.name;
    }
    const out = await attention(symbol, name);
    res.setHeader("Cache-Control", out.score == null ? "no-store" : "public, s-maxage=21600, stale-while-revalidate=86400");
    res.status(200).json(out);
  } catch (e) {
    res.status(502).json({ error: "attention_unavailable", detail: String(e.message || e) });
  }
}
