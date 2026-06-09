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
  leaders?: Executive[]; // hand-verified C-suite for curated companies
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
  currency: string; // ISO code of the reporting currency (USD, EUR, JPY, …)
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

export interface FilingRef {
  form: string;
  date: string;
  accession: string;
  primaryDoc: string;
}

export interface Executive {
  name: string;
  title: string;
  photo?: string; // optional explicit headshot URL; otherwise an avatar is generated
}

export interface TenKSections {
  url: string;
  fiscalYear?: string;
  business?: string;
  competition?: string;
  competitors: string[]; // named competitor companies, if extractable
  products?: string; // Products / Products & Services subsection prose
  productList: string[]; // named products & services, if extractable
  customers?: string; // Customers subsection prose
  customerFacts: string[]; // customer-concentration facts (e.g. "X = 14% of revenue")
  risks?: string;
  riskHeadlines: string[];
  mda?: string;
  employees?: string;
  executives: Executive[];
}

/** a single legal subsidiary, parsed from a 10-K Exhibit 21 */
export interface Subsidiary {
  name: string;
  jurisdiction?: string;
}

/** a recursive node for the multi-level tree (org / product taxonomy) chart */
export interface TreeNode {
  label: string;
  sub?: string;
  children?: TreeNode[];
}
