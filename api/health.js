// Open /api/health after deploying to see which data sources respond.
import { createHash } from "node:crypto";
import { search, chart, fundamentals } from "../lib/yahoo.js";
import { history as edgarHistory } from "../lib/edgar.js";
import { wikipedia, news, reddit, stocktwits } from "../lib/attention.js";

export default async function handler(req, res) {
  const probe = async (fn) => {
    const t = Date.now();
    try { const info = await fn(); return { ok: true, ms: Date.now() - t, info }; }
    catch (e) { return { ok: false, ms: Date.now() - t, error: String(e.message || e) }; }
  };
  const [s, c, f, e, aw, an, ar, as] = await Promise.all([
    probe(async () => (await search("constellation software")).map((x) => x.symbol)),
    probe(async () => { const r = await chart("CSU.TO"); return { price: r?.meta?.regularMarketPrice, currency: r?.meta?.currency, months: r?.points?.length }; }),
    probe(async () => { const r = await fundamentals("CSU.TO"); return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.length])); }),
    probe(async () => ({ years: (await edgarHistory("MSFT")).length })),
    probe(async () => { const r = await wikipedia("Microsoft Corporation"); return r && { title: r.title, avg30: r.avg30 }; }),
    probe(async () => news("Microsoft Corporation")),
    probe(async () => reddit("MSFT")),
    probe(async () => stocktwits("MSFT")),
  ]);
  // Says whether member access is configured, without revealing any values.
  const env = process.env;
  const access = { ACCESS_SECRET: !!env.ACCESS_SECRET, ADMIN_KEY: !!env.ADMIN_KEY, ADMIN_EMAIL: !!env.ADMIN_EMAIL, adminEmails: String(env.ADMIN_EMAIL || "").split(/[\s,;]+/).filter(Boolean).length,
    // TEMPORARY, for troubleshooting admin sign-in. Remove once it works.
    adminEmailCheck: env.ADMIN_EMAIL ? createHash("sha256").update(String(env.ADMIN_EMAIL).trim().toLowerCase()).digest("hex").slice(0, 8) : null,
    adminKeyLength: env.ADMIN_KEY ? String(env.ADMIN_KEY).trim().length : 0,
    adminKeyRawLength: env.ADMIN_KEY ? String(env.ADMIN_KEY).length : 0 };
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ yahooSearch: s, yahooChart: c, yahooFundamentals: f, access, secEdgar: e, wikipedia: aw, googleNews: an, reddit: ar, stocktwits: as });
}
