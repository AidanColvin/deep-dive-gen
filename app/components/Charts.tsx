"use client";

/**
 * dependency-free SVG/HTML charts rendered from a JSON spec embedded in the
 * report markdown as a ```chart code block. supports line, bar, pie/donut,
 * and a leadership hierarchy (org chart).
 */

type Series = { name: string; values: number[]; color?: string };
type Slice = { label: string; value: number; color?: string };
type Node = { label: string; sub?: string };
type TreeNode = { label: string; sub?: string; children?: TreeNode[] };

export type ChartSpec =
  | { type: "line"; title?: string; x: string[]; series: Series[]; unit?: string }
  | { type: "bar"; title?: string; x: string[]; series: Series[]; unit?: string }
  | { type: "pie" | "donut"; title?: string; slices: Slice[]; unit?: string }
  | { type: "hierarchy"; title?: string; root: Node; children: Node[] }
  | { type: "tree"; title?: string; root: TreeNode };

const PALETTE = [
  "#4f46e5", "#0071e3", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b",
];

function fmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 1000) return (v / 1000).toFixed(1) + "k";
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(0);
  return v.toFixed(1);
}

export default function Chart({ spec }: { spec: ChartSpec }) {
  switch (spec.type) {
    case "tree":
      return <Tree spec={spec} />;
    case "hierarchy":
      return <Hierarchy spec={spec} />;
    case "pie":
    case "donut":
      return <Pie spec={spec} />;
    case "bar":
      return <BarLine spec={spec} kind="bar" />;
    case "line":
      return <BarLine spec={spec} kind="line" />;
    default:
      return null;
  }
}

/* ------------------------------ line & bar ------------------------------ */

