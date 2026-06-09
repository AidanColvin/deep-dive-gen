/**
 * helpers that emit a ```chart fenced code block carrying a JSON spec.
 * MarkdownArticle intercepts these blocks and renders SVG/HTML charts.
 */

type Series = { name: string; values: number[]; color?: string };
type Slice = { label: string; value: number; color?: string };
type Node = { label: string; sub?: string };
type TreeNode = { label: string; sub?: string; children?: TreeNode[] };

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

/**
 * emit a multi-level tree (recursive). used for the corporate
 * parent → subsidiaries structure and the product/service taxonomy.
 */
export function treeChart(title: string, root: TreeNode): string {
  return block({ type: "tree", title, root });
}
