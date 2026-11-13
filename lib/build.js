// Pure assembly: turns raw provider responses into the payload the page uses.
// No network access here, so it is fully covered by test/run.js.

const MINOR_UNITS = { GBp: ["GBP", 100], GBX: ["GBP", 100], ZAc: ["ZAR", 100], ZAC: ["ZAR", 100], ILA: ["ILS", 100] };
const DAY = 86400000;

const last = (a) => (a && a.length ? a[a.length - 1] : null);
const byDate = (series) => new Map((series ?? []).map((p) => [p.date, p]));

export function tradingCurrency(metaCurrency) {
  const m = MINOR_UNITS[metaCurrency];
  return m ? { currency: m[0], scale: m[1] } : { currency: metaCurrency || "USD", scale: 1 };
}

// Last monthly close at or before the given date.
function closeAt(points, dateMs) {
  let v = null;
  for (const p of points) {
    if (p.t <= dateMs + 2 * DAY) v = p.close;
    else break;
  }
  return v;
}

// Share counts are reported unadjusted in old filings but restated in newer
// ones, so splits are applied only where the data shows the matching jump.
export function adjustForSplits(rows, splits, anchorShares) {
  const out = rows.map((r) => ({ ...r }));
  const sorted = [...splits].filter((s) => s.factor > 1.25 || s.factor < 0.8).sort((a, b) => b.t - a.t);
  for (const s of sorted) {
    const near = (ratio) => ratio > s.factor * 0.8 && ratio < s.factor * 1.25;
    let cut = -1;
    for (let i = out.length - 2; i >= 0; i--) {
      const d = Date.parse(out[i].date);
      if (d >= s.t || d < s.t - 3.5 * 365 * DAY) continue;
      if (near(out[i + 1].shares / out[i].shares)) { cut = i; break; }
    }
    if (cut < 0 && out.length) {
      const lastRow = out[out.length - 1];
      const afterLast = Date.parse(lastRow.date) < s.t;
      if (afterLast && (anchorShares ? near(anchorShares / lastRow.shares) : true)) cut = out.length - 1;
    }
    for (let i = 0; i <= cut; i++) out[i].shares *= s.factor;
  }
  return out;
}

