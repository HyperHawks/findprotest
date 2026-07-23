import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { X } from "lucide-react"; // Import for closing modal

import { SiteHeader } from "@/components/site-header";
import { fetchNews } from "@/lib/queries";
import { useAuth } from "@/hooks/use-auth";
import { CAUSE_TAGS } from "@/lib/protest-colors";
import { ingestGoogleNews } from "@/lib/news";
import { useState, useEffect } from "react";
import { COUNTRIES } from "@/lib/countries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "@tanstack/react-router";

const search = z.object({ country: z.string().optional(), state: z.string().optional(), city: z.string().optional(), cause: z.string().optional(), topic: z.string().optional() });

export const Route = createFileRoute("/news")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Protest News — FINDPROTEST" },
      { name: "description", content: "Verified news on global protests and civic mobilization." },
      { property: "og:title", content: "Protest News — FINDPROTEST" },
      { property: "og:description", content: "Verified news on global protests." },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const s = Route.useSearch();
  const q = useQuery({ queryKey: ["news", s], queryFn: () => fetchNews(s) });
  const [syncing, setSyncing] = useState(false);
  
  // Local state for search filters to allow typing before submitting
  const [topicInput, setTopicInput] = useState(s.topic && s.topic !== "undefined" ? s.topic : "");
  const [cityInput, setCityInput] = useState(s.city && s.city !== "undefined" ? s.city : "");
  const [stateInput, setStateInput] = useState(s.state && s.state !== "undefined" ? s.state : "");
  const [countryInput, setCountryInput] = useState(s.country && s.country !== "undefined" ? s.country : "");
  
  
  const navigate = useNavigate();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // State for redirect confirmation modal
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);

  const { user } = useAuth();

  async function handleSync() {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    setSyncing(true);
    try {
      const res = await ingestGoogleNews({ data: { city: s.city, state: s.state, country: s.country, topic: s.topic } });
      if (res && !res.success) {
        alert("Sync Failed: " + res.message);
      }
      await q.refetch();
    } catch (e: any) {
      console.error(e);
      alert("Error: " + e.message);
    } finally {
      setSyncing(false);
    }
  }

  function applyFilters() {
    const searchParams = { ...s } as Record<string, string>;
    if (cityInput) searchParams.city = cityInput; else delete searchParams.city;
    if (stateInput) searchParams.state = stateInput; else delete searchParams.state;
    if (countryInput) searchParams.country = countryInput; else delete searchParams.country;
    if (topicInput) searchParams.topic = topicInput; else delete searchParams.topic;
    
    // Clean up "undefined" strings that might have snuck into the URL
    Object.keys(searchParams).forEach(k => {
      if (searchParams[k] === "undefined") delete searchParams[k];
    });

    window.history.pushState(null, "", `?${new URLSearchParams(searchParams)}`);
    location.reload();
  }

  // Automatically sync news every 14 minutes while on this page
  useEffect(() => {
    const interval = setInterval(() => {
      handleSync();
    }, 14 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-6xl mx-auto p-6 lg:p-10">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-4xl font-black uppercase tracking-tighter">Protest News</h1>
          
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search and Location Filters */}
            <input 
              type="text" 
              placeholder="Topic/Keyword..." 
              value={topicInput} 
              onChange={e => setTopicInput(e.target.value)}
              className="border-2 border-border bg-background px-3 py-2 font-mono text-xs uppercase w-36"
            />
            <input 
              type="text" 
              placeholder="City..." 
              value={cityInput} 
              onChange={e => setCityInput(e.target.value)}
              className="border-2 border-border bg-background px-3 py-2 font-mono text-xs uppercase w-24"
            />
            <input 
              type="text" 
              placeholder="State..." 
              value={stateInput} 
              onChange={e => setStateInput(e.target.value)}
              className="border-2 border-border bg-background px-3 py-2 font-mono text-xs uppercase w-24"
            />
            <select
              value={countryInput}
              onChange={e => setCountryInput(e.target.value)}
              className="border-2 border-border bg-background px-3 py-2 font-mono text-xs uppercase"
            >
              <option value="">Any Country</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={applyFilters}
              className="border-2 border-border bg-background px-4 py-2 font-mono text-xs font-extrabold uppercase hover:bg-tertiary"
            >
              Filter
            </button>
            <select
              value={s.cause ?? ""}
              onChange={(e) => {
                const cause = e.target.value || undefined;
                const searchParams = { ...s, cause };
                window.history.pushState(null, "", `?${new URLSearchParams(searchParams as Record<string,string>)}`);
                location.reload();
              }}
              className="border-2 border-border bg-background px-3 py-2 font-mono text-xs uppercase"
            >
              <option value="">All causes</option>
              {CAUSE_TAGS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="border-2 border-border bg-foreground text-background px-4 py-2 font-mono text-xs font-extrabold uppercase hover:bg-primary disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync Latest News"}
            </button>
          </div>
        </div>

        {(q.data ?? []).length === 0 && !q.isLoading && !syncing && (
          <div className="border-2 border-dashed border-border p-10 text-center text-sm font-mono uppercase">
            No news ingested yet. News ingestion runs on a schedule once configured.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(q.data ?? []).map((n) => (
            <button
              key={n.id}
              onClick={() => setConfirmUrl(n.url)}
              className="text-left border-2 border-border bg-card p-5 brutal-shadow hover:-translate-y-1 hover:-translate-x-1 transition-transform block w-full"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-mono font-extrabold uppercase border-2 border-border px-2 py-0.5 bg-tertiary">
                  {n.source}
                </span>
                <span className="text-[10px] font-mono uppercase">
                  {[n.city, n.state, n.country_code].filter(Boolean).join(", ") || "GLOBAL"}
                </span>
              </div>
              <h3 className="font-black text-lg uppercase leading-tight mb-2">{n.title}</h3>
              {n.summary && <p className="text-sm text-muted-foreground line-clamp-3">{n.summary}</p>}
              <div className="text-[10px] font-mono uppercase mt-3">
                {new Date(n.published_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </main>

      {confirmUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-4 border-black brutal-shadow max-w-lg w-full p-6 flex flex-col gap-6 animate-in zoom-in duration-200">
            <h2 className="font-mono font-black text-2xl uppercase border-b-4 border-black pb-2">External Link</h2>
            
            <p className="font-mono text-lg font-bold">
              This will take you to:
            </p>
            
            <div className="bg-primary/20 p-4 border-2 border-black font-mono text-sm break-all">
              {confirmUrl}
            </div>
            
            <p className="font-mono text-lg font-bold">
              Do you wish to continue?
            </p>
            
            <div className="flex gap-4 mt-4">
              <button 
                onClick={() => setConfirmUrl(null)}
                className="flex-1 font-mono font-black uppercase text-xl py-3 border-4 border-black bg-white hover:bg-black hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  window.open(confirmUrl, "_blank");
                  setConfirmUrl(null);
                }}
                className="flex-1 font-mono font-black uppercase text-xl py-3 border-4 border-black bg-primary hover:-translate-y-1 hover:-translate-x-1 hover:brutal-shadow transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showAuthPrompt} onOpenChange={setShowAuthPrompt}>
        <AlertDialogContent className="border-4 border-black brutal-shadow rounded-none bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono font-black text-2xl uppercase border-b-4 border-black pb-2 text-black">Sign in required</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-lg font-bold text-black mt-4">
              You must identify yourself before triggering global news synchronization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-4 sm:space-x-0">
            <AlertDialogCancel className="flex-1 font-mono font-black uppercase text-xl py-6 border-4 border-black bg-white hover:bg-black hover:text-white transition-colors rounded-none mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => navigate({ to: "/auth" })}
              className="flex-1 font-mono font-black uppercase text-xl py-6 border-4 border-black bg-primary hover:-translate-y-1 hover:-translate-x-1 hover:brutal-shadow transition-all rounded-none text-black hover:text-black"
            >
              Sign In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
