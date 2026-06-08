/**
 * tiny fetch helpers shared by every data client
 * all external APIs used here are free and need no key
 */

// SEC and other public APIs ask for a descriptive User-Agent.
const USER_AGENT = "deep-dive-gen/1.0 (free research demo; contact@deepdivegen.app)";

interface GetOpts {
  revalidate?: number; // seconds of edge cache
  accept?: string;
}

/**
 * given a url
 * return parsed JSON of type T, or null on any failure
 */
export async function getJson<T>(url: string, opts: GetOpts = {}): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: opts.accept ?? "application/json",
      },
      next: opts.revalidate ? { revalidate: opts.revalidate } : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
