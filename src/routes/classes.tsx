import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Users, Plus, LogIn, Copy, Check } from "lucide-react";
import { getMyClasses, createClass, joinClass } from "@/lib/class.functions";

const classesQuery = queryOptions({
  queryKey: ["my-classes"],
  queryFn: () => getMyClasses(),
  staleTime: 0,
});

export const Route = createFileRoute("/classes")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(classesQuery),
  component: ClassesPage,
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-10 text-sm text-destructive">Classes failed: {error.message}</div>
  ),
  head: () => ({ meta: [{ title: "Classes — MemoryTwin AI" }] }),
});

function ClassesPage() {
  const { data } = useSuspenseQuery(classesQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const create = useServerFn(createClass);
  const join = useServerFn(joinClass);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function onCreate() {
    if (name.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      await create({ data: { name: name.trim() } });
      setName("");
      await qc.invalidateQueries({ queryKey: ["my-classes"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the class");
    } finally {
      setBusy(false);
    }
  }

  async function onJoin() {
    if (code.trim().length < 4) return;
    setBusy(true);
    setError(null);
    try {
      await join({ data: { code: code.trim() } });
      setCode("");
      await qc.invalidateQueries({ queryKey: ["my-classes"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join that class");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" /> Classes
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 p-6">
        {data.isDemo ? (
          <section className="rounded-lg border border-border bg-card p-6">
            <h1 className="text-lg">Viewing as a guest</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The sample class below is open to everyone, so you can see what a teacher sees.
              Creating a class or joining one with a code needs an account.
            </p>
            {data.classes.map((c) => (
              <Link
                key={c.id}
                to="/class/$id"
                params={{ id: c.id }}
                className="mt-4 flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm hover:border-primary"
              >
                <span>
                  {c.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {c.member_count} student{c.member_count === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="text-xs text-primary">Open the teacher view &rarr;</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={() => navigate({ to: "/auth" })}
              className="mt-4 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
            >
              Sign in
            </button>
          </section>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="rounded-lg border border-border bg-card p-4">
                <h2 className="text-sm">Join a class</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter the six-character code your teacher gave you.
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ABC234"
                    maxLength={8}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 font-mono text-sm tracking-widest"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onJoin}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    <LogIn className="h-3.5 w-3.5" /> Join
                  </button>
                </div>
              </section>

              <section className="rounded-lg border border-border bg-card p-4">
                <h2 className="text-sm">Create a class</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  You become its teacher and get a code to share.
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Class 10 — Chemistry"
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onCreate}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Create
                  </button>
                </div>
              </section>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm">Your classes</h2>
              {data.classes.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Nothing yet. Join one with a code, or create one.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {data.classes.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/class/$id"
                          params={{ id: c.id }}
                          className="text-sm hover:text-primary"
                        >
                          {c.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {c.is_teacher ? "You teach this" : "You are a member"} · {c.member_count}{" "}
                          student{c.member_count === 1 ? "" : "s"}
                        </p>
                      </div>
                      {c.join_code && (
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard?.writeText(c.join_code!);
                            setCopied(c.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-xs"
                        >
                          {copied === c.id ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {c.join_code}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
