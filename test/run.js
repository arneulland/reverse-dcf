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
const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
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

console.log("All checks passed.");
