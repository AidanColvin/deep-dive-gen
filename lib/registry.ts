/**
 * registry of curated, hand-built deep dive reports
 * these render instantly with no network calls
 */

import type { CuratedMeta } from "./types";

export const CURATED: CuratedMeta[] = [
  {
    slug: "apple",
    name: "Apple",
    aliases: ["apple inc", "aapl"],
    ticker: "AAPL",
    type: "Public",
    hq: "Cupertino, CA",
    sector: "Consumer Technology",
    tagline: "The integrated hardware-services ecosystem at $416B revenue.",
    accent: "#0071e3",
    updated: "June 2026",
  },
  {
    slug: "nvidia",
    name: "NVIDIA",
    aliases: ["nvidia corporation", "nvda"],
    ticker: "NVDA",
    type: "Public",
    hq: "Santa Clara, CA",
    sector: "Accelerated Computing",
    tagline: "The AI compute platform powering the data-center buildout.",
    accent: "#76b900",
    updated: "June 2026",
  },
  {
    slug: "microsoft",
    name: "Microsoft",
    aliases: ["microsoft corporation", "msft"],
    ticker: "MSFT",
    type: "Public",
    hq: "Redmond, WA",
    sector: "Software & Cloud",
    tagline: "Azure, Copilot, and the enterprise AI distribution machine.",
    accent: "#0078d4",
    updated: "June 2026",
  },
  {
    slug: "google",
    name: "Alphabet (Google)",
    aliases: ["google", "alphabet", "alphabet inc", "googl", "goog"],
    ticker: "GOOGL",
    type: "Public",
    hq: "Mountain View, CA",
    sector: "Internet & AI",
    tagline: "Search economics funding a full-stack AI and cloud push.",
    accent: "#4285f4",
    updated: "June 2026",
  },
  {
    slug: "aws",
    name: "Amazon Web Services",
    aliases: ["aws", "amazon", "amazon web services", "amazon.com", "amzn"],
    ticker: "AMZN",
    type: "Public",
    hq: "Seattle, WA",
    sector: "Cloud Infrastructure",
    tagline: "The $129B cloud segment that funds Amazon's operating income.",
    accent: "#ff9900",
    updated: "June 2026",
  },
  {
    slug: "anthropic",
    name: "Anthropic",
    aliases: ["anthropic pbc", "claude"],
    type: "Private",
    hq: "San Francisco, CA",
    sector: "Frontier AI",
    tagline: "Claude, enterprise safety positioning, and a ~$1T valuation.",
    accent: "#d97757",
    updated: "June 2026",
  },
  {
    slug: "openai",
    name: "OpenAI",
    aliases: ["openai group", "chatgpt"],
    type: "Private",
    hq: "San Francisco, CA",
    sector: "Frontier AI",
    tagline: "ChatGPT scale, an $852B valuation, and a filed S-1.",
    accent: "#10a37f",
    updated: "June 2026",
  },
];

/**
 * given a free-text query
 * return the curated report whose name, slug, ticker, or alias matches, or null
 */
export function findCurated(query: string): CuratedMeta | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const c of CURATED) {
    if (c.slug === q) return c;
    if (c.name.toLowerCase() === q) return c;
    if (c.ticker && c.ticker.toLowerCase() === q) return c;
    if (c.aliases.includes(q)) return c;
  }
  // looser contains match as a fallback
  for (const c of CURATED) {
    if (c.name.toLowerCase().includes(q)) return c;
    if (c.aliases.some((a) => a.includes(q))) return c;
  }
  return null;
}
