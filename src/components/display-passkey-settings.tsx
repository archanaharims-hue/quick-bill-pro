import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, KeyRound, Trash2, Plus, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDisplay } from "@/lib/display-store";
import { supabase } from "@/integrations/supabase/client";
import { createPasskey } from "@/lib/passkeys.functions";
import { toast } from "sonner";

export function DisplaySection() {
  const { categoryNameOnly, productNameOnly, set } = useDisplay();
  return (
    <section className="rounded-2xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Eye className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Display</h2>
      </div>
      <label className="flex items-center justify-between gap-3 px-4 py-3 border-b">
        <span className="text-sm">Categories: name only (no photo)</span>
        <Switch checked={categoryNameOnly} onCheckedChange={(v) => set({ categoryNameOnly: v })} />
      </label>
      <label className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm">Products: name only (no photo)</span>
        <Switch checked={productNameOnly} onCheckedChange={(v) => set({ productNameOnly: v })} />
      </label>
    </section>
  );
}

export function PasskeySection() {
  const qc = useQueryClient();
  const createFn = useServerFn(createPasskey);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: keys = [] } = useQuery({
    queryKey: ["passkeys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("passkeys").select("id, label, created_at").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createFn({ data: { label, code } });
      toast.success("Passkey created");
      setLabel(""); setCode("");
      qc.invalidateQueries({ queryKey: ["passkeys"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("passkeys").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Passkey deleted");
    qc.invalidateQueries({ queryKey: ["passkeys"] });
  };

  return (
    <section className="rounded-2xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <KeyRound className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-semibold leading-tight">Passkeys</h2>
          <p className="text-xs text-muted-foreground">Staff unlock the app with a passkey instead of email.</p>
        </div>
      </div>
      <form onSubmit={onCreate} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] px-4 py-3 border-b">
        <Input placeholder="Name (e.g. Counter 1)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Input placeholder="Passkey (min 6)" value={code} onChange={(e) => setCode(e.target.value)} minLength={6} required />
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Create
        </Button>
      </form>
      {keys.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">No passkeys yet.</div>
      ) : (
        <ul className="divide-y">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between px-4 py-3">
              <span className="font-medium truncate">{k.label}</span>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(k.id)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
