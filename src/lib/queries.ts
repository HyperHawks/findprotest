import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Protest = Database["public"]["Tables"]["protests"]["Row"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type NewsArticle = Database["public"]["Tables"]["news_articles"]["Row"];
export type Party = Database["public"]["Tables"]["political_parties"]["Row"];
export type ChatChannel = Database["public"]["Tables"]["chat_channels"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type CountryStat = { country_code: string; active_count: number; avg_intensity: number; color_bucket: number };

// ── Paginated result type ────────────────────────────────────────
export type Paginated<T> = { data: T[]; total: number };

// ── Protest filters ──────────────────────────────────────────────
export type ProtestFilters = {
  country?: string;
  cause?: string;
  status?: string;
  minIntensity?: number;
  page?: number;
  pageSize?: number;
  sortBy?: "start_at" | "intensity" | "title" | "country_code";
  sortDir?: "asc" | "desc";
  groupBy?: "country_code" | "cause" | "status";
};

export async function fetchProtests(filters: ProtestFilters = {}): Promise<Protest[]> {
  const { page, pageSize, sortBy, sortDir, ...rest } = filters;
  const col = sortBy ?? "start_at";
  const asc = sortDir === "asc";
  const size = pageSize ?? 100;
  const from = ((page ?? 1) - 1) * size;

  let q = supabase.from("protests").select("*", { count: "exact" }).order(col, { ascending: asc }).range(from, from + size - 1);
  if (rest.country) q = q.eq("country_code", rest.country.toUpperCase());
  if (rest.status) q = q.eq("status", rest.status as Protest["status"]);
  if (rest.cause) q = q.contains("cause_tags", [rest.cause]);
  if (rest.minIntensity) q = q.gte("intensity", rest.minIntensity);
  const { data, error } = await q;
  if (error) {
    console.error("fetchProtests ERROR:", error);
    throw error;
  }
  return data ?? [];
}

export async function fetchProtestsPaginated(filters: ProtestFilters = {}): Promise<Paginated<Protest>> {
  const { page, pageSize, sortBy, sortDir, ...rest } = filters;
  const col = sortBy ?? "start_at";
  const asc = sortDir === "asc";
  const size = pageSize ?? 12;
  const from = ((page ?? 1) - 1) * size;

  let q = supabase.from("protests").select("*", { count: "exact" }).order(col, { ascending: asc }).range(from, from + size - 1);
  if (rest.country) q = q.eq("country_code", rest.country.toUpperCase());
  if (rest.status) q = q.eq("status", rest.status as Protest["status"]);
  if (rest.cause) q = q.contains("cause_tags", [rest.cause]);
  if (rest.minIntensity) q = q.gte("intensity", rest.minIntensity);
  const { data, count, error } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

export async function fetchProtest(id: string): Promise<Protest | null> {
  const { data, error } = await supabase.from("protests").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchCountryStats(): Promise<CountryStat[]> {
  const { data, error } = await supabase.from("country_stats").select("*");
  if (error) {
    console.error("fetchCountryStats ERROR:", error);
    throw error;
  }
  return (data as unknown as CountryStat[]) ?? [];
}

export async function fetchNews(filters: { country?: string; state?: string; city?: string; cause?: string; topic?: string } = {}): Promise<NewsArticle[]> {
  let q = supabase.from("news_articles").select("*").order("published_at", { ascending: false }).limit(50);
  if (filters.country) q = q.eq("country_code", filters.country.toUpperCase());
  if (filters.state) q = q.ilike("state", `%${filters.state}%`);
  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.cause) q = q.contains("cause_tags", [filters.cause]);
  if (filters.topic) q = q.ilike("title", `%${filters.topic}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ── Posts (paginated, with profiles) ─────────────────────────────
export type PostWithProfile = Post & { profiles: { display_name: string | null; avatar_url: string | null } | null };

export async function fetchPosts(): Promise<PostWithProfile[]> {
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
    
  if (postsError) throw postsError;
  if (!posts || posts.length === 0) return [];

  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", authorIds);
    
  if (profilesError) throw profilesError;

  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  return posts.map((p) => ({
    ...p,
    profiles: profileMap.get(p.author_id) ?? null,
  })) as never;
}

export async function fetchPostsPaginated(page = 1, pageSize = 10, sortBy: "newest" | "oldest" = "newest"): Promise<Paginated<PostWithProfile>> {
  const from = (page - 1) * pageSize;
  const asc = sortBy === "oldest";

  const { data: posts, count, error: postsError } = await supabase
    .from("posts")
    .select("*", { count: "exact" })
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: asc })
    .range(from, from + pageSize - 1);
    
  if (postsError) throw postsError;
  if (!posts || posts.length === 0) return { data: [], total: count ?? 0 };

  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));
  const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", authorIds);
  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  return {
    data: posts.map((p) => ({ ...p, profiles: profileMap.get(p.author_id) ?? null })) as PostWithProfile[],
    total: count ?? 0,
  };
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function fetchAttendeeCount(protestId: string): Promise<number> {
  const { count, error } = await supabase
    .from("protest_attendees")
    .select("*", { count: "exact", head: true })
    .eq("protest_id", protestId);
  if (error) throw error;
  return count ?? 0;
}

// ── Comments (threaded) ──────────────────────────────────────────
export type CommentWithProfile = Comment & { profiles: { display_name: string | null; avatar_url: string | null } | null; replies?: CommentWithProfile[] };

export async function fetchComments(postId: string): Promise<CommentWithProfile[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const authorIds = Array.from(new Set(data.map((c) => c.author_id)));
  const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", authorIds);
  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  const withProfiles = data.map((c) => ({
    ...c,
    profiles: profileMap.get(c.author_id) ?? null,
    replies: [] as CommentWithProfile[],
  }));

  // Build tree
  const map = new Map(withProfiles.map((c) => [c.id, c]));
  const roots: CommentWithProfile[] = [];
  for (const c of withProfiles) {
    if (c.parent_comment_id && map.has(c.parent_comment_id)) {
      map.get(c.parent_comment_id)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  }
  return roots;
}

export async function addComment(postId: string, authorId: string, body: string, parentCommentId?: string) {
  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    author_id: authorId,
    body,
    parent_comment_id: parentCommentId ?? null,
  });
  if (error) throw error;
}

// ── Pin toggle for posts (leader/admin, max 3) ──────────────────
export async function togglePostPin(postId: string, userId: string, pin: boolean) {
  if (pin) {
    // Check max 3 pinned
    const { count } = await supabase.from("posts").select("*", { count: "exact", head: true }).eq("is_pinned", true);
    if ((count ?? 0) >= 3) throw new Error("Maximum 3 pinned posts allowed");
  }
  const { error } = await supabase.from("posts").update({ is_pinned: pin, pinned_by: pin ? userId : null }).eq("id", postId);
  if (error) throw error;
}

// ── User personal pins ──────────────────────────────────────────
export async function fetchUserPins(userId: string, entityType: string) {
  const { data, error } = await supabase.from("user_pins").select("entity_id").eq("user_id", userId).eq("entity_type", entityType);
  if (error) throw error;
  return new Set((data ?? []).map((p) => p.entity_id));
}

export async function toggleUserPin(userId: string, entityType: string, entityId: string) {
  const { data } = await supabase.from("user_pins").select("entity_id").eq("user_id", userId).eq("entity_type", entityType).eq("entity_id", entityId).maybeSingle();
  if (data) {
    await supabase.from("user_pins").delete().eq("user_id", userId).eq("entity_type", entityType).eq("entity_id", entityId);
    return false;
  } else {
    await supabase.from("user_pins").insert({ user_id: userId, entity_type: entityType, entity_id: entityId });
    return true;
  }
}

// ── Parties ──────────────────────────────────────────────────────
export type PartyFilters = {
  country?: string;
  ideology?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "supporter_count_cached" | "founding_date" | "created_at";
  sortDir?: "asc" | "desc";
};

export async function fetchParties(filters: PartyFilters = {}): Promise<Paginated<Party>> {
  const { page = 1, pageSize = 12, sortBy = "created_at", sortDir = "desc", ...rest } = filters;
  const from = (page - 1) * pageSize;
  let q = supabase.from("political_parties").select("*", { count: "exact" }).order(sortBy, { ascending: sortDir === "asc" }).range(from, from + pageSize - 1);
  if (rest.country) q = q.eq("country_code", rest.country.toUpperCase());
  if (rest.ideology) q = q.ilike("ideology", `%${rest.ideology}%`);
  const { data, count, error } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

export async function fetchParty(id: string): Promise<Party | null> {
  const { data, error } = await supabase.from("political_parties").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchPartyMemberCount(partyId: string): Promise<number> {
  const { count, error } = await supabase.from("party_members").select("*", { count: "exact", head: true }).eq("party_id", partyId);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchMyPartyRole(partyId: string, userId: string) {
  const { data } = await supabase.from("party_members").select("role").eq("party_id", partyId).eq("user_id", userId).maybeSingle();
  return data?.role ?? null;
}

export async function joinParty(partyId: string, userId: string) {
  const { error } = await supabase.from("party_members").upsert({ party_id: partyId, user_id: userId, role: "supporter" });
  if (error) throw error;
}

export async function leaveParty(partyId: string, userId: string) {
  const { error } = await supabase.from("party_members").delete().eq("party_id", partyId).eq("user_id", userId);
  if (error) throw error;
}

// ── Chat channels & messages ─────────────────────────────────────
export async function fetchChannels(entityType: "protest" | "party", entityId: string): Promise<ChatChannel[]> {
  const { data, error } = await supabase.from("chat_channels").select("*").eq("entity_type", entityType).eq("entity_id", entityId).order("type", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function ensureDefaultChannels(entityType: "protest" | "party", entityId: string): Promise<ChatChannel[]> {
  const existing = await fetchChannels(entityType, entityId);
  if (existing.length > 0) return existing;

  // Create default channels
  const defaults = [
    { entity_type: entityType as "protest" | "party", entity_id: entityId, name: "Announcements", slug: "announcements", type: "announcements" as const },
    { entity_type: entityType as "protest" | "party", entity_id: entityId, name: "General", slug: "general", type: "general" as const },
  ];
  const { data, error } = await supabase.from("chat_channels").insert(defaults).select();
  if (error) throw error;
  return data ?? [];
}

export type MessageWithProfile = ChatMessage & { profiles: { display_name: string | null; avatar_url: string | null } | null };

export async function fetchMessages(channelId: string, limit = 50): Promise<MessageWithProfile[]> {
  const { data, error } = await supabase.from("chat_messages").select("*").eq("channel_id", channelId).order("created_at", { ascending: true }).limit(limit);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const authorIds = Array.from(new Set(data.map((m) => m.author_id)));
  const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", authorIds);
  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  return data.map((m) => ({ ...m, profiles: profileMap.get(m.author_id) ?? null }));
}

export async function sendMessage(channelId: string, authorId: string, body: string) {
  const { error } = await supabase.from("chat_messages").insert({ channel_id: channelId, author_id: authorId, body });
  if (error) throw error;
}

export async function toggleMessagePin(messageId: string, pin: boolean, channelId: string) {
  if (pin) {
    const { count } = await supabase.from("chat_messages").select("*", { count: "exact", head: true }).eq("channel_id", channelId).eq("is_pinned", true);
    if ((count ?? 0) >= 3) throw new Error("Maximum 3 pinned messages per channel");
  }
  const { error } = await supabase.from("chat_messages").update({ is_pinned: pin }).eq("id", messageId);
  if (error) throw error;
}
