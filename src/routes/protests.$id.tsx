import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { ChatRoom } from "@/components/chat-room";
import { fetchProtest, fetchAttendeeCount } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/protests/$id")({
  loader: async ({ params }) => {
    const p = await fetchProtest(params.id);
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Protest"} — FINDPROTEST` },
      { name: "description", content: loaderData?.title ?? "Protest details on FINDPROTEST" },
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

type TabId = "overview" | "chat" | "attendees";

function ProtestDetail() {
  const p = Route.useLoaderData();
  const qc = useQueryClient();
  const { user, isLeader } = useAuth();
  const [tab, setTab] = useState<TabId>("overview");

  const isOwner = user?.uid === p.leader_id;

  const attendeeCount = useQuery({
    queryKey: ["attendees", p.id],
    queryFn: () => fetchAttendeeCount(p.id),
  });

  const going = useQuery({
    queryKey: ["attending", p.id, user?.uid],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("protest_attendees")
        .select("status")
        .eq("protest_id", p.id)
        .eq("user_id", user!.uid)
        .maybeSingle();
      return data?.status ?? null;
    },
  });

  const join = useMutation({
    mutationFn: async (status: "interested" | "going") => {
      if (!user?.uid) throw new Error("Sign in required");
      await supabase.from("protest_attendees").upsert({ protest_id: p.id, user_id: user.uid, status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendees", p.id] });
      qc.invalidateQueries({ queryKey: ["attending", p.id] });
    },
  });

  const milestones = Array.isArray(p.milestones) ? (p.milestones as { title: string; date?: string; done?: boolean }[]) : [];

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "chat", label: "Chat" },
    { id: "attendees", label: `Attendees (${attendeeCount.data ?? 0})` },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-6xl mx-auto p-6 lg:p-10">
        <Link to="/protests" className="text-[11px] font-mono font-extrabold uppercase underline">← All protests</Link>

        {/* Header */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border-2 border-border p-6 bg-card brutal-shadow">
            <div className="flex flex-wrap justify-between items-start mb-4 gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-1 border-2 border-border text-[10px] font-mono font-extrabold uppercase"
                  style={{ background: `var(--protest-${p.intensity})` }}
                >
                  Intensity {p.intensity}/5
                </span>
                <span className={`px-2 py-1 border-2 border-border text-[10px] font-mono font-extrabold uppercase ${p.is_peaceful ? "bg-primary" : "bg-danger"}`}>
                  {p.is_peaceful ? "☮ Peaceful" : "⚠ Non-peaceful"}
                </span>
              </div>
              <span className="text-[10px] font-mono font-extrabold uppercase border-2 border-border px-2 py-1">
                {p.status}
              </span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">{p.title}</h1>
            {p.motto && (
              <p className="text-sm font-medium italic text-muted-foreground mb-4">"{p.motto}"</p>
            )}
            <div className="text-xs font-mono uppercase text-muted-foreground mb-4">
              {[p.city, p.region, p.country_code].filter(Boolean).join(" · ")}
              {" · "}
              {new Date(p.start_at).toLocaleString()}
              {p.end_at && ` → ${new Date(p.end_at).toLocaleString()}`}
            </div>

            {/* Tabs */}
            <div className="flex border-b-2 border-border mb-6">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 text-[11px] font-mono font-extrabold uppercase border-b-2 -mb-[2px] transition-colors ${
                    tab === t.id ? "border-foreground bg-foreground text-background" : "border-transparent hover:bg-secondary/30"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === "overview" && <OverviewTab p={p} milestones={milestones} />}
            {tab === "chat" && (
              <ChatRoom entityType="protest" entityId={p.id} user={user} isAdmin={isOwner || isLeader} />
            )}
            {tab === "attendees" && <AttendeesTab protestId={p.id} />}
          </div>

          {/* Sidebar */}
          <aside className="border-2 border-border p-6 bg-secondary space-y-4 h-fit">
            <div>
              <div className="text-[10px] font-mono font-extrabold uppercase">Attending</div>
              <div className="text-4xl font-black tabular-nums">{attendeeCount.data ?? 0}</div>
            </div>
            {p.rating != null && p.rating > 0 && (
              <div>
                <div className="text-[10px] font-mono font-extrabold uppercase">Rating</div>
                <div className="text-2xl font-black tabular-nums flex items-center gap-1">
                  {"★".repeat(Math.round(p.rating))}{"☆".repeat(5 - Math.round(p.rating))}
                  <span className="text-sm ml-1">{Number(p.rating).toFixed(1)}</span>
                </div>
              </div>
            )}
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

// ── Overview tab ─────────────────────────────────────────────────
function OverviewTab({ p, milestones }: { p: ReturnType<typeof Route.useLoaderData>; milestones: { title: string; date?: string; done?: boolean }[] }) {
  return (
    <div className="space-y-6">
      {/* Description */}
      <div
        className="prose prose-sm max-w-none [&_p]:my-2"
        dangerouslySetInnerHTML={{ __html: p.description_html || "<p><em>No description provided.</em></p>" }}
      />

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {p.how_to_join && (
          <DetailCard title="How to Join" content={p.how_to_join} />
        )}
        {p.arrival_info && (
          <DetailCard title="Arrival Info" content={p.arrival_info} />
        )}
        {p.location_name && (
          <DetailCard title="Location" content={p.location_name} />
        )}
        {p.what_to_bring.length > 0 && (
          <div className="border-2 border-border p-4 bg-secondary/20">
            <h4 className="text-[10px] font-mono font-extrabold uppercase mb-2 flex items-center gap-1">
              <span className="size-2 bg-foreground" /> What to Bring
            </h4>
            <ul className="space-y-1">
              {p.what_to_bring.map((item, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {p.services_available.length > 0 && (
          <div className="border-2 border-border p-4 bg-primary/10">
            <h4 className="text-[10px] font-mono font-extrabold uppercase mb-2 flex items-center gap-1">
              <span className="size-2 bg-foreground" /> Services Available
            </h4>
            <ul className="space-y-1">
              {p.services_available.map((item, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span className="text-primary font-bold">●</span> {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Plan of Action */}
      {p.plan_of_action_html && (
        <div className="border-2 border-border p-4 bg-tertiary/10">
          <h4 className="text-[10px] font-mono font-extrabold uppercase mb-3 flex items-center gap-1">
            <span className="size-2 bg-foreground" /> Plan of Action
          </h4>
          <div className="prose prose-sm max-w-none [&_p]:my-2" dangerouslySetInnerHTML={{ __html: p.plan_of_action_html }} />
        </div>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="border-2 border-border p-4">
          <h4 className="text-[10px] font-mono font-extrabold uppercase mb-3 flex items-center gap-1">
            <span className="size-2 bg-foreground" /> Milestones
          </h4>
          <div className="space-y-3">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`size-5 border-2 border-border grid place-items-center text-[10px] font-extrabold shrink-0 ${m.done ? "bg-primary" : "bg-background"}`}>
                  {m.done ? "✓" : i + 1}
                </div>
                <div>
                  <div className="text-sm font-bold">{m.title}</div>
                  {m.date && <div className="text-[10px] font-mono text-muted-foreground">{m.date}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personalities */}
      {p.personalities.length > 0 && (
        <div className="border-2 border-border p-4 bg-secondary/10">
          <h4 className="text-[10px] font-mono font-extrabold uppercase mb-3 flex items-center gap-1">
            <span className="size-2 bg-foreground" /> Public Personalities Involved
          </h4>
          <div className="flex flex-wrap gap-2">
            {p.personalities.map((name, i) => (
              <span key={i} className="px-3 py-1.5 border-2 border-border bg-card text-sm font-medium">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cause tags */}
      <div className="flex flex-wrap gap-2">
        {(p.cause_tags ?? []).map((t: string) => (
          <span key={t} className="text-[10px] font-mono font-extrabold border-2 border-border px-2 py-1 uppercase bg-primary">
            #{t}
          </span>
        ))}
      </div>
    </div>
  );
}

function DetailCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="border-2 border-border p-4">
      <h4 className="text-[10px] font-mono font-extrabold uppercase mb-2 flex items-center gap-1">
        <span className="size-2 bg-foreground" /> {title}
      </h4>
      <p className="text-sm">{content}</p>
    </div>
  );
}

// ── Attendees tab ────────────────────────────────────────────────
function AttendeesTab({ protestId }: { protestId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["attendees-list", protestId],
    queryFn: async () => {
      const { data: attendees } = await supabase
        .from("protest_attendees")
        .select("user_id, status, created_at")
        .eq("protest_id", protestId)
        .order("created_at", { ascending: false });
      if (!attendees || attendees.length === 0) return [];

      const userIds = attendees.map((a) => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p]));

      return attendees.map((a) => ({
        ...a,
        profile: profileMap.get(a.user_id) ?? null,
      }));
    },
  });

  if (isLoading) return <div className="text-sm font-mono uppercase text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-2">
      {(data ?? []).length === 0 && (
        <div className="text-sm font-mono uppercase text-muted-foreground">No attendees yet.</div>
      )}
      {(data ?? []).map((a) => (
        <div key={a.user_id} className="flex items-center gap-3 border-2 border-border p-3 bg-background">
          <div className="size-8 rounded-full bg-primary border-2 border-border grid place-items-center text-[10px] font-black">
            {(a.profile?.display_name ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-mono font-extrabold uppercase">{a.profile?.display_name ?? "Anonymous"}</div>
          </div>
          <span className={`text-[10px] font-mono font-extrabold uppercase px-2 py-1 border-2 border-border ${a.status === "going" ? "bg-primary" : "bg-tertiary"}`}>
            {a.status}
          </span>
        </div>
      ))}
    </div>
  );
}
