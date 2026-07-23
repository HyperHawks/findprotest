import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { fetchPosts } from "@/lib/queries";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Community Feed — Vanguard" },
      { name: "description", content: "Latest updates from organizers and observers around the world." },
      { property: "og:title", content: "Community Feed — Vanguard" },
      { property: "og:description", content: "Latest updates from organizers worldwide." },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const q = useQuery({ queryKey: ["posts"], queryFn: fetchPosts });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-3xl mx-auto p-6 lg:p-10">
        <div className="flex items-end justify-between mb-6">
          <h1 className="text-4xl font-black uppercase tracking-tighter">Community Feed</h1>
          <Link to="/posts/new" className="px-4 py-2 border-2 border-border bg-primary font-mono text-[11px] font-extrabold uppercase brutal-shadow">
            + New Post
          </Link>
        </div>
        <div className="space-y-5">
          {(q.data ?? []).map((p) => (
            <article key={p.id} className="border-2 border-border bg-card p-6 brutal-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="size-8 rounded-full bg-primary border-2 border-border grid place-items-center text-[10px] font-black">
                  {(p.profiles?.display_name ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-[11px] font-mono font-extrabold uppercase">
                    {p.profiles?.display_name ?? "Anonymous"}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <h2 className="font-black text-xl uppercase leading-tight mb-3">{p.title}</h2>
              <div
                className="prose prose-sm max-w-none [&_p]:my-2 [&_img]:border-2 [&_img]:border-border [&_img]:my-3"
                dangerouslySetInnerHTML={{ __html: p.body_html }}
              />
            </article>
          ))}
          {!q.isLoading && (q.data ?? []).length === 0 && (
            <div className="border-2 border-dashed border-border p-10 text-center text-sm font-mono uppercase">
              Nothing posted yet. Be first.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
