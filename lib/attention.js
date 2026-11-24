// Attention score: how much a stock is talked about right now, from free sources
// that need no API key. Each source becomes 0-100 points on a log scale, and the
// score is a weighted average of the sources that answered.
//
//   Wikipedia   average daily page views, last 30 days      every company
//   Google News stories in the last 7 days (feed caps at 100) every company
//   Reddit      mentions in the last 24 hours (ApeWisdom)    US tickers only
//   StockTwits  people watching the stock                    US tickers only
//
// Trend compares recent attention with the stock's own normal level.

const UA = "TorghattenCapital-MembersCorner/1.0 (https://substack.com/@torghattencapital)";
const NEWS_CAP = 100; // Google News RSS returns at most 100 items

// [value that earns 0 points, value that earns 100 points]
export const ANCHORS = { wiki: [10, 20000], news: [1, 100], reddit: [1, 1000], stocktwits: [500, 1000000] };
// Social sources weigh more, since the question is how much people talk about it.
export const WEIGHTS = { reddit: 0.3, stocktwits: 0.2, wiki: 0.25, news: 0.25 };

// ---- pure functions (tested in test/run.js) ---------------------------------

// "Constellation Software Inc." -> "Constellation Software"
export function cleanName(name) {
  let s = String(name || "").replace(/\s+/g, " ").trim();
  const suffix = /[,\s]+(inc\.?|incorporated|corporation|corp\.?|company|co\.?|ltd\.?|limited|plc|asa|as|ab|a\/s|oyj|sa|s\.a\.|nv|n\.v\.|se|ag|spa|s\.p\.a\.|class [a-z]|ordinary shares|\(the\))$/i;
  for (let i = 0; i < 4 && suffix.test(s); i++) s = s.replace(suffix, "").trim();
  return s.replace(/^the\s+/i, "").replace(/[,.]$/, "").trim();
}

// A Wikipedia title only counts if it contains the company's first real word,
// so "Topicus.com" can't land on an unrelated page through a redirect.
export function titleMatches(title, query) {
  const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const words = norm(query).replace(/\.(com|net|io|ai)\b/g, "").split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !["the", "and", "group", "holdings"].includes(w));
  if (!words.length) return false;
  return norm(title).includes(words[0]);
}

// Yahoo symbol -> US ticker as Reddit and StockTwits write it, or null if the
// listing isn't American. BRK-B -> BRK.B, CSU.TO -> null.
export function usSymbol(sym) {
  const s = String(sym || "").trim().toUpperCase();
  return /^[A-Z]{1,5}(-[A-Z])?$/.test(s) ? s.replace("-", ".") : null;
}

export function logPoints(x, [lo, hi]) {
  if (x == null || !isFinite(x)) return null;
  if (x <= 0) return 0;
  const p = (100 * (Math.log10(x) - Math.log10(lo))) / (Math.log10(hi) - Math.log10(lo));
  return Math.min(100, Math.max(0, p));
}

export function wikiStats(views) {
  if (!Array.isArray(views) || views.length < 60) return null;
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const avg30 = avg(views.slice(-30)), avgAll = avg(views);
  return { avg30: Math.round(avg30), avgYear: Math.round(avgAll), ratio: avgAll > 0 ? avg30 / avgAll : null };
}

export function level(score) {
  if (score == null) return null;
  return score < 33 ? "Low" : score < 67 ? "Medium" : "High";
}

// m: { wiki, news, reddit, stocktwits } as returned by the fetchers (null = no data)
export function scoreAll(m) {
  const value = {
    wiki: m.wiki?.avg30,
    news: m.news?.week,
    reddit: m.reddit ? m.reddit.mentions : undefined,
    stocktwits: m.stocktwits?.watchers,
  };
  let sum = 0, wsum = 0;
  const points = {};
  for (const k of Object.keys(WEIGHTS)) {
    const p = value[k] === undefined ? null : logPoints(value[k], ANCHORS[k]);
    points[k] = p;
    if (p != null) { sum += p * WEIGHTS[k]; wsum += WEIGHTS[k]; }
  }
  const score = wsum ? Math.max(1, Math.min(100, Math.round(sum / wsum))) : null;
  return { score, level: level(score), points, trend: trend(m) };
}

// Ratio of recent attention to the stock's own normal level, combined across
// sources with a geometric mean. Sources too thin or capped to say anything are left out.
export function trend(m) {
  const parts = [];
  if (m.wiki?.ratio > 0) parts.push(["wiki", m.wiki.ratio]);
  const n = m.news;
  if (n && n.week > 0 && n.quarter > 0 && n.week < NEWS_CAP && n.quarter < NEWS_CAP) parts.push(["news", n.week / ((n.quarter * 7) / 90)]);
  const r = m.reddit;
  if (r && r.mentions >= 5 && r.prev >= 5) parts.push(["reddit", r.mentions / r.prev]);
  if (!parts.length) return null;
  const ratio = Math.exp(parts.reduce((s, [, x]) => s + Math.log(x), 0) / parts.length);
  const label = ratio >= 1.25 ? "Rising" : ratio <= 0.8 ? "Falling" : "Steady";
  return { ratio: Math.round(ratio * 100) / 100, label, from: parts.map(([k]) => k) };
}

