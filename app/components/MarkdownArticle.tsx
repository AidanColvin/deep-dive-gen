"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";
import Chart from "./Charts";

/**
 * given any react children
 * return their concatenated plain-text content
 */
function toText(node: ReactNode): string {
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (typeof node === "object" && "props" in (node as any)) {
    return toText((node as any).props?.children);
  }
  return "";
}

/**
 * given heading text
 * return a url-safe slug used as the heading id (for the table of contents)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * renders a markdown report string with anchored headings and GFM tables
 */
export default function MarkdownArticle({ markdown }: { markdown: string }) {
  return (
    <article className="report">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => <h2 id={slugify(toText(children))}>{children}</h2>,
          h3: ({ children }) => <h3 id={slugify(toText(children))}>{children}</h3>,
          table: ({ children }) => (
            <div className="table-wrap">
              <table>{children}</table>
            </div>
          ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          // unwrap <pre> so chart blocks render as block-level figures
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            if (className && className.includes("language-chart")) {
              try {
                return <Chart spec={JSON.parse(toText(children).trim())} />;
              } catch {
                // JSON not complete yet (still streaming)
                return <div className="chart chart-loading">Rendering chart…</div>;
              }
            }
            return <code className={className}>{children}</code>;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
