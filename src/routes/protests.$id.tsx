import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { fetchProtest, fetchAttendeeCount } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/protests/$id")({
  loader: async ({ params }) => {
    const p = await fetchProtest(params.id);
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Protest"} — Vanguard` },
      { name: "description", content: loaderData?.title ?? "Protest details on Vanguard" },
      { property: "og:title", content: loaderData?.title ?? "Protest" },
      { property: "og:description", content: `${loaderData?.city ?? ""} · Intensity ${loaderData?.intensity}/5` },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center bg-background text-foreground p-6">
      <div className="border-2 border-border p-6 max-w-md">
        <h1 className="text-2xl font-black uppercase mb-2">Something broke</h1>
        <p className="text-sm font-mono">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-5xl font-black uppercase tracking-tighter">404</h1>
        <p className="mt-2 font-mono uppercase text-xs">Protest not found</p>
        <Link to="/protests" className="mt-4 inline-block px-4 py-2 border-2 border-border bg-primary font-mono text-[11px] font-extrabold uppercase">
          Back to protests
        </Link>
      </div>
    </div>
  ),
  component: ProtestDetail,
});

function ProtestDetail() {
  const p = Route.useLoaderData();
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
  }, []);

  const attendeeCount = useQuery({
    queryKey: ["attendees", p.id],
    queryFn: () => fetchAttendeeCount(p.id),
  });

  const going = useQuery({
    queryKey: ["attending", p.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("protest_attendees")
        .select("status")
        .eq("protest_id", p.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.status ?? null;
    },
  });

  const join = useMutation({
    mutationFn: async (status: "interested" | "going") => {
      if (!user) throw new Error("Sign in required");
      await supabase.from("protest_attendees").upsert({ protest_id: p.id, user_id: user.id, status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendees", p.id] });
      qc.invalidateQueries({ queryKey: ["attending", p.id] });
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-5xl mx-auto p-6 lg:p-10">
        <Link to="/protests" className="text-[11px] font-mono font-extrabold uppercase underline">← All protests</Link>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border-2 border-border p-6 bg-card brutal-shadow">
            <div className="flex justify-between items-start mb-4">
              <span
                className="px-2 py-1 border-2 border-border text-[10px] font-mono font-extrabold uppercase"
                style={{ background: `var(--protest-${p.intensity})` }}
              >
                Intensity {p.intensity}/5
              </span>
              <span className="text-[10px] font-mono font-extrabold uppercase border-2 border-border px-2 py-1">
                {p.status}
              </span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">{p.title}</h1>
            <div className="text-xs font-mono uppercase text-muted-foreground mb-6">
              {[p.city, p.region, p.country_code].filter(Boolean).join(" · ")}
              {" · "}
              {new Date(p.start_at).toLocaleString()}
            </div>
            <div
              className="prose prose-sm max-w-none [&_p]:my-2"
              dangerouslySetInnerHTML={{ __html: p.description_html || "<p><em>No description provided.</em></p>" }}
            />
            <div className="mt-6 flex flex-wrap gap-2">
              {(p.cause_tags ?? []).map((t) => (
                <span key={t} className="text-[10px] font-mono font-extrabold border-2 border-border px-2 py-1 uppercase bg-primary">
                  #{t}
                </span>
              ))}
            </div>
          </div>

          <aside className="border-2 border-border p-6 bg-secondary space-y-4">
            <div>
              <div className="text-[10px] font-mono font-extrabold uppercase">Attending</div>
              <div className="text-4xl font-black tabular-nums">{attendeeCount.data ?? 0}</div>
            </div>
            {user ? (
              <div className="space-y-2">
                <button
                  onClick={() => join.mutate("going")}
                  className={`w-full py-3 border-2 border-border font-mono text-[11px] font-extrabold uppercase ${going.data === "going" ? "bg-foreground text-background" : "bg-primary"}`}
                >
                  {going.data === "going" ? "You're going ✓" : "I'm going"}
                </button>
                <button
                  onClick={() => join.mutate("interested")}
                  className={`w-full py-3 border-2 border-border font-mono text-[11px] font-extrabold uppercase ${going.data === "interested" ? "bg-foreground text-background" : "bg-tertiary"}`}
                >
                  {going.data === "interested" ? "Interested ✓" : "Interested"}
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="block text-center py-3 border-2 border-border bg-foreground text-background font-mono text-[11px] font-extrabold uppercase"
              >
                Sign in to join
              </Link>
            )}
            <div className="pt-4 border-t-2 border-border text-[11px] font-mono font-bold uppercase leading-relaxed">
              Safety first. Bring water, ID, and know your legal rights. Report on-ground updates in the community feed.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
