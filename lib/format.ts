/**
 * number and money formatting helpers
 */

import type { YearValue } from "./types";

/**
 * given a USD number
 * return a compact human string like "$416.2B" or "$1.24T" or "$5.3M"
 */
export function usd(val: number | undefined | null): string {
  if (val === undefined || val === null || Number.isNaN(val)) return "n/a";
  const sign = val < 0 ? "-" : "";
  const n = Math.abs(val);
  if (n >= 1e12) return `${sign}$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${sign}$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${sign}$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${sign}$${(n / 1e3).toFixed(1)}K`;
  return `${sign}$${n.toFixed(0)}`;
}

/**
 * given a fraction like 0.469
 * return a percent string like "46.9%"
 */
export function pct(val: number | undefined | null, digits = 1): string {
  if (val === undefined || val === null || Number.isNaN(val)) return "n/a";
  return `${(val * 100).toFixed(digits)}%`;
}

/**
 * given two numbers
 * return the year-over-year growth string like "+14.0%" or "-3.4%"
 */
export function yoy(curr: number, prev: number): string {
  if (!prev) return "n/a";
  const g = (curr - prev) / Math.abs(prev);
  const sign = g >= 0 ? "+" : "";
  return `${sign}${(g * 100).toFixed(1)}%`;
}

/**
 * given a YearValue series
 * return the last n entries (most recent fiscal years), oldest first
 */
export function lastN(series: YearValue[], n: number): YearValue[] {
  return series.slice(-n);
}

/**
 * given a YearValue series
 * return the value for the most recent fiscal year, or undefined
 */
export function latest(series: YearValue[]): YearValue | undefined {
  return series.length ? series[series.length - 1] : undefined;
}

/**
 * given a series and a fiscal year
 * return the value for that year, or undefined
 */
export function valueFor(series: YearValue[], fy: number): number | undefined {
  return series.find((s) => s.fy === fy)?.val;
}
