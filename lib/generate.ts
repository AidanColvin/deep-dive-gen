/**
 * live report assembler
 * builds a full deep-dive markdown report for any company from free, keyless data:
 *   - SEC EDGAR: multi-year XBRL financials + the narrative sections of the
 *     company's latest 10-K (Business, Competition, Risk Factors, MD&A)
 *   - Wikipedia: narrative overview
 *   - OpenAlex: recent research signal
 * no LLM, no API keys, no cost. every claim traces to a public source.
 */

import {
  fetchProfile,
  fetchFinancials,
  fetchRecentFilings,
  findLatest10K,
  fetch10KSections,
  resolveCik,
} from "./sec";
import { fetchWikiSummary } from "./wikipedia";
import { fetchResearch } from "./openalex";
import { usd, pct, yoy, lastN, latest, valueFor } from "./format";
import type {
  FilingRef,
  Financials,
  ResearchSignal,
  SecProfile,
  TenKSections,
  WikiSummary,
} from "./types";

/**
 * given a company query
 * return a complete markdown deep-dive report assembled from public data
 */
export async function buildLiveReport(query: string): Promise<string> {
  const hit = await resolveCik(query);

  const [profile, financials, filings, wiki, research] = await Promise.all([
    hit ? fetchProfile(hit.cik, hit.ticker, hit.title) : Promise.resolve(null),
    hit ? fetchFinancials(hit.cik) : Promise.resolve(null),
    hit ? fetchRecentFilings(hit.cik) : Promise.resolve([] as FilingRef[]),
    fetchWikiSummary(hit?.title ?? query),
    fetchResearch(hit?.title ?? query),
  ]);

  // the 10-K narrative depends on the filing list, so fetch it after
  const ref = filings.length ? findLatest10K(filings) : null;
  const tenk = hit && ref ? await fetch10KSections(hit.cik, ref) : null;

  const name = profile?.name ?? wiki?.title ?? titleCase(query);
  if (!profile && !wiki) return notFound(query);

  const parts: string[] = [
    `# ${name}: Company Deep Dive\n`,
    banner(profile, hit?.ticker),
    execSummary(name, profile, financials, wiki, tenk),
    companyOverview(name, profile, wiki, tenk),
    strategicDirection(name, tenk, wiki),
    businessModel(financials),
    competitivePositioning(name, financials, tenk),
    keyRisks(name, tenk, profile),
    recentFilings(filings),
    researchSection(research),
    outlook(name, financials, tenk),
    sources(profile, wiki, research, tenk),
  ];
  return parts.join("\n");
}

/* ------------------------------ sections ------------------------------ */

function banner(profile: SecProfile | null, ticker?: string): string {
  const bits: string[] = [];
  if (ticker) bits.push(`**${ticker}**`);
  if (profile?.exchange) bits.push(profile.exchange);
  if (profile?.sicDescription) bits.push(profile.sicDescription);
  if (profile?.hqCity)
    bits.push(`${profile.hqCity}${profile.hqState ? ", " + profile.hqState : ""}`);
  if (!bits.length)
    return "> Private company — no SEC filings available. Profile assembled from public web sources.\n";
  return `> ${bits.join(" · ")}\n`;
}

function execSummary(
  name: string,
  profile: SecProfile | null,
  fin: Financials | null,
  wiki: WikiSummary | null,
  tenk: TenKSections | null,
): string {
  const lines: string[] = ["## Executive Summary\n"];
  const rev = fin ? latest(fin.revenue) : undefined;
  const ni = fin ? latest(fin.netIncome) : undefined;

  if (rev) {
    const prev = fin!.revenue.find((s) => s.fy === rev.fy - 1);
    const growth = prev ? ` (${yoy(rev.val, prev.val)} YoY)` : "";
    lines.push(`${name} reported revenue of ${usd(rev.val)} in FY${rev.fy}${growth} [1].`);
  }
  if (ni) lines.push(`Net income was ${usd(ni.val)} in FY${ni.fy} [1].`);
  if (rev && ni) {
    const gp = valueFor(fin!.grossProfit, rev.fy);
    if (gp) lines.push(`Gross margin was ${pct(gp / rev.val)} [1].`);
  }
  if (tenk?.employees) lines.push(`The company reports approximately ${tenk.employees} employees [4].`);
  if (wiki?.description) lines.push(`It is ${lowerFirst(wiki.description)} [2].`);
  if (wiki?.extract) lines.push(firstSentences(wiki.extract, 1) + " [2]");
  if (lines.length === 1)
    lines.push(
      `${name} is a private company; detailed financials are not available through SEC EDGAR [1].`,
    );
  return lines.join(" ") + "\n";
}

