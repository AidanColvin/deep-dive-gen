/**
 * SEC EDGAR client — free, no API key
 * resolves a company to its CIK, then pulls profile + XBRL financials
 */

import { getJson, getText } from "./http";
import type {
  Financials,
  FilingRef,
  SecProfile,
  TenKSections,
  YearValue,
} from "./types";

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
 * return the raw EDGAR submissions document (cached), or null
 */
export async function fetchSubmissions(cik: string): Promise<any | null> {
  return getJson<any>(`https://data.sec.gov/submissions/CIK${cik}.json`, {
    revalidate: 3600,
  });
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
  const data = await fetchSubmissions(cik);
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

/**
 * given a 10-digit CIK
 * return its recent filings as a flat list (newest first)
 */
export async function fetchRecentFilings(cik: string): Promise<FilingRef[]> {
  const data = await fetchSubmissions(cik);
  const r = data?.filings?.recent;
  if (!r?.form) return [];
  const out: FilingRef[] = [];
  for (let i = 0; i < r.form.length; i++) {
    out.push({
      form: r.form[i],
      date: r.filingDate[i],
      accession: r.accessionNumber[i],
      primaryDoc: r.primaryDocument[i],
    });
  }
  return out;
}

/**
 * given a list of filings
 * return the most recent annual report (10-K), or null
 */
export function findLatest10K(filings: FilingRef[]): FilingRef | null {
  return (
    filings.find((f) => f.form === "10-K") ??
    filings.find((f) => f.form === "10-K/A") ??
    filings.find((f) => f.form === "20-F") ??
    null
  );
}

/**
 * given a CIK and a 10-K filing reference
 * fetch the filing and extract its key narrative sections
 * (Business, Competition, Risk Factors, MD&A) plus the employee count
 */
export async function fetch10KSections(
  cik: string,
  ref: FilingRef,
): Promise<TenKSections | null> {
  const cikInt = parseInt(cik, 10);
  const acc = ref.accession.replace(/-/g, "");
  const url = `https://www.sec.gov/Archives/edgar/data/${cikInt}/${acc}/${ref.primaryDoc}`;
  const html = await getText(url, { revalidate: 86400 });
  if (!html) return null;

  const text = htmlToText(html);
  const items = sliceItems(text);

  const businessSeg = items["1"];
  const riskSeg = items["1A"];
  const mdaSeg = items["7"];

  return {
    url,
    fiscalYear: ref.date?.slice(0, 4),
    business: businessSeg ? excerpt(businessSeg, 1700) : undefined,
    competition: businessSeg ? competitionExcerpt(businessSeg) : undefined,
    risks: riskSeg ? excerpt(riskSeg, 1100) : undefined,
    riskHeadlines: riskSeg ? riskHeadlines(riskSeg) : [],
    mda: mdaSeg ? excerpt(mdaSeg, 1100) : undefined,
    employees: extractEmployees(text),
  };
}

/* --------------------------- 10-K text helpers --------------------------- */

/**
 * given raw filing HTML
 * return readable plain text with block boundaries preserved as newlines
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => safeCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => safeCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&rsquo;|&lsquo;|&apos;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * given a unicode code point
 * return the character, or a space if the value is invalid
 */
function safeCodePoint(n: number): string {
  try {
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : " ";
  } catch {
    return " ";
  }
}

/**
 * given the full 10-K text
 * return the longest text block for each "Item N" section, keyed by item
 * number (the longest block is the real section, not the table-of-contents line)
 */
function sliceItems(text: string): Record<string, string> {
  const re = /\bItem\s+(\d{1,2}[A-C]?)\b[.:\s\-—]/gi;
  const marks: { item: string; idx: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) marks.push({ item: m[1].toUpperCase(), idx: m.index });

  const groups: Record<string, string[]> = {};
  for (let i = 0; i < marks.length; i++) {
    const seg = text.slice(marks[i].idx, marks[i + 1]?.idx ?? text.length);
    (groups[marks[i].item] ||= []).push(seg);
  }

  const out: Record<string, string> = {};
  for (const k of Object.keys(groups)) {
    out[k] = groups[k].reduce((a, b) => (b.length > a.length ? b : a), "");
  }
  return out;
}

/**
 * given a section segment
 * return a clean prose excerpt up to max chars, ending on a sentence boundary
 */
function excerpt(seg: string, max: number): string {
  const t = seg
    .replace(/^\s*Item\s+\d{1,2}[A-C]?\b[.:\s\-—]*/i, "")
    .replace(
      /^(Business|Risk Factors|Management['’]s Discussion and Analysis[^.]*\.?|Overview|General)\b[.:\s\-—]*/i,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
  let out: string;
  if (t.length <= max) out = t;
  else {
    const cut = t.slice(0, max);
    const stop = cut.lastIndexOf(". ");
    out = (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut) + " …";
  }
  return sanitizeMd(out);
}

/**
 * given raw filing prose
 * return it with markdown-significant characters neutralized so it can't
 * break the rendered report (stray emphasis, links, or raw HTML)
 */
function sanitizeMd(s: string): string {
  return s.replace(/[<>[\]]/g, "").replace(/([*_`|])/g, "\\$1");
}

/**
 * given the Business section
 * return an excerpt of its Competition subsection, if present
 */
function competitionExcerpt(business: string): string | undefined {
  // prefer a real "Competition" subsection header on its own line
  const header = business.search(/\n[ \t]*Competition\b/i);
  if (header >= 0) {
    const sub = business.slice(header).replace(/^\s*Competition\b[.:\s\-—]*/i, "");
    const out = excerpt(sub, 800);
    if (out.length > 120) return out;
  }
  // otherwise fall back to the first contextual mention of competition
  const any = business.search(/\bcompetit(ion|ive|ors)\b/i);
  if (any < 0) return undefined;
  const out = excerpt(business.slice(any), 800);
  return out.length > 120 ? out : undefined;
}

/**
 * given the Risk Factors section
 * return up to 8 short risk-factor headlines (heuristic: short header lines)
 */
function riskHeadlines(riskSeg: string): string[] {
  const lines = riskSeg.split("\n").map((l) => l.trim());
  const heads: string[] = [];
  for (const line of lines) {
    if (line.length < 16 || line.length > 130) continue;
    if (/[.;:]$/.test(line)) continue; // headers usually don't end in punctuation
    if (/^(item|table of contents|page|the following|see |our |we )/i.test(line)) continue;
    if (!/[a-z]/.test(line)) continue; // skip ALL-CAPS noise / numbers
    const words = line.split(/\s+/);
    if (words.length < 3 || words.length > 18) continue;
    if (!/^[A-Z]/.test(line)) continue;
    heads.push(sanitizeMd(line.replace(/\s+/g, " ")));
    if (heads.length >= 8) break;
  }
  return heads;
}

/**
 * given the full 10-K text
 * return the disclosed employee count phrase, if found
 */
function extractEmployees(text: string): string | undefined {
  const m = text.match(
    /(?:had|employed|approximately|of)\s+([\d,]{4,})\s+(?:full-?\s?time\s+)?(?:employees|people|persons)/i,
  );
  return m ? m[1].replace(/,/g, ",") : undefined;
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