export function buildCompany({ symbol, chart, fund, edgarRows = [], fxChart = null, fxRate = null }) {
  const warnings = [];
  const sources = ["yahoo"];
  const meta = chart.meta;
  const { currency, scale } = tradingCurrency(meta.currency);
  const points = chart.points.map((p) => ({ t: p.t, close: p.close / scale }));
  const price = Number.isFinite(meta.regularMarketPrice) ? meta.regularMarketPrice / scale : last(points)?.close ?? null;

  // --- annual rows from Yahoo -------------------------------------------------
  const fcfS = fund.annualFreeCashFlow ?? [];
  const ocf = byDate(fund.annualOperatingCashFlow), capex = byDate(fund.annualCapitalExpenditure);
  const sbc = byDate(fund.annualStockBasedCompensation), div = byDate(fund.annualCashDividendsPaid);
  const dil = byDate(fund.annualDilutedAverageShares), bas = byDate(fund.annualBasicAverageShares);
  const ord = byDate(fund.annualOrdinarySharesNumber);
  const dates = new Set([...fcfS.map((p) => p.date), ...ocf.keys()]);
  const fcfMap = byDate(fcfS);
  let rows = [];
  for (const date of [...dates].sort()) {
    let fcf = fcfMap.get(date)?.value;
    if (!Number.isFinite(fcf) && ocf.has(date) && capex.has(date)) fcf = ocf.get(date).value - Math.abs(capex.get(date).value);
    const shares = dil.get(date)?.value || bas.get(date)?.value || ord.get(date)?.value;
    if (!Number.isFinite(fcf) || !(shares > 0)) continue;
    rows.push({
      date, fcf, shares,
      sbc: sbc.get(date)?.value ?? null,
      dividends: div.has(date) ? Math.abs(div.get(date).value) : null,
      src: "yahoo",
    });
  }
  const finCurrency =
    last(fcfS)?.currency || last(fund.trailingFreeCashFlow)?.currency || last(fund.annualOperatingCashFlow)?.currency || currency;

  // --- older years from SEC filings (USD reporters only) -----------------------
  if (finCurrency === "USD" && edgarRows.length) {
    let added = 0;
    for (const e of edgarRows) {
      const d = Date.parse(e.date);
      if (rows.some((r) => Math.abs(Date.parse(r.date) - d) < 45 * DAY)) continue;
      rows.push({
        date: e.date, fcf: e.ocf - Math.abs(e.capex), shares: e.shares,
        sbc: e.sbc, dividends: e.dividends != null ? Math.abs(e.dividends) : null, src: "edgar",
      });
      added++;
    }
    if (added) sources.push("edgar");
    rows.sort((a, b) => a.date.localeCompare(b.date));
  }

  // --- shares: split adjustment and latest count ------------------------------
  const qShares = last(fund.quarterlyOrdinarySharesNumber);
  rows = adjustForSplits(rows, chart.splits, qShares?.value);
  const lastRow = last(rows);
  let ttmShares = qShares?.value ?? last(fund.annualOrdinarySharesNumber)?.value ?? null;
  if (ttmShares && qShares) {
    for (const s of chart.splits) if (s.t > Date.parse(qShares.date) + 5 * DAY) ttmShares *= s.factor;
  }
  if (lastRow && (!ttmShares || ttmShares / lastRow.shares > 1.6 || ttmShares / lastRow.shares < 0.6)) {
    if (ttmShares) warnings.push("share_count_fallback");
    ttmShares = lastRow.shares;
  }

  // --- trailing twelve months ------------------------------------------------
  const tF = last(fund.trailingFreeCashFlow);
  const tO = last(fund.trailingOperatingCashFlow), tC = last(fund.trailingCapitalExpenditure);
  let ttm = null;
  const ttmFcf = tF?.value ?? (tO && tC ? tO.value - Math.abs(tC.value) : null);
  if (Number.isFinite(ttmFcf) && ttmShares) {
    const tD = last(fund.trailingCashDividendsPaid);
    ttm = {
      asOf: tF?.date ?? tO?.date, fcf: ttmFcf, shares: ttmShares,
      sbc: last(fund.trailingStockBasedCompensation)?.value ?? null,
      dividends: tD ? Math.abs(tD.value) : null,
      isAnnual: false,
    };
  } else if (lastRow) {
    ttm = { asOf: lastRow.date, fcf: lastRow.fcf, shares: ttmShares, sbc: lastRow.sbc, dividends: lastRow.dividends, isAnnual: true };
    warnings.push("ttm_is_last_fiscal_year");
  } else {
    warnings.push("no_fundamentals");
  }

  // --- currency conversion (reporting currency -> trading currency) -----------
  let fx = 1;
  let fxPoints = null;
  if (finCurrency !== currency) {
    const fxScale = fxChart ? tradingCurrency(fxChart.meta.currency).scale : 1;
    fx = fxRate ?? (fxChart ? (fxChart.meta.regularMarketPrice ?? last(fxChart.points)?.close) / fxScale : null);
    fxPoints = fxChart ? fxChart.points.map((p) => ({ t: p.t, close: p.close / fxScale })) : null;
    if (!Number.isFinite(fx)) { fx = 1; warnings.push("fx_unavailable"); }
  }
  const fxAt = (ms) => (fxPoints ? closeAt(fxPoints, ms) ?? fx : fx);

  const annual = rows.map((r) => {
    const ms = Date.parse(r.date);
    return { ...r, year: Number(r.date.slice(0, 4)), price: closeAt(points, ms), fx: fxAt(ms) };
  });
  const firstMs = annual.length ? Date.parse(annual[0].date) : Infinity;
  const monthly = points
    .filter((p) => p.t >= firstMs)
    .map((p) => [new Date(p.t).toISOString().slice(0, 10), round(p.close), round(fxAt(p.t), 6)]);

  return {
    symbol,
    name: meta.longName || meta.shortName || symbol,
    exchange: meta.fullExchangeName || meta.exchangeName || "",
    currency, price,
    priceTime: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
    finCurrency, fx,
    ttm, annual, monthly, sources, warnings,
  };
}

function round(v, dp = 4) {
  if (!Number.isFinite(v)) return null;
  const k = 10 ** dp;
  return Math.round(v * k) / k;
}