function companyOverview(
  name: string,
  profile: SecProfile | null,
  wiki: WikiSummary | null,
  tenk: TenKSections | null,
): string {
  const lines: string[] = ["## Company Overview\n"];
  if (wiki?.extract) lines.push(wiki.extract + " [2]");
  const facts: string[] = [];
  if (profile?.hqCity)
    facts.push(
      `**HQ:** ${profile.hqCity}${profile.hqState ? ", " + profile.hqState : ""}`,
    );
  if (profile?.exchange && profile.ticker)
    facts.push(`**Listing:** ${profile.exchange}: ${profile.ticker}`);
  if (profile?.sicDescription) facts.push(`**Industry:** ${profile.sicDescription}`);
  if (tenk?.employees) facts.push(`**Employees:** ~${tenk.employees}`);
  if (profile?.fiscalYearEnd)
    facts.push(`**Fiscal year end:** ${formatFye(profile.fiscalYearEnd)}`);
  if (profile?.formerNames?.length)
    facts.push(`**Former names:** ${profile.formerNames.slice(0, 2).join("; ")}`);
  if (facts.length) lines.push("\n" + facts.map((f) => `- ${f} [1]`).join("\n"));
  return lines.join("\n") + "\n";
}

function strategicDirection(
  name: string,
  tenk: TenKSections | null,
  wiki: WikiSummary | null,
): string {
  const lines: string[] = ["## Strategic Direction\n"];
  if (tenk?.business) {
    lines.push(
      `In its own words, from Item 1 (Business) of its FY${tenk.fiscalYear} Form 10-K, ${name} describes its business and strategy as follows [4]:\n`,
    );
    lines.push(tenk.business);
    lines.push(`\n*Source: ${name} Form 10-K, Item 1 — Business (SEC EDGAR) [4].*`);
  } else if (wiki?.extract) {
    lines.push(
      "A full narrative strategy section requires the company's 10-K, which was not available for this entity. The overview above is drawn from public sources [2].",
    );
  } else {
    lines.push("Strategy narrative is not available from public structured sources for this company.");
  }
  return lines.join("\n") + "\n";
}

function businessModel(fin: Financials | null): string {
  const lines: string[] = ["## Business Model & Financial Performance\n"];
  if (!fin || !fin.revenue.length) {
    lines.push(
      "Multi-year financials are not available through SEC EDGAR for this company (typically because it is private or files under a foreign form). [1]",
    );
    return lines.join("\n") + "\n";
  }

  const yrs = lastN(fin.revenue, 5).map((y) => y.fy);

  // revenue trajectory
  lines.push("**Revenue Trajectory** [1]\n");
  lines.push("| Fiscal Year | Revenue | YoY Growth |");
  lines.push("|---|---|---|");
  for (const fy of yrs) {
    const v = valueFor(fin.revenue, fy)!;
    const prev = valueFor(fin.revenue, fy - 1);
    lines.push(`| FY${fy} | ${usd(v)} | ${prev ? yoy(v, prev) : "—"} |`);
  }
  lines.push("");

  // income statement
  lines.push("**Income Statement** [1]\n");
  lines.push("| Fiscal Year | Revenue | Gross Profit | Operating Income | Net Income | R&D |");
  lines.push("|---|---|---|---|---|---|");
  for (const fy of yrs) {
    lines.push(
      `| FY${fy} | ${cell(fin.revenue, fy)} | ${cell(fin.grossProfit, fy)} | ${cell(
        fin.opIncome,
        fy,
      )} | ${cell(fin.netIncome, fy)} | ${cell(fin.rnd, fy)} |`,
    );
  }
  lines.push("");

  // margins, if gross profit exists for any year
  if (yrs.some((fy) => valueFor(fin.grossProfit, fy) !== undefined)) {
    lines.push("**Margin Trend** [1]\n");
    lines.push("| Fiscal Year | Gross | Operating | Net |");
    lines.push("|---|---|---|---|");
    for (const fy of yrs) {
      const r = valueFor(fin.revenue, fy);
      lines.push(
        `| FY${fy} | ${marg(fin.grossProfit, r, fy)} | ${marg(fin.opIncome, r, fy)} | ${marg(
          fin.netIncome,
          r,
          fy,
        )} |`,
      );
    }
    lines.push("");
  }

  // balance sheet + capital return snapshot (latest year)
  const a = latest(fin.assets);
  const l = latest(fin.liabilities);
  const e = latest(fin.equity);
  const bb = latest(fin.buybacks);
  if (a || e || bb) {
    const fy = (a ?? e ?? bb)!.fy;
    lines.push(`**Balance Sheet & Capital Return — FY${fy}** [1]\n`);
    lines.push("| Metric | Value |");
    lines.push("|---|---|");
    if (a) lines.push(`| Total assets | ${usd(a.val)} |`);
    if (l) lines.push(`| Total liabilities | ${usd(l.val)} |`);
    if (e) lines.push(`| Shareholders' equity | ${usd(e.val)} |`);
    if (bb) lines.push(`| Share repurchases | ${usd(bb.val)} |`);
    lines.push("");
  }
  return lines.join("\n") + "\n";
}