// ---- network ----------------------------------------------------------------

async function get(url, { timeout = 7000, headers = {} } = {}) {
  const res = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) { const e = new Error(`${new URL(url).host} ${res.status}`); e.status = res.status; throw e; }
  return res;
}
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");

export async function wikipedia(name) {
  const q = cleanName(name);
  const os = await (await get(`https://en.wikipedia.org/w/api.php?action=opensearch&redirects=resolve&limit=1&format=json&search=${encodeURIComponent(q)}`)).json();
  let title = os?.[1]?.[0];
  if (!titleMatches(title, q)) {
    const sr = await (await get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=3&format=json&srsearch=${encodeURIComponent(q + " company")}`)).json();
    title = (sr?.query?.search ?? []).map((x) => x.title).find((t) => titleMatches(t, q));
  }
  if (!title) return null;
  const end = new Date(Date.now() - 864e5), start = new Date(end.getTime() - 364 * 864e5);
  const pv = await (await get(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(title.replace(/ /g, "_"))}/daily/${ymd(start)}/${ymd(end)}`)).json();
  const s = wikiStats((pv.items || []).map((x) => x.views));
  if (!s) return null;
  return { title, url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(title.replace(/ /g, "_")), ...s };
}

async function newsCount(q, when) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent('"' + q + '"')}+when:${when}&hl=en-US&gl=US&ceid=US:en`;
  const xml = await (await get(url)).text();
  return (xml.match(/<item>/g) || []).length;
}
export async function news(name) {
  const q = cleanName(name);
  const [week, quarter] = await Promise.all([newsCount(q, "7d"), newsCount(q, "90d")]);
  return { query: q, week, quarter, capped: week >= NEWS_CAP };
}

// ApeWisdom ranks the most-mentioned tickers across stock subreddits. A ticker
// missing from its list had too few mentions to rank, which we count as zero.
let apeCache = null;
async function apeWisdom() {
  if (apeCache && Date.now() - apeCache.at < 30 * 60 * 1000) return apeCache.map;
  const map = {};
  for (let p = 1; p <= 5; p++) {
    const j = await (await get(`https://apewisdom.io/api/v1.0/filter/all-stocks/page/${p}`)).json();
    for (const x of j.results || []) {
      map[String(x.ticker).toUpperCase()] = { mentions: Number(x.mentions) || 0, prev: Number(x.mentions_24h_ago) || 0, rank: Number(x.rank) || null };
    }
    if (!j.pages || p >= j.pages) break;
  }
  if (!Object.keys(map).length) throw new Error("ApeWisdom returned no tickers");
  apeCache = { map, at: Date.now() };
  return map;
}
export async function reddit(us) {
  const map = await apeWisdom();
  return map[us] ?? { mentions: 0, prev: 0, rank: null };
}

export async function stocktwits(us) {
  const j = await (await get(`https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(us)}.json`, { headers: { Accept: "application/json" } })).json();
  const w = j?.symbol?.watchlist_count;
  if (w == null) throw new Error("StockTwits returned no watcher count");
  return { watchers: Number(w) };
}

// Everything for one stock. Sources that fail are reported, not fatal.
export async function attention(symbol, name) {
  const us = usSymbol(symbol);
  const settle = (p) => p.then((v) => ({ ok: true, v }), (e) => ({ ok: false, error: String(e.message || e) }));
  const [w, n, r, s] = await Promise.all([
    settle(wikipedia(name)),
    settle(news(name)),
    us ? settle(reddit(us)) : null,
    us ? settle(stocktwits(us)) : null,
  ]);
  const m = { wiki: w.ok ? w.v : null, news: n.ok ? n.v : null, reddit: r?.ok ? r.v : null, stocktwits: s?.ok ? s.v : null };
  const status = (x) => (x === null ? "not_applicable" : x.ok ? (x.v ? "ok" : "no_data") : "unavailable");
  const sc = scoreAll(m);
  return {
    symbol, name, query: cleanName(name), us,
    ...sc,
    sources: {
      wiki: { status: status(w), data: m.wiki, error: w.error },
      news: { status: status(n), data: m.news, error: n.error },
      reddit: { status: status(r), data: m.reddit, error: r?.error },
      stocktwits: { status: status(s), data: m.stocktwits, error: s?.error },
    },
    asOf: new Date().toISOString(),
  };
}
