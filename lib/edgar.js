// SEC EDGAR XBRL "company concept" API: official, free, 10+ years of history
// for companies that file 10-Ks. Used only to extend history further back than
// Yahoo's ~4 fiscal years. Every failure here is silent: the tool still works.

const UA = process.env.SEC_USER_AGENT || "reverse-dcf-tool contact@example.com";
let tickerMap = null;

async function j(url, timeout = 6000) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) return null;
  return res.json();
}

async function cikFor(symbol) {
  if (!tickerMap) {
    const data = await j("https://www.sec.gov/files/company_tickers.json");
    if (!data) return null;
    tickerMap = new Map(Object.values(data).map((r) => [String(r.ticker).toUpperCase(), r.cik_str]));
  }
  const cik = tickerMap.get(symbol.toUpperCase());
  return cik ? String(cik).padStart(10, "0") : null;
}

const TAGS = {
  ocf: ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"],
  capex: ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"],
  sbc: ["ShareBasedCompensation", "AllocatedShareBasedCompensationExpense"],
  dividends: ["PaymentsOfDividendsCommonStock", "PaymentsOfDividends"],
  shares: ["WeightedAverageNumberOfDilutedSharesOutstanding"],
};

// Full-year values from annual reports, keyed by period end date.
export function annualFacts(concept) {
  const out = new Map();
  for (const facts of Object.values(concept?.units ?? {})) {
    for (const f of facts) {
      if (!f.end || !f.start || !/^10-K/.test(f.form || "")) continue;
      const days = (Date.parse(f.end) - Date.parse(f.start)) / 86400000;
      if (days < 340 || days > 385) continue;
      const prev = out.get(f.end);
      if (!prev || (f.filed || "") > prev.filed) out.set(f.end, { value: f.val, filed: f.filed || "" });
    }
  }
  return out;
}

// Returns [{ date, ocf, capex, sbc, dividends, shares }] oldest first, or [].
export async function history(symbol) {
  try {
    const cik = await cikFor(symbol);
    if (!cik) return [];
    const base = `https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/`;
    const fields = Object.keys(TAGS);
    const maps = await Promise.all(
      fields.map(async (field) => {
        const merged = new Map();
        const res = await Promise.all(TAGS[field].map((t) => j(`${base}${t}.json`).catch(() => null)));
        for (const c of res) for (const [end, v] of annualFacts(c)) if (!merged.has(end)) merged.set(end, v.value);
        return merged;
      })
    );
    const [ocf, capex, sbc, dividends, shares] = maps;
    return [...ocf.keys()]
      .sort()
      .map((date) => ({
        date,
        ocf: ocf.get(date),
        capex: capex.get(date) ?? null,
        sbc: sbc.get(date) ?? null,
        dividends: dividends.get(date) ?? null,
        shares: shares.get(date) ?? null,
      }))
      .filter((r) => r.capex != null && r.shares > 0);
  } catch {
    return [];
  }
}
