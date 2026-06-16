import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Search, ImageIcon, Pencil, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import { useLongPress } from "@/hooks/use-long-press";
import { useDebounce } from "@/hooks/use-debounce";
import { ProductFormDialog, type ProductRow } from "@/components/product-form-dialog";
import { QuickEditProduct } from "@/components/quick-edit-product";
import { useCart, selectCartCount } from "@/lib/cart-store";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/category/$id")({
  component: CategoryDetail,
});

function CategoryDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 200);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [quickEdit, setQuickEdit] = useState<ProductRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: category } = useQuery({
    queryKey: ["category", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", id, debounced],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id, category_id, name, price, image_url, thumbnail_url, barcode, stock_qty, unit, description")
        .eq("category_id", id)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (debounced.trim()) {
        const term = `%${debounced.trim()}%`;
        q = q.or(`name.ilike.${term},barcode.ilike.${term}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as ProductRow[];
    },
  });

  const onDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("products").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    toast.success("Product deleted");
    setDeleteId(null);
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <div className="mx-auto max-w-3xl lg:max-w-6xl">
      <header className="sticky top-0 md:top-16 z-30 bg-background/90 backdrop-blur border-b">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2 py-3">
          <Button size="icon" variant="ghost" onClick={() => navigate({ to: "/" })}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold truncate">{category?.name || "Category"}</h1>
          <CartButton />
        </div>
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or barcode"
              className="pl-9 rounded-full bg-muted/60 border-transparent focus-visible:bg-card"
            />
          </div>
        </div>
      </header>

      <div className="px-3 pt-3">
        {isLoading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <EmptyState onAdd={() => { setEditing(null); setFormOpen(true); }} hasQuery={!!debounced.trim()} />
        ) : (
          <VirtualizedGrid
            products={products}
            onLongPress={(p) => setQuickEdit(p)}
            onEdit={(p) => { setEditing(p); setFormOpen(true); }}
            onDelete={(id) => setDeleteId(id)}
          />
        )}
      </div>

      <button
        onClick={() => { setEditing(null); setFormOpen(true); }}
        className="fixed bottom-24 md:bottom-8 right-4 lg:right-[max(2rem,calc((100vw-72rem)/2+2rem))] z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-pop grid place-items-center press-feedback"
        aria-label="Add product"
      >
        <Plus className="h-7 w-7" />
      </button>

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} categoryId={id} />
      <QuickEditProduct open={!!quickEdit} onOpenChange={(v) => !v && setQuickEdit(null)} product={quickEdit} />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CartButton() {
  const count = useCart(selectCartCount);
  return (
    <Link to="/cart" className="relative h-10 w-10 rounded-full grid place-items-center bg-primary text-primary-foreground press-feedback">
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function VirtualizedGrid({
  products, onLongPress, onEdit, onDelete,
}: {
  products: ProductRow[];
  onLongPress: (p: ProductRow) => void;
  onEdit: (p: ProductRow) => void;
  onDelete: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(2);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    // Derive column count from the actual container width (~180px per card),
    // so it scales from 2 on a phone up to 6 on a wide desktop, and stays at 2
    // inside the native 480px phone column.
    const measure = () => {
      const w = el.clientWidth;
      setCols(Math.max(2, Math.min(6, Math.floor(w / 180))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = useMemo(() => {
    const out: ProductRow[][] = [];
    for (let i = 0; i < products.length; i += cols) out.push(products.slice(i, i + cols));
    return out;
  }, [products, cols]);

  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 220,
    overscan: 4,
  });

  return (
    <div ref={parentRef} className="h-[calc(100dvh-180px)] overflow-y-auto -mx-1 px-1">
      <div style={{ height: virtual.getTotalSize(), position: "relative" }}>
        {virtual.getVirtualItems().map((vi) => {
          const row = rows[vi.index];
          return (
            <div
              key={vi.key}
              ref={virtual.measureElement}
              data-index={vi.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
              className="grid gap-3 pb-3"
            >
              {row.map((p) => (
                <ProductCard key={p.id} product={p} onLongPress={() => onLongPress(p)} onEdit={() => onEdit(p)} onDelete={() => onDelete(p.id)} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductCard({
  product, onLongPress, onEdit, onDelete,
}: {
  product: ProductRow;
  onLongPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const add = useCart((s) => s.add);
  const lp = useLongPress(() => onLongPress());

  return (
    <div className="relative">
      <button
        type="button"
        {...lp}
        onClick={(e) => {
          lp.onClick(e);
          if (e.defaultPrevented) return;
          add({ productId: product.id, name: product.name ?? "Unnamed", price: Number(product.price ?? 0) });
          toast.success("Added to bill", { duration: 1200 });
        }}
        className="w-full text-left rounded-2xl overflow-hidden bg-card border shadow-soft press-feedback no-select"
      >
        <div className="aspect-square bg-muted overflow-hidden">
          {product.thumbnail_url || product.image_url ? (
            <img
              src={product.thumbnail_url ?? product.image_url ?? ""}
              loading="lazy"
              decoding="async"
              alt={product.name ?? ""}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full grid place-items-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="px-2.5 py-2">
          <div className="text-sm font-medium truncate">{product.name || "Unnamed item"}</div>
          <div className="text-sm font-bold text-primary">
            {product.price != null ? `₹${Number(product.price).toFixed(2)}` : "—"}
            {product.unit && <span className="text-[10px] font-normal text-muted-foreground ml-1">/{product.unit}</span>}
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-background/90 grid place-items-center text-muted-foreground"
        aria-label="More"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {menuOpen && (
        <div className="absolute top-9 right-1.5 z-20 bg-card border rounded-xl shadow-pop py-1 min-w-[120px]">
          <button className="w-full text-left text-sm px-3 py-1.5 hover:bg-accent flex items-center gap-2" onClick={() => { setMenuOpen(false); onEdit(); }}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button className="w-full text-left text-sm px-3 py-1.5 hover:bg-accent text-destructive flex items-center gap-2" onClick={() => { setMenuOpen(false); onDelete(); }}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd, hasQuery }: { onAdd: () => void; hasQuery: boolean }) {
  return (
    <div className="text-center py-20">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-accent grid place-items-center mb-3">
        <ImageIcon className="h-7 w-7 text-accent-foreground" />
      </div>
      <h2 className="font-semibold">{hasQuery ? "No matches" : "No products yet"}</h2>
      <p className="text-sm text-muted-foreground mt-1">
        {hasQuery ? "Try a different search term." : "Add your first product in this category."}
      </p>
      {!hasQuery && (
        <Button className="mt-4" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add product
        </Button>
      )}
    </div>
  );
}
