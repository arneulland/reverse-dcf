// Thin client for Yahoo Finance's public web endpoints (unofficial, no API key).
// Search and chart work without authentication. Fundamentals sometimes need a
// cookie + crumb, so that handshake is done lazily and only on a 401/403.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const HOSTS = ["https://query2.finance.yahoo.com", "https://query1.finance.yahoo.com"];

let session = null; // { cookie, crumb, at }

async function get(path, { cookie, timeout = 7000 } = {}) {
  let lastErr;
  for (const host of HOSTS) {
    try {
      const res = await fetch(host + path, {
        headers: {
          "User-Agent": UA,
          Accept: "application/json,text/plain,*/*",
          "Accept-Language": "en-US,en;q=0.9",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        signal: AbortSignal.timeout(timeout),
      });
      if (res.status === 404) return { status: 404, json: null };
      if (res.status === 401 || res.status === 403) return { status: res.status, json: null };
      if (!res.ok) throw new Error(`Yahoo ${res.status}`);
      return { status: 200, json: await res.json() };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function getSession() {
  if (session && Date.now() - session.at < 30 * 60 * 1000) return session;
  const r = await fetch("https://fc.yahoo.com/", {
    headers: { "User-Agent": UA },
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  const raw = r?.headers?.getSetCookie?.() ?? [];
  const cookie = raw.map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("Yahoo session cookie unavailable");
  const c = await fetch(HOSTS[0] + "/v1/test/getcrumb", {
    headers: { "User-Agent": UA, Cookie: cookie },
    signal: AbortSignal.timeout(5000),
  });
  const crumb = (await c.text()).trim();
  if (!c.ok || !crumb || crumb.includes("<")) throw new Error("Yahoo crumb unavailable");
  session = { cookie, crumb, at: Date.now() };
  return session;
}

async function getAuthed(path) {
  const first = await get(path);
  if (first.status === 200 || first.status === 404) return first;
  const s = await getSession();
  const sep = path.includes("?") ? "&" : "?";
  const second = await get(`${path}${sep}crumb=${encodeURIComponent(s.crumb)}`, { cookie: s.cookie });
  if (second.status !== 200) session = null;
  return second;
}

export async function search(q) {
  const path = `/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&listsCount=0&enableFuzzyQuery=false`;
  const { json } = await get(path);
  return (json?.quotes ?? [])
    .filter((x) => x.quoteType === "EQUITY" && x.symbol)
    .slice(0, 8)
    .map((x) => ({
      symbol: x.symbol,
      name: x.longname || x.shortname || x.symbol,
      exchange: x.exchDisp || x.exchange || "",
    }));
}

// Monthly closes for 10+ years, current price, currency and split history.
export async function chart(symbol, range = "max") {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1mo&events=split`;
  const { json, status } = await getAuthed(path);
  const r = json?.chart?.result?.[0];
  if (status === 404 || !r) return null;
  const closes = r.indicators?.quote?.[0]?.close ?? [];
  const points = (r.timestamp ?? [])
    .map((t, i) => ({ t: t * 1000, close: closes[i] }))
    .filter((p) => Number.isFinite(p.close));
  const splits = Object.values(r.events?.splits ?? {})
    .map((s) => ({ t: s.date * 1000, factor: s.numerator / s.denominator }))
    .filter((s) => Number.isFinite(s.factor) && s.factor > 0);
  return { meta: r.meta ?? {}, points, splits };
}

export const TS_TYPES = [
  "annualFreeCashFlow", "trailingFreeCashFlow",
  "annualOperatingCashFlow", "trailingOperatingCashFlow",
  "annualCapitalExpenditure", "trailingCapitalExpenditure",
  "annualStockBasedCompensation", "trailingStockBasedCompensation",
  "annualCashDividendsPaid", "trailingCashDividendsPaid",
  "annualDilutedAverageShares", "annualBasicAverageShares",
  "annualOrdinarySharesNumber", "quarterlyOrdinarySharesNumber",
];

// Returns { [type]: [{ date, value, currency }] } sorted oldest first.
export async function fundamentals(symbol, types = TS_TYPES) {
  const now = Math.floor(Date.now() / 1000) + 86400;
  const path =
    `/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}` +
    `?symbol=${encodeURIComponent(symbol)}&type=${types.join(",")}` +
    `&period1=493590046&period2=${now}&merge=false&padTimeSeries=false&lang=en-US&region=US`;
  const { json } = await getAuthed(path);
  const out = {};
  for (const r of json?.timeseries?.result ?? []) {
    const type = r?.meta?.type?.[0];
    if (!type || !Array.isArray(r[type])) continue;
    out[type] = r[type]
      .filter((p) => p && p.asOfDate && Number.isFinite(p.reportedValue?.raw))
      .map((p) => ({ date: p.asOfDate, value: p.reportedValue.raw, currency: p.currencyCode || null }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  return out;
}
