import { useEffect, useState } from "react";
import { X, ArrowRight, ArrowLeft, Brain, Sparkles } from "lucide-react";

const STORAGE_KEY = "memorytwin.onboarded.v1";

type Step = {
  eyebrow: string;
  title: string;
  body: React.ReactNode;
};

const STEPS: Step[] = [
  {
    eyebrow: "Welcome",
    title: "This is your Memory Twin.",
    body: (
      <>
        The 3D brain on the left is a live model of what you know. Every concept
        you study becomes a node on the cortex. Answer a question and the twin
        updates in real time.
      </>
    ),
  },
  {
    eyebrow: "Reading the brain",
    title: "Color = confidence. Size = mastery.",
    body: (
      <ul className="space-y-2">
        <li className="flex items-start gap-2">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "#0d0d0d", boxShadow: "0 0 8px #0d0d0d55" }} />
          <span><strong>Consolidated</strong> — mastery ≥ 80%. Safe in long-term memory.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "#a97b2c", boxShadow: "0 0 8px #a97b2c55" }} />
          <span><strong>Building</strong> — you've seen it, but it isn't stable yet.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "#8b1a1a", boxShadow: "0 0 8px #8b1a1a55" }} />
          <span><strong>Fading</strong> — recall probability dropped below 50% or the review is overdue. Pulse rate = urgency.</span>
        </li>
      </ul>
    ),
  },
  {
    eyebrow: "Two models, one twin",
    title: "Mastery vs. fading risk.",
    body: (
      <>
        <p>
          <strong>Mastery</strong> is Bayesian Knowledge Tracing — the probability you
          <em> know </em> the concept, updated every time you answer.
        </p>
        <p className="mt-2">
          <strong>Fading risk</strong> is the Ebbinghaus forgetting curve —
          R = e<sup>-t/S</sup>. Even a mastered concept fades if you don't revisit it.
          That's why nodes turn red over time.
        </p>
      </>
    ),
  },
  {
    eyebrow: "Your daily plan",
    title: "Four lanes, four jobs.",
    body: (
      <ul className="space-y-2">
        <li><strong>Learn</strong> — first exposure. Builds awareness of new concepts.</li>
        <li><strong>Practice</strong> — targeted questions that raise mastery on weak nodes.</li>
        <li><strong>Apply</strong> — mixed problems that turn mastery into transfer.</li>
        <li><strong>Review</strong> — spaced recall on the fading nodes, exactly when the curve says you'll forget.</li>
      </ul>
    ),
  },
  {
    eyebrow: "Ready",
    title: "Follow the top pick.",
    body: (
      <>
        The Study Plan on the right ranks every concept for you and highlights the
        single best next activity. Hover any "Fading fastest" card to locate that
        concept on the brain. You can reopen this tour from the header anytime.
      </>
    ),
  },
];

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch { /* ignore */ }
    const onOpen = () => { setStep(0); setOpen(true); };
    window.addEventListener("memorytwin:open-onboarding", onOpen);
    return () => window.removeEventListener("memorytwin:open-onboarding", onOpen);
  }, []);

  const close = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
  };

  if (!open) return null;
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg border border-border bg-card shadow-xl">
        <button
          onClick={close}
          aria-label="Close walkthrough"
          className="absolute right-3 top-3 rounded-sm p-1 text-muted-foreground transition hover:bg-secondary hover:text-primary"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-border px-6 py-3">
          <div className="flex items-center gap-2">
            {step === 0 ? <Sparkles className="h-3.5 w-3.5 text-primary" /> : <Brain className="h-3.5 w-3.5 text-primary" />}
            <span className="ink-caps text-primary">{s.eyebrow}</span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="px-6 py-5">
          <h3 className="font-serif text-2xl font-bold leading-tight text-primary">{s.title}</h3>
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/80">
            {s.body}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-secondary/50 px-6 py-3">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={"h-1 w-6 " + (i === step ? "bg-primary" : "bg-border")}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-1 border border-border bg-background px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-foreground transition hover:bg-secondary"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={close}
                className="inline-flex items-center gap-1 bg-primary px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-primary-foreground transition hover:bg-foreground"
              >
                Start studying <ArrowRight className="h-3 w-3" />
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1 bg-primary px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-primary-foreground transition hover:bg-foreground"
              >
                Next <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function openOnboarding() {
  window.dispatchEvent(new Event("memorytwin:open-onboarding"));
}