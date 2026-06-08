/**
 * shared type definitions for the deep dive generator
 */

export type CompanyType = "Public" | "Private";

export interface CuratedMeta {
  slug: string;
  name: string;
  aliases: string[];
  ticker?: string;
  type: CompanyType;
  hq: string;
  sector: string;
  tagline: string;
  accent: string; // hex color used as the report accent
  domain: string; // primary web domain, used to fetch the company logo
  updated: string; // human display date
}

export interface YearValue {
  fy: number;
  val: number;
}

export interface SecProfile {
  cik: string;
  name: string;
  ticker?: string;
  exchange?: string;
  sicDescription?: string;
  hqCity?: string;
  hqState?: string;
  fiscalYearEnd?: string;
  formerNames: string[];
}

export interface Financials {
  revenue: YearValue[];
  netIncome: YearValue[];
  grossProfit: YearValue[];
  rnd: YearValue[];
  opIncome: YearValue[];
  assets: YearValue[];
  liabilities: YearValue[];
  equity: YearValue[];
  buybacks: YearValue[];
}

export interface WikiSummary {
  title: string;
  description?: string;
  extract: string;
  url: string;
}

export interface ResearchSignal {
  count: number;
  topWorks: { title: string; year?: number; venue?: string }[];
}
