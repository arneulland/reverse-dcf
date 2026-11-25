import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { mockFetch } from "./fixtures.js";

globalThis.fetch = mockFetch;
const { search, chart, fundamentals } = await import("../lib/yahoo.js");
const { history } = await import("../lib/edgar.js");
const { buildCompany } = await import("../lib/build.js");

// --- the model, taken straight from the page --------------------------------
const html = readFileSync(new URL("../public/reverse-dcf/index.html", import.meta.url), "utf8");
const src = html.match(/<script id="model">([\s\S]*?)<\/script>/)[1];
const mod = { exports: {} };
vm.runInNewContext(src, { module: mod, Math, isFinite });
const { impliedGrowth, scenarioReturn, futurePrice } = mod.exports;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, want ${b}`);

// Constellation Software write-up: US$2,387 a share, US$91.74 FCFA2S, no payout.
const P = 2387, F = 91.74, fx = 3385 / 2387;
near(P / F, 26.0, 0.05, "multiple");
near(impliedGrowth(P, F, 0.09, 20, 10, 0), 0.119, 0.002, "priced-in growth (~12%)");
near(scenarioReturn(P, F, 0.08, 18, 10, 0), 0.04, 0.005, "bear return (~4%)");
near(scenarioReturn(P, F, 0.13, 22, 10, 0), 0.11, 0.005, "base return (~11%)");
near(scenarioReturn(P, F, 0.17, 25, 10, 0), 0.16, 0.006, "bull return (~16%)");
near(futurePrice(F, 0.08, 18, 10) * fx, 5060, 15, "bear price C$");
near(futurePrice(F, impliedGrowth(P, F, 0.09, 20, 10, 0), 20, 10) * fx, 8010, 15, "priced-in price C$");
near(futurePrice(F, 0.13, 22, 10) * fx, 9720, 15, "base price C$");
near(futurePrice(F, 0.17, 25, 10) * fx, 15630, 20, "bull price C$");
// round trip with dividends: the implied growth must earn exactly the required return
const g = impliedGrowth(100, 5, 0.1, 15, 10, 0.4);
near(scenarioReturn(100, 5, g, 15, 10, 0.4), 0.1, 1e-6, "round trip with payout");
assert.ok(g < impliedGrowth(100, 5, 0.1, 15, 10, 0), "dividends lower the growth needed");
assert.equal(impliedGrowth(100, -2, 0.1, 15, 10, 0), null, "negative FCF has no answer");

// --- data assembly ----------------------------------------------------------
const hits = await search("constellation");
assert.deepEqual(hits.map((h) => h.symbol), ["CSU.TO", "CNSWF", "STZ"], "search keeps equities only");

async function company(symbol, withEdgar) {
  const [c, fund, edgarRows] = await Promise.all([chart(symbol), fundamentals(symbol), withEdgar ? history(symbol) : []]);
  const fin = fund.annualFreeCashFlow.at(-1).currency;
  const fxChart = fin !== c.meta.currency ? await chart(`${fin}${c.meta.currency}=X`) : null;
  return buildCompany({ symbol, chart: c, fund, edgarRows, fxChart });
}
const csu = await company("CSU.TO", false);
assert.equal(csu.currency, "CAD"); assert.equal(csu.finCurrency, "USD");
near(csu.fx, 1.418, 1e-9, "fx");
near((csu.ttm.fcf / csu.ttm.shares) * csu.fx, 130.1, 0.2, "CSU FCF per share in CAD");
assert.equal(csu.annual.length, 4);
assert.ok(csu.annual.every((r) => r.price > 0 && r.fx > 1.1), "year-end price and fx present");
assert.equal(csu.ttm.dividends, 8.5e7, "dividends are positive");

const sp = await company("SPLT", true);
assert.deepEqual(sp.sources, ["yahoo", "edgar"]);
assert.equal(sp.annual[0].year, 2014); assert.equal(sp.annual.length, 12);
const ratios = sp.annual.slice(1).map((r, i) => r.shares / sp.annual[i].shares);
assert.ok(ratios.every((x) => x > 0.9 && x < 1.1), "share count is continuous across the split: " + ratios.map((x) => x.toFixed(2)));
assert.equal(sp.annual.find((r) => r.year === 2023).src, "yahoo", "Yahoo wins where both have the year");
near(sp.ttm.shares, 3.97e9, 1, "latest share count");

// a hole in the SEC history drops everything older than the hole
const { adjustForSplits } = await import("../lib/build.js");
const c0 = await chart("SPLT"), f0 = await fundamentals("SPLT");
const holed = (await history("SPLT")).filter((r) => !["2017", "2018"].includes(r.date.slice(0, 4)));
const gap = buildCompany({ symbol: "SPLT", chart: c0, fund: f0, edgarRows: holed });
assert.equal(gap.annual[0].year, 2019, "history starts after the gap");

console.log("All checks passed.");

// CSU screenshot case: 12% required, 18x exit, price 3,492, FCF/share 188.57.
near(impliedGrowth(3492, 188.57, 0.12, 18, 10, 0), 0.1232, 0.0005, "no dividend");
near(impliedGrowth(3492, 188.57, 0.12, 18, 10, 0.03), 0.1213, 0.0006, "actual 3% payout");
console.log("Payout checks passed.");

// --- attention score ---------------------------------------------------------
{
  const A = await import("../lib/attention.js");
  assert.equal(A.cleanName("Constellation Software Inc."), "Constellation Software");
  assert.equal(A.cleanName("Microsoft Corporation"), "Microsoft");
  assert.equal(A.cleanName("Kongsberg Gruppen ASA"), "Kongsberg Gruppen");
  assert.equal(A.cleanName("Atlas Copco AB Class A"), "Atlas Copco");
  assert.equal(A.usSymbol("BRK-B"), "BRK.B");
  assert.equal(A.usSymbol("MSFT"), "MSFT");
  assert.equal(A.usSymbol("CSU.TO"), null);
  assert.equal(A.usSymbol("KOG.OL"), null);
  assert.equal(A.logPoints(10, [10, 20000]), 0);
  assert.equal(A.logPoints(20000, [10, 20000]), 100);
  near(A.logPoints(Math.sqrt(10 * 20000), [10, 20000]), 50, 1e-9, "log midpoint");
  assert.equal(A.logPoints(0, [1, 100]), 0);
  assert.equal(A.logPoints(1e9, [1, 100]), 100);

  // only the sources that answered count, re-weighted
  const only = A.scoreAll({ wiki: { avg30: 20000, ratio: 1 }, news: { week: 1, quarter: 13 } });
  assert.equal(only.score, 50, "wiki 100 + news 0 at equal weight");
  assert.equal(A.scoreAll({}).score, null, "no sources, no score");
  assert.equal(A.scoreAll({ news: { week: 0, quarter: 0 } }).score, 1, "floor is 1");

  // trend: capped news and thin Reddit counts are left out
  assert.deepEqual(A.trend({ news: { week: 100, quarter: 100 } }), null);
  assert.deepEqual(A.trend({ reddit: { mentions: 3, prev: 1 } }), null);
  assert.equal(A.trend({ wiki: { ratio: 1.5 } }).label, "Rising");
  assert.equal(A.trend({ wiki: { ratio: 0.7 } }).label, "Falling");
  const tr = A.trend({ wiki: { ratio: 2 }, reddit: { mentions: 50, prev: 100 } });
  near(tr.ratio, 1, 1e-9, "geometric mean of 2 and 0.5");

  const msft = await A.attention("MSFT", "Microsoft Corporation");
  assert.equal(msft.sources.wiki.status, "ok");
  assert.equal(msft.sources.reddit.data.mentions, 240);
  assert.equal(msft.sources.stocktwits.data.watchers, 520000);
  assert.ok(msft.score >= 60 && msft.score <= 100, "MSFT scores high: " + msft.score);
  assert.equal(msft.trend.label, "Rising", "wiki 1.4x and Reddit 1.5x");

  const csuA = await A.attention("CSU.TO", "Constellation Software Inc.");
  assert.equal(csuA.sources.reddit.status, "not_applicable");
  assert.equal(csuA.sources.stocktwits.status, "not_applicable");
  assert.ok(csuA.score > 0 && csuA.score < msft.score, "CSU below MSFT: " + csuA.score);

  const none = await A.attention("ZZZZ", "Nothing Known");
  assert.equal(none.sources.wiki.status, "no_data");
  assert.equal(none.sources.stocktwits.status, "unavailable");
  console.log("Attention checks passed. MSFT", msft.score, msft.trend.label, "| CSU.TO", csuA.score, csuA.trend?.label);
}

// --- compounding -------------------------------------------------------------
{
  const html2 = readFileSync(new URL("../public/compounding/index.html", import.meta.url), "utf8");
  const m2 = { exports: {} };
  vm.runInNewContext(html2.match(/<script id="model">([\s\S]*?)<\/script>/)[1], { module: m2, Math });
  const { project, crossover, doublingYears } = m2.exports;
  // Same inputs as the original spreadsheet: 1,436,639 start, 12%, 35,000 a year.
  const rows = project(1436639, 0.12, 35000, 30, {});
  assert.equal(rows[0].bal, 1436639);
  near(rows[1].bal, 1436639 * 1.12 + 35000, 1e-6, "year 1 balance");
  near(rows[1].earned, 1436639 * 0.12, 1e-6, "year 1 growth");
  near(rows[2].bal, rows[1].bal * 1.12 + 35000, 1e-6, "year 2 balance");
  near(rows[30].put, 1436639 + 30 * 35000, 1e-6, "contributions");
  // closed form: S(1+r)^n + A((1+r)^n - 1)/r
  near(rows[30].bal, 1436639 * Math.pow(1.12, 30) + 35000 * (Math.pow(1.12, 30) - 1) / 0.12, 1e-3, "closed form");
  // extras behave like the sheet's extra column
  const x = project(1000, 0.1, 100, 3, { 0: 500, 2: -200 });
  assert.equal(x[0].bal, 1500); near(x[1].bal, 1750, 1e-9, "x1"); near(x[2].bal, 1825, 1e-9, "x2"); near(x[3].bal, 2107.5, 1e-9, "x3");
  near(x[3].base, 1000 * 1.331 + 100 * 3.31, 1e-9, "balance without extras");
  assert.equal(crossover(project(10000, 0.08, 6000, 30, {}), 6000), 9, "growth beats contributions in year 9");
  near(doublingYears(0.072), 9.97, 0.01, "doubling at 7.2%");
  console.log("Compounding checks passed.");
}

// --- member access -----------------------------------------------------------
{
  const A = await import("../lib/access.js");
  const S = "test-secret", now = Date.UTC(2026, 10, 24, 12);
  const code = await A.personalCode(S, "Arne@Example.com ", "2710");
  assert.match(code, /^TC-2710-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(A.normCode(code.toLowerCase().replace(/-/g, " ")), code, "codes forgive case and spaces");
  const ok = await A.checkCode(S, "arne@example.com", code, now);
  assert.equal(ok.kind, "member"); assert.equal(ok.exp, Date.UTC(2027, 10, 1), "valid through Oct 2027");
  assert.equal((await A.checkCode(S, "someone@else.com", code, now)).error, "bad_code", "code is tied to the email");
  assert.equal((await A.checkCode("other", "arne@example.com", code, now)).error, "bad_code", "other secret");
  assert.equal((await A.checkCode(S, "arne@example.com", code, Date.UTC(2027, 10, 1))).error, "expired");
  assert.equal((await A.checkCode(S, "arne@example.com", code.slice(0, -1) + (code.endsWith("A") ? "B" : "A"), now)).error, "bad_code");
  assert.equal((await A.checkCode(undefined, "a@b.co", code, now)).error, "not_configured");

  const m = await A.monthlyCode(S, "2611");
  assert.equal((await A.checkCode(S, "", m, now)).kind, "monthly", "monthly needs no email");
  assert.equal((await A.checkCode(S, "", m, Date.UTC(2026, 11, 7, 23))).kind, "monthly", "grace week");
  assert.equal((await A.checkCode(S, "", m, Date.UTC(2026, 11, 8, 1))).error, "expired");
  assert.equal((await A.checkCode(S, "", await A.monthlyCode(S, "2612"), now)).error, "bad_code", "next month's code isn't live yet");

  const s = await A.makeSession(S, ok, now);
  assert.equal(s.maxAge, 180 * 86400, "session capped at 180 days");
  const r = await A.readSession(S, s.value, now);
  assert.equal(r.email, "arne@example.com");
  assert.equal(await A.readSession(S, s.value, now, ["arne@example.com"]), null, "revoked");
  assert.equal(await A.readSession(S, s.value.replace(/^./, "x"), now), null, "tampered");
  assert.equal(await A.readSession(S, s.value, now + 181 * 864e5), null, "expired session");
  const sm = await A.makeSession(S, { kind: "monthly", email: null, exp: Date.UTC(2026, 11, 8) }, now);
  assert.equal(sm.maxAge, Math.floor((Date.UTC(2026, 11, 8) - now) / 1000), "monthly session ends with the grace week");

  assert.ok(A.isGated("/attention") && A.isGated("/attention/") && A.isGated("/compounding/index.html") && A.isGated("/api/attention"));
  assert.ok(A.isGated("/reverse-dcf") && A.isGated("/api/company") && A.isGated("/api/search"));
  assert.ok(!A.isGated("/") && !A.isGated("/api/health") && !A.isGated("/api/me") && !A.isGated("/join") && !A.isGated("/attentionx"));

  const env = { ACCESS_SECRET: S };
  const req = (p, cookie = "") => new Request("https://x.test" + p, { headers: { cookie } });
  const g1 = await A.gate(req("/attention?t=MSFT"), env);
  assert.equal(g1.status, 302); assert.equal(g1.headers.get("location"), "/join?next=%2Fattention%3Ft%3DMSFT");
  assert.equal((await A.gate(req("/api/attention?symbol=MSFT"), env)).status, 401);
  assert.equal(await A.gate(req("/"), env), null, "hub stays open");
  const live = await A.makeSession(S, ok);
  assert.equal(await A.gate(req("/attention", "a=1; tc_member=" + encodeURIComponent(live.value)), env), null, "member passes");
  assert.equal((await A.gate(req("/attention"), {})).status, 302, "fails closed without a secret");
  console.log("Access checks passed.");
}

// --- admin -------------------------------------------------------------------
{
  const A = await import("../lib/access.js");
  const S = "test-secret", env = { ACCESS_SECRET: S, ADMIN_EMAIL: "boss@example.com" };
  const req = (p, v) => new Request("https://x.test" + p, { headers: { cookie: v ? "tc_member=" + encodeURIComponent(v) : "" } });
  const member = (await A.makeSession(S, { kind: "member", email: "boss@example.com", exp: Date.now() + 864e5 })).value;
  const adminOther = (await A.makeSession(S, { kind: "admin", email: "other@example.com", exp: Date.now() + 864e5 })).value;
  const admin = (await A.makeSession(S, { kind: "admin", email: "boss@example.com", exp: Date.now() + 864e5 })).value;
  assert.ok(A.isAdminPath("/admin") && A.isAdminPath("/admin/") && A.isAdminPath("/api/admin") && !A.isAdminPath("/administrator"));
  assert.equal((await A.gate(req("/admin"), env)).headers.get("location"), "/join?next=%2Fadmin", "no session");
  assert.equal((await A.gate(req("/admin", member), env)).status, 302, "a member code isn't enough, even with the admin email");
  assert.equal((await A.gate(req("/admin", adminOther), env)).status, 302, "admin session for another email");
  assert.equal((await A.gate(req("/api/admin", member), env)).status, 401);
  assert.equal(await A.gate(req("/admin", admin), env), null, "admin passes");
  assert.equal(await A.gate(req("/attention", admin), env), null, "admin can use the tools");
  assert.equal((await A.gate(req("/admin", admin), { ACCESS_SECRET: S })).status, 302, "no ADMIN_EMAIL set, no admin");
  console.log("Admin checks passed.");
}

// --- diversification simulator ----------------------------------------------
{
  const html3 = readFileSync(new URL("../public/diversification/index.html", import.meta.url), "utf8");
  const m3 = { exports: {} };
  vm.runInNewContext(html3.match(/<script id="model">([\s\S]*?)<\/script>/)[1], { module: m3, Math, Float64Array, Array });
  const { weights, simulate, quantile, share, requiredEdge } = m3.exports;
  const sum = (w) => w.reduce((a, b) => a + b, 0);
  near(sum(weights(15, "conviction")), 1, 1e-12, "weights sum to 1");
  near(weights(15, "conviction")[0], 2 / 18, 1e-12, "top 3 double weight");
  near(weights(10, "bigbet")[0], 0.25, 1e-12, "big bet 25%");
  near(weights(1, "bigbet")[0], 1, 1e-12, "one stock");
  const base = { scheme: "equal", alpha: 0, idio: 0.32, mu: 0.08, years: 10, rebalance: false, paths: 3000, seed: 3 };
  const t0 = Date.now();
  const one = simulate({ ...base, n: 1 }), many = simulate({ ...base, n: 50 });
  const spread = (r) => quantile(r.rel, 0.9) - quantile(r.rel, 0.1);
  assert.ok(spread(one) > 3 * spread(many), "one stock spreads far wider than fifty");
  // skew: a single random stock usually lags the index (Bessembinder)
  assert.ok(share(one.rel, (x) => x > 0) < 0.42, "single stock beats index well under half the time: " + share(one.rel, (x) => x > 0));
  // mean wealth is preserved: average of growth factors ~ index average
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const mw = (r) => avg(Array.from(r.port, (c) => Math.pow(1 + c, 10))), iw = (r) => avg(Array.from(r.idx, (c) => Math.pow(1 + c, 10)));
  near(mw(many) / iw(many), 1, 0.03, "no edge: expected wealth equals the index");
  const edge = simulate({ ...base, n: 10, alpha: 0.04 });
  assert.ok(share(edge.rel, (x) => x > 0) > 0.7, "a 4% edge with 10 stocks usually wins");
  const need = requiredEdge({ ...base, n: 10 }, 2 / 3);
  assert.ok(need > 0.005 && need < 0.06, "required edge for 10 stocks is a few percent: " + need);
  console.log("Diversification checks passed. Edge needed for 10 stocks:", (need * 100).toFixed(1) + "%", "in", Date.now() - t0, "ms");
}

// --- would you have held -------------------------------------------------------
{
  const html4 = readFileSync(new URL("../public/held/index.html", import.meta.url), "utf8");
  const m4 = { exports: {} };
  vm.runInNewContext(html4.match(/<script id="model">([\s\S]*?)<\/script>/)[1], { module: m4, Math });
  const { underwater, falls, panic } = m4.exports;
  const P = [100, 120, 60, 50, 90, 130, 110, 140, 70, 75].map((p, i) => [`20${10 + i}-01-01`, p]);
  const F = falls(P, 0.3);
  assert.equal(F.length, 2, "two falls over 30%");
  near(F[0].depth, 50 / 120 - 1, 1e-12, "first fall from 120 to 50");
  assert.equal(F[0].peakI, 1); assert.equal(F[0].troughI, 3); assert.equal(F[0].recoverI, 5);
  near(F[1].depth, 70 / 140 - 1, 1e-12, "second fall, not yet recovered");
  assert.equal(F[1].recoverI, null);
  assert.equal(falls(P, 0.6).length, 0, "nothing over 60%");
  near(underwater(P)[3], 50 / 120 - 1, 1e-12, "underwater at the bottom");
  // sell at -40%: sells at 60 (from 120), buys back above 120 at 130, sells again at 70 (from 140)
  const s = panic(P, 0.4, "high");
  assert.equal(s.sells, 2); assert.equal(s.out, true);
  near(s.value, 10000 / 100 * 60 / 130 * 70, 1e-9, "panic path value");
  near(panic(P, 0.4, "never").value, 6000, 1e-9, "sold once, never back");
  console.log("Held checks passed.");
}

// --- moat test -------------------------------------------------------------------
{
  const html5 = readFileSync(new URL("../public/moat/index.html", import.meta.url), "utf8");
  const m5 = { exports: {} };
  vm.runInNewContext(html5.match(/<script id="model">([\s\S]*?)<\/script>/)[1], { module: m5, Object });
  const { classify } = m5.exports;
  const pw = { switching: { on: true, benefit: "b", barrier: "c" } };
  assert.equal(classify({}).verdict, null);
  assert.equal(classify({ proof: "no", change: "no" }).verdict, "none", "no record, no change");
  assert.equal(classify({ proof: "yes", powers: {} }).verdict, null, "needs a power");
  assert.equal(classify({ proof: "yes", powers: pw, dur: "wide" }).verdict, "wide");
  assert.equal(classify({ proof: "yes", powers: pw, dur: "wide", gov: "yes" }).verdict, "narrow", "regulator caps at narrow");
  assert.equal(classify({ proof: "yes", powers: pw, dur: "narrow" }).verdict, "narrow");
  assert.equal(classify({ proof: "no", change: "yes", powers: pw, dur: "wide" }).verdict, "narrow", "no record can't be wide");
  console.log("Moat checks passed.");
}

// --- moat data -------------------------------------------------------------------
{
  const { roicRows } = await import("../lib/moat.js");
  const s = (vals) => vals.map(([d, v]) => ({ date: d, value: v }));
  const rows = roicRows({
    annualEBIT: s([["2024-12-31", 100], ["2025-12-31", 120]]),
    annualTaxRateForCalcs: s([["2024-12-31", 0.2], ["2025-12-31", 0.25]]),
    annualInvestedCapital: s([["2024-12-31", 400], ["2025-12-31", 0]]),
    annualTotalRevenue: s([["2024-12-31", 1000], ["2025-12-31", 1100]]),
    annualOperatingIncome: s([["2024-12-31", 100], ["2025-12-31", 121]]),
  });
  near(rows[0].roic, 0.2, 1e-12, "ROIC = EBIT x (1 - t) / IC");
  assert.equal(rows[1].roic, null, "no capital, no ROIC");
  near(rows[1].margin, 0.11, 1e-12, "operating margin");
  console.log("Moat data checks passed.");
}

// --- attention fixes from live data ----------------------------------------------
{
  const A = await import("../lib/attention.js");
  assert.equal(A.cleanName("The Coca-Cola Company"), "Coca-Cola");
  assert.equal(A.titleMatches("First Look Media", "Topicus.com"), false, "wrong redirect is rejected");
  assert.equal(A.titleMatches("Topicus", "Topicus.com"), true);
  assert.equal(A.titleMatches("Nvidia", "NVIDIA"), true);
  assert.equal(A.titleMatches("Roper Technologies", "Roper Technologies"), true);
  assert.equal(A.titleMatches("Nestlé", "Nestle"), true, "accents ignored");
  console.log("Attention fixes passed.");
}

// --- academy -------------------------------------------------------------------
{
  const read = (f) => readFileSync(new URL("../public/academy/" + f, import.meta.url), "utf8");
  const ms = { exports: {} };
  vm.runInNewContext(read("sims.js"), { module: ms, Math });
  const S = ms.exports;
  // the justified P/E grid in the Strategy Book (8% cost of capital, 15 years)
  const book = { "2,4": 10.1, "4,4": 7.1, "6,4": 3.3, "2,12": 13.3, "12,12": 21.6, "20,12": 39.3, "10,20": 24.4, "20,20": 60.7, "14,30": 39.2, "20,40": 76.8, "2,8": 12.5, "20,8": 12.5 };
  for (const k in book) { const [g, r] = k.split(",").map((x) => x / 100); near(S.justifiedPE(g, r), book[k], 0.051, "justified P/E " + k); }
  assert.equal(S.justifiedPE(0.08, 0.04), null, "NM when growth destroys too much");
  const fv = S.fairValue(10, 0.1, 20, 0.1);
  near(fv, 200, 1e-9, "fair value");
  near(S.impliedIRR(fv, 10, 0.1, 20), 0.1, 1e-12, "IRR at fair value equals the hurdle");
  near(S.impliedIRR(0.75 * fv, 10, 0.1, 20), 0.165, 0.001, "0.75 x FV gives about 16.5%");
  near(S.needToRecover(0.5), 1, 1e-12);
  assert.equal(S.ruleCheck({ price: 70, fv: 100, weight: 0.05, topUps: 0, sameThesis: 0, category: 0 }).add, "full");
  assert.equal(S.ruleCheck({ price: 80, fv: 100, weight: 0.03, topUps: 0, sameThesis: 0, category: 0 }).add, "starter");
  assert.equal(S.ruleCheck({ price: 80, fv: 100, weight: 0.05, topUps: 0, sameThesis: 0, category: 0 }).add, "no", "starter only under 4%");
  assert.equal(S.ruleCheck({ price: 70, fv: 100, weight: 0.05, topUps: 2, sameThesis: 0, category: 0 }).add, "no", "two top-ups a year");
  assert.equal(S.ruleCheck({ price: 120, fv: 100, weight: 0.12, topUps: 0, sameThesis: 0, category: 0 }).trim, true, "trim when both");
  assert.equal(S.ruleCheck({ price: 105, fv: 100, weight: 0.14, topUps: 0, sameThesis: 0, category: 0 }).trim, false, "no trim at 1.05");
  assert.equal(S.ruleCheck({ price: 120, fv: 100, weight: 0.06, topUps: 0, sameThesis: 0, category: 0 }).trim, false, "no trim under 10%");
  assert.equal(S.sizing(true, true).range, "4–5%");
  const rv = S.review({ start: 1000000, end: 1050000, deposits: 60000, nothing: 1100000, index: 0.08, fees: 4000 });
  near(rv.gapIdle, -0.1097, 0.001, "review gap");
  assert.equal(S.certId("Arne", "2026-11-25"), S.certId(" arne ", "2026-11-25"), "cert id ignores case and spaces");

  // course content: structure, answers in range, exercises point at real simulations
  const win = { COURSE: null };
  const ctx = { window: win };
  for (let i = 0; i <= 6; i++) vm.runInNewContext(read(`course-${i}.js`), ctx);
  const C = win.COURSE;
  const ui = read("academy.js");
  assert.equal(C.modules.length, 6, "six modules");
  const ids = new Set();
  const checkQ = (q, where) => { assert.ok(q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length, "answer in range: " + where + " " + q.q); assert.ok(q.why, "explanation: " + where); };
  C.modules.forEach((m) => {
    assert.equal(m.lessons.length, 4, m.slug + " has four lessons");
    assert.equal(m.test.length, 10, m.slug + " has ten test questions");
    m.test.forEach((q) => checkQ(q, m.slug));
    m.exercises.forEach((x) => { assert.ok(!ids.has(x.id), "unique exercise id " + x.id); ids.add(x.id); assert.ok(new RegExp("\\b" + x.sim + ": function").test(ui), "simulation exists: " + x.sim); checkQ(x.task, x.id); });
    assert.ok(m.assignment.fields.length >= 5, m.slug + " assignment");
    const pageHtml = read(m.slug + "/index.html");
    assert.ok(pageHtml.includes('data-page="' + m.slug + '"'), "page shell for " + m.slug);
  });
  assert.equal(C.exam.cases.length, 12, "twelve exam cases");
  C.exam.cases.forEach((q) => checkQ(q, "exam"));
  console.log("Academy checks passed:", C.modules.reduce((s, m) => s + m.lessons.length, 0), "lessons,", C.modules.reduce((s, m) => s + m.test.length, 0) + 12, "questions.");
}
