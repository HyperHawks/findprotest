import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { SiteHeader } from "@/components/site-header";
import { PaginationControls } from "@/components/pagination-controls";
import { SortGroupBar } from "@/components/sort-group-bar";
import { fetchProtestsPaginated, type Protest } from "@/lib/queries";
import { CAUSE_TAGS } from "@/lib/protest-colors";

const search = z.object({
  country: z.string().optional(),
  cause: z.string().optional(),
  status: z.enum(["upcoming", "active", "ended", "cancelled"]).optional(),
  minIntensity: z.coerce.number().min(1).max(5).optional(),
  page: z.coerce.number().min(1).optional(),
  sortBy: z.enum(["start_at", "intensity", "title", "country_code"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  groupBy: z.enum(["country_code", "cause", "status"]).optional(),
});

export const Route = createFileRoute("/protests/")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Protests — FINDPROTEST" },
      { name: "description", content: "Browse and filter protests worldwide by country, cause, status, and intensity." },
      { property: "og:title", content: "Protests — FINDPROTEST" },
      { property: "og:description", content: "Browse and filter protests worldwide." },
    ],
  }),
  component: ProtestsPage,
});

function ProtestsPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/protests" });

  const page = s.page ?? 1;
  const sortBy = s.sortBy ?? "start_at";
  const sortDir = s.sortDir ?? "desc";

  const q = useQuery({
    queryKey: ["protests", s],
    queryFn: () => fetchProtestsPaginated({
      country: s.country,
      cause: s.cause,
      status: s.status,
      minIntensity: s.minIntensity,
      page,
      pageSize: 12,
      sortBy,
      sortDir,
    }),
  });

  const setSearch = (patch: Partial<typeof s>) => navigate({ search: { ...s, ...patch } });

  // Group items if groupBy is set
  const items = q.data?.data ?? [];
  const grouped = s.groupBy ? groupItems(items, s.groupBy) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="grid grid-cols-1 lg:grid-cols-12">
        <aside className="lg:col-span-3 border-r-0 lg:border-r-2 border-border p-6 bg-secondary/10 space-y-8">
          <h2 className="text-xl font-black uppercase">Filters</h2>

          <Field label="Country (ISO-2)">
            <input
              value={s.country ?? ""}
              onChange={(e) => setSearch({ country: e.target.value.toUpperCase() || undefined, page: 1 })}
              placeholder="e.g. US, DE"
              maxLength={2}
              className="w-full border-2 border-border bg-background px-3 py-2 font-mono text-sm uppercase"
            />
          </Field>

          <Field label="Cause">
            <select
              value={s.cause ?? ""}
              onChange={(e) => setSearch({ cause: e.target.value || undefined, page: 1 })}
              className="w-full border-2 border-border bg-background px-3 py-2 font-mono text-xs uppercase"
            >
              <option value="">All causes</option>
              {CAUSE_TAGS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <div className="flex flex-wrap gap-2">
              {(["upcoming", "active", "ended"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSearch({ status: s.status === st ? undefined : st, page: 1 })}
                  className={`px-3 py-1.5 border-2 border-border text-[10px] font-mono font-extrabold uppercase ${s.status === st ? "bg-foreground text-background" : "bg-background"}`}
                >
                  {st}
                </button>
              ))}
            </div>
          </Field>

          <Field label={`Min intensity: ${s.minIntensity ?? 1}`}>
            <input
              type="range"
              min={1}
              max={5}
              value={s.minIntensity ?? 1}
              onChange={(e) => setSearch({ minIntensity: Number(e.target.value), page: 1 })}
              className="w-full"
            />
          </Field>

          <button
            type="button"
            onClick={() => navigate({ search: {} })}
            className="w-full py-2 border-2 border-border bg-danger font-mono text-[11px] font-extrabold uppercase"
          >
            Reset filters
          </button>
        </aside>

        <section className="lg:col-span-9 p-6">
          <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
            <h1 className="text-4xl font-black uppercase tracking-tighter">Protests</h1>
            <span className="text-[11px] font-mono uppercase">{q.data?.total ?? 0} results</span>
          </div>

          <SortGroupBar
            sortOptions={[
              { value: "start_at", label: "Date" },
              { value: "intensity", label: "Intensity" },
              { value: "title", label: "Title" },
              { value: "country_code", label: "Country" },
            ]}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={(sb, sd) => setSearch({ sortBy: sb as typeof sortBy, sortDir: sd as typeof sortDir, page: 1 })}
            groupOptions={[
              { value: "country_code", label: "Country" },
              { value: "status", label: "Status" },
            ]}
            groupBy={s.groupBy}
            onGroupChange={(g) => setSearch({ groupBy: g as typeof s.groupBy })}
          />

          {grouped ? (
            // Grouped view
            <div className="space-y-8">
              {Object.entries(grouped).map(([group, protests]) => (
                <div key={group}>
                  <h3 className="text-lg font-black uppercase mb-3 flex items-center gap-2">
                    <span className="size-3 bg-primary" />
                    {group || "Unknown"}
                    <span className="text-[10px] font-mono font-normal ml-2">({protests.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {protests.map((p) => <ProtestCard key={p.id} p={p} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Flat grid
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {items.map((p) => <ProtestCard key={p.id} p={p} />)}
              {!q.isLoading && items.length === 0 && (
                <div className="col-span-full border-2 border-dashed border-border p-10 text-center text-sm font-mono uppercase">
                  No protests match your filters.
                </div>
              )}
            </div>
          )}

          <PaginationControls
            page={page}
            pageSize={12}
            total={q.data?.total ?? 0}
            onPageChange={(p) => setSearch({ page: p })}
          />
        </section>
      </main>
    </div>
  );
}

function ProtestCard({ p }: { p: Protest }) {
  return (
    <Link
      to="/protests/$id"
      params={{ id: p.id }}
      className="border-2 border-border bg-card p-5 brutal-shadow hover:-translate-y-1 hover:-translate-x-1 transition-transform"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-1.5">
          <span
            className="px-2 py-1 border-2 border-border text-[10px] font-mono font-extrabold uppercase"
            style={{ background: `var(--protest-${p.intensity})` }}
          >
            L{p.intensity}
          </span>
          <span className={`px-1.5 py-0.5 border border-border text-[9px] font-mono font-extrabold uppercase ${p.is_peaceful ? "bg-primary" : "bg-danger"}`}>
            {p.is_peaceful ? "☮" : "⚠"}
          </span>
        </div>
        <span className="text-[10px] font-mono uppercase bg-white border-2 border-border px-1.5 py-0.5">
          {p.country_code}
        </span>
      </div>
      <h3 className="font-black text-lg uppercase leading-tight mb-2">{p.title}</h3>
      <div className="text-xs font-mono uppercase text-muted-foreground">
        {p.city ?? ""} {p.status ? `· ${p.status}` : ""}
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {(p.cause_tags ?? []).slice(0, 3).map((t) => (
          <span key={t} className="text-[9px] font-mono font-extrabold border border-border px-1.5 py-0.5 uppercase">
            #{t}
          </span>
        ))}
      </div>
    </Link>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-mono font-extrabold uppercase mb-2 flex items-center gap-2">
        <span className="size-2 bg-foreground" /> {label}
      </span>
      {children}
    </label>
  );
}

function groupItems(items: Protest[], by: string): Record<string, Protest[]> {
  const groups: Record<string, Protest[]> = {};
  for (const item of items) {
    const key = by === "country_code" ? item.country_code : by === "status" ? item.status : "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}
