import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";

// Offline-first UPI accounts, using the same approach as the cart store: the
// working copy lives in a zustand `persist` (localStorage) store so the account
// list — and therefore Test QR and the billing QR — work with no connection.
// Mutations update local state immediately and are written through to Supabase;
// if a write fails (offline), it's queued and retried on the next sync / when
// the browser fires the `online` event.

export type UpiAccount = {
  id: string;
  label: string | null;
  upi_id: string | null;
  payee_name: string | null;
  is_default: boolean;
  sort_order: number;
};

type PendingOp =
  | { type: "upsert"; account: UpiAccount }
  | { type: "delete"; id: string };

type UpiState = {
  accounts: UpiAccount[];
  pending: PendingOp[];
  loading: boolean;
  /** Pull from Supabase (after flushing queued writes) when online. */
  sync: () => Promise<void>;
  addAccount: (data: Partial<UpiAccount>) => Promise<void>;
  updateAccount: (id: string, data: Partial<UpiAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
};

const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

async function getUserId(): Promise<string | null> {
  // Reads the persisted session from localStorage — works offline.
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export const useUpiAccounts = create<UpiState>()(
  persist(
    (set, get) => {
      const flush = async () => {
        if (!isOnline() || get().pending.length === 0) return;
        const userId = await getUserId();
        if (!userId) return;
        const remaining: PendingOp[] = [];
        for (const op of get().pending) {
          try {
            if (op.type === "upsert") {
              const a = op.account;
              const { error } = await supabase.from("upi_accounts").upsert({
                id: a.id,
                user_id: userId,
                label: a.label,
                upi_id: a.upi_id,
                payee_name: a.payee_name,
                is_default: a.is_default,
                sort_order: a.sort_order,
              });
              if (error) throw error;
            } else {
              const { error } = await supabase.from("upi_accounts").delete().eq("id", op.id);
              if (error) throw error;
            }
          } catch {
            remaining.push(op); // keep it queued for the next attempt
          }
        }
        set({ pending: remaining });
      };

      const queue = (op: PendingOp) => set((s) => ({ pending: [...s.pending, op] }));

      return {
        accounts: [],
        pending: [],
        loading: false,

        sync: async () => {
          set({ loading: true });
          await flush();
          // Only adopt the server list once all local writes have synced, so we
          // never clobber unsynced offline edits.
          if (isOnline() && get().pending.length === 0) {
            const { data, error } = await supabase
              .from("upi_accounts")
              .select("id,label,upi_id,payee_name,is_default,sort_order")
              .order("sort_order", { ascending: true })
              .order("created_at", { ascending: true });
            if (!error && data) set({ accounts: data as UpiAccount[] });
          }
          set({ loading: false });
        },

        addAccount: async (data) => {
          const account: UpiAccount = {
            id: crypto.randomUUID(),
            label: data.label ?? null,
            upi_id: data.upi_id ?? null,
            payee_name: data.payee_name ?? null,
            is_default: data.is_default ?? false,
            sort_order: data.sort_order ?? get().accounts.length,
          };
          set((s) => ({ accounts: [...s.accounts, account] }));
          queue({ type: "upsert", account });
          await flush();
        },

        updateAccount: async (id, data) => {
          let next: UpiAccount | undefined;
          set((s) => ({
            accounts: s.accounts.map((a) => (a.id === id ? (next = { ...a, ...data, id }) : a)),
          }));
          if (next) queue({ type: "upsert", account: next });
          await flush();
        },

        deleteAccount: async (id) => {
          set((s) => ({
            accounts: s.accounts.filter((a) => a.id !== id),
            // Drop any not-yet-synced upsert for this id; it no longer matters.
            pending: s.pending.filter((p) => !(p.type === "upsert" && p.account.id === id)),
          }));
          queue({ type: "delete", id });
          await flush();
        },

        setDefault: async (id) => {
          const changed: UpiAccount[] = [];
          set((s) => ({
            accounts: s.accounts.map((a) => {
              const next = { ...a, is_default: a.id === id };
              if (next.is_default !== a.is_default) changed.push(next);
              return next;
            }),
          }));
          changed.forEach((account) => queue({ type: "upsert", account }));
          await flush();
        },
      };
    },
    {
      name: "upi-accounts",
      partialize: (s) => ({ accounts: s.accounts, pending: s.pending }),
    }
  )
);

export const selectDefaultUpiAccount = (s: UpiState) =>
  s.accounts.find((a) => a.is_default) ?? s.accounts[0] ?? null;

// Retry queued writes automatically when connectivity returns.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void useUpiAccounts.getState().sync();
  });
}
