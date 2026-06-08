/**
 * OpenAlex client — free, no API key
 * surfaces recent research output that mentions the company
 */

import { getJson } from "./http";
import type { ResearchSignal } from "./types";

/**
 * given a company name
 * return recent research volume and a few top works, or null
 */
export async function fetchResearch(name: string): Promise<ResearchSignal | null> {
  const url =
    "https://api.openalex.org/works?" +
    `search=${encodeURIComponent(name)}` +
    "&filter=from_publication_date:2024-01-01" +
    "&sort=cited_by_count:desc&per_page=5&mailto=deepdivegen@example.com";
  const data = await getJson<any>(url);
  if (!data?.results) return null;
  return {
    count: data.meta?.count ?? data.results.length,
    topWorks: data.results.slice(0, 5).map((w: any) => ({
      title: w.title ?? w.display_name ?? "Untitled",
      year: w.publication_year,
      venue: w.primary_location?.source?.display_name,
    })),
  };
}
