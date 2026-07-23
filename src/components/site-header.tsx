import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const NAV = [
  { to: "/map", label: "Global Map" },
  { to: "/protests", label: "Protests" },
  { to: "/news", label: "News" },
  { to: "/feed", label: "Feed" },
  { to: "/pricing", label: "Leader" },
] as const;

export function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <>
      <div className="w-full bg-primary border-b-2 border-border py-2 px-4 overflow-hidden whitespace-nowrap">
        <div className="inline-flex gap-10 items-center text-[11px] font-mono font-extrabold uppercase tracking-tighter">
          <span className="flex items-center gap-2">
            <span className="size-2 bg-foreground animate-pulse" /> LIVE // GLOBAL PROTEST INDEX
          </span>
          <span>// USER-CONTRIBUTED + VERIFIED NEWS</span>
          <span>// COLOR = INTENSITY</span>
          <span>// LEAD YOUR MOVEMENT</span>
        </div>
      </div>
      <nav className="sticky top-0 z-50 bg-background border-b-2 border-border px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6 md:gap-10">
          <Link
            to="/"
            className="text-xl md:text-2xl font-black tracking-tighter uppercase italic bg-foreground text-background px-3 py-1"
          >
            Vanguard
          </Link>
          <div className="hidden md:flex gap-6 text-[11px] font-mono font-extrabold uppercase">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="hover:underline decoration-primary decoration-4 underline-offset-4"
                activeProps={{ className: "underline decoration-primary decoration-4 underline-offset-4" }}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/posts/new"
                className="hidden sm:inline-block px-4 py-2 text-[10px] font-mono font-extrabold border-2 border-border bg-tertiary uppercase tracking-tighter hover:brutal-shadow-sm"
              >
                New Post
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
                className="px-4 py-2 text-[10px] font-mono font-extrabold border-2 border-border bg-foreground text-background uppercase tracking-tighter"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 text-[10px] font-mono font-extrabold border-2 border-border bg-foreground text-background hover:bg-primary hover:text-foreground transition-colors uppercase tracking-tighter"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
