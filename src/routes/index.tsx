import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WorldChoropleth, IntensityLegend } from "@/components/world-choropleth";
import { fetchCountryStats, fetchProtests } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FINDPROTEST — Live Global Protest Index" },
      { name: "description", content: "Real-time color-coded map of protests worldwide. Track intensity, read verified news, join movements." },
      { property: "og:title", content: "FINDPROTEST — Live Global Protest Index" },
      { property: "og:description", content: "Real-time color-coded map of protests worldwide. Track intensity, read verified news, join movements." },
    ],
  }),
  component: Home,
});

function Home() {
  const stats = useQuery({ queryKey: ["country-stats"], queryFn: fetchCountryStats });
  const protests = useQuery({ queryKey: ["protests", "top"], queryFn: () => fetchProtests() });
  const recentProtests = useQuery({ queryKey: ["protests", "recent"], queryFn: () => fetchProtests({ sortBy: "start_at", sortDir: "desc", pageSize: 6 }) });

  const totalActive = (stats.data ?? []).reduce((n, s) => n + Number(s.active_count), 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="border-b-2 border-border">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-4 p-8 lg:p-12 border-r-0 lg:border-r-2 border-border">
              <span className="inline-block bg-danger border-2 border-border px-2 py-1 text-[10px] font-mono font-extrabold uppercase mb-6">
                Live // Global
              </span>
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.85] mb-6">
                Every<br />movement,<br />on one map.
              </h1>
              <p className="text-sm font-medium text-muted-foreground max-w-sm mb-8">
                FINDPROTEST tracks protests worldwide in real time. Filter by country, cause, and intensity. Read
                verified news. Join or lead a movement.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/map" className="px-5 py-3 bg-foreground text-background border-2 border-border font-mono font-extrabold text-xs uppercase brutal-shadow">
                  Open Global Map
                </Link>
                <Link to="/protests" className="px-5 py-3 bg-tertiary border-2 border-border font-mono font-extrabold text-xs uppercase brutal-shadow">
                  Browse Protests
                </Link>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-4">
                <Stat label="Active mobilizations" value={totalActive.toLocaleString()} />
                <Stat label="Countries reporting" value={(stats.data?.length ?? 0).toLocaleString()} />
              </div>
            </div>
            <div className="lg:col-span-8 p-4 md:p-6 bg-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-extrabold uppercase">Global Intensity — Choropleth</span>
                <IntensityLegend />
              </div>
              <WorldChoropleth stats={stats.data ?? []} />
            </div>
          </div>
        </section>

        {/* Top protests */}
        <section className="p-8 lg:p-12 border-b-2 border-border">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Currently Active</h2>
            <Link to="/protests" className="text-[11px] font-mono font-extrabold uppercase underline">See all →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(protests.data ?? []).slice(0, 6).map((p) => (
              <Link
                key={p.id}
                to="/protests/$id"
                params={{ id: p.id }}
                className="border-2 border-border bg-card p-5 brutal-shadow hover:-translate-y-1 hover:-translate-x-1 transition-transform"
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className="px-2 py-1 border-2 border-border text-[10px] font-mono font-extrabold uppercase"
                    style={{ background: `var(--protest-${p.intensity})` }}
                  >
                    Intensity {p.intensity}/5
                  </div>
                  <span className="text-[10px] font-mono font-extrabold uppercase">{p.country_code}</span>
                </div>
                <h3 className="font-black text-lg uppercase leading-tight mb-2">{p.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {p.city ?? ""}{p.city && p.region ? " · " : ""}{p.region ?? ""}
                </p>
              </Link>
            ))}
            {!protests.isLoading && (protests.data ?? []).length === 0 && (
              <div className="col-span-full border-2 border-dashed border-border p-8 text-center text-sm font-mono uppercase">
                No protests yet. <Link to="/pricing" className="underline">Become a leader</Link> to create one.
              </div>
            )}
          </div>
        </section>

        {/* Recent protests */}
        <section className="p-8 lg:p-12 border-b-2 border-border bg-muted/30">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Recent Protests</h2>
            <Link to="/protests" className="text-[11px] font-mono font-extrabold uppercase underline">See all →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(recentProtests.data ?? []).slice(0, 6).map((p) => (
              <Link
                key={p.id}
                to="/protests/$id"
                params={{ id: p.id }}
                className="border-2 border-border bg-card p-5 brutal-shadow hover:-translate-y-1 hover:-translate-x-1 transition-transform"
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className="px-2 py-1 border-2 border-border text-[10px] font-mono font-extrabold uppercase"
                    style={{ background: `var(--protest-${p.intensity})` }}
                  >
                    Intensity {p.intensity}/5
                  </div>
                  <span className="text-[10px] font-mono font-extrabold uppercase">{p.country_code}</span>
                </div>
                <h3 className="font-black text-lg uppercase leading-tight mb-2">{p.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {p.city ?? ""}{p.city && p.region ? " · " : ""}{p.region ?? ""}
                </p>
                <p className="text-[10px] font-mono uppercase mt-4 text-muted-foreground">
                  Started: {new Date(p.start_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
            {!recentProtests.isLoading && (recentProtests.data ?? []).length === 0 && (
              <div className="col-span-full border-2 border-dashed border-border p-8 text-center text-sm font-mono uppercase">
                No recent protests found.
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-border p-3 bg-primary">
      <div className="text-[10px] font-mono font-extrabold uppercase">{label}</div>
      <div className="text-2xl font-black tabular-nums">{value}</div>
    </div>
  );
}
