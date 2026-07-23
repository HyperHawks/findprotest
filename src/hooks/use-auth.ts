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
        const token = await u.getIdToken();
        const { success, token: supaToken } = await mintSupabaseToken({ data: { firebaseToken: token } });
        if (success && supaToken) {
          setSupabaseToken(supaToken);
        } else {
          setSupabaseToken(token);
        }
        
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", u.uid)
          .maybeSingle();
        setIsLeader(data?.role === "leader");
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
