import { createServerFn } from "@tanstack/react-start";
import { XMLParser } from "fast-xml-parser";
import { supabase } from "@/integrations/supabase/client";

export const ingestGoogleNews = createServerFn({ method: "POST" })
  .validator((data: { city?: string; state?: string; country?: string; topic?: string } | void) => data)
  .handler(async ({ data }) => {
  console.log("Fetching Google News RSS...");
  try {
    let query = data?.topic ? data.topic : "protest OR strike OR riot";
    if (data?.city) query += ` "${data.city}"`;
    if (data?.state) query += ` "${data.state}"`;
    if (data?.country) query += ` "${data.country}"`;

    const encodedQuery = encodeURIComponent(query);
    const res = await fetch(`https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`);
    if (!res.ok) throw new Error("Failed to fetch Google News RSS");
    
    const xml = await res.text();
    const parser = new XMLParser();
    const parsed = parser.parse(xml);
    
    const items = parsed?.rss?.channel?.item;
    if (!items || !Array.isArray(items)) {
      console.error("No items found in RSS");
      return { success: false, message: "No items found in RSS feed." };
    }

    let ingested = 0;
    
    // We only take the top 20 news items to avoid spamming the DB too much on every sync
    for (const item of items.slice(0, 20)) {
      const title = item.title || "";
      const link = item.link || "";
      const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
      const source = item.source || "Google News";
      
      // Determine cause/tags based on basic keyword matching
      const tl = title.toLowerCase();
      let cause = "other";
      if (tl.includes("climate") || tl.includes("environment")) cause = "environment";
      else if (tl.includes("labor") || tl.includes("strike") || tl.includes("union")) cause = "labor";
      else if (tl.includes("election") || tl.includes("democracy")) cause = "political";
      else if (tl.includes("human rights") || tl.includes("equality")) cause = "human_rights";
      else if (tl.includes("economy") || tl.includes("inflation") || tl.includes("cost of living")) cause = "economic";

      // Attempt to find country codes for major countries
      let countryCode = data?.country ? data.country : null;
      if (!countryCode) {
        if (tl.includes(" us ") || tl.includes(" usa ") || tl.includes("american")) countryCode = "US";
        else if (tl.includes(" uk ") || tl.includes("britain")) countryCode = "GB";
        else if (tl.includes("france") || tl.includes("french")) countryCode = "FR";
        else if (tl.includes("india")) countryCode = "IN";
        else if (tl.includes("germany") || tl.includes("german")) countryCode = "DE";
      }

      // Check if exists
      const { data: existing } = await supabase.from("news_articles").select("id").eq("url", link).maybeSingle();
      
      if (!existing) {
        const { error } = await supabase.from("news_articles").insert({
          title,
          source: typeof source === 'object' ? source['#text'] : source,
          url: link,
          published_at: pubDate,
          cause_tags: [cause],
          country_code: countryCode,
          city: data?.city || null,
          state: data?.state || null,
        });
        if (!error) {
          ingested++;
        } else {
          console.error("News insert error:", error);
        }
      }
    }
    
    return { success: true, message: `Ingested ${ingested} articles.` };
  } catch (error: any) {
    console.error("News ingestion error:", error);
    return { success: false, message: error.message };
  }
});
