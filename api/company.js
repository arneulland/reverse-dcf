import { chart, fundamentals } from "../lib/yahoo.js";
import { history as edgarHistory } from "../lib/edgar.js";
import { buildCompany, tradingCurrency } from "../lib/build.js";

export default async function handler(req, res) {
  const symbol = String(req.query?.symbol ?? "").trim().toUpperCase().replace(/^\$/, "");
  if (!/^[A-Z0-9][A-Z0-9.\-=^]{0,14}$/.test(symbol)) return res.status(400).json({ error: "bad_symbol" });
  try {
    const usListing = !symbol.includes(".");
    const [c, fund, edgarRows] = await Promise.all([
      chart(symbol),
      fundamentals(symbol).catch(() => ({})),
      usListing ? edgarHistory(symbol) : Promise.resolve([]),
    ]);
    if (!c) return res.status(404).json({ error: "not_found" });

    const trade = tradingCurrency(c.meta.currency).currency;
    const fin =
      [fund.annualFreeCashFlow, fund.trailingFreeCashFlow, fund.annualOperatingCashFlow]
        .map((s) => s?.[s.length - 1]?.currency).find(Boolean) || trade;
    const fxChart = fin !== trade ? await chart(`${fin}${trade}=X`).catch(() => null) : null;

    const payload = buildCompany({ symbol, chart: c, fund, edgarRows, fxChart });
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json(payload);
  } catch (e) {
    res.status(502).json({ error: "data_unavailable", detail: String(e.message || e) });
  }
}
