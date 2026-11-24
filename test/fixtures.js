// Synthetic responses shaped like the real provider payloads. Used for tests
// and for `MOCK=1 npm run dev` when the providers aren't reachable.
const ts = (iso) => Math.floor(Date.parse(iso) / 1000);
function months(fromYear, toIso, startPx, endPx) {
  const out = []; const end = Date.parse(toIso);
  for (let d = new Date(Date.UTC(fromYear, 0, 1)); d.getTime() <= end; d.setUTCMonth(d.getUTCMonth() + 1)) out.push(d.getTime() / 1000);
  const close = out.map((_, i) => startPx * Math.pow(endPx / startPx, i / (out.length - 1)) * (1 + 0.08 * Math.sin(i / 3)));
  return { timestamp: out, close };
}
const chartJson = (meta, m, splits) => ({ chart: { result: [{ meta, timestamp: m.timestamp, indicators: { quote: [{ close: m.close }] }, ...(splits ? { events: { splits } } : {}) }] } });
const series = (type, cur, pts, periodType = "12M") => ({ meta: { symbol: ["X"], type: [type] }, timestamp: pts.map((p) => ts(p[0])), [type]: pts.map((p) => ({ asOfDate: p[0], periodType, currencyCode: cur, reportedValue: { raw: p[1], fmt: "" } })) });

const csuYears = [["2022-12-31", 1.15e9], ["2023-12-31", 1.39e9], ["2024-12-31", 1.63e9], ["2025-12-31", 1.86e9]];
const sh = (v) => csuYears.map(([d]) => [d, v]);
export const routes = {
  "search?q=constellation": { quotes: [
    { symbol: "CSU.TO", longname: "Constellation Software Inc.", exchDisp: "Toronto", quoteType: "EQUITY" },
    { symbol: "CNSWF", longname: "Constellation Software Inc.", exchDisp: "OTC Markets", quoteType: "EQUITY" },
    { symbol: "STZ", longname: "Constellation Brands, Inc.", exchDisp: "NYSE", quoteType: "EQUITY" },
    { symbol: "X-USD", shortname: "noise", quoteType: "CRYPTOCURRENCY" } ] },
  "search?q=microsoft": { quotes: [{ symbol: "MSFT", longname: "Microsoft Corporation", exchDisp: "NASDAQ", quoteType: "EQUITY" }] },
  "chart/CSU.TO": chartJson({ currency: "CAD", symbol: "CSU.TO", longName: "Constellation Software Inc.", fullExchangeName: "Toronto", regularMarketPrice: 3385, regularMarketTime: ts("2026-11-12T21:00:00Z") }, months(2016, "2026-11-01", 550, 3385)),
  "chart/USDCAD=X": chartJson({ currency: "CAD", symbol: "USDCAD=X", regularMarketPrice: 1.418 }, months(2016, "2026-11-01", 1.33, 1.418)),
  "timeseries/CSU.TO": { timeseries: { result: [
    series("annualFreeCashFlow", "USD", csuYears),
    series("trailingFreeCashFlow", "USD", [["2026-09-30", 1.944e9]], "TTM"),
    series("annualStockBasedCompensation", "USD", []),
    series("annualCashDividendsPaid", "USD", csuYears.map(([d]) => [d, -8.5e7])),
    series("trailingCashDividendsPaid", "USD", [["2026-09-30", -8.5e7]], "TTM"),
    series("annualDilutedAverageShares", "USD", sh(21.19e6)),
    series("quarterlyOrdinarySharesNumber", "USD", [["2026-09-30", 21.19e6]], "3M"),
    { meta: { symbol: ["CSU.TO"], type: ["annualCapitalExpenditure"] } },
  ] } },
  // US company with a 4-for-1 split in June 2024; Yahoo history is restated,
  // SEC history before the split is not.
  "chart/SPLT": chartJson({ currency: "USD", symbol: "SPLT", longName: "Split Corp", fullExchangeName: "NasdaqGS", regularMarketPrice: 120, regularMarketTime: ts("2026-11-12T21:00:00Z") }, months(2014, "2026-11-01", 20, 120), { 1: { date: ts("2024-06-10"), numerator: 4, denominator: 1 } }),
  "timeseries/SPLT": { timeseries: { result: [
    series("annualFreeCashFlow", "USD", [["2022-12-31", 3.0e9], ["2023-12-31", 3.4e9], ["2024-12-31", 3.9e9], ["2025-12-31", 4.4e9]]),
    series("trailingFreeCashFlow", "USD", [["2026-09-30", 4.8e9]], "TTM"),
    series("annualStockBasedCompensation", "USD", [["2022-12-31", 3e8], ["2023-12-31", 3.4e8], ["2024-12-31", 3.9e8], ["2025-12-31", 4.4e8]]),
    series("trailingStockBasedCompensation", "USD", [["2026-09-30", 4.8e8]], "TTM"),
    series("annualCashDividendsPaid", "USD", [["2025-12-31", -1.1e9]]),
    series("trailingCashDividendsPaid", "USD", [["2026-09-30", -1.2e9]], "TTM"),
    series("annualDilutedAverageShares", "USD", [["2022-12-31", 4.12e9], ["2023-12-31", 4.08e9], ["2024-12-31", 4.04e9], ["2025-12-31", 4.0e9]]),
    series("quarterlyOrdinarySharesNumber", "USD", [["2026-09-30", 3.97e9]], "3M"),
  ] } },
  "timeseries/MSFT": { timeseries: { result: [
    series("annualEBIT", "USD", [["2022-06-30", 8.3e10], ["2023-06-30", 8.9e10], ["2024-06-30", 1.1e11], ["2025-06-30", 1.29e11]]),
    series("annualTaxRateForCalcs", "USD", [["2022-06-30", 0.13], ["2023-06-30", 0.19], ["2024-06-30", 0.18], ["2025-06-30", 0.18]]),
    series("annualInvestedCapital", "USD", [["2022-06-30", 2.3e11], ["2023-06-30", 2.7e11], ["2024-06-30", 3.3e11], ["2025-06-30", 3.9e11]]),
    series("annualTotalRevenue", "USD", [["2022-06-30", 1.98e11], ["2023-06-30", 2.12e11], ["2024-06-30", 2.45e11], ["2025-06-30", 2.82e11]]),
    series("annualOperatingIncome", "USD", [["2022-06-30", 8.3e10], ["2023-06-30", 8.85e10], ["2024-06-30", 1.09e11], ["2025-06-30", 1.28e11]]),
  ] } },
  "company_tickers.json": { 0: { cik_str: 1234, ticker: "SPLT", title: "Split Corp" } },
};
const fact = (y, val) => ({ start: `${y}-01-01`, end: `${y}-12-31`, val, fy: y, fp: "FY", form: "10-K", filed: `${y + 1}-02-15` });
const concept = (unit, fn) => ({ units: { [unit]: Array.from({ length: 12 }, (_, i) => fact(2014 + i, fn(2014 + i))).concat([{ start: "2020-01-01", end: "2020-03-31", val: 1, form: "10-Q", filed: "2020-05-01" }]) } });
export const edgar = {
  NetCashProvidedByUsedInOperatingActivities: concept("USD", (y) => 1.6e9 * Math.pow(1.12, y - 2014)),
  PaymentsToAcquirePropertyPlantAndEquipment: concept("USD", (y) => 2.5e8 * Math.pow(1.1, y - 2014)),
  ShareBasedCompensation: concept("USD", (y) => 1.2e8 * Math.pow(1.12, y - 2014)),
  PaymentsOfDividends: concept("USD", (y) => 4e8 * Math.pow(1.1, y - 2014)),
  // as reported: ~1.05bn pre-split shares until 2023, restated from the FY2024 10-K
  WeightedAverageNumberOfDilutedSharesOutstanding: concept("shares", (y) => (y >= 2022 ? 4.12e9 - (y - 2022) * 4e7 : 1.07e9 - (y - 2014) * 5e6)),
};

