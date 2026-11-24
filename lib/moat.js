// Return on invested capital by year, from Yahoo's annual statements.
// ROIC = EBIT x (1 - tax rate) / invested capital (debt + equity, so goodwill is included).
export const MOAT_TYPES = ["annualEBIT", "annualTaxRateForCalcs", "annualInvestedCapital", "annualTotalRevenue", "annualOperatingIncome"];

export function roicRows(fund) {
  const by = (k) => new Map((fund[k] ?? []).map((p) => [p.date, p.value]));
  const ebit = by("annualEBIT"), tax = by("annualTaxRateForCalcs"), ic = by("annualInvestedCapital"), rev = by("annualTotalRevenue"), op = by("annualOperatingIncome");
  const dates = [...new Set([...ebit.keys(), ...ic.keys()])].sort();
  return dates.map((d) => {
    const t = tax.has(d) ? Math.min(0.5, Math.max(0, tax.get(d))) : 0.21;
    const e = ebit.get(d), c = ic.get(d), r = rev.get(d), o = op.get(d);
    return {
      year: +d.slice(0, 4),
      roic: e != null && c > 0 ? (e * (1 - t)) / c : null,
      margin: o != null && r > 0 ? o / r : null,
    };
  }).filter((x) => x.roic != null || x.margin != null);
}
