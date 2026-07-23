import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let currentToken: string | null = null;

export function setSupabaseToken(token: string | null) {
  currentToken = token;
  // Supabase Realtime requires this specific call to update the JWT
  if (token) {
    // @ts-ignore - The types might be strict but realtime exposes setAuth
    supabase.realtime.setAuth(token);
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (url, options = {}) => {
      if (currentToken) {
        const headers = new Headers(options.headers || {});
        headers.set("Authorization", `Bearer ${currentToken}`);
        return fetch(url, { ...options, headers });
      }
      return fetch(url, options);
    },
  },
});
