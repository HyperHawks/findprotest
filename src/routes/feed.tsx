import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { PaginationControls } from "@/components/pagination-controls";
import { CommentSection } from "@/components/comment-section";
import { fetchPostsPaginated, togglePostPin, toggleUserPin, fetchUserPins, deletePost } from "@/lib/queries";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "firebase/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const search = z.object({
  page: z.coerce.number().min(1).optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
});

export const Route = createFileRoute("/feed")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Community Feed — FINDPROTEST" },
      { name: "description", content: "Latest updates from organizers and observers around the world." },
      { property: "og:title", content: "Community Feed — FINDPROTEST" },
      { property: "og:description", content: "Latest updates from organizers worldwide." },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/feed" });
  const { user, isLeader } = useAuth();
  const qc = useQueryClient();

  const page = s.page ?? 1;
  const sort = s.sort ?? "newest";

  const q = useQuery({
    queryKey: ["posts", page, sort],
    queryFn: () => fetchPostsPaginated(page, 10, sort),
  });

  const userPins = useQuery({
    queryKey: ["user-pins", "post", (user as User)?.uid],
    enabled: !!user,
    queryFn: () => fetchUserPins((user as User)!.uid, "post"),
  });

  const pinPost = useMutation({
    mutationFn: ({ postId, pin }: { postId: string; pin: boolean }) => togglePostPin(postId, (user as User)!.uid, pin),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const bookmarkPost = useMutation({
    mutationFn: (postId: string) => toggleUserPin((user as User)!.uid, "post", postId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-pins", "post"] }),
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const setSearch = (patch: Record<string, unknown>) => navigate({ search: { ...s, ...patch } });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-2xl mx-auto p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-4xl font-black uppercase tracking-tighter">Community Feed</h1>
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSearch({ sort: e.target.value, page: 1 })}
              className="border-2 border-border bg-background px-2 py-1.5 font-mono text-[10px] uppercase"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
            <Link to="/posts/new" className="px-4 py-2 border-2 border-border bg-primary font-mono text-[11px] font-extrabold uppercase brutal-shadow">
              + New Post
            </Link>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {(q.data?.data ?? []).map((p) => {
            const isPinned = p.is_pinned;
            const isBookmarked = userPins.data?.has(p.id) ?? false;
            
            // Allow deletion only by author within 24 hours
            const isAuthor = user && user.uid === p.author_id;
            const postAgeMs = Date.now() - new Date(p.created_at).getTime();
            const isDeletable = isAuthor && postAgeMs < 24 * 60 * 60 * 1000;

            return (
              <article
                key={p.id}
                className={`border-2 border-border bg-card brutal-shadow ${isPinned ? "border-tertiary" : ""}`}
              >
                {/* Pinned indicator */}
                {isPinned && (
                  <div className="bg-tertiary border-b-2 border-border px-4 py-1.5 text-[10px] font-mono font-extrabold uppercase flex items-center gap-1">
                    📌 Pinned post
                  </div>
                )}

                <div className="p-5">
                  {/* Author row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary border-2 border-border grid place-items-center text-xs font-black">
                        {(p.profiles?.display_name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[11px] font-mono font-extrabold uppercase">
                          {p.profiles?.display_name ?? "Anonymous"}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()} · {new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isDeletable && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              disabled={deletePostMutation.isPending}
                              className="px-2 py-1 border-2 border-border text-[10px] font-mono font-extrabold bg-danger text-background disabled:opacity-50 hover:opacity-90"
                              title="Delete post (available for 24h)"
                            >
                              🗑️ DELETE
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-2 border-border brutal-shadow rounded-none sm:rounded-none">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-black uppercase text-xl">Delete Post</AlertDialogTitle>
                              <AlertDialogDescription className="font-mono text-sm text-muted-foreground">
                                Are you sure you want to permanently delete this post? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-2 border-border rounded-none font-mono text-xs font-bold uppercase">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deletePostMutation.mutate(p.id)}
                                className="border-2 border-border rounded-none font-mono text-xs font-bold uppercase bg-danger text-background hover:bg-danger/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {user && (
                        <button
                          type="button"
                          onClick={() => bookmarkPost.mutate(p.id)}
                          className={`px-2 py-1 border-2 border-border text-[10px] font-mono font-extrabold ${isBookmarked ? "bg-secondary" : "bg-background"}`}
                          title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                        >
                          {isBookmarked ? "🔖" : "📎"}
                        </button>
                      )}
                      {isLeader && (
                        <button
                          type="button"
                          onClick={() => pinPost.mutate({ postId: p.id, pin: !isPinned })}
                          className={`px-2 py-1 border-2 border-border text-[10px] font-mono font-extrabold ${isPinned ? "bg-tertiary" : "bg-background"}`}
                          title={isPinned ? "Unpin" : "Pin to top (max 3)"}
                        >
                          📌
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="font-black text-xl uppercase leading-tight mb-3">{p.title}</h2>

                  {/* Body */}
                  <div
                    className="prose prose-sm max-w-none [&_p]:my-2 [&_img]:border-2 [&_img]:border-border [&_img]:my-3"
                    dangerouslySetInnerHTML={{ __html: p.body_html }}
                  />

                  {/* Comments section */}
                  <CommentSection postId={p.id} user={user} />
                </div>
              </article>
            );
          })}

          {!q.isLoading && (q.data?.data ?? []).length === 0 && (
            <div className="border-2 border-dashed border-border p-10 text-center text-sm font-mono uppercase">
              Nothing posted yet. Be first.
            </div>
          )}
        </div>

        {/* Pagination */}
        <PaginationControls
          page={page}
          pageSize={10}
          total={q.data?.total ?? 0}
          onPageChange={(p) => setSearch({ page: p })}
        />
      </main>
    </div>
  );
}