export function mockFetch(url) {
  const u = String(url);
  const json = (body, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
  if (u.includes("/v1/finance/search")) return json(/q=const/i.test(u) ? routes["search?q=constellation"] : /q=(micro|msft)/i.test(u) ? routes["search?q=microsoft"] : { quotes: [] });
  // attention sources
  if (u.includes("en.wikipedia.org/w/api.php")) {
    const q = decodeURIComponent((u.match(/search=([^&]+)/) || [])[1] || "");
    if (u.includes("list=search")) return json({ query: { search: [] } });
    return json([q, /^(Microsoft|Constellation Software)$/.test(q) ? [q] : []]);
  }
  if (u.includes("wikimedia.org/api/rest_v1/metrics/pageviews")) {
    const big = u.includes("/Microsoft/");
    return json({ items: Array.from({ length: 365 }, (_, i) => ({ views: (big ? 9000 : 700) * (i >= 335 ? 1.5 : 1) })) });
  }
  if (u.includes("news.google.com/rss")) {
    const big = u.includes("Microsoft"), wk = u.includes("when:7d");
    const n = big ? 100 : wk ? 9 : 60;
    return Promise.resolve(new Response("<rss><channel>" + "<item><title>x</title></item>".repeat(n) + "</channel></rss>", { status: 200 }));
  }
  if (u.includes("apewisdom.io")) return json({ pages: 1, results: [{ ticker: "MSFT", mentions: "240", mentions_24h_ago: "160", rank: 8 }, { ticker: "NVDA", mentions: "1900", mentions_24h_ago: "2100", rank: 1 }] });
  if (u.includes("api.stocktwits.com")) return u.includes("MSFT") ? json({ symbol: { symbol: "MSFT", watchlist_count: 520000 } }) : json({}, 403);
  if (u.includes("company_tickers.json")) return json(routes["company_tickers.json"]);
  let m = u.match(/companyconcept\/CIK\d+\/us-gaap\/(\w+)\.json/);
  if (m) return edgar[m[1]] ? json(edgar[m[1]]) : json({}, 404);
  m = u.match(/\/v8\/finance\/chart\/([^?]+)/);
  if (m) { const k = "chart/" + decodeURIComponent(m[1]); return routes[k] ? json(routes[k]) : json({ chart: { result: null } }, 404); }
  m = u.match(/finance\/timeseries\/([^?]+)/);
  if (m) { const k = "timeseries/" + decodeURIComponent(m[1]); return json(routes[k] ?? { timeseries: { result: [] } }); }
  return json({}, 404);
}
