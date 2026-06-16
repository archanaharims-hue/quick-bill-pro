import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";

// Offline-capable bill deletion. A deleted bill id is queued (persisted to
// localStorage) and removed from the UI immediately; the actual Supabase delete
// runs now if online, otherwise on the next flush / `online` event. Deleting a
// bill cascades its bill_items (FK ON DELETE CASCADE).

type BillDeletesState = {
  pendingIds: string[];
  enqueue: (id: string) => Promise<void>;
  flush: () => Promise<void>;
};

const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

export const useBillDeletes = create<BillDeletesState>()(
  persist(
    (set, get) => {
      const flush = async () => {
        if (!isOnline() || get().pendingIds.length === 0) return;
        const remaining: string[] = [];
        for (const id of get().pendingIds) {
          const { error } = await supabase.from("bills").delete().eq("id", id);
          if (error) remaining.push(id); // keep queued, retry later
        }
        set({ pendingIds: remaining });
      };

      return {
        pendingIds: [],
        enqueue: async (id) => {
          set((s) => ({ pendingIds: s.pendingIds.includes(id) ? s.pendingIds : [...s.pendingIds, id] }));
          await flush();
        },
        flush,
      };
    },
    { name: "bill-deletes" }
  )
);

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void useBillDeletes.getState().flush();
  });
}
