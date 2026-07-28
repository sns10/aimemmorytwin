import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  concept_id: z.string().uuid(),
  kind: z.enum(["impression", "click"]),
  lane: z.enum(["learn", "practice", "apply", "review"]),
  explanation_mode: z.enum(["tailored", "characteristic"]),
  persuasive_type: z.enum(["authority", "commitment", "peer"]).nullable().optional(),
  profile_cluster: z.string().nullable().optional(),
});

export const Route = createFileRoute("/api/rec-event")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        try {
          const { resolveStudent } = await import("@/lib/session.server");
          const { supabase, studentId } = await resolveStudent();
          await supabase.from("recommendation_events").insert({
            student_id: studentId,
            concept_id: parsed.concept_id,
            kind: parsed.kind,
            lane: parsed.lane,
            explanation_mode: parsed.explanation_mode,
            persuasive_type: parsed.persuasive_type ?? null,
            profile_cluster: parsed.profile_cluster ?? null,
          });
        } catch {
          // analytics must never break the app
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
