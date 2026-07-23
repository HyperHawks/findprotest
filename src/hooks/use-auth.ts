import { useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { supabase, setSupabaseToken } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Get the JWT token and give it to Supabase
        const token = await firebaseUser.getIdToken();
        setSupabaseToken(token);
        
        // Also check if they are a leader
        checkLeader(firebaseUser.uid);
      } else {
        setSupabaseToken(null);
        setIsLeader(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function checkLeader(userId: string) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["leader", "admin"]);
    setIsLeader((data ?? []).length > 0);
  }

  return { user, isLoading, isLeader };
}
