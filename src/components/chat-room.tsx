import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRealtimeChat } from "@/hooks/use-realtime-chat";
import {
  ensureDefaultChannels,
  sendMessage,
  toggleMessagePin,
  type ChatChannel,
  type MessageWithProfile,
} from "@/lib/queries";
import type { User } from "firebase/auth";

interface ChatRoomProps {
  entityType: "protest" | "party";
  entityId: string;
  user: User | null;
  isAdmin?: boolean; // leader/admin of this entity
}

export function ChatRoom({ entityType, entityId, user, isAdmin }: ChatRoomProps) {
  const qc = useQueryClient();
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [msgInput, setMsgInput] = useState("");

  // Load or create default channels
  const channels = useQuery({
    queryKey: ["channels", entityType, entityId],
    queryFn: () => ensureDefaultChannels(entityType, entityId),
  });

  // Set initial active channel
  const channelList = channels.data ?? [];
  const activeChannel = channelList.find((c) => c.id === activeChannelId) ?? channelList[0] ?? null;
  const resolvedChannelId = activeChannel?.id ?? null;

  // Realtime messages
  const { messages, isLoading, bottomRef } = useRealtimeChat(resolvedChannelId);

  // Separate pinned messages
  const pinnedMessages = messages.filter((m) => m.is_pinned);
  const regularMessages = messages;

  // Check if user can post in this channel
  const isAnnouncement = activeChannel?.type === "announcements";
  const canPost = user && (!isAnnouncement || isAdmin);

  const send = useMutation({
    mutationFn: () => {
      if (!user || !resolvedChannelId) throw new Error("Not ready");
      return sendMessage(resolvedChannelId, user.uid, msgInput.trim());
    },
    onSuccess: () => setMsgInput(""),
  });

  const pinToggle = useMutation({
    mutationFn: ({ messageId, pin }: { messageId: string; pin: boolean }) => {
      return toggleMessagePin(messageId, pin, resolvedChannelId!);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages", resolvedChannelId] }),
  });

  return (
    <div className="border-2 border-border bg-card flex flex-col md:flex-row h-[500px]">
      {/* Channel sidebar */}
      <div className="w-full md:w-56 border-b-2 md:border-b-0 md:border-r-2 border-border bg-secondary/20 p-3 shrink-0 overflow-y-auto">
        <div className="text-[10px] font-mono font-extrabold uppercase mb-3 flex items-center gap-2">
          <span className="size-2 bg-foreground" /> Channels
        </div>
        {channelList.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setActiveChannelId(ch.id)}
            className={`w-full text-left px-3 py-2 text-[11px] font-mono font-bold uppercase mb-1 border-2 border-border transition-colors ${
              ch.id === resolvedChannelId
                ? "bg-foreground text-background"
                : "bg-background hover:bg-primary/30"
            }`}
          >
            {ch.type === "announcements" ? "📢" : "💬"} {ch.name}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel header */}
        <div className="border-b-2 border-border px-4 py-2 bg-background flex items-center justify-between shrink-0">
          <div>
            <span className="text-[11px] font-mono font-extrabold uppercase">
              {activeChannel?.type === "announcements" ? "📢" : "💬"} {activeChannel?.name ?? "Select a channel"}
            </span>
            {isAnnouncement && (
              <span className="ml-2 text-[9px] font-mono text-muted-foreground uppercase">
                Admin-only posting
              </span>
            )}
          </div>
          {pinnedMessages.length > 0 && (
            <span className="text-[9px] font-mono font-extrabold uppercase bg-tertiary border border-border px-2 py-0.5">
              📌 {pinnedMessages.length} pinned
            </span>
          )}
        </div>

        {/* Pinned messages bar */}
        {pinnedMessages.length > 0 && (
          <div className="border-b-2 border-border bg-tertiary/20 px-4 py-2 space-y-1 shrink-0 max-h-[100px] overflow-y-auto">
            {pinnedMessages.map((m) => (
              <div key={m.id} className="text-[10px] font-mono flex items-center gap-2">
                <span className="font-extrabold">📌 {m.profiles?.display_name ?? "Anonymous"}:</span>
                <span className="truncate">{m.body}</span>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {isLoading && (
            <div className="text-center text-[11px] font-mono uppercase text-muted-foreground py-10">Loading…</div>
          )}
          {!isLoading && regularMessages.length === 0 && (
            <div className="text-center text-[11px] font-mono uppercase text-muted-foreground py-10">
              No messages yet. Start the conversation!
            </div>
          )}
          {regularMessages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.author_id === user?.uid}
              isAdmin={isAdmin}
              onPinToggle={(pin) => pinToggle.mutate({ messageId: m.id, pin })}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t-2 border-border p-3 bg-background shrink-0">
          {canPost ? (
            <form
              onSubmit={(e) => { e.preventDefault(); if (msgInput.trim()) send.mutate(); }}
              className="flex gap-2"
            >
              <input
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                placeholder={isAnnouncement ? "Post an announcement..." : "Type a message..."}
                className="flex-1 border-2 border-border bg-card px-3 py-2 text-sm font-mono"
                maxLength={2000}
              />
              <button
                type="submit"
                disabled={send.isPending || !msgInput.trim()}
                className="px-4 py-2 border-2 border-border bg-foreground text-background font-mono text-[10px] font-extrabold uppercase disabled:opacity-50"
              >
                Send
              </button>
            </form>
          ) : user ? (
            <div className="text-[11px] font-mono uppercase text-muted-foreground text-center py-2">
              Only admins can post in announcements
            </div>
          ) : (
            <div className="text-[11px] font-mono uppercase text-muted-foreground text-center py-2">
              Sign in to chat
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ───────────────────────────────────────────────
function MessageBubble({
  message,
  isOwn,
  isAdmin,
  onPinToggle,
}: {
  message: MessageWithProfile;
  isOwn: boolean;
  isAdmin?: boolean;
  onPinToggle: (pin: boolean) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`group flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="size-7 rounded-full bg-primary border-2 border-border grid place-items-center text-[9px] font-black shrink-0">
        {(message.profiles?.display_name ?? "?").slice(0, 2).toUpperCase()}
      </div>
      <div className={`max-w-[75%] min-w-0 ${isOwn ? "text-right" : ""}`}>
        <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
          <span className="text-[10px] font-mono font-extrabold uppercase">
            {message.profiles?.display_name ?? "Anonymous"}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {message.is_pinned && <span className="text-[9px]">📌</span>}
        </div>
        <div
          className={`inline-block px-3 py-2 border-2 border-border text-sm break-words ${
            isOwn ? "bg-primary" : "bg-card"
          } ${message.is_pinned ? "border-tertiary" : ""}`}
        >
          {message.body}
        </div>
        {/* Pin action (admins only) */}
        {showActions && isAdmin && (
          <button
            type="button"
            onClick={() => onPinToggle(!message.is_pinned)}
            className="ml-2 text-[9px] font-mono font-extrabold uppercase text-muted-foreground hover:text-foreground"
          >
            {message.is_pinned ? "Unpin" : "📌 Pin"}
          </button>
        )}
      </div>
    </div>
  );
}