function competitivePositioning(
  name: string,
  fin: Financials | null,
  tenk: TenKSections | null,
): string {
  const lines: string[] = ["## Competitive Positioning\n"];
  if (tenk?.competition) {
    lines.push("### Competition (from the 10-K)\n");
    lines.push(tenk.competition);
    lines.push(`\n*Source: ${name} Form 10-K, Item 1 [4].*\n`);
  }
  lines.push("### Financial Scale\n");
  const rev = fin ? latest(fin.revenue) : undefined;
  if (rev)
    lines.push(
      `${name} operates at ${usd(rev.val)} of annual revenue (FY${rev.fy}), placing it among large-cap operators in its sector [1].`,
    );
  else
    lines.push(
      `Public revenue scale is not disclosed via SEC filings for ${name} [1].`,
    );
  const eq = fin ? latest(fin.equity) : undefined;
  if (eq)
    lines.push(
      `Shareholders' equity stood at ${usd(eq.val)} as of FY${eq.fy}, a measure of accumulated capital base [1].`,
    );
  return lines.join("\n") + "\n";
}

function keyRisks(
  name: string,
  tenk: TenKSections | null,
  profile: SecProfile | null,
): string {
  const lines: string[] = ["## Key Risks\n"];
  if (tenk && tenk.riskHeadlines.length >= 3) {
    lines.push(
      `Risk factors disclosed in ${name}'s FY${tenk.fiscalYear} Form 10-K (Item 1A) include [4]:\n`,
    );
    for (const h of tenk.riskHeadlines) lines.push(`- ${h}`);
    return lines.join("\n") + "\n";
  }
  if (tenk?.risks) {
    lines.push(`From the Risk Factors section (Item 1A) of the FY${tenk.fiscalYear} Form 10-K [4]:\n`);
    lines.push(tenk.risks);
    return lines.join("\n") + "\n";
  }
  lines.push(
    "**Disclosure scope** — Company-specific risk factors were not retrievable from the latest filing; read the 10-K Item 1A directly. [1]",
  );
  if (profile?.sicDescription)
    lines.push(
      `\n**Sector exposure** — As a ${profile.sicDescription.toLowerCase()} business, the company carries the cyclical and regulatory risk typical of that industry. [1]`,
    );
  return lines.join("\n") + "\n";
}

function recentFilings(filings: FilingRef[]): string {
  const notable = filings
    .filter((f) => ["10-K", "10-Q", "8-K", "DEF 14A", "S-1", "20-F", "424B5"].includes(f.form))
    .slice(0, 8);
  if (!notable.length) return "";
  const lines: string[] = ["## Recent SEC Filings\n"];
  lines.push("| Date | Form | Type |");
  lines.push("|---|---|---|");
  for (const f of notable) lines.push(`| ${f.date} | ${f.form} | ${formName(f.form)} |`);
  lines.push("\n*Material events and periodic reports filed with the SEC [1].*");
  return lines.join("\n") + "\n";
}

