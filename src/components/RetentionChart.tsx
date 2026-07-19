import { useMemo, useState } from "react";
import type { ConceptWithState } from "@/lib/memorytwin.functions";

type Props = { concepts: ConceptWithState[] };

const WIDTH = 720;
const HEIGHT = 280;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };
const THRESHOLD = 0.8;
const DAYS = 14;

// Deterministic hue per concept (stable across renders)
function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function RetentionChart({ concepts }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const now = Date.now();
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const series = useMemo(() => {
    return concepts.map((c) => {
      const stability = Math.max(0.1, c.state.memory_stability);
      const last = c.state.last_reviewed_at
        ? new Date(c.state.last_reviewed_at).getTime()
        : now;
      const pts: { t: number; r: number }[] = [];
      // sample 60 points across the window
      for (let i = 0; i <= 60; i++) {
        const t = (i / 60) * DAYS; // days from now
        const elapsedDays = (now - last) / 86_400_000 + t;
        const r = Math.exp(-Math.max(0, elapsedDays) / stability);
        pts.push({ t, r });
      }
      // days until R crosses threshold (from now)
      const elapsedNow = (now - last) / 86_400_000;
      const tThreshold = Math.max(
        0,
        -stability * Math.log(THRESHOLD) - elapsedNow,
      );
      return {
        id: c.id,
        name: c.name,
        hue: hueFor(c.id),
        pts,
        tThreshold,
        stability,
      };
    });
  }, [concepts, now]);

  const xScale = (t: number) => PAD.left + (t / DAYS) * innerW;
  const yScale = (r: number) => PAD.top + (1 - r) * innerH;

  const thresholdY = yScale(THRESHOLD);

  // sort so most-at-risk is listed first
  const legend = [...series].sort((a, b) => a.tThreshold - b.tThreshold);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Forgetting curves</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Projected recall over the next {DAYS} days. The dashed line is the
            80% recall threshold — where a concept becomes worth reviewing.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full min-w-[560px]"
          role="img"
          aria-label="Forgetting curves for each concept"
        >
          {/* y grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((r) => (
            <g key={r}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={yScale(r)}
                y2={yScale(r)}
                stroke="currentColor"
                className="text-border"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={yScale(r)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {Math.round(r * 100)}%
              </text>
            </g>
          ))}

          {/* x ticks */}
          {[0, 3, 7, 10, 14].map((d) => (
            <g key={d}>
              <line
                x1={xScale(d)}
                x2={xScale(d)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                stroke="currentColor"
                className="text-border/60"
                strokeDasharray="2 4"
                strokeWidth={1}
              />
              <text
                x={xScale(d)}
                y={HEIGHT - PAD.bottom + 14}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {d === 0 ? "today" : `+${d}d`}
              </text>
            </g>
          ))}

          {/* 80% threshold */}
          <g className="text-primary">
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={thresholdY}
              y2={thresholdY}
              stroke="currentColor"
              strokeDasharray="4 4"
              strokeWidth={1.25}
              opacity={0.75}
            />
            <text
              x={WIDTH - PAD.right}
              y={thresholdY - 4}
              textAnchor="end"
              fill="currentColor"
              className="text-[10px] font-medium"
            >
              80% recall
            </text>
          </g>

          {/* curves */}
          {series.map((s) => {
            const isDim = hoverId !== null && hoverId !== s.id;
            const d = s.pts
              .map(
                (p, i) =>
                  `${i === 0 ? "M" : "L"} ${xScale(p.t).toFixed(1)} ${yScale(p.r).toFixed(1)}`,
              )
              .join(" ");
            return (
              <path
                key={s.id}
                d={d}
                fill="none"
                stroke={`hsl(${s.hue} 65% 45%)`}
                strokeWidth={hoverId === s.id ? 2.5 : 1.75}
                opacity={isDim ? 0.15 : 0.9}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </svg>
      </div>

      {/* legend */}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {legend.map((s) => {
          const label =
            s.tThreshold <= 0
              ? "below threshold now"
              : s.tThreshold < 1
                ? `crosses in <1 day`
                : `crosses in ${s.tThreshold.toFixed(1)} days`;
          return (
            <li
              key={s.id}
              onMouseEnter={() => setHoverId(s.id)}
              onMouseLeave={() => setHoverId(null)}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2 text-xs hover:bg-accent/30"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: `hsl(${s.hue} 65% 45%)` }}
                />
                <span className="truncate font-medium">{s.name}</span>
              </span>
              <span className="shrink-0 text-muted-foreground">{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}