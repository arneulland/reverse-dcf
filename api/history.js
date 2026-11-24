// Monthly price history for one stock, for the drawdown tool.
import { chart, search } from "../lib/yahoo.js";
import { tradingCurrency } from "../lib/build.js";

export default async function handler(req, res) {
  const symbol = String(req.query?.symbol ?? "").trim().toUpperCase().replace(/^\$/, "");
  if (!/^[A-Z0-9][A-Z0-9.\-=^]{0,14}$/.test(symbol)) return res.status(400).json({ error: "bad_symbol" });
  try {
    const c = await chart(symbol);
    if (!c || c.points.length < 13) return res.status(404).json({ error: "not_found" });
    const { currency, scale } = tradingCurrency(c.meta.currency);
    let name = c.meta.longName || c.meta.shortName || "";
    if (!name) name = (await search(symbol).catch(() => [])).find((x) => x.symbol === symbol)?.name || symbol;
    res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
    res.status(200).json({
      symbol, name, currency, exchange: c.meta.fullExchangeName || c.meta.exchangeName || "",
      points: c.points.map((p) => [new Date(p.t).toISOString().slice(0, 10), +(p.close / scale).toPrecision(8)]),
    });
  } catch (e) {
    res.status(502).json({ error: "data_unavailable", detail: String(e.message || e) });
  }
}
