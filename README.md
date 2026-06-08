# Deep Dive — Company Intelligence Reports

Structured, board-ready company deep-dive reports — **completely free, no API keys, no language model, no per-use cost.**

Every report is either hand-built from primary sources or assembled on demand from **free, keyless public data**:

- **SEC EDGAR** — real multi-year XBRL financials (revenue, margins, R&D) for any U.S. public company
- **Wikipedia REST** — narrative company overview
- **OpenAlex** — recent research signal

There is no Claude/OpenAI/Gemini call anywhere in the pipeline, so the app costs **$0** to host and run, forever.

## Two kinds of report

1. **Curated** — seven hand-written, fully-analyzed deep dives in the OIC format:
   Apple, NVIDIA, Microsoft, Alphabet (Google), AWS, Anthropic, OpenAI.
   These render instantly and are grounded in real SEC numbers.
2. **Live** — any other public company is built on demand from SEC EDGAR + Wikipedia + OpenAlex,
   with a real revenue-trajectory table and citations. Private companies fall back to a
   Wikipedia-grounded profile.

## Stack

- **Next.js (App Router) + React + TypeScript** — single app, single deployment
- **Plain CSS** — no Tailwind; editorial research-report design
- **react-markdown + remark-gfm** — report rendering with tables and anchored headings
- A streaming route handler (`/api/generate`) that emits markdown progressively

No environment variables are required.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy (free, public URL)

The app is a standard Next.js project and deploys to Vercel's free tier with **no environment
variables**:

```bash
npm i -g vercel
vercel            # first deploy (preview)
vercel --prod     # promote to the public production URL
```

Or push to GitHub and import the repo at vercel.com/new. The result is a permanent public URL
(e.g. `deep-dive-gen.vercel.app`) that stays free because nothing in the app costs money to run.

## Project layout

```
app/
  page.tsx                  # search + streaming report UI (client)
  globals.css               # design system
  components/MarkdownArticle.tsx
  api/generate/route.ts     # streams curated or live reports
lib/
  registry.ts               # curated company list + resolver
  curated.ts                # reads curated markdown
  generate.ts               # assembles live reports from public data
  sec.ts                    # SEC EDGAR client (CIK resolve, profile, XBRL)
  wikipedia.ts / openalex.ts
  format.ts / http.ts / types.ts
content/reports/*.md        # the seven curated deep dives
```

## Data sources & disclaimer

Data: U.S. SEC EDGAR, Wikipedia, OpenAlex. This tool is for informational purposes only and is
not investment advice.
