import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, Minus, Plus, Trash2, ShoppingBag, Loader2, Share2, Tag, Percent, X, Check } from "lucide-react";
import { useCart, selectCartSubtotal, type CartItem } from "@/lib/cart-store";
import { useLongPress } from "@/hooks/use-long-press";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCompany } from "@/lib/company-store";
import { useBillFormat } from "@/lib/bill-format-store";
import { PaymentFlow, type PaidInfo } from "@/components/payment-flow";
import { BillReceipt, type ReceiptData, type ReceiptItem } from "@/components/bill-receipt";
import { shareReceipt } from "@/lib/share-receipt";
import { toast } from "sonner";

type DiscountType = "amount" | "percent";

// Snapshot taken when the pending bill is created, so the receipt can be built
// after the cart is cleared.
type PendingBill = {
  id: string;
  number: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
};

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({ meta: [{ title: "Cart — Tally" }] }),
  component: Cart,
});

function Cart() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const setPrice = useCart((s) => s.setPrice);
  const setName = useCart((s) => s.setName);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const subtotal = useCart(selectCartSubtotal);

  const companyName = useCompany((s) => s.name);
  const companyLogo = useCompany((s) => s.logoUrl);
  const companySync = useCompany((s) => s.sync);
  const billFormat = useBillFormat((s) => s.format);
  const billFormatSync = useBillFormat((s) => s.sync);

  const [editing, setEditing] = useState<CartItem | null>(null);
  // Conditional discount/tax — hidden until the owner taps to add them.
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType | null>(null);
  const [discountValue, setDiscountValue] = useState("");
  const [showTax, setShowTax] = useState(false);
  const [taxValue, setTaxValue] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [generating, setGenerating] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  // The bill is created up-front with payment_status='pending' so the UPI QR can
  // embed the real bill number; the payment step then marks it 'paid'.
  const [pendingBill, setPendingBill] = useState<PendingBill | null>(null);

  useEffect(() => { void companySync(); void billFormatSync(); }, [companySync, billFormatSync]);

  const dVal = Number(discountValue || 0);
  const tVal = Number(taxValue || 0);
  // Discount: flat ₹ amount, or a percentage of the subtotal.
  const discountAmount =
    showDiscount && discountType
      ? discountType === "percent"
        ? (subtotal * dVal) / 100
        : dVal
      : 0;
  // Tax basis: treated as a percentage of the subtotal.
  const taxAmount = showTax ? (subtotal * tVal) / 100 : 0;
  const total = Math.max(0, subtotal - discountAmount + taxAmount);

  const proceedToPayment = async () => {
    if (!user || items.length === 0) return;
    setGenerating(true);
    const { data: bill, error } = await supabase
      .from("bills")
      .insert({
        user_id: user.id,
        subtotal,
        discount: discountAmount, // computed amount
        tax: taxAmount, // computed amount
        discount_type: showDiscount && discountType ? discountType : null,
        discount_value: showDiscount && discountType ? dVal : null,
        tax_value: showTax ? tVal : null,
        total,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        payment_status: "pending",
      })
      .select("id, bill_number, total")
      .single();
    if (error || !bill) {
      setGenerating(false);
      return toast.error(error?.message ?? "Failed to create bill");
    }
    const billItems = items.map((i) => ({
      bill_id: bill.id,
      product_id: i.productId,
      name_snapshot: i.name,
      price_snapshot: i.price,
      quantity: i.quantity,
      line_total: i.price * i.quantity,
    }));
    const { error: e2 } = await supabase.from("bill_items").insert(billItems);
    setGenerating(false);
    if (e2) return toast.error(e2.message);
    setPendingBill({
      id: bill.id,
      number: bill.bill_number,
      total: Number(bill.total),
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      items: items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })),
    });
  };

  const onPaid = (info: PaidInfo) => {
    if (!pendingBill) return;
    setReceipt({
      company: { name: companyName, logoUrl: companyLogo },
      billNumber: pendingBill.number,
      date: new Date().toISOString(),
      items: pendingBill.items,
      subtotal: pendingBill.subtotal,
      discount: pendingBill.discount,
      tax: pendingBill.tax,
      total: pendingBill.total,
      paymentMethod: info.payment_method,
      changeReturned: info.change_returned,
      accountLabel: info.account_label,
      format: billFormat,
    });
    setPendingBill(null);
    clear();
  };

  const onCancelPayment = async () => {
    const pb = pendingBill;
    setPendingBill(null);
    // Best-effort cleanup of the abandoned pending bill (bill_items cascade).
    if (pb) await supabase.from("bills").delete().eq("id", pb.id);
  };

  if (receipt) {
    return (
      <ReceiptScreen
        receipt={receipt}
        onDone={() => { setReceipt(null); navigate({ to: "/" }); }}
        onNew={() => setReceipt(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="sticky top-0 md:top-16 z-30 bg-background/90 backdrop-blur border-b">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2 py-3">
          <Link to="/" className="h-10 w-10 grid place-items-center rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold">Current bill</h1>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear}>Clear</Button>
          )}
        </div>
      </header>

      {items.length === 0 ? (
        <div className="text-center py-24 px-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-accent grid place-items-center mb-4">
            <ShoppingBag className="h-8 w-8 text-accent-foreground" />
          </div>
          <h2 className="font-semibold">Cart is empty</h2>
          <p className="text-sm text-muted-foreground mt-1">Tap a product to add it to your bill.</p>
          <Button asChild className="mt-4">
            <Link to="/">Browse categories</Link>
          </Button>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="rounded-2xl border bg-card overflow-hidden divide-y">
            {items.map((item) => (
              <CartLine
                key={item.productId ?? Math.random()}
                item={item}
                onInc={() => setQty(item.productId, item.quantity + 1)}
                onDec={() => setQty(item.productId, item.quantity - 1)}
                onRemove={() => remove(item.productId)}
                onLongPress={() => setEditing(item)}
              />
            ))}
          </div>

          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <Row label="Subtotal" value={`₹${subtotal.toFixed(2)}`} />

            {/* Discount — hidden until added; asks Amount vs Percentage first. */}
            {!showDiscount ? (
              <button
                className="text-sm font-medium text-primary inline-flex items-center gap-1 press-feedback"
                onClick={() => { setShowDiscount(true); setDiscountType(null); }}
              >
                <Plus className="h-4 w-4" /> Add discount
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Discount</Label>
                  <button
                    className="text-muted-foreground"
                    onClick={() => { setShowDiscount(false); setDiscountType(null); setDiscountValue(""); }}
                    aria-label="Remove discount"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {!discountType ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDiscountType("amount")}>
                      <Tag className="h-4 w-4 mr-1" /> Amount (₹)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDiscountType("percent")}>
                      <Percent className="h-4 w-4 mr-1" /> Percentage (%)
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        autoFocus
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        className="pr-9"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {discountType === "percent" ? "%" : "₹"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDiscountType(discountType === "percent" ? "amount" : "percent")}
                    >
                      {discountType === "percent" ? "Use ₹" : "Use %"}
                    </Button>
                  </div>
                )}
                {discountAmount > 0 && <Row label="Discount" value={`−₹${discountAmount.toFixed(2)}`} />}
              </div>
            )}

            {/* Tax — hidden until added; treated as a % of the subtotal. */}
            {!showTax ? (
              <button
                className="text-sm font-medium text-primary inline-flex items-center gap-1 press-feedback"
                onClick={() => setShowTax(true)}
              >
                <Plus className="h-4 w-4" /> Add tax
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tax (% of subtotal)</Label>
                  <button
                    className="text-muted-foreground"
                    onClick={() => { setShowTax(false); setTaxValue(""); }}
                    aria-label="Remove tax"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative">
                  <Input
                    value={taxValue}
                    onChange={(e) => setTaxValue(e.target.value)}
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    className="pr-9"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                {taxAmount > 0 && <Row label="Tax" value={`+₹${taxAmount.toFixed(2)}`} />}
              </div>
            )}

            <div className="border-t pt-3">
              <Row label="Total" value={`₹${total.toFixed(2)}`} bold />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div>
              <Label>Customer name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <Button className="w-full h-12 text-base font-semibold" onClick={proceedToPayment} disabled={generating}>
            {generating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Proceed to payment · ₹{total.toFixed(2)}
          </Button>
        </div>
      )}

      {pendingBill && (
        <PaymentFlow
          billId={pendingBill.id}
          billNumber={pendingBill.number}
          total={pendingBill.total}
          onPaid={onPaid}
          onCancel={onCancelPayment}
        />
      )}

      <EditLineDialog
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(name, price, qty) => {
          if (!editing) return;
          setName(editing.productId, name);
          setPrice(editing.productId, price);
          setQty(editing.productId, qty);
          setEditing(null);
          toast.success("Line updated");
        }}
      />
    </div>
  );
}

