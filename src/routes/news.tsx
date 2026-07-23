import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { SiteHeader } from "@/components/site-header";
import { fetchNews } from "@/lib/queries";
import { CAUSE_TAGS } from "@/lib/protest-colors";

const search = z.object({ country: z.string().optional(), cause: z.string().optional() });

export const Route = createFileRoute("/news")({
  validateSearch: zodValidator(search),
  head: () => ({
    meta: [
      { title: "Protest News — Vanguard" },
      { name: "description", content: "Verified news on global protests and civic mobilization." },
      { property: "og:title", content: "Protest News — Vanguard" },
      { property: "og:description", content: "Verified news on global protests." },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const s = Route.useSearch();
  const q = useQuery({ queryKey: ["news", s], queryFn: () => fetchNews(s) });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-6xl mx-auto p-6 lg:p-10">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-4xl font-black uppercase tracking-tighter">Protest News</h1>
          <div className="flex gap-2">
            <select
              value={s.cause ?? ""}
              onChange={(e) => {
                const cause = e.target.value || undefined;
                const search = { ...s, cause };
                window.history.pushState(null, "", `?${new URLSearchParams(search as Record<string,string>)}`);
                location.reload();
              }}
              className="border-2 border-border bg-background px-3 py-2 font-mono text-xs uppercase"
            >
              <option value="">All causes</option>
              {CAUSE_TAGS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {(q.data ?? []).length === 0 && !q.isLoading && (
          <div className="border-2 border-dashed border-border p-10 text-center text-sm font-mono uppercase">
            No news ingested yet. News ingestion runs on a schedule once configured.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(q.data ?? []).map((n) => (
            <a
              key={n.id}
              href={n.url}
              target="_blank"
              rel="noreferrer noopener"
              className="border-2 border-border bg-card p-5 brutal-shadow hover:-translate-y-1 hover:-translate-x-1 transition-transform block"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-mono font-extrabold uppercase border-2 border-border px-2 py-0.5 bg-tertiary">
                  {n.source}
                </span>
                <span className="text-[10px] font-mono uppercase">{n.country_code ?? "GLOBAL"}</span>
              </div>
              <h3 className="font-black text-lg uppercase leading-tight mb-2">{n.title}</h3>
              {n.summary && <p className="text-sm text-muted-foreground line-clamp-3">{n.summary}</p>}
              <div className="text-[10px] font-mono uppercase mt-3">
                {new Date(n.published_at).toLocaleDateString()}
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
