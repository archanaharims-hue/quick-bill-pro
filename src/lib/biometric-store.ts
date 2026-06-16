import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { biometricAvailable, storeRefreshToken, clearRefreshToken } from "./biometric";

// `enabled` is the persisted Settings toggle. `unlocked` is per-app-run (NOT
// persisted) so every fresh launch starts locked and requires biometric.

type BiometricState = {
  enabled: boolean;
  unlocked: boolean;
  setUnlocked: (v: boolean) => void;
  /** Turn on biometric unlock: verify availability + stash the refresh token. */
  enable: () => Promise<boolean>;
  /** Forget device: clear the stored token and turn the toggle off. */
  disable: () => Promise<void>;
};

export const useBiometric = create<BiometricState>()(
  persist(
    (set) => ({
      enabled: false,
      unlocked: false,
      setUnlocked: (v) => set({ unlocked: v }),

      enable: async () => {
        if (!Capacitor.isNativePlatform()) return false;
        if (!(await biometricAvailable())) return false;
        const { data } = await supabase.auth.getSession();
        if (data.session?.refresh_token) await storeRefreshToken(data.session.refresh_token);
        set({ enabled: true, unlocked: true }); // already authenticated right now
        return true;
      },

      disable: async () => {
        await clearRefreshToken();
        set({ enabled: false });
      },
    }),
    { name: "biometric", partialize: (s) => ({ enabled: s.enabled }) }
  )
);
