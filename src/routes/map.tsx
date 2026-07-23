import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { SiteHeader } from "@/components/site-header";
import { WorldChoropleth, IntensityLegend } from "@/components/world-choropleth";
import { PaginationControls } from "@/components/pagination-controls";
import { fetchCountryStats, fetchProtestsPaginated } from "@/lib/queries";

const search = z.object({
  country: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
});

export const Route = createFileRoute("/map")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Global Map — Vanguard" },
      { name: "description", content: "Interactive world protest choropleth. Click any country to drill in." },
      { property: "og:title", content: "Global Map — Vanguard" },
      { property: "og:description", content: "Interactive world protest choropleth." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/map" });
  const stats = useQuery({ queryKey: ["country-stats"], queryFn: fetchCountryStats });
  const page = s.page ?? 1;
  
  const protests = useQuery({
    queryKey: ["protests-map", s.country, page],
    queryFn: () => fetchProtestsPaginated({ country: s.country, page, pageSize: 20 }),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="grid grid-cols-1 lg:grid-cols-12">
        <section className="lg:col-span-8 border-r-0 lg:border-r-2 border-border p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">Global Intensity Map</h1>
              <p className="text-xs font-mono uppercase text-muted-foreground">
                {s.country ? `Zoomed into ${s.country} · Click map to explore` : "Click a country to zoom in"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <IntensityLegend />
              {s.country && (
                <button
                  type="button"
                  className="px-3 py-2 border-2 border-border bg-danger text-[10px] font-mono font-extrabold uppercase"
                  onClick={() => navigate({ search: {} })}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <WorldChoropleth
            stats={stats.data ?? []}
            selectedCountry={s.country}
            protests={protests.data?.data}
            onCountryClick={(alpha2) => {
              if (alpha2 && alpha2 !== s.country) {
                navigate({ search: { country: alpha2, page: 1 } });
              } else {
                navigate({ search: {} });
              }
            }}
          />
        </section>
        <aside className="lg:col-span-4 p-4 md:p-6 bg-card">
          <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
            <span className="size-2 bg-foreground animate-pulse" />
            {s.country ? `Protests in ${s.country}` : "Latest worldwide"}
          </h2>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {(protests.data?.data ?? []).map((p) => (
              <Link
                key={p.id}
                to="/protests/$id"
                params={{ id: p.id }}
                className="block border-2 border-border p-4 bg-background hover:brutal-shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className="text-[10px] font-mono font-extrabold uppercase border-2 border-border px-1.5 py-0.5"
                    style={{ background: `var(--protest-${p.intensity})` }}
                  >
                    L{p.intensity}
                  </span>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">{p.country_code}</span>
                </div>
                <div className="font-bold text-sm leading-tight">{p.title}</div>
                <div className="text-[11px] font-mono uppercase text-muted-foreground mt-1">
                  {p.city ?? ""} {p.status ? `· ${p.status}` : ""}
                </div>
              </Link>
            ))}
            {!protests.isLoading && (protests.data?.data ?? []).length === 0 && (
              <div className="border-2 border-dashed border-border p-6 text-center text-xs font-mono uppercase">
                No protests here yet.
              </div>
            )}
          </div>
          <PaginationControls
            page={page}
            pageSize={20}
            total={protests.data?.total ?? 0}
            onPageChange={(p) => navigate({ search: { ...s, page: p } })}
          />
        </aside>
      </main>
    </div>
  );
}
