/**
 * SEC EDGAR client — free, no API key
 * resolves a company to its CIK, then pulls profile + XBRL financials
 */

import { getJson } from "./http";
import type { Financials, SecProfile, YearValue } from "./types";

interface TickerRow {
  cik_str: number;
  ticker: string;
  title: string;
}

// common spoken names that differ from the SEC registered title
const NAME_ALIASES: Record<string, string> = {
  google: "Alphabet Inc.",
  alphabet: "Alphabet Inc.",
  facebook: "Meta Platforms, Inc.",
  meta: "Meta Platforms, Inc.",
  "amazon web services": "Amazon.com, Inc.",
  aws: "Amazon.com, Inc.",
  amazon: "Amazon.com, Inc.",
};

/**
 * given a free-text company name or ticker
 * return the matching SEC CIK record, or null if not found
 */
export async function resolveCik(
  query: string,
): Promise<{ cik: string; ticker: string; title: string } | null> {
  const data = await getJson<Record<string, TickerRow>>(
    "https://www.sec.gov/files/company_tickers.json",
    { revalidate: 86400 },
  );
  if (!data) return null;

  const rows = Object.values(data);
  const raw = query.trim().toLowerCase();
  const q = NAME_ALIASES[raw] ? NAME_ALIASES[raw].toLowerCase() : raw;

  // an exact ticker match always wins
  const tickerHit = rows.find((r) => r.ticker.toLowerCase() === raw);
  if (tickerHit) return format(tickerHit);

  // otherwise score every candidate and take the best. titles are
  // normalized (lowercase, no leading "the", punctuation -> spaces) so
  // "Coca-Cola" matches the SEC title "COCA COLA CO". shorter titles break
  // ties, so it lands on "The Coca-Cola Company", not a bottler subsidiary.
  const nq = normalizeName(q);
  const word = new RegExp(`\\b${escapeRegExp(nq)}\\b`);

  let best: TickerRow | null = null;
  let bestScore = -1;
  for (const r of rows) {
    const nt = normalizeName(r.title);
    let score = -1;
    if (nt === nq) score = 1000 - nt.length;
    else if (nt.startsWith(nq)) score = 600 - nt.length;
    else if (word.test(nt)) score = 300 - nt.length;
    else if (nt.includes(nq)) score = 100 - nt.length;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  if (!best || bestScore < 0) return null;
  return format(best);
}

function format(row: TickerRow): { cik: string; ticker: string; title: string } {
  return {
    cik: String(row.cik_str).padStart(10, "0"),
    ticker: row.ticker,
    title: row.title,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * given a company name or SEC title
 * return it lowercased, without a leading "the", with punctuation collapsed
 * to single spaces — so hyphen/comma/period differences don't block matches
 */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * given a 10-digit CIK
 * return the company filing profile (HQ, industry, exchange, fiscal year)
 */
export async function fetchProfile(
  cik: string,
  ticker?: string,
  title?: string,
): Promise<SecProfile | null> {
  const data = await getJson<any>(`https://data.sec.gov/submissions/CIK${cik}.json`);
  if (!data) return null;
  const addr = data.addresses?.business ?? {};
  return {
    cik,
    name: data.name ?? title ?? "",
    ticker: data.tickers?.[0] ?? ticker,
    exchange: data.exchanges?.[0],
    sicDescription: data.sicDescription,
    hqCity: addr.city,
    hqState: addr.stateOrCountry,
    fiscalYearEnd: data.fiscalYearEnd,
    formerNames: (data.formerNames ?? []).map((f: any) => f.name),
  };
}

// XBRL concept candidates, in priority order
const CONCEPTS = {
  revenue: [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "SalesRevenueNet",
  ],
  netIncome: ["NetIncomeLoss"],
  grossProfit: ["GrossProfit"],
  rnd: ["ResearchAndDevelopmentExpense"],
  opIncome: ["OperatingIncomeLoss"],
  assets: ["Assets"],
  liabilities: ["Liabilities"],
  equity: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
  buybacks: ["PaymentsForRepurchaseOfCommonStock"],
};

/**
 * given the facts root, candidate concept names, and period type
 * return one merged annual series, filling each fiscal year from the
 * highest-priority concept that reports it. companies re-tag line items
 * over time (e.g. Revenues -> RevenueFromContractWithCustomer...), so a
 * single concept leaves gaps; merging across candidates yields a
 * contiguous multi-year series.
 */
function mergedAnnual(
  factsRoot: any,
  names: string[],
  instant: boolean,
): YearValue[] {
  const gaap = factsRoot?.["us-gaap"];
  if (!gaap) return [];
  const byFy = new Map<number, number>();
  for (const name of names) {
    const units = gaap[name]?.units?.USD;
    if (!Array.isArray(units)) continue;
    for (const yv of toAnnual(units, instant)) {
      if (!byFy.has(yv.fy)) byFy.set(yv.fy, yv.val); // first (highest priority) wins
    }
  }
  return [...byFy.entries()]
    .map(([fy, val]) => ({ fy, val }))
    .sort((a, b) => a.fy - b.fy);
}

/**
 * given raw XBRL USD entries
 * return one clean annual value per fiscal year (10-K full-year periods)
 * instant=true for balance-sheet items (point in time); false for flows
 */
function toAnnual(entries: any[] | null, instant: boolean): YearValue[] {
  if (!entries) return [];
  const byFy = new Map<number, { val: number; end: string }>();
  for (const e of entries) {
    if (e.fp !== "FY" || !e.fy) continue;
    if (!instant) {
      if (!e.start || !e.end) continue;
      const days =
        (new Date(e.end).getTime() - new Date(e.start).getTime()) / 86_400_000;
      if (days < 350 || days > 380) continue; // keep only full-year durations
    }
    const prev = byFy.get(e.fy);
    if (!prev || e.end > prev.end) byFy.set(e.fy, { val: e.val, end: e.end });
  }
  return [...byFy.entries()]
    .map(([fy, v]) => ({ fy, val: v.val }))
    .sort((a, b) => a.fy - b.fy);
}

/**
 * given a CIK
 * return multi-year financial series pulled from XBRL company facts
 */
export async function fetchFinancials(cik: string): Promise<Financials | null> {
  const facts = await getJson<any>(
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
  );
  if (!facts?.facts) return null;
  const f = facts.facts;
  return {
    revenue: mergedAnnual(f, CONCEPTS.revenue, false),
    netIncome: mergedAnnual(f, CONCEPTS.netIncome, false),
    grossProfit: mergedAnnual(f, CONCEPTS.grossProfit, false),
    rnd: mergedAnnual(f, CONCEPTS.rnd, false),
    opIncome: mergedAnnual(f, CONCEPTS.opIncome, false),
    assets: mergedAnnual(f, CONCEPTS.assets, true),
    liabilities: mergedAnnual(f, CONCEPTS.liabilities, true),
    equity: mergedAnnual(f, CONCEPTS.equity, true),
    buybacks: mergedAnnual(f, CONCEPTS.buybacks, false),
  };
}
