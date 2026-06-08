"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MarkdownArticle, { slugify } from "./components/MarkdownArticle";
import CompanyLogo from "./components/CompanyLogo";
import { CURATED, findCurated } from "@/lib/registry";

type Status = "idle" | "loading" | "streaming" | "done" | "error";

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

const DEFAULT_ACCENT = "#4f46e5";

export default function Home() {
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("");
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [logoDomain, setLogoDomain] = useState<string | undefined>(undefined);
  const [markdown, setMarkdown] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [activeId, setActiveId] = useState("");
  const articleRef = useRef<HTMLDivElement>(null);

  const isBusy = status === "loading" || status === "streaming";

  async function generate(name: string) {
    const trimmed = name.trim();
    if (!trimmed || isBusy) return;

    const curated = findCurated(trimmed);
    setCompany(curated ? curated.name : titleCase(trimmed));
    setAccent(curated ? curated.accent : DEFAULT_ACCENT);
    setLogoDomain(curated ? curated.domain : guessDomain(trimmed));
    setQuery(curated ? curated.name : trimmed);
    setMarkdown("");
    setStatus("loading");

    try {
      const res = await fetch(`/api/generate?company=${encodeURIComponent(trimmed)}`);
      if (!res.ok || !res.body) {
        setStatus("error");
        setMarkdown(`> Could not generate a report (HTTP ${res.status}).`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      setStatus("streaming");
      let acc = "";
      // strip the leading H1 — we render the company name in the report header
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMarkdown(acc);
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setMarkdown("> Network error while generating the report.");
    }
  }

  // markdown with the leading H1 removed (header shows the title instead)
  const body = useMemo(() => markdown.replace(/^#\s+.*\n?/, ""), [markdown]);

  // build the table of contents from headings in the streamed markdown
  const toc = useMemo<TocItem[]>(() => {
    const items: TocItem[] = [];
    for (const line of body.split("\n")) {
      const h2 = /^##\s+(.+?)\s*$/.exec(line);
      const h3 = /^###\s+(.+?)\s*$/.exec(line);
      if (h2) items.push({ level: 2, text: h2[1], id: slugify(h2[1]) });
      else if (h3) items.push({ level: 3, text: h3[1], id: slugify(h3[1]) });
    }
    return items;
  }, [body]);

  // scroll-spy: highlight the section currently in view
  useEffect(() => {
    if (status !== "done") return;
    const headings = toc
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => !!el);
    if (!headings.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-10% 0px -75% 0px", threshold: 0 },
    );
    headings.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, [status, toc]);

  function copyMarkdown() {
    navigator.clipboard?.writeText(markdown);
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(company || "report")}-deep-dive.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setStatus("idle");
    setMarkdown("");
    setCompany("");
    setQuery("");
    setAccent(DEFAULT_ACCENT);
    setLogoDomain(undefined);
  }

  /* ------------------------------- idle / hero ------------------------------- */
  if (status === "idle") {
    return (
      <main className="hero">
        <div className="hero-inner">
          <div className="kicker">FREE · NO API KEYS · SOURCE-GROUNDED</div>
          <h1 className="hero-title">
            Company <span className="hero-em">Deep Dive</span> Generator
          </h1>
          <p className="hero-sub">
            Structured intelligence reports on any public company — real financials
            pulled live from SEC EDGAR, plus hand-built deep dives on the companies
            that matter. No login, no cost.
          </p>

          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              generate(query);
            }}
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter a company or ticker — Apple, NVIDIA, Tesla, TSLA…"
              aria-label="Company name"
            />
            <button type="submit">Generate</button>
          </form>

          <div className="chips">
            <span className="chips-label">Curated reports</span>
            {CURATED.map((c) => (
              <button
                key={c.slug}
                className="chip"
                style={{ ["--chip" as any]: c.accent }}
                onClick={() => generate(c.name)}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="how">
            <div className="how-item">
              <strong>Curated</strong>
              <span>
                Seven hand-written deep dives synthesized from SEC filings and primary
                sources — Apple, NVIDIA, Microsoft, Alphabet, AWS, Anthropic, OpenAI.
              </span>
            </div>
            <div className="how-item">
              <strong>Live</strong>
              <span>
                Any other public company is assembled on demand from SEC EDGAR XBRL
                facts, Wikipedia, and OpenAlex — every number cited.
              </span>
            </div>
            <div className="how-item">
              <strong>Free forever</strong>
              <span>
                No language model, no API keys, no per-use cost. Just public data,
                rendered into a board-ready report.
              </span>
            </div>
          </div>
        </div>
        <footer className="foot">
          Data: U.S. SEC EDGAR · Wikipedia · OpenAlex. Not investment advice.
        </footer>
      </main>
    );
  }

  /* ------------------------------- report view ------------------------------- */
  return (
    <main className="app" style={{ ["--accent" as any]: accent }}>
      <header className="topbar">
        <button className="brand" onClick={reset}>
          ◆ Deep Dive
        </button>
        <form
          className="topsearch"
          onSubmit={(e) => {
            e.preventDefault();
            generate(query);
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search another company…"
            disabled={isBusy}
          />
          <button type="submit" disabled={isBusy}>
            {isBusy ? "…" : "Go"}
          </button>
        </form>
      </header>

      <div className="layout">
        <aside className="toc">
          <div className="toc-head">Contents</div>
          <nav>
            {toc.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className={`toc-link lvl${t.level} ${activeId === t.id ? "active" : ""}`}
              >
                {t.text}
              </a>
            ))}
          </nav>
        </aside>

        <div className="content" ref={articleRef}>
          <div className="report-head">
            <div className="report-head-top">
              <div className="report-head-title">
                <div className="report-eyebrow">Company Deep Dive</div>
                <h1 className="report-title">{company}</h1>
              </div>
              <CompanyLogo
                key={logoDomain || company}
                name={company}
                domain={logoDomain}
                accent={accent}
              />
            </div>
            <div className="export">
              <button onClick={copyMarkdown} disabled={isBusy}>
                Copy Markdown
              </button>
              <button onClick={downloadMarkdown} disabled={isBusy}>
                Download .md
              </button>
              <button onClick={() => window.print()} disabled={isBusy}>
                Print / PDF
              </button>
            </div>
          </div>

          {status === "loading" && (
            <div className="loading">
              <span className="spinner" /> Gathering public data…
            </div>
          )}

          <div className={isBusy ? "streaming" : ""}>
            <MarkdownArticle markdown={body} />
            {isBusy && <span className="cursor" />}
          </div>
        </div>
      </div>
    </main>
  );
}

function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * given a company name or query
 * return a best-guess web domain for logo lookup (e.g. "Tesla" -> "tesla.com").
 * logo fetching degrades gracefully to a monogram if this guess is wrong.
 */
function guessDomain(name: string): string {
  const base = name
    .toLowerCase()
    .replace(
      /,?\s+(inc|incorporated|corp|corporation|co|company|plc|ltd|limited|holdings|group|llc|sa|ag|nv)\.?$/g,
      "",
    )
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
  return base ? `${base}.com` : "";
}
