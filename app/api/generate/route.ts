/**
 * GET /api/generate?company=...
 * streams a deep-dive report as plain-text markdown chunks.
 * curated companies are served from disk; everything else is assembled
 * live from free, keyless public data (SEC EDGAR / Wikipedia / OpenAlex).
 */

import type { NextRequest } from "next/server";
import { findCurated } from "@/lib/registry";
import { readCurated } from "@/lib/curated";
import { buildLiveReport } from "@/lib/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const company = req.nextUrl.searchParams.get("company")?.trim() ?? "";
  if (!company) {
    return new Response("Missing ?company=", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s));
      try {
        const curated = findCurated(company);
        const markdown = curated
          ? await readCurated(curated.slug)
          : await buildLiveReport(company);

        // emit in small chunks so the client can render progressively
        const size = 220;
        for (let i = 0; i < markdown.length; i += size) {
          send(markdown.slice(i, i + size));
          await sleep(10);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown error";
        send(`\n\n> **Generation error.** ${msg}\n`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
