import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { supabase, setSupabaseToken } from "@/integrations/supabase/client";
import { mintSupabaseToken } from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const token = await u.getIdToken();
          const res = await mintSupabaseToken({ data: { firebaseToken: token } });
          if (res.success && res.token) {
            setSupabaseToken(res.token);
          } else {
            // Do NOT set Firebase token as fallback — it poisons all Supabase requests.
            // Leave anon key in place so reads still work.
            console.error("Failed to mint Supabase token:", res.message);
            setSupabaseToken(null);
          }
        } catch (err) {
          console.error("Token minting crashed:", err);
          setSupabaseToken(null);
        }

        // Check leader role (works with anon key if RLS allows, or with minted token)
        try {
          const { data } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", u.uid)
            .maybeSingle();
          setIsLeader(data?.role === "leader");
        } catch {
          setIsLeader(false);
        }
      } else {
        setSupabaseToken(null);
        setIsLeader(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, isLeader, isLoading };
}
