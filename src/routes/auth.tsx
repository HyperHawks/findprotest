import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Sign in — Vanguard" }, { name: "description", content: "Join Vanguard as a follower or leader." }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: displayName || email.split("@")[0] },
        },
      });
      setBusy(false);
      if (error) return setErr(error.message);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setErr(error.message);
    }
    navigate({ to: "/" });
  }

  async function google() {
    setErr(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return setErr(String(result.error));
    if (!result.redirected) navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-md mx-auto p-6 lg:p-10">
        <div className="border-2 border-border bg-card p-6 brutal-shadow">
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">
            {mode === "signin" ? "Sign in" : "Join Vanguard"}
          </h1>
          <p className="text-xs font-mono uppercase text-muted-foreground mb-6">
            Free follower account · upgrade to Leader anytime
          </p>

          <button
            type="button"
            onClick={google}
            className="w-full py-3 border-2 border-border bg-tertiary font-mono text-[11px] font-extrabold uppercase mb-4 brutal-shadow-sm"
          >
            Continue with Google
          </button>

          <div className="text-center text-[10px] font-mono uppercase text-muted-foreground my-4">— or —</div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                maxLength={60}
                className="w-full border-2 border-border bg-background px-3 py-2 font-bold"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full border-2 border-border bg-background px-3 py-2 font-mono"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (8+ chars)"
              minLength={8}
              required
              className="w-full border-2 border-border bg-background px-3 py-2 font-mono"
            />
            {err && <div className="border-2 border-border bg-danger p-2 text-xs font-mono">{err}</div>}
            <button
              disabled={busy}
              className="w-full py-3 border-2 border-border bg-foreground text-background font-mono text-[11px] font-extrabold uppercase disabled:opacity-50"
            >
              {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full mt-4 text-[11px] font-mono uppercase underline"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </div>
      </main>
    </div>
  );
}
