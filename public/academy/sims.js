// Pure models behind the Academy simulations. No DOM here, so the tests can
// load this file on its own. The UI lives in academy.js.
(function (root) {
  var M = {};

  // Justified P/E for a company that grows earnings at g for T years,
  // reinvesting g/roic of earnings to do it, then stops growing.
  // Cost of capital r. Earnings in year 1 equal today's earnings.
  // With r = 8% and T = 15 this reproduces the table in the Strategy Book.
  M.justifiedPE = function (g, roic, r, T) {
    if (r == null) r = 0.08;
    if (T == null) T = 15;
    var v = 0, pay = 1 - g / roic;
    for (var t = 1; t <= T; t++) v += Math.pow(1 + g, t - 1) * pay / Math.pow(1 + r, t);
    v += Math.pow(1 + g, T) / r / Math.pow(1 + r, T);
    return v > 0 ? v : null; // null = not meaningful
  };

  // Growth engine: growth = ROIC x reinvestment rate. What is left is free cash.
  M.engine = function (e0, roic, g, years) {
    var rate = g / roic, rows = [], cum = 0;
    for (var t = 1; t <= years; t++) {
      var e = e0 * Math.pow(1 + g, t);
      var fcf = e * (1 - rate);
      cum += fcf;
      rows.push({ year: t, earnings: e, reinvested: e * rate, fcf: fcf, cumFcf: cum });
    }
    return { reinvestRate: rate, rows: rows };
  };

  M.roic = function (ebit, taxRate, investedCapital) {
    return investedCapital > 0 ? ebit * (1 - taxRate) / investedCapital : null;
  };

  // Fair value from owner earnings: earnings in `years` x exit multiple,
  // discounted at the hurdle. Interim cash flows are left out on purpose,
  // which makes the answer a little conservative.
  M.fairValue = function (e0, g, exit, hurdle, years) {
    years = years || 5;
    return e0 * Math.pow(1 + g, years) * exit / Math.pow(1 + hurdle, years);
  };
  M.impliedIRR = function (price, e0, g, exit, years) {
    years = years || 5;
    return Math.pow(e0 * Math.pow(1 + g, years) * exit / price, 1 / years) - 1;
  };
  M.entryPrice = function (rate, e0, g, exit, years) {
    return M.fairValue(e0, g, exit, rate, years);
  };

  // The buy, top-up and trim rules from the Strategy Book.
  M.ruleCheck = function (o) {
    // o: price, fv, weight (0-1), topUps (this year), sameThesis (0-1), category (0-1)
    var ratio = o.price / o.fv;
    var add = "no", why = [];
    if (ratio < 0.75) { add = "full"; why.push("Price is under 0.75 x fair value, so a full position is allowed."); }
    else if (ratio < 0.85) { add = "starter"; why.push("Price is between 0.75 and 0.85 x fair value: a starter position under 4% is allowed, full weight is not."); }
    else why.push("Price is over 0.85 x fair value: no buying.");
    function block(cond, msg) { if (add !== "no" && cond) { add = "no"; why.push(msg); } }
    block(o.topUps >= 2, "You have already topped up twice this year, the most the rules allow.");
    block(o.weight >= 0.10, "The position is already 10% or more, the most you may hold when you buy.");
    block(add === "starter" && o.weight >= 0.04, "A starter position must stay under 4%, and this one is already there. Full weight needs 0.75 x fair value.");
    block(o.sameThesis >= 0.25, "Positions that fail on the same input are already 25% or more.");
    block(o.category >= 0.35, "The category is already at the 35% cap.");
    var trim = o.weight > 0.10 && ratio > 1.1;
    if (trim) why.push("Over 10% of the portfolio AND over 1.1 x fair value: trim back to 10%. Don't sell out.");
    else if (o.weight > 0.10) why.push("Over 10%, but not over 1.1 x fair value: hold. Both conditions must be true to trim.");
    else if (ratio > 1.1) why.push("Over 1.1 x fair value, but the position is under 10%: hold. Valuation alone is not a reason to sell.");
    if (o.weight >= 0.20) why.push("At or over the hard cap of 20%: trim to under 20% whatever the valuation.");
    return { ratio: ratio, add: add, trim: trim || o.weight >= 0.20, why: why };
  };

  // Steinhardt's grid: do I have a differentiated view, and how bad is it if I'm wrong?
  M.sizing = function (edge, consequenceHigh) {
    if (!edge && !consequenceHigh) return { label: "No position", range: "0%", note: "No edge, low consequence. Buy the fund instead." };
    if (!edge && consequenceHigh) return { label: "Never", range: "0%", note: "No edge and a big downside. Walk away." };
    if (edge && !consequenceHigh) return { label: "Full weight", range: "8–10%", note: "An edge, and you survive being wrong." };
    return { label: "Half weight", range: "4–5%", note: "An edge, but the outcome is binary or hard to see." };
  };

  // Recovery maths.
  M.needToRecover = function (fall) { return 1 / (1 - fall) - 1; };
  M.yearsToRecover = function (fall, r) { return Math.log(1 / (1 - fall)) / Math.log(1 + r); };

  // What activity costs: trading costs as a yearly drag on the return.
  M.activity = function (o) {
    // o: start, r, years, trades, costPerTrade (money), add (yearly saving)
    var calm = o.start, busy = o.start, fees = 0;
    for (var y = 1; y <= o.years; y++) {
      calm = calm * (1 + o.r) + (o.add || 0);
      var f = o.trades * o.costPerTrade;
      busy = Math.max(0, busy * (1 + o.r) - f + (o.add || 0));
      fees += f;
    }
    return { calm: calm, busy: busy, lost: calm - busy, fees: fees };
  };

  // Which of the sell reasons are allowed by the Strategy Book.
  M.SELL = {
    thesis: { ok: true, t: "The thesis is broken by an outside change you can verify" },
    changed: { ok: true, t: "The case has changed from what I wrote down before I bought" },
    better: { ok: true, t: "A new idea is clearly better on management, reinvestment or life cycle" },
    trim: { ok: true, t: "The position is over 10% AND over 1.1 x fair value (trim to 10%)" },
    up: { ok: false, t: "The price has gone up a lot" },
    down: { ok: false, t: "The price has fallen" },
    media: { ok: false, t: "There's a lot of noise in the media" },
    someone: { ok: false, t: "Someone on X, Discord or a podcast said something" },
    cash: { ok: false, t: "I need cash for a more exciting idea" },
    cheaper: { ok: false, t: "Another stock looks cheaper, nothing else" }
  };

  // Annual review numbers. Deposits are assumed to arrive mid-year.
  M.review = function (o) {
    // o: start, end, deposits, nothing (value of 1 Jan holdings untouched, today), index (return), fees
    var mine = (o.end - o.start - o.deposits) / (o.start + o.deposits / 2);
    var idle = o.nothing / o.start - 1;
    return {
      mine: mine, idle: idle, index: o.index,
      gapIdle: mine - idle, gapIndex: mine - o.index,
      feePct: o.fees / ((o.start + o.end) / 2)
    };
  };

  // Certificate ID: short, stable for the same name and date.
  M.certId = function (name, date) {
    var s = (name || "").trim().toLowerCase() + "|" + date, h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return "TC-RI-" + date.replace(/-/g, "").slice(2) + "-" + h.toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
  };

  if (typeof module !== "undefined" && module.exports) module.exports = M;
  root.TCSims = M;
})(typeof window !== "undefined" ? window : this);
