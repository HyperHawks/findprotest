import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { ChatRoom } from "@/components/chat-room";
import { fetchParty, fetchPartyMemberCount, fetchMyPartyRole, joinParty, leaveParty } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "firebase/auth";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/parties/$id")({
  loader: async ({ params }) => {
    const p = await fetchParty(params.id);
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Party"} — Vanguard` },
      { name: "description", content: loaderData?.name ?? "Political party on Vanguard" },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-5xl font-black uppercase tracking-tighter">404</h1>
        <p className="mt-2 font-mono uppercase text-xs">Party not found</p>
        <Link to="/parties" className="mt-4 inline-block px-4 py-2 border-2 border-border bg-primary font-mono text-[11px] font-extrabold uppercase">
          Back to parties
        </Link>
      </div>
    </div>
  ),
  component: PartyDetail,
});

type TabId = "about" | "chat" | "members";

function PartyDetail() {
  const party = Route.useLoaderData();
  const qc = useQueryClient();
  const { user, isLeader } = useAuth();
  const [tab, setTab] = useState<TabId>("about");

  const isOwner = user?.uid === party.leader_id;

  const memberCount = useQuery({
    queryKey: ["party-members-count", party.id],
    queryFn: () => fetchPartyMemberCount(party.id),
  });

  const myRole = useQuery({
    queryKey: ["my-party-role", party.id, user?.uid],
    enabled: !!user,
    queryFn: () => fetchMyPartyRole(party.id, user!.uid),
  });

  const doJoin = useMutation({
    mutationFn: () => joinParty(party.id, user!.uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["party-members-count", party.id] });
      qc.invalidateQueries({ queryKey: ["my-party-role", party.id] });
    },
  });

  const doLeave = useMutation({
    mutationFn: () => leaveParty(party.id, user!.uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["party-members-count", party.id] });
      qc.invalidateQueries({ queryKey: ["my-party-role", party.id] });
    },
  });

  const isAdmin = isOwner || myRole.data === "admin";

  const tabs: { id: TabId; label: string }[] = [
    { id: "about", label: "About" },
    { id: "chat", label: "Chat" },
    { id: "members", label: `Members (${memberCount.data ?? 0})` },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-6xl mx-auto p-6 lg:p-10">
        <Link to="/parties" className="text-[11px] font-mono font-extrabold uppercase underline">← All parties</Link>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 border-2 border-border p-6 bg-card brutal-shadow">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="size-16 border-2 border-border bg-secondary grid place-items-center text-2xl font-black shrink-0">
                {party.logo_url ? (
                  <img src={party.logo_url} alt="" className="size-full object-cover" />
                ) : (
                  party.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">{party.name}</h1>
                {party.ideology && (
                  <div className="text-xs font-mono uppercase text-muted-foreground mt-1">{party.ideology}</div>
                )}
              </div>
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
            {tab === "about" && <AboutTab party={party} />}
            {tab === "chat" && (
              <ChatRoom entityType="party" entityId={party.id} user={user} isAdmin={isAdmin} />
            )}
            {tab === "members" && <MembersTab partyId={party.id} />}
          </div>

          {/* Sidebar */}
          <aside className="border-2 border-border p-6 bg-secondary space-y-4 h-fit">
            <div>
              <div className="text-[10px] font-mono font-extrabold uppercase">Supporters</div>
              <div className="text-4xl font-black tabular-nums">{memberCount.data ?? 0}</div>
            </div>
            {party.country_code && (
              <div>
                <div className="text-[10px] font-mono font-extrabold uppercase">Country</div>
                <div className="text-lg font-black">{party.country_code}</div>
              </div>
            )}
            {party.founding_date && (
              <div>
                <div className="text-[10px] font-mono font-extrabold uppercase">Founded</div>
                <div className="text-sm font-bold">{new Date(party.founding_date).toLocaleDateString()}</div>
              </div>
            )}
            {party.website && (
              <a
                href={party.website}
                target="_blank"
                rel="noreferrer"
                className="block text-[11px] font-mono font-extrabold uppercase underline"
              >
                Visit website →
              </a>
            )}

            {/* Join / Leave */}
            {user ? (
              myRole.data ? (
                <div className="space-y-2">
                  <div className="text-center py-2 border-2 border-border bg-primary font-mono text-[11px] font-extrabold uppercase">
                    You're a {myRole.data} ✓
                  </div>
                  {!isOwner && (
                    <button
                      onClick={() => doLeave.mutate()}
                      className="w-full py-2 border-2 border-border bg-danger font-mono text-[11px] font-extrabold uppercase"
                    >
                      Leave party
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => doJoin.mutate()}
                  className="w-full py-3 border-2 border-border bg-foreground text-background font-mono text-[11px] font-extrabold uppercase"
                >
                  Support this party
                </button>
              )
            ) : (
              <Link
                to="/auth"
                className="block text-center py-3 border-2 border-border bg-foreground text-background font-mono text-[11px] font-extrabold uppercase"
              >
                Sign in to join
              </Link>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function AboutTab({ party }: { party: ReturnType<typeof Route.useLoaderData> }) {
  return (
    <div className="space-y-4">
      <div
        className="prose prose-sm max-w-none [&_p]:my-2"
        dangerouslySetInnerHTML={{ __html: party.description_html || "<p><em>No description provided.</em></p>" }}
      />
    </div>
  );
}

function MembersTab({ partyId }: { partyId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["party-members-list", partyId],
    queryFn: async () => {
      const { data: members } = await supabase
        .from("party_members")
        .select("user_id, role, created_at")
        .eq("party_id", partyId)
        .order("role", { ascending: true })
        .order("created_at", { ascending: false });
      if (!members || members.length === 0) return [];

      const userIds = members.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p]));

      return members.map((m) => ({
        ...m,
        profile: profileMap.get(m.user_id) ?? null,
      }));
    },
  });

  if (isLoading) return <div className="text-sm font-mono uppercase text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-2">
      {(data ?? []).length === 0 && (
        <div className="text-sm font-mono uppercase text-muted-foreground">No members yet.</div>
      )}
      {(data ?? []).map((m) => (
        <div key={m.user_id} className="flex items-center gap-3 border-2 border-border p-3 bg-background">
          <div className="size-8 rounded-full bg-primary border-2 border-border grid place-items-center text-[10px] font-black">
            {(m.profile?.display_name ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-mono font-extrabold uppercase">{m.profile?.display_name ?? "Anonymous"}</div>
          </div>
          <span className={`text-[10px] font-mono font-extrabold uppercase px-2 py-1 border-2 border-border ${m.role === "admin" ? "bg-tertiary" : "bg-secondary/50"}`}>
            {m.role}
          </span>
        </div>
      ))}
    </div>
  );
}
