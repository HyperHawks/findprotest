import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchComments, addComment, type CommentWithProfile } from "@/lib/queries";
import type { User } from "firebase/auth";

interface CommentSectionProps {
  postId: string;
  user: User | null;
}

export function CommentSection({ postId, user }: CommentSectionProps) {
  const qc = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const comments = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => fetchComments(postId),
  });

  const submit = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Sign in to comment");
      return addComment(postId, user.uid, newComment.trim());
    },
    onSuccess: () => {
      setNewComment("");
      qc.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });

  return (
    <div className="mt-4 border-t-2 border-border pt-4">
      {/* Comment count */}
      <div className="text-[10px] font-mono font-extrabold uppercase mb-3">
        {comments.data?.length ?? 0} comment{(comments.data?.length ?? 0) !== 1 ? "s" : ""}
      </div>

      {/* Comment list */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {(comments.data ?? []).map((c) => (
          <CommentItem key={c.id} comment={c} postId={postId} user={user} depth={0} />
        ))}
      </div>

      {/* New comment input */}
      {user ? (
        <form
          onSubmit={(e) => { e.preventDefault(); if (newComment.trim()) submit.mutate(); }}
          className="flex gap-2 mt-4"
        >
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 border-2 border-border bg-background px-3 py-2 text-sm font-mono"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={submit.isPending || !newComment.trim()}
            className="px-4 py-2 border-2 border-border bg-foreground text-background font-mono text-[10px] font-extrabold uppercase disabled:opacity-50"
          >
            Post
          </button>
        </form>
      ) : (
        <p className="mt-4 text-[11px] font-mono uppercase text-muted-foreground">
          Sign in to comment
        </p>
      )}
    </div>
  );
}

// ── Single comment (recursive for replies) ──────────────────────
function CommentItem({ comment, postId, user, depth }: { comment: CommentWithProfile; postId: string; user: User | null; depth: number }) {
  const qc = useQueryClient();
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const submitReply = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Sign in to reply");
      return addComment(postId, user.uid, replyText.trim(), comment.id);
    },
    onSuccess: () => {
      setReplyText("");
      setReplying(false);
      qc.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });

  const replies = comment.replies ?? [];

  return (
    <div className={`${depth > 0 ? "ml-6 pl-4 border-l-2 border-border/40" : ""}`}>
      <div className="flex gap-2">
        {/* Avatar */}
        <div className="size-7 rounded-full bg-secondary border-2 border-border grid place-items-center text-[9px] font-black shrink-0">
          {(comment.profiles?.display_name ?? "?").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-extrabold uppercase">
              {comment.profiles?.display_name ?? "Anonymous"}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground">
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm mt-0.5 break-words">{comment.body}</p>
          <div className="flex items-center gap-3 mt-1">
            {user && depth < 2 && (
              <button
                type="button"
                onClick={() => setReplying(!replying)}
                className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground hover:text-foreground"
              >
                Reply
              </button>
            )}
            {replies.length > 0 && (
              <button
                type="button"
                onClick={() => setShowReplies(!showReplies)}
                className="text-[10px] font-mono font-extrabold uppercase text-primary-foreground bg-primary px-2 py-0.5 border border-border"
              >
                {showReplies ? "Hide" : "View"} {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </button>
            )}
          </div>

          {/* Reply input */}
          {replying && (
            <form
              onSubmit={(e) => { e.preventDefault(); if (replyText.trim()) submitReply.mutate(); }}
              className="flex gap-2 mt-2"
            >
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${comment.profiles?.display_name ?? "Anonymous"}...`}
                className="flex-1 border-2 border-border bg-background px-2 py-1.5 text-xs font-mono"
                maxLength={500}
                autoFocus
              />
              <button
                type="submit"
                disabled={submitReply.isPending || !replyText.trim()}
                className="px-3 py-1.5 border-2 border-border bg-foreground text-background font-mono text-[9px] font-extrabold uppercase disabled:opacity-50"
              >
                Reply
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {showReplies && replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {replies.map((r) => (
            <CommentItem key={r.id} comment={r} postId={postId} user={user} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