function researchSection(research: ResearchSignal | null): string {
  const lines: string[] = ["## Research & Innovation Signals\n"];
  if (!research || !research.count) {
    lines.push("No recent indexed research output was found for this company. [3]");
    return lines.join("\n") + "\n";
  }
  lines.push(
    `OpenAlex indexes **${research.count.toLocaleString()}** works published since 2024 that reference this company [3]. Most-cited recent works:`,
  );
  lines.push("");
  for (const w of research.topWorks) {
    const meta = [w.year, w.venue].filter(Boolean).join(", ");
    lines.push(`- ${w.title}${meta ? ` — *${meta}*` : ""} [3]`);
  }
  return lines.join("\n") + "\n";
}

function outlook(
  name: string,
  fin: Financials | null,
  tenk: TenKSections | null,
): string {
  const lines: string[] = ["## Outlook\n"];
  if (fin && fin.revenue.length >= 2) {
    const yrs = lastN(fin.revenue, 3);
    const first = yrs[0];
    const last = yrs[yrs.length - 1];
    const cagr = Math.pow(last.val / first.val, 1 / (last.fy - first.fy)) - 1;
    lines.push(
      `Over FY${first.fy}–FY${last.fy}, ${name} grew revenue at roughly ${pct(cagr)} per year [1].`,
    );
  }
  if (tenk?.mda) {
    lines.push(`\nFrom Management's Discussion & Analysis (Item 7) of the latest 10-K [4]:\n`);
    lines.push(tenk.mda);
  } else {
    lines.push(
      "The trajectory and margin profile above are the key metrics to watch in the next annual filing.",
    );
  }
  return lines.join("\n") + "\n";
}

function sources(
  profile: SecProfile | null,
  wiki: WikiSummary | null,
  research: ResearchSignal | null,
  tenk: TenKSections | null,
): string {
  const lines: string[] = ["## Sources\n"];
  if (profile)
    lines.push(
      `[1] U.S. SEC EDGAR — submissions and XBRL company facts. https://data.sec.gov/submissions/CIK${profile.cik}.json`,
    );
  else lines.push("[1] U.S. SEC EDGAR — no public filings located for this company.");
  if (wiki) lines.push(`[2] Wikipedia — ${wiki.title}. ${wiki.url}`);
  if (research && research.count)
    lines.push("[3] OpenAlex — open catalog of scholarly works. https://openalex.org");
  if (tenk) lines.push(`[4] ${profile?.name ?? "Company"} Form 10-K (FY${tenk.fiscalYear}), SEC EDGAR. ${tenk.url}`);
  return lines.join("\n") + "\n";
}

function notFound(query: string): string {
  return [
    `# ${titleCase(query)}: Company Deep Dive\n`,
    "## Not Found\n",
    `We could not locate **${titleCase(query)}** in SEC EDGAR or Wikipedia.\n`,
    "Try one of the following:",
    "- A public company's exact name or ticker (e.g. `Tesla`, `TSLA`, `Coca-Cola`).",
    "- One of the curated companies on the home page.",
    "",
    "This generator uses only free, keyless public data, so coverage is limited to companies indexed by those sources.",
  ].join("\n");
}

/* ------------------------------ helpers ------------------------------ */

function cell(series: { fy: number; val: number }[], fy: number): string {
  const v = valueFor(series, fy);
  return v === undefined ? "—" : usd(v);
}

function marg(
  series: { fy: number; val: number }[],
  rev: number | undefined,
  fy: number,
): string {
  const v = valueFor(series, fy);
  return v !== undefined && rev ? pct(v / rev) : "—";
}

function formName(form: string): string {
  const map: Record<string, string> = {
    "10-K": "Annual report",
    "10-Q": "Quarterly report",
    "8-K": "Material event",
    "DEF 14A": "Proxy statement",
    "S-1": "Registration",
    "20-F": "Foreign annual report",
    "424B5": "Prospectus",
  };
  return map[form] ?? "Filing";
}

function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function firstSentences(text: string, n: number): string {
  const parts = text.match(/[^.!?]+[.!?]+/g);
  if (!parts) return text;
  return parts.slice(0, n).join(" ").trim();
}

function formatFye(mmdd: string): string {
  if (!/^\d{4}$/.test(mmdd)) return mmdd;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const m = parseInt(mmdd.slice(0, 2), 10);
  const d = parseInt(mmdd.slice(2), 10);
  if (m < 1 || m > 12) return mmdd;
  return `${months[m - 1]} ${d}`;
}
