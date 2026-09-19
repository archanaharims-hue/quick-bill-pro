import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { CategoryFormDialog, type CategoryRow } from "@/components/category-form-dialog";
import { Plus, Pencil, Trash2, LogOut, FileSpreadsheet, ImageIcon, Package, Settings, Receipt, Search, X, Loader2 } from "lucide-react";
import { useLongPress } from "@/hooks/use-long-press";
import { useDebounce } from "@/hooks/use-debounce";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import * as XLSX from "xlsx";


export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [{ title: "Categories — Tally" }],
  }),
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const search = useDebounce(query, 250).trim();
  const addToCart = useCart((s) => s.add);

  const { data: results = [], isFetching: searching } = useQuery({
    queryKey: ["product-search", user?.id, search],
    enabled: !!user && search.length > 0,
    queryFn: async () => {
      const term = `%${search}%`;
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, unit, thumbnail_url, image_url, category_id, categories(name)")
        .or(`name.ilike.${term},barcode.ilike.${term}`)
        .limit(60);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, image_url, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const onSignOut = async () => {
    await supabase.auth.signOut();
  };

  const onDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("categories").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    toast.success("Category deleted");
    setDeleteId(null);
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const exportProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("name, price, stock_qty, unit, barcode, description, category_id, categories(name)")
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    const rows = (data ?? []).map((p: any) => ({
      Category: p.categories?.name ?? "",
      Name: p.name ?? "",
      Price: p.price ?? "",
      Stock: p.stock_qty ?? "",
      Unit: p.unit ?? "",
      Barcode: p.barcode ?? "",
      Description: p.description ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, `products-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${rows.length} products`);
  };

  return (
    <div className="mx-auto max-w-3xl lg:max-w-6xl">
      <header className="sticky top-0 md:top-16 z-30 bg-background/90 backdrop-blur border-b">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">Categories</h1>
            <p className="text-xs text-muted-foreground">Tap to view products · long-press to edit</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button size="icon" variant="ghost" asChild title="Bill history">
              <Link to="/history"><Receipt className="h-5 w-5" /></Link>
            </Button>
            <Button size="icon" variant="ghost" asChild title="Settings">
              <Link to="/settings"><Settings className="h-5 w-5" /></Link>
            </Button>
            <Button size="icon" variant="ghost" onClick={exportProducts} title="Export to Excel">
              <FileSpreadsheet className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onSignOut} title="Sign out">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all products by name or barcode"
              className="pl-9 pr-9 rounded-full bg-muted/60 border-transparent focus-visible:bg-card"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="p-4">
        {search ? (
          searching && results.length === 0 ? (
            <div className="grid place-items-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20">
              <h2 className="font-semibold">No products found</h2>
              <p className="text-sm text-muted-foreground mt-1">Try a different name or barcode.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    addToCart({ productId: p.id, name: p.name ?? "Unnamed", price: Number(p.price ?? 0) });
                    toast.success("Added to bill", { duration: 1200 });
                  }}
                  className="text-left rounded-2xl overflow-hidden bg-card border shadow-soft press-feedback no-select"
                >
                  <div className="aspect-square bg-muted overflow-hidden">
                    {p.thumbnail_url || p.image_url ? (
                      <img src={p.thumbnail_url ?? p.image_url} loading="lazy" decoding="async" alt={p.name ?? ""} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full grid place-items-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="px-2.5 py-2">
                    <div className="text-sm font-medium truncate">{p.name || "Unnamed item"}</div>
                    <div className="text-sm font-bold text-primary">
                      {p.price != null ? `₹${Number(p.price).toFixed(2)}` : "—"}
                      {p.unit && <span className="text-[10px] font-normal text-muted-foreground ml-1">/{p.unit}</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{p.categories?.name ?? "Uncategorized"}</div>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : isLoading ? (
          <SkeletonGrid />
        ) : categories.length === 0 ? (
          <EmptyState onAdd={() => { setEditing(null); setFormOpen(true); }} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {categories.map((c) => (
              <CategoryCard
                key={c.id}
                category={c}
                onEdit={() => { setEditing(c); setFormOpen(true); }}
                onDelete={() => setDeleteId(c.id)}
              />
            ))}
          </div>
        )}
      </div>


      <button
        onClick={() => { setEditing(null); setFormOpen(true); }}
        className="fixed bottom-24 md:bottom-8 right-4 lg:right-[max(2rem,calc((100vw-72rem)/2+2rem))] z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-pop grid place-items-center press-feedback"
        aria-label="Add category"
      >
        <Plus className="h-7 w-7" />
      </button>

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editing} />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              Products in this category will be kept but uncategorized.
            </AlertDialogDescription>
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

function CategoryCard({
  category, onEdit, onDelete,
}: { category: CategoryRow; onEdit: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const lp = useLongPress(() => setMenuOpen(true));

  return (
    <div className="relative group">
      <Link
        to="/category/$id"
        params={{ id: category.id }}
        className="block rounded-2xl overflow-hidden bg-card border shadow-soft press-feedback no-select"
        {...lp}
      >
        <div className="aspect-square bg-muted grid place-items-center overflow-hidden">
          {category.image_url ? (
            <img
              src={category.image_url}
              alt={category.name ?? ""}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <Package className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
        <div className="px-3 py-2">
          <div className="font-semibold text-sm truncate">{category.name || "Unnamed"}</div>
        </div>
      </Link>
      {/* Desktop affordance: long-press/double-click is the touch path; a mouse
          user can't long-press a navigating link, so reveal an edit button on
          hover. Hidden on phones (native + mobile web), so mobile is unchanged. */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(true); }}
        className="hidden md:grid absolute top-1.5 right-1.5 z-10 h-7 w-7 place-items-center rounded-full bg-background/90 text-muted-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Edit category"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {menuOpen && (
        <div
          className="absolute inset-0 z-10 rounded-2xl bg-background/95 border-2 border-primary grid place-items-center"
          onClick={() => setMenuOpen(false)}
        >
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(); }}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-accent grid place-items-center mb-4">
        <ImageIcon className="h-8 w-8 text-accent-foreground" />
      </div>
      <h2 className="text-lg font-semibold">No categories yet</h2>
      <p className="text-sm text-muted-foreground mt-1">Add your first category to start building your catalog.</p>
      <Button className="mt-4" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-1" /> Add category
      </Button>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-muted aspect-[3/4] animate-pulse" />
      ))}
    </div>
  );
}
