import { Suspense, useEffect, useMemo, useState, lazy } from "react";
import type { ConceptWithState } from "@/lib/memorytwin.functions";

// Three.js is browser-only — dynamically load the 3D scene after hydration.
const BrainScene = lazy(() => import("./BrainScene"));

export type BrainNode = {
  id: string;
  name: string;
  mastery: number;      // 0..1
  retention: number;    // 0..1 (R = exp(-days/stability))
  due: boolean;
};

function toNodes(concepts: ConceptWithState[]): BrainNode[] {
  const now = Date.now();
  return concepts.map((c) => {
    const last = c.state.last_reviewed_at
      ? new Date(c.state.last_reviewed_at).getTime()
      : null;
    const days = last ? Math.max(0, (now - last) / 86400000) : 0;
    const R = last
      ? Math.exp(-days / Math.max(0.25, c.state.memory_stability))
      : 0.5;
    return {
      id: c.id,
      name: c.name,
      mastery: c.state.mastery_probability,
      retention: Math.max(0, Math.min(1, R)),
      due: new Date(c.state.next_revision_at).getTime() <= now,
    };
  });
}

export function nodeColor(n: BrainNode): string {
  // Red-ink for at-risk / due; ink-black for strong mastery; gray for medium.
  if (n.due || n.retention < 0.5) return "#8b1a1a";
  if (n.mastery >= 0.8) return "#0d0d0d";
  if (n.mastery >= 0.5) return "#5b5b5b";
  return "#a97b2c"; // amber ink — building
}

export function BrainVisualization({
  concepts,
  activeId,
  onHover,
}: {
  concepts: ConceptWithState[];
  activeId?: string | null;
  onHover?: (id: string | null) => void;
}) {
  const nodes = useMemo(() => toNodes(concepts), [concepts]);
  const [hovered, setHovered] = useState<string | null>(null);
  const hydrated = useHydrated();
  const focus = activeId ?? hovered;
  const focusNode = nodes.find((n) => n.id === focus) ?? null;

  const activeCount = nodes.length;
  const avgRetention = nodes.length
    ? Math.round(
        (nodes.reduce((s, n) => s + n.retention, 0) / nodes.length) * 100,
      )
    : 0;
  const atRisk = nodes.filter((n) => n.retention < 0.5 || n.due).length;

  return (
    <div className="relative h-full w-full overflow-hidden bg-secondary/40">
      {/* subtle instrument grid */}
      <div className="paper-grid absolute inset-0" />

      {/* header label */}
      <div className="absolute left-6 top-6 z-10">
        <div className="ink-caps text-foreground/70">Visualization 01·A</div>
        <h2 className="mt-1 font-serif text-xl font-semibold text-primary">
          Cognitive Topology
        </h2>
      </div>

      {/* legend */}
      <div className="absolute right-6 top-6 z-10 flex flex-col gap-1.5 text-[10px] font-medium uppercase tracking-widest text-foreground/60">
        <LegendDot color="#0d0d0d" label="Consolidated" />
        <LegendDot color="#a97b2c" label="Building" />
        <LegendDot color="#8b1a1a" label="Fading" />
      </div>

      {/* the 3d canvas */}
      <div className="absolute inset-0">
        {hydrated && (
          <Suspense fallback={null}>
            <BrainScene
              nodes={nodes}
              focusId={focus}
              onHover={(id: string | null) => {
                setHovered(id);
                onHover?.(id);
              }}
            />
          </Suspense>
        )}
      </div>

      {/* hover tooltip pinned bottom-center */}
      {focusNode && (
        <div className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 rounded-sm border border-border bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground shadow-lg">
          {focusNode.name} · {Math.round(focusNode.mastery * 100)}% mastery ·{" "}
          {Math.round(focusNode.retention * 100)}% recall
        </div>
      )}

      {/* readouts */}
      <div className="absolute bottom-6 left-6 z-10 flex gap-8">
        <Readout label="Active Nodes" value={String(activeCount)} />
        <Readout label="Retention Avg" value={`${avgRetention}%`} />
        <Readout
          label="At Risk"
          value={String(atRisk)}
          tone={atRisk > 0 ? "warn" : undefined}
        />
      </div>

      <div className="absolute bottom-6 right-6 z-10 font-mono text-[9px] uppercase tracking-widest text-foreground/40">
        MEM_TWIN · REF_{concepts.length.toString().padStart(2, "0")}42 · SYNC_OK
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}55` }}
      />
      <span>{label}</span>
    </div>
  );
}

function Readout({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div>
      <div className="ink-caps text-foreground/50">{label}</div>
      <div
        className={
          "mt-0.5 font-serif text-2xl font-semibold " +
          (tone === "warn" ? "text-destructive" : "text-primary")
        }
      >
        {value}
      </div>
    </div>
  );
}

// Hydration gate — three.js must not render during SSR.
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}