import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, Banknote, QrCode, Loader2, Receipt, Trash2, User } from "lucide-react";
import { useBillDeletes } from "@/lib/bill-deletes-store";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Bill history — SSC" }] }),
  component: HistoryPage,
});

type BillRow = {
  id: string;
  bill_number: string;
  total: number;
  created_at: string;
  customer_name: string | null;
  payment_method: string | null;
  payment_status: string | null;
  amount_received: number | null;
  change_returned: number | null;
  upi_id_used: string | null;
  upi_accounts: { label: string | null } | null;
};

function HistoryPage() {
  const { user } = useAuth();
  const pendingIds = useBillDeletes((s) => s.pendingIds);
  const enqueueDelete = useBillDeletes((s) => s.enqueue);
  const flushDeletes = useBillDeletes((s) => s.flush);
  const [deleting, setDeleting] = useState<BillRow | null>(null);

  // Push any deletes that were queued offline.
  useEffect(() => { void flushDeletes(); }, [flushDeletes]);

  const { data: allBills = [], isLoading } = useQuery({
    queryKey: ["bills", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select(
          "id, bill_number, total, created_at, customer_name, payment_method, payment_status, amount_received, change_returned, upi_id_used, upi_accounts(label)"
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as BillRow[];
    },
  });

  // Hide bills that are queued for (or already) deleted, so removal is instant
  // and survives an offline reload.
  const bills = allBills.filter((b) => !pendingIds.includes(b.id));

  return (
    <div className="mx-auto max-w-2xl lg:max-w-3xl">
      <header className="sticky top-0 md:top-16 z-30 bg-background/90 backdrop-blur border-b">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2 py-3">
          <Link to="/" className="h-10 w-10 grid place-items-center rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold">Bill history</h1>
          <span />
        </div>
      </header>

      <div className="p-4">
        {isLoading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-accent grid place-items-center mb-3">
              <Receipt className="h-7 w-7 text-accent-foreground" />
            </div>
            <h2 className="font-semibold">No bills yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Generated bills will appear here.</p>
          </div>
        ) : (
          <ul className="rounded-2xl border bg-card overflow-hidden divide-y">
            {bills.map((b) => (
              <li key={b.id} className="px-4 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{b.bill_number}</div>
                  {b.customer_name && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <User className="h-3 w-3 shrink-0" /> {b.customer_name}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {b.created_at ? format(new Date(b.created_at), "dd MMM yyyy · h:mm a") : ""}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold">₹{Number(b.total).toFixed(2)}</div>
                  <PaymentTag bill={b} />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground shrink-0"
                  onClick={() => setDeleting(b)}
                  aria-label="Delete bill"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bill {deleting?.bill_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the bill and its items. It can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) {
                  void enqueueDelete(deleting.id);
                  toast.success("Bill deleted");
                }
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PaymentTag({ bill }: { bill: BillRow }) {
  const method = bill.payment_method;
  if (method === "cash") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Banknote className="h-3.5 w-3.5 text-success" /> Cash
      </span>
    );
  }
  if (method === "upi") {
    const label = bill.upi_accounts?.label || bill.upi_id_used || "UPI";
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <QrCode className="h-3.5 w-3.5 text-primary" /> UPI · {label}
      </span>
    );
  }
  // pending / unspecified
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
      {bill.payment_status === "pending" ? "Pending" : "—"}
    </span>
  );
}
