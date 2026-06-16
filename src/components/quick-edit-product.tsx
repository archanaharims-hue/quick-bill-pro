import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function QuickEditProduct({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: { id: string; name: string | null; price: number | null } | null;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && product) {
      setName(product.name ?? "");
      setPrice(product.price?.toString() ?? "");
    }
  }, [open, product]);

  const save = async () => {
    if (!product) return;
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({ name: name || null, price: price ? Number(price) : null })
      .eq("id", product.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["products"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Quick edit</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Price</Label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              inputMode="decimal"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
