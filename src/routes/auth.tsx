import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { supabase } from "@/integrations/supabase/client";

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
    // If they are already signed in, redirect them
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) navigate({ to: "/" });
    });
    return () => unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const name = displayName || email.split("@")[0];
        
        await updateProfile(user, { displayName: name });
        
        // Ensure profile exists in Supabase DB (Supabase handles custom JWT inserts if RLS permits)
        // Wait, for custom JWTs, we must manually create the profile row since there's no trigger.
        // We set the token so the client is authenticated for the insert.
        const token = await user.getIdToken();
        const { setSupabaseToken } = await import("@/integrations/supabase/client");
        setSupabaseToken(token);
        
        await supabase.from("profiles").upsert({
          id: user.uid,
          display_name: name,
        });

      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate({ to: "/" });
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1 grid place-items-center p-6">
        <div className="w-full max-w-md border-2 border-border bg-card p-6 md:p-10 brutal-shadow">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Vanguard</h1>
            <p className="font-mono text-[10px] font-extrabold uppercase text-muted-foreground">
              Identify yourself to continue
            </p>
          </div>

          {err && (
            <div className="mb-6 p-4 border-2 border-border bg-danger text-[11px] font-mono font-extrabold uppercase">
              {err}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <label className="block">
                <span className="block text-[11px] font-mono font-extrabold uppercase mb-2">Display Name</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border-2 border-border bg-background px-4 py-3 font-mono text-sm"
                  placeholder="Anonymous"
                />
              </label>
            )}
            <label className="block">
              <span className="block text-[11px] font-mono font-extrabold uppercase mb-2">Email *</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-border bg-background px-4 py-3 font-mono text-sm"
                placeholder="rebel@example.com"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-mono font-extrabold uppercase mb-2">Password *</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-border bg-background px-4 py-3 font-mono text-sm"
                placeholder="••••••••"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-4 border-2 border-border bg-foreground text-background font-mono text-[11px] font-extrabold uppercase hover:bg-primary transition-colors disabled:opacity-50 mt-4"
            >
              {busy ? "Processing..." : mode === "signin" ? "Sign in" : "Join Vanguard"}
            </button>
          </form>

          <div className="mt-8 text-center border-t-2 border-border pt-6">
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-[10px] font-mono font-extrabold uppercase hover:underline decoration-2 underline-offset-4"
            >
              {mode === "signin" ? "No ID yet? Create one →" : "← Already have an ID? Sign in"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
