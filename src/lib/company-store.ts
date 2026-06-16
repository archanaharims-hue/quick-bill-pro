import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";

// Company identity (name + logo) used by the billing button, the receipt header
// and the shared receipt file. Cached in a zustand `persist` store so it renders
// offline; backed by the existing `profiles` row (shop_name + avatar_url).

type CompanyState = {
  name: string;
  logoUrl: string | null;
  dirty: boolean; // a local change not yet pushed to Supabase
  sync: () => Promise<void>;
  save: (data: { name: string; logoUrl: string | null }) => Promise<void>;
  // Live edit: updates local state instantly and debounce-pushes to Supabase.
  update: (data: Partial<{ name: string; logoUrl: string | null }>) => void;
};

const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

export const useCompany = create<CompanyState>()(
  persist(
    (set, get) => {
      const push = async () => {
        if (!isOnline() || !get().dirty) return;
        const userId = await getUserId();
        if (!userId) return;
        const { error } = await supabase
          .from("profiles")
          .update({ shop_name: get().name || null, avatar_url: get().logoUrl })
          .eq("id", userId);
        if (!error) set({ dirty: false });
      };

      return {
        name: "",
        logoUrl: null,
        dirty: false,

        sync: async () => {
          await push();
          if (isOnline() && !get().dirty) {
            const userId = await getUserId();
            if (!userId) return;
            const { data, error } = await supabase
              .from("profiles")
              .select("shop_name, avatar_url")
              .eq("id", userId)
              .maybeSingle();
            if (!error && data) set({ name: data.shop_name ?? "", logoUrl: data.avatar_url ?? null });
          }
        },

        save: async ({ name, logoUrl }) => {
          set({ name, logoUrl, dirty: true });
          await push();
        },

        update: (data) => {
          set({ ...data, dirty: true });
          if (pushTimer) clearTimeout(pushTimer);
          pushTimer = setTimeout(() => void push(), 800);
        },
      };
    },
    { name: "company-profile", partialize: (s) => ({ name: s.name, logoUrl: s.logoUrl, dirty: s.dirty }) }
  )
);

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void useCompany.getState().sync();
  });
}
