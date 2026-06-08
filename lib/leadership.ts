/**
 * builds the Leadership section markdown shared by curated and live reports.
 * uses only free, keyless services:
 *   - ui-avatars.com for initials avatars (no real headshots are freely
 *     licensed for arbitrary executives)
 *   - a LinkedIn people-search URL per person (no free API returns exact
 *     profile URLs, so this is a best-effort link to find them)
 */

import type { Executive } from "./types";

/**
 * given a person's name and their company
 * return a LinkedIn people-search URL that finds that person
 */
function linkedinUrl(name: string, company: string): string {
  const q = encodeURIComponent(`${name} ${company}`);
  return `https://www.linkedin.com/search/results/people/?keywords=${q}`;
}

/**
 * given a name and an accent hex color
 * return a generated initials-avatar image URL
 */
function avatarUrl(name: string, accentHex: string): string {
  const bg = accentHex.replace("#", "");
  return (
    "https://ui-avatars.com/api/?" +
    `name=${encodeURIComponent(name)}&background=${bg}&color=ffffff&bold=true&size=128`
  );
}

/**
 * given a list of executives and display options
 * return a markdown Leadership section (table of avatar, name, role), or ""
 */
export function buildLeadership(
  execs: Executive[],
  opts: { accent: string; company: string; companyUrl?: string },
): string {
  if (!execs.length) return "";
  const lines: string[] = ["## Leadership\n"];
  const pageLink = opts.companyUrl
    ? ` See the [${opts.company} company page ↗](${opts.companyUrl}).`
    : "";
  lines.push(
    `Current executive leadership. Each name links to a LinkedIn people search.${pageLink}\n`,
  );
  lines.push("|  | Executive | Role |");
  lines.push("|---|---|---|");
  for (const e of execs) {
    const photo = e.photo || avatarUrl(e.name, opts.accent);
    const li = linkedinUrl(e.name, opts.company);
    const role = e.title.replace(/\|/g, "/");
    lines.push(`| ![${e.name}](${photo}) | [${e.name}](${li}) | ${role} |`);
  }
  lines.push("");
  return lines.join("\n") + "\n";
}
