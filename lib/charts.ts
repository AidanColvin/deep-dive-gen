/**
 * helpers that emit a ```chart fenced code block carrying a JSON spec.
 * MarkdownArticle intercepts these blocks and renders SVG/HTML charts.
 */

type Series = { name: string; values: number[]; color?: string };
type Slice = { label: string; value: number; color?: string };
type Node = { label: string; sub?: string };

function block(spec: Record<string, unknown>): string {
  return "```chart\n" + JSON.stringify(spec) + "\n```\n";
}

export function lineChart(
  title: string,
  x: string[],
  series: Series[],
  unit?: string,
): string {
  return block({ type: "line", title, x, series, unit });
}

export function barChart(
  title: string,
  x: string[],
  series: Series[],
  unit?: string,
): string {
  return block({ type: "bar", title, x, series, unit });
}

export function donutChart(title: string, slices: Slice[]): string {
  return block({ type: "donut", title, slices });
}

export function pieChart(title: string, slices: Slice[]): string {
  return block({ type: "pie", title, slices });
}

export function hierarchyChart(
  title: string,
  root: Node,
  children: Node[],
): string {
  return block({ type: "hierarchy", title, root, children });
}
