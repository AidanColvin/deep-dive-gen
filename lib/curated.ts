/**
 * reads curated markdown reports from disk (server-side only)
 */

import { promises as fs } from "fs";
import path from "path";

/**
 * given a curated report slug
 * return the markdown body of that report
 */
export async function readCurated(slug: string): Promise<string> {
  const safe = slug.replace(/[^a-z0-9-]/gi, "");
  const file = path.join(process.cwd(), "content", "reports", `${safe}.md`);
  return fs.readFile(file, "utf8");
}
