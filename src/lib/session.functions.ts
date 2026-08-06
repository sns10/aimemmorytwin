import { createServerFn } from "@tanstack/react-start";

export interface SessionInfo {
  isDemo: boolean;
  studentId: string;
  name: string;
  /** True when a signed-in learner has no memory model yet. */
  needsPlacement: boolean;
}

export const getSessionInfo = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionInfo> => {
    const { resolveStudent } = await import("./session.server");
    const { supabase, studentId, isDemo } = await resolveStudent();

    const [studentRes, statesRes] = await Promise.all([
      supabase
        .from("students")
        .select("name, placement_completed_at")
        .eq("id", studentId)
        .maybeSingle(),
      supabase
        .from("knowledge_states")
        .select("concept_id")
        .eq("student_id", studentId)
        .limit(1),
    ]);

    const hasStates = (statesRes.data ?? []).length > 0;
    const done = Boolean(studentRes.data?.placement_completed_at);
    return {
      isDemo,
      studentId,
      name: studentRes.data?.name ?? "Learner",
      needsPlacement: !isDemo && !done && !hasStates,
    };
  },
);