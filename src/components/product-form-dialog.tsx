import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { ImagePicker } from "@/components/image-picker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";

export type ProductRow = {
  id: string;
  category_id: string | null;
  name: string | null;
  price: number | null;
  image_url: string | null;
  thumbnail_url: string | null;
  barcode: string | null;
  stock_qty: number | null;
  unit: string | null;
  description: string | null;
};

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categoryId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product?: ProductRow | null;
  categoryId: string | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "");
      setPrice(product?.price?.toString() ?? "");
      setBarcode(product?.barcode ?? "");
      setStock(product?.stock_qty?.toString() ?? "");
      setUnit(product?.unit ?? "");
      setDescription(product?.description ?? "");
      setImageUrl(product?.image_url ?? null);
      setThumbUrl(product?.thumbnail_url ?? null);
    }
  }, [open, product]);

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      category_id: categoryId,
      name: name || null,
      price: price ? Number(price) : null,
      barcode: barcode || null,
      stock_qty: stock ? Number(stock) : null,
      unit: unit || null,
      description: description || null,
      image_url: imageUrl,
      thumbnail_url: thumbUrl,
    };
    const { error } = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(product ? "Product updated" : "Product added");
    qc.invalidateQueries({ queryKey: ["products"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Image</Label>
            <div className="mt-2">
              <ImagePicker
                value={imageUrl}
                onChange={(full, thumb) => { setImageUrl(full); setThumbUrl(thumb); }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
            </div>
            <div>
              <Label>Price</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" inputMode="decimal" placeholder="0.00" />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg / pcs" />
            </div>
            <div>
              <Label>Stock</Label>
              <Input value={stock} onChange={(e) => setStock(e.target.value)} type="number" inputMode="numeric" placeholder="0" />
            </div>
            <div>
              <Label>Barcode</Label>
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="—" />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
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
