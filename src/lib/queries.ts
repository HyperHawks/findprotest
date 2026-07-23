import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Protest = Database["public"]["Tables"]["protests"]["Row"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type NewsArticle = Database["public"]["Tables"]["news_articles"]["Row"];
export type CountryStat = { country_code: string; active_count: number; avg_intensity: number; color_bucket: number };

export type ProtestFilters = {
  country?: string;
  cause?: string;
  status?: string;
  minIntensity?: number;
};

export async function fetchProtests(filters: ProtestFilters = {}): Promise<Protest[]> {
  let q = supabase.from("protests").select("*").order("start_at", { ascending: false }).limit(100);
  if (filters.country) q = q.eq("country_code", filters.country.toUpperCase());
  if (filters.status) q = q.eq("status", filters.status as Protest["status"]);
  if (filters.cause) q = q.contains("cause_tags", [filters.cause]);
  if (filters.minIntensity) q = q.gte("intensity", filters.minIntensity);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchProtest(id: string): Promise<Protest | null> {
  const { data, error } = await supabase.from("protests").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchCountryStats(): Promise<CountryStat[]> {
  const { data, error } = await supabase.from("country_stats").select("*");
  if (error) throw error;
  return (data as unknown as CountryStat[]) ?? [];
}

export async function fetchNews(filters: { country?: string; cause?: string } = {}): Promise<NewsArticle[]> {
  let q = supabase.from("news_articles").select("*").order("published_at", { ascending: false }).limit(50);
  if (filters.country) q = q.eq("country_code", filters.country.toUpperCase());
  if (filters.cause) q = q.contains("cause_tags", [filters.cause]);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchPosts(): Promise<(Post & { profiles: { display_name: string | null; avatar_url: string | null } | null })[]> {
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("*")
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

export async function fetchAttendeeCount(protestId: string): Promise<number> {
  const { count, error } = await supabase
    .from("protest_attendees")
    .select("*", { count: "exact", head: true })
    .eq("protest_id", protestId);
  if (error) throw error;
  return count ?? 0;
}
