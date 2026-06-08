"use client";

import { useState } from "react";

/**
 * given a company name, optional web domain, and accent color
 * render the company logo, falling back through several free, keyless
 * logo/favicon services, and finally to a colored monogram so every
 * report shows something.
 */
export default function CompanyLogo({
  name,
  domain,
  accent,
}: {
  name: string;
  domain?: string;
  accent: string;
}) {
  const sources = domain
    ? [
        `https://logo.clearbit.com/${domain}`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      ]
    : [];

  const [index, setIndex] = useState(0);
  const letter = (name.trim()[0] || "?").toUpperCase();

  if (!domain || index >= sources.length) {
    return (
      <div className="company-logo monogram" style={{ background: accent }} aria-hidden>
        {letter}
      </div>
    );
  }

  return (
    <div className="company-logo">
      <img
        src={sources[index]}
        alt={`${name} logo`}
        onError={() => setIndex((n) => n + 1)}
        loading="eager"
      />
    </div>
  );
}
