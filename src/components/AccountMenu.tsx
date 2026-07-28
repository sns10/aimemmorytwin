import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Session-aware sign-in affordance for the app header. */
export function AccountMenu({ fallbackName }: { fallbackName: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setEmail(data.session?.user.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!ready) {
    return (
      <span className="rounded-sm border border-border bg-background px-2 py-1 text-primary">
        {fallbackName}
      </span>
    );
  }

  if (!email) {
    return (
      <Link
        to="/auth"
        className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2 py-1 text-primary hover:bg-accent"
      >
        <User className="h-3.5 w-3.5" /> Sign in
      </Link>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="rounded-sm border border-border bg-background px-2 py-1 text-primary normal-case tracking-normal">
        {email}
      </span>
      <button
        onClick={signOut}
        title="Sign out"
        className="inline-flex items-center gap-1.5 hover:text-primary"
      >
        <LogOut className="h-3.5 w-3.5" /> Out
      </button>
    </span>
  );
}
