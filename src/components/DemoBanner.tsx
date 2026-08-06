import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { sessionQuery } from "@/lib/session-query";

/**
 * Every learner-facing number is either the signed-in student's own memory
 * model or the shared demo learner's. Make that unambiguous.
 */
export function DemoBanner({ className = "" }: { className?: string }) {
  const { data } = useQuery(sessionQuery);
  if (!data?.isDemo) return null;
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground ${className}`}
    >
      <Info className="h-3.5 w-3.5 text-primary" />
      <span>
        <strong className="font-semibold text-primary">Demo data</strong> — these
        curves belong to the sample learner.
      </span>
      <Link to="/auth" className="font-semibold text-primary underline underline-offset-2">
        Sign in to build your own memory model
      </Link>
    </div>
  );
}