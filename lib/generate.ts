/**
 * live report assembler
 * builds a full deep-dive markdown report for any company from free, keyless data:
 *   - SEC EDGAR (profile + multi-year XBRL financials) for public companies
 *   - Wikipedia (narrative overview)
 *   - OpenAlex (recent research signal)
 * no LLM, no API keys, no cost. every number traces to a public source.
 */

import { fetchProfile, fetchFinancials, resolveCik } from "./sec";
import { fetchWikiSummary } from "./wikipedia";
import { fetchResearch } from "./openalex";
import { usd, pct, yoy, lastN, latest, valueFor } from "./format";
import type { Financials, SecProfile, WikiSummary, ResearchSignal } from "./types";

/**
 * given a company query
 * return a complete markdown deep-dive report assembled from public data
 */
export async function buildLiveReport(query: string): Promise<string> {
  const hit = await resolveCik(query);

  // fan out the free lookups in parallel
  const [profile, financials, wiki, research] = await Promise.all([
    hit ? fetchProfile(hit.cik, hit.ticker, hit.title) : Promise.resolve(null),
    hit ? fetchFinancials(hit.cik) : Promise.resolve(null),
    fetchWikiSummary(hit?.title ?? query),
    fetchResearch(hit?.title ?? query),
  ]);

  const displayName = profile?.name ?? wiki?.title ?? titleCase(query);

  if (!profile && !wiki) {
    return notFound(query);
  }

  const parts: string[] = [];
  parts.push(`# ${displayName}: Company Deep Dive\n`);
  parts.push(banner(profile, hit?.ticker));
  parts.push(execSummary(displayName, profile, financials, wiki));
  parts.push(companyOverview(displayName, profile, wiki));
  parts.push(businessModel(financials));
  parts.push(researchSection(research));
  parts.push(competitive(displayName, financials));
  parts.push(risks(profile));
  parts.push(outlook(displayName, financials));
  parts.push(sources(profile, wiki, research));

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
  if (!bits.length) return "> Private company — no SEC filings available. Profile assembled from public web sources.\n";
  return `> ${bits.join(" · ")}\n`;
}

function execSummary(
  name: string,
  profile: SecProfile | null,
  fin: Financials | null,
  wiki: WikiSummary | null,
): string {
  const lines: string[] = ["## Executive Summary\n"];
  const rev = fin ? latest(fin.revenue) : undefined;
  const ni = fin ? latest(fin.netIncome) : undefined;

  if (rev) {
    const prev = fin!.revenue.find((s) => s.fy === rev.fy - 1);
    const growth = prev ? ` (${yoy(rev.val, prev.val)} YoY)` : "";
    lines.push(
      `${name} reported revenue of ${usd(rev.val)} in FY${rev.fy}${growth} [1].`,
    );
  }
  if (ni) {
    lines.push(`Net income was ${usd(ni.val)} in FY${ni.fy} [1].`);
  }
  if (wiki?.description) {
    lines.push(`It is ${lowerFirst(wiki.description)} [2].`);
  }
  if (wiki?.extract) {
    lines.push(firstSentences(wiki.extract, 2) + " [2]");
  }
  if (lines.length === 1) {
    lines.push(
      `${name} is a private company; detailed financials are not available through SEC EDGAR [1].`,
    );
  }
  return lines.join(" ") + "\n";
}

function companyOverview(
  name: string,
  profile: SecProfile | null,
  wiki: WikiSummary | null,
): string {
  const lines: string[] = ["## Company Overview\n"];
  if (wiki?.extract) lines.push(wiki.extract + " [2]");
  const facts: string[] = [];
  if (profile?.hqCity)
    facts.push(`**HQ:** ${profile.hqCity}${profile.hqState ? ", " + profile.hqState : ""}`);
  if (profile?.exchange && profile.ticker)
    facts.push(`**Listing:** ${profile.exchange}: ${profile.ticker}`);
  if (profile?.sicDescription) facts.push(`**Industry:** ${profile.sicDescription}`);
  if (profile?.fiscalYearEnd)
    facts.push(`**Fiscal year end:** ${formatFye(profile.fiscalYearEnd)}`);
  if (profile?.formerNames?.length)
    facts.push(`**Former names:** ${profile.formerNames.slice(0, 2).join("; ")}`);
  if (facts.length) lines.push("\n" + facts.map((f) => `- ${f} [1]`).join("\n"));
  return lines.join("\n") + "\n";
}

function businessModel(fin: Financials | null): string {
  const lines: string[] = ["## Business Model & Financial Performance\n"];
  if (!fin || !fin.revenue.length) {
    lines.push(
      "Segment-level and multi-year financials are not available through SEC EDGAR for this company (typically because it is private or files under a foreign form). [1]",
    );
    return lines.join("\n") + "\n";
  }

  const years = lastN(fin.revenue, 5);
  lines.push("**Revenue Trajectory**\n");
  lines.push("| Fiscal Year | Revenue | YoY Growth |");
  lines.push("|---|---|---|");
  years.forEach((y) => {
    // only compute YoY against the immediately preceding fiscal year
    const prev = valueFor(fin.revenue, y.fy - 1);
    lines.push(`| FY${y.fy} | ${usd(y.val)} | ${prev ? yoy(y.val, prev) : "—"} |`);
  });
  lines.push("");

  // margin + key line items for the most recent year
  const fy = years[years.length - 1].fy;
  const rev = valueFor(fin.revenue, fy);
  const gp = valueFor(fin.grossProfit, fy);
  const oi = valueFor(fin.opIncome, fy);
  const ni = valueFor(fin.netIncome, fy);
  const rnd = valueFor(fin.rnd, fy);

  const kv: string[] = [];
  if (rev && gp) kv.push(`| Gross margin | ${pct(gp / rev)} |`);
  if (rev && oi) kv.push(`| Operating margin | ${pct(oi / rev)} |`);
  if (rev && ni) kv.push(`| Net margin | ${pct(ni / rev)} |`);
  if (rnd) kv.push(`| R&D spend | ${usd(rnd)}${rev ? ` (${pct(rnd / rev)} of revenue)` : ""} |`);
  if (kv.length) {
    lines.push(`**FY${fy} Profitability** [1]\n`);
    lines.push("| Metric | Value |");
    lines.push("|---|---|");
    lines.push(...kv);
    lines.push("");
  }
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
  research.topWorks.forEach((w) => {
    const meta = [w.year, w.venue].filter(Boolean).join(", ");
    lines.push(`- ${w.title}${meta ? ` — *${meta}*` : ""} [3]`);
  });
  return lines.join("\n") + "\n";
}

function competitive(name: string, fin: Financials | null): string {
  const lines: string[] = ["## Competitive Positioning\n"];
  lines.push("### Financial Scale\n");
  const rev = fin ? latest(fin.revenue) : undefined;
  if (rev) {
    lines.push(
      `${name} operates at ${usd(rev.val)} of annual revenue (FY${rev.fy}), placing it among large-cap operators in its sector [1].`,
    );
  } else {
    lines.push(
      `Public revenue scale is not disclosed via SEC filings for ${name}; competitive scale must be assessed from private-market disclosures [1].`,
    );
  }
  const eq = fin ? latest(fin.equity) : undefined;
  if (eq) {
    lines.push(
      `\nShareholders' equity stood at ${usd(eq.val)} as of FY${eq.fy}, a measure of accumulated capital base [1].`,
    );
  }
  return lines.join("\n") + "\n";
}

function risks(profile: SecProfile | null): string {
  const lines: string[] = ["## Key Risks\n"];
  lines.push(
    "**Disclosure scope** — This report is assembled from structured public data (SEC XBRL facts, Wikipedia, OpenAlex). It does not parse the narrative risk factors in the company's 10-K, so company-specific risks should be read directly from the latest filing. [1]",
  );
  if (profile?.sicDescription) {
    lines.push(
      `\n**Sector exposure** — As a ${profile.sicDescription.toLowerCase()} business, the company carries the cyclical and regulatory risk typical of that industry. [1]`,
    );
  }
  lines.push(
    "\n**Data lag** — XBRL facts reflect the most recent annual filing and may trail current quarter performance. [1]",
  );
  return lines.join("\n") + "\n";
}

function outlook(name: string, fin: Financials | null): string {
  const lines: string[] = ["## Outlook\n"];
  if (fin && fin.revenue.length >= 2) {
    const yrs = lastN(fin.revenue, 3);
    const first = yrs[0];
    const last = yrs[yrs.length - 1];
    const cagr =
      Math.pow(last.val / first.val, 1 / (last.fy - first.fy)) - 1;
    lines.push(
      `Over FY${first.fy}–FY${last.fy}, ${name} grew revenue at roughly ${pct(cagr)} per year [1]. The trajectory and margin profile above are the key metrics to watch in the next annual filing.`,
    );
  } else {
    lines.push(
      `${name} does not file standard annual reports with the SEC, so forward signals are best tracked through its press disclosures and private financing announcements [2].`,
    );
  }
  lines.push(
    "\n*For a fully analyzed, narrative deep dive on this company, see the curated reports on the home page.*",
  );
  return lines.join("\n") + "\n";
}

function sources(
  profile: SecProfile | null,
  wiki: WikiSummary | null,
  research: ResearchSignal | null,
): string {
  const lines: string[] = ["## Sources\n"];
  if (profile)
    lines.push(
      `[1] U.S. SEC EDGAR — company submissions and XBRL company facts. https://data.sec.gov/submissions/CIK${profile.cik}.json`,
    );
  else lines.push("[1] U.S. SEC EDGAR — no public filings located for this company.");
  if (wiki) lines.push(`[2] Wikipedia — ${wiki.title}. ${wiki.url}`);
  if (research && research.count)
    lines.push("[3] OpenAlex — open catalog of scholarly works. https://openalex.org");
  return lines.join("\n") + "\n";
}

function notFound(query: string): string {
  return [
    `# ${titleCase(query)}: Company Deep Dive\n`,
    "## Not Found\n",
    `We could not locate **${titleCase(query)}** in SEC EDGAR or Wikipedia.\n`,
    "Try one of the following:",
    "- A public company's exact name or ticker (e.g. `Tesla`, `TSLA`, `Coca-Cola`).",
    "- One of the curated companies on the home page (Apple, NVIDIA, Microsoft, Alphabet, AWS, Anthropic, OpenAI).",
    "",
    "This generator uses only free, keyless public data, so coverage is limited to companies indexed by those sources.",
  ].join("\n");
}

/* ------------------------------ helpers ------------------------------ */

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
  // SEC encodes fiscal year end as "MMDD", e.g. "0928"
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
