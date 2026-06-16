import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ImagePicker } from "@/components/image-picker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";

export type CategoryRow = {
  id: string;
  name: string | null;
  image_url: string | null;
};

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category?: CategoryRow | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState(category?.name ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(category?.image_url ?? null);
  const [saving, setSaving] = useState(false);

  // Reset when dialog opens with a different category
  const resetFor = (c?: CategoryRow | null) => {
    setName(c?.name ?? "");
    setImageUrl(c?.image_url ?? null);
  };

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { name: name || null, image_url: imageUrl, user_id: user.id };
    const { error } = category
      ? await supabase.from("categories").update(payload).eq("id", category.id)
      : await supabase.from("categories").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(category ? "Category updated" : "Category added");
    qc.invalidateQueries({ queryKey: ["categories"] });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) resetFor(category);
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Beverages" />
          </div>
          <div>
            <Label>Image</Label>
            <div className="mt-2">
              <ImagePicker value={imageUrl} onChange={(full) => setImageUrl(full)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
