import { BookOpen, Dumbbell, Feather, Trophy, RotateCcw } from "lucide-react";
import { type Stage, stageLabel } from "@/lib/stage";

const STYLES: Record<Stage, { cls: string; icon: React.ReactNode }> = {
  learn:    { cls: "bg-muted text-muted-foreground",          icon: <BookOpen className="h-3 w-3" /> },
  practice: { cls: "bg-primary/10 text-primary",              icon: <Dumbbell className="h-3 w-3" /> },
  apply:    { cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300", icon: <Feather className="h-3 w-3" /> },
  master:   { cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", icon: <Trophy className="h-3 w-3" /> },
  review:   { cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300", icon: <RotateCcw className="h-3 w-3" /> },
};

export function StageBadge({ stage, className = "" }: { stage: Stage; className?: string }) {
  const s = STYLES[stage];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${s.cls} ${className}`}
    >
      {s.icon}
      {stageLabel(stage)}
    </span>
  );
}