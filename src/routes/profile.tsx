import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Brain, Check } from "lucide-react";
import {
  getPersonalityContext,
  savePersonalityProfile,
  setTailoredEnabled,
} from "@/lib/personality.functions";
import {
  CLUSTER_BLURB,
  CLUSTER_LABEL,
  PERSUASIVE_BY_CLUSTER,
  type Cluster,
} from "@/lib/personality";
import { LIKERT_LABELS, TIPI_ITEMS, scoreTipi } from "@/lib/tipi";

const personalityQuery = queryOptions({
  queryKey: ["personality"],
  queryFn: () => getPersonalityContext(),
  staleTime: 0,
});

export const Route = createFileRoute("/profile")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(personalityQuery),
  component: ProfilePage,
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-10 text-sm text-destructive">Profile failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found</div>,
  head: () => ({
    meta: [
      { title: "Learner profile — MemoryTwin AI" },
      {
        name: "description",
        content:
          "A two-minute Big Five check that tailors how MemoryTwin explains each study recommendation to you.",
      },
      { property: "og:title", content: "Learner profile — MemoryTwin AI" },
      {
        property: "og:description",
        content:
          "Personality-tailored explanations for every study recommendation, based on the Big Five.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ProfilePage() {
  const { data } = useSuspenseQuery(personalityQuery);
  const router = useRouter();
  const save = useServerFn(savePersonalityProfile);
  const toggle = useServerFn(setTailoredEnabled);

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [mathConfidence, setMathConfidence] = useState(3);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Cluster | null>(null);

  const answered = Object.keys(answers).length;
  const complete = answered === TIPI_ITEMS.length;
  const current = data.profile;
  const shownCluster = result ?? (current?.cluster as Cluster | undefined) ?? null;

  async function onSubmit() {
    setSaving(true);
    try {
      const scores = scoreTipi(answers, mathConfidence);
      const res = await save({ data: scores });
      setResult(res.cluster as Cluster);
      await router.invalidate();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="font-serif text-sm font-semibold">Learner profile</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-serif text-4xl font-semibold">How should we explain your plan?</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          MemoryTwin already tells you <em>why</em> a topic is recommended using your
          mastery and memory-decay estimates. Research on tailored explainable
          recommendation (Takami et al., 2023) found that adding a second,
          personality-matched line meaningfully increases whether learners act on
          the recommendation. This ten-item Big Five check decides which second
          line you see. It never changes <em>what</em> is recommended — only how it's framed.
        </p>

        {shownCluster && (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="text-[11px] font-medium uppercase tracking-wide text-primary">
              Current profile
            </div>
            <div className="mt-1 font-serif text-2xl font-semibold">
              {CLUSTER_LABEL[shownCluster]}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{CLUSTER_BLURB[shownCluster]}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Persuasive style: <strong>{PERSUASIVE_BY_CLUSTER[shownCluster]}</strong>
            </p>
            {current && (
              <label className="mt-3 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  defaultChecked={current.tailored_enabled}
                  onChange={async (e) => {
                    await toggle({ data: { enabled: e.currentTarget.checked } });
                    await router.invalidate();
                  }}
                />
                Show tailored explanations on my study plan
              </label>
            )}
          </div>
        )}

        <section className="mt-8 space-y-3">
          <h2 className="font-serif text-xl font-semibold">
            I see myself as… <span className="text-sm font-normal text-muted-foreground">({answered}/{TIPI_ITEMS.length})</span>
          </h2>
          {TIPI_ITEMS.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm font-medium">{item.text}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {LIKERT_LABELS.map((label, i) => {
                  const value = i + 1;
                  const active = answers[item.id] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [item.id]: value }))}
                      className={
                        "rounded-full border px-2.5 py-1 text-[11px] transition " +
                        (active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary/50")
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium">How confident are you in science and maths?</div>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMathConfidence(v)}
                  className={
                    "rounded-full border px-3 py-1 text-[11px] transition " +
                    (mathConfidence === v
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary/50")
                  }
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">1 = not at all · 5 = very confident</p>
          </div>
        </section>

        <button
          type="button"
          disabled={!complete || saving}
          onClick={onSubmit}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          {saving ? "Scoring…" : current ? "Update my profile" : "Save my profile"}
        </button>

        <p className="mt-6 text-xs text-muted-foreground">
          Method: ten-item Big Five inventory (Gosling et al., 2003), scored to five
          trait means, then matched by nearest centroid to the three learner clusters
          published in Takami et al. (2023) — Diligent, Fearful, Agreeable. Peer and
          top-achiever counts come from a synthetic demo cohort; commitment counts use
          your real activity log.
        </p>
      </main>
    </div>
  );
}