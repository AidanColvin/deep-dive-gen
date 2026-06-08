/**
 * Wikipedia REST client — free, no API key
 * used for the narrative company overview of any company
 */

import { getJson } from "./http";
import type { WikiSummary } from "./types";

/**
 * given a search term
 * return the best-matching Wikipedia article title, or null
 */
async function searchTitle(term: string): Promise<string | null> {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&list=search&format=json" +
    `&srsearch=${encodeURIComponent(term)}&srlimit=1&origin=*`;
  const data = await getJson<any>(url);
  const hit = data?.query?.search?.[0]?.title;
  return hit ?? null;
}

/**
 * given a company name
 * return a Wikipedia summary (one-liner + lead paragraph + url), or null
 */
export async function fetchWikiSummary(name: string): Promise<WikiSummary | null> {
  const direct = await rest(name);
  if (direct) return direct;
  const title = await searchTitle(`${name} company`);
  if (!title) return null;
  return rest(title);
}

/**
 * given an exact article title
 * return its REST summary, or null
 */
async function rest(title: string): Promise<WikiSummary | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const data = await getJson<any>(url);
  if (!data || data.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found")
    return null;
  if (!data.extract) return null;
  return {
    title: data.title,
    description: data.description,
    extract: data.extract,
    url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  };
}
