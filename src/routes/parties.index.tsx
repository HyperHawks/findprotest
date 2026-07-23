import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { SiteHeader } from "@/components/site-header";
import { PaginationControls } from "@/components/pagination-controls";
import { SortGroupBar } from "@/components/sort-group-bar";
import { fetchParties } from "@/lib/queries";
import { useAuth } from "@/hooks/use-auth";

const search = z.object({
  country: z.string().optional(),
  ideology: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  sortBy: z.enum(["name", "supporter_count_cached", "founding_date", "created_at"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export const Route = createFileRoute("/parties/")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Political Parties — FINDPROTEST" },
      { name: "description", content: "Browse and support political parties on FINDPROTEST." },
      { property: "og:title", content: "Political Parties — FINDPROTEST" },
      { property: "og:description", content: "Browse and support political parties." },
    ],
  }),
  component: PartiesPage,
});

function PartiesPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/parties" });
  const { isLeader } = useAuth();

  const page = s.page ?? 1;
  const sortBy = s.sortBy ?? "created_at";
  const sortDir = s.sortDir ?? "desc";

  const q = useQuery({
    queryKey: ["parties", s],
    queryFn: () => fetchParties({
      country: s.country,
      ideology: s.ideology,
      page,
      pageSize: 12,
      sortBy,
      sortDir,
    }),
  });

  const setSearch = (patch: Partial<typeof s>) => navigate({ search: { ...s, ...patch } });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-6xl mx-auto p-6 lg:p-10">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Political Parties</h1>
            <p className="text-xs font-mono uppercase text-muted-foreground mt-1">
              Support a party · join the conversation
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isLeader && (
              <Link
                to="/parties/new"
                className="px-4 py-2 border-2 border-border bg-primary font-mono text-[11px] font-extrabold uppercase brutal-shadow"
              >
                + Create Party
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            value={s.country ?? ""}
            onChange={(e) => setSearch({ country: e.target.value.toUpperCase() || undefined, page: 1 })}
            placeholder="Country (ISO-2)"
            maxLength={2}
            className="border-2 border-border bg-background px-3 py-1.5 font-mono text-xs uppercase w-24"
          />
          <input
            value={s.ideology ?? ""}
            onChange={(e) => setSearch({ ideology: e.target.value || undefined, page: 1 })}
            placeholder="Ideology"
            className="border-2 border-border bg-background px-3 py-1.5 font-mono text-xs w-40"
          />
          {(s.country || s.ideology) && (
            <button
              type="button"
              onClick={() => navigate({ search: {} })}
              className="px-3 py-1.5 border-2 border-border bg-danger text-[10px] font-mono font-extrabold uppercase"
            >
              Clear
            </button>
          )}
        </div>

        <SortGroupBar
          sortOptions={[
            { value: "created_at", label: "Newest" },
            { value: "name", label: "Name" },
            { value: "supporter_count_cached", label: "Supporters" },
            { value: "founding_date", label: "Founded" },
          ]}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={(sb, sd) => setSearch({ sortBy: sb as typeof sortBy, sortDir: sd as typeof sortDir, page: 1 })}
        />

        {/* Party grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(q.data?.data ?? []).map((party) => (
            <Link
              key={party.id}
              to="/parties/$id"
              params={{ id: party.id }}
              className="border-2 border-border bg-card p-5 brutal-shadow hover:-translate-y-1 hover:-translate-x-1 transition-transform"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="size-12 border-2 border-border bg-secondary grid place-items-center text-lg font-black shrink-0">
                  {party.logo_url ? (
                    <img src={party.logo_url} alt="" className="size-full object-cover" />
                  ) : (
                    party.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-lg uppercase leading-tight truncate">{party.name}</h3>
                  {party.ideology && (
                    <div className="text-[10px] font-mono uppercase text-muted-foreground truncate">{party.ideology}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                {party.country_code && (
                  <span className="text-[10px] font-mono uppercase bg-white border-2 border-border px-1.5 py-0.5">
                    {party.country_code}
                  </span>
                )}
                <span className="text-[10px] font-mono font-extrabold uppercase">
                  {party.supporter_count_cached} supporters
                </span>
              </div>
            </Link>
          ))}
          {!q.isLoading && (q.data?.data ?? []).length === 0 && (
            <div className="col-span-full border-2 border-dashed border-border p-10 text-center text-sm font-mono uppercase">
              No parties yet. {isLeader ? "Create one!" : "Check back later."}
            </div>
          )}
        </div>

        <PaginationControls
          page={page}
          pageSize={12}
          total={q.data?.total ?? 0}
          onPageChange={(p) => setSearch({ page: p })}
        />
      </main>
    </div>
  );
}
