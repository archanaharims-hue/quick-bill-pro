import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { type BillFormat, DEFAULT_BILL_FORMAT, mergeBillFormat } from "./bill-format";

// Offline-first bill format config, same pattern as the company/UPI stores:
// edits update local state instantly (live preview) and are debounced-pushed to
// profiles.bill_format; retried on reconnect.

type BillFormatState = {
  format: BillFormat;
  dirty: boolean;
  sync: () => Promise<void>;
  update: (updater: (f: BillFormat) => BillFormat) => void;
  reset: () => void;
};

const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

// If the `profiles.bill_format` column doesn't exist yet (migration not applied),
// Supabase returns 42703. Detect it once and stop calling the API so we don't
// spam 400s — the config still works locally; reload after running the SQL.
let schemaMissing = false;
function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === "42703" || /bill_format/i.test(error.message ?? ""));
}
function noteSchemaMissing() {
  if (!schemaMissing) {
    schemaMissing = true;
    console.warn(
      "[bill-format] profiles.bill_format is missing — run migration 20260616150000_bill_format.sql " +
        "(then NOTIFY pgrst, 'reload schema'). Using local config until then."
    );
  }
}

export const useBillFormat = create<BillFormatState>()(
  persist(
    (set, get) => {
      const push = async () => {
        if (!isOnline() || !get().dirty || schemaMissing) return;
        const userId = await getUserId();
        if (!userId) return;
        const { error } = await supabase
          .from("profiles")
          .update({ bill_format: get().format as unknown as Json })
          .eq("id", userId);
        if (!error) {
          set({ dirty: false });
        } else if (isMissingColumn(error)) {
          noteSchemaMissing();
        }
        // other errors: keep dirty and retry later
      };
      const schedulePush = () => {
        if (pushTimer) clearTimeout(pushTimer);
        pushTimer = setTimeout(() => void push(), 800);
      };

      return {
        format: structuredClone(DEFAULT_BILL_FORMAT),
        dirty: false,

        sync: async () => {
          if (schemaMissing) return;
          await push();
          if (isOnline() && !get().dirty) {
            const userId = await getUserId();
            if (!userId) return;
            const { data, error } = await supabase
              .from("profiles")
              .select("bill_format")
              .eq("id", userId)
              .maybeSingle();
            if (!error && data) set({ format: mergeBillFormat(data.bill_format) });
            else if (isMissingColumn(error)) noteSchemaMissing();
          }
        },

        update: (updater) => {
          set((s) => ({ format: updater(s.format), dirty: true }));
          schedulePush();
        },

        reset: () => {
          set({ format: structuredClone(DEFAULT_BILL_FORMAT), dirty: true });
          schedulePush();
        },
      };
    },
    { name: "bill-format", partialize: (s) => ({ format: s.format, dirty: s.dirty }) }
  )
);

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void useBillFormat.getState().sync());
}