function CartLine({
  item, onInc, onDec, onRemove, onLongPress,
}: {
  item: CartItem;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
  onLongPress: () => void;
}) {
  const lp = useLongPress(onLongPress);
  return (
    <div className="px-3 py-3 flex items-center gap-3 no-select" {...lp}>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{item.name || "Unnamed"}</div>
        <div className="text-xs text-muted-foreground">
          ₹{item.price.toFixed(2)} × {item.quantity} ={" "}
          <span className="font-semibold text-foreground">₹{(item.price * item.quantity).toFixed(2)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={onDec}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-6 text-center font-semibold">{item.quantity}</span>
        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={onInc}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ReceiptScreen({
  receipt, onDone, onNew,
}: {
  receipt: ReceiptData;
  onDone: () => void;
  onNew: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const onShare = async () => {
    if (!ref.current) return;
    setSharing(true);
    try {
      await shareReceipt(ref.current, receipt.billNumber);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't generate the receipt image");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-4 md:py-8">
      {/* Success confirmation — intentionally OUTSIDE the ref'd bill card, so it
          never appears in the shared/printed receipt image. */}
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-success text-success-foreground">
          <Check className="h-6 w-6" />
        </div>
        <span className="text-sm font-semibold">Bill generated</span>
      </div>
      <div ref={ref}>
        <BillReceipt data={receipt} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onDone}>Done</Button>
        <Button variant="outline" onClick={onNew}>New bill</Button>
        <Button variant="secondary" className="col-span-2" onClick={onShare} disabled={sharing}>
          {sharing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Share2 className="h-4 w-4 mr-1" />}
          Share receipt
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={"flex items-center justify-between " + (bold ? "text-lg font-bold" : "text-sm")}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function EditLineDialog({
  item, onClose, onSave,
}: { item: CartItem | null; onClose: () => void; onSave: (name: string, price: number, qty: number) => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  useEffect(() => {
    if (item) {
      setName(item.name);
      setPrice(item.price.toString());
      setQty(item.quantity.toString());
    }
  }, [item]);

  return (
    <Dialog
      open={!!item}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setName(""); setPrice(""); setQty("");
        }
      }}
    >
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Edit line</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" inputMode="decimal" />
            </div>
            <div>
              <Label>Qty</Label>
              <Input value={qty} onChange={(e) => setQty(e.target.value)} type="number" inputMode="numeric" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Changes apply to this bill only — master price isn't changed.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { onClose(); setName(""); setPrice(""); setQty(""); }}>Cancel</Button>
          <Button
            onClick={() => {
              onSave(name, Number(price || 0), Math.max(1, Number(qty || 1)));
              setName(""); setPrice(""); setQty("");
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