function BarLine({
  spec,
  kind,
}: {
  spec: Extract<ChartSpec, { type: "line" | "bar" }>;
  kind: "line" | "bar";
}) {
  const W = 620;
  const H = 300;
  const m = { l: 46, r: 16, t: 12, b: 34 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;

  const all = spec.series.flatMap((s) => s.values);
  const max = Math.max(...all, 0);
  const min = Math.min(...all, 0);
  const span = max - min || 1;
  const y = (v: number) => m.t + ph - ((v - min) / span) * ph;

  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => min + (span * i) / ticks);

  const n = spec.x.length;
  const xLine = (i: number) => (n <= 1 ? m.l + pw / 2 : m.l + (i * pw) / (n - 1));
  const groupW = pw / Math.max(n, 1);

  return (
    <figure className="chart">
      {spec.title && <figcaption className="chart-title">{spec.title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img">
        {gridVals.map((gv, i) => (
          <g key={i}>
            <line className="chart-grid" x1={m.l} x2={W - m.r} y1={y(gv)} y2={y(gv)} />
            <text className="chart-axis" x={m.l - 6} y={y(gv) + 3} textAnchor="end">
              {fmt(gv)}
            </text>
          </g>
        ))}

        {kind === "bar"
          ? spec.series.map((s, si) =>
              s.values.map((v, i) => {
                const bw = (groupW * 0.7) / spec.series.length;
                const bx = m.l + i * groupW + groupW * 0.15 + si * bw;
                const h = Math.abs(y(v) - y(0));
                return (
                  <rect
                    key={`${si}-${i}`}
                    x={bx}
                    y={Math.min(y(v), y(0))}
                    width={Math.max(bw - 2, 1)}
                    height={Math.max(h, 1)}
                    rx={1.5}
                    fill={s.color || PALETTE[si % PALETTE.length]}
                  />
                );
              }),
            )
          : spec.series.map((s, si) => {
              const color = s.color || PALETTE[si % PALETTE.length];
              const pts = s.values.map((v, i) => `${xLine(i)},${y(v)}`).join(" ");
              return (
                <g key={si}>
                  <polyline className="chart-line" points={pts} stroke={color} />
                  {s.values.map((v, i) => (
                    <circle key={i} cx={xLine(i)} cy={y(v)} r={3.2} fill={color} />
                  ))}
                </g>
              );
            })}

        {spec.x.map((lbl, i) => (
          <text
            key={i}
            className="chart-axis"
            x={kind === "bar" ? m.l + i * groupW + groupW / 2 : xLine(i)}
            y={H - 12}
            textAnchor="middle"
          >
            {lbl}
          </text>
        ))}
      </svg>
      {spec.series.length > 1 && (
        <div className="chart-legend">
          {spec.series.map((s, si) => (
            <span key={si} className="chart-key">
              <i style={{ background: s.color || PALETTE[si % PALETTE.length] }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}

/* --------------------------------- pie ---------------------------------- */

function Pie({ spec }: { spec: Extract<ChartSpec, { type: "pie" | "donut" }> }) {
  const total = spec.slices.reduce((a, s) => a + s.value, 0) || 1;
  const cx = 110;
  const cy = 110;
  const r = 100;
  const inner = spec.type === "donut" ? 56 : 0;
  let angle = -Math.PI / 2;

  const arcs = spec.slices.map((s, i) => {
    const frac = s.value / total;
    const a0 = angle;
    const a1 = angle + frac * Math.PI * 2;
    angle = a1;
    const color = s.color || PALETTE[i % PALETTE.length];
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    let d: string;
    if (inner > 0) {
      const ix0 = cx + inner * Math.cos(a1);
      const iy0 = cy + inner * Math.sin(a1);
      const ix1 = cx + inner * Math.cos(a0);
      const iy1 = cy + inner * Math.sin(a0);
      d = `M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} L${ix0} ${iy0} A${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1} Z`;
    } else {
      d = `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
    }
    return { d, color, pct: frac * 100 };
  });

  return (
    <figure className="chart">
      {spec.title && <figcaption className="chart-title">{spec.title}</figcaption>}
      <div className="chart-pie-wrap">
        <svg viewBox="0 0 220 220" className="chart-pie" role="img">
          {arcs.map((a, i) => (
            <path key={i} d={a.d} fill={a.color} stroke="#fff" strokeWidth={1.5} />
          ))}
        </svg>
        <div className="chart-legend chart-legend-col">
          {spec.slices.map((s, i) => (
            <span key={i} className="chart-key">
              <i style={{ background: s.color || PALETTE[i % PALETTE.length] }} />
              {s.label}
              <b>{((s.value / total) * 100).toFixed(0)}%</b>
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

/* --------------------------- multi-level tree --------------------------- */

function Tree({ spec }: { spec: Extract<ChartSpec, { type: "tree" }> }) {
  return (
    <figure className="chart">
      {spec.title && <figcaption className="chart-title">{spec.title}</figcaption>}
      <div className="tree-scroll">
        <TreeBox node={spec.root} depth={0} />
      </div>
    </figure>
  );
}

function TreeBox({ node, depth }: { node: TreeNode; depth: number }) {
  const kids = node.children ?? [];
  const allLeaves = kids.length > 0 && kids.every((k) => !(k.children && k.children.length));
  const boxClass =
    depth === 0 ? "tree-box tree-box-root" : `tree-box tree-box-l${Math.min(depth, 2)}`;
  return (
    <div className="tree-node">
      <div className={boxClass}>
        <div className="tree-label">{node.label}</div>
        {node.sub && <div className="tree-sub">{node.sub}</div>}
      </div>
      {kids.length === 0 ? null : allLeaves ? (
        // terminal children stack as a vertical chain — keeps wide groups legible
        <div className="tree-leaves">
          {kids.map((c, i) => (
            <div key={i} className="tree-leaf">
              {c.label}
              {c.sub && <span className="tree-leaf-sub"> · {c.sub}</span>}
            </div>
          ))}
        </div>
      ) : (
        <div className="tree-children">
          {kids.map((c, i) => (
            <TreeBox key={i} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ hierarchy ------------------------------- */

function Hierarchy({ spec }: { spec: Extract<ChartSpec, { type: "hierarchy" }> }) {
  return (
    <figure className="chart">
      {spec.title && <figcaption className="chart-title">{spec.title}</figcaption>}
      <div className="org">
        <div className="org-root">
          <div className="org-name">{spec.root.label}</div>
          {spec.root.sub && <div className="org-sub">{spec.root.sub}</div>}
        </div>
        {spec.children.length > 0 && (
          <>
            <div className="org-stem" />
            <div className="org-children">
              {spec.children.map((c, i) => (
                <div key={i} className="org-node">
                  <div className="org-name">{c.label}</div>
                  {c.sub && <div className="org-sub">{c.sub}</div>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </figure>
  );
}
