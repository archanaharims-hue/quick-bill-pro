import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useBiometric } from "@/lib/biometric-store";
import { storeRefreshToken } from "@/lib/biometric";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const Ctx = createContext<AuthCtx>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Register listener FIRST, then read existing session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Keep the biometric refresh token fresh on the APK when unlock is enabled.
      if (s?.refresh_token && Capacitor.isNativePlatform() && useBiometric.getState().enabled) {
        void storeRefreshToken(s.refresh_token);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
