import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, QrCode, ChevronLeft, X, Check, Loader2, Star } from "lucide-react";
import { useUpiAccounts, selectDefaultUpiAccount, type UpiAccount } from "@/lib/upi-store";
import { buildUpiUri } from "@/lib/upi";
import { UpiQR } from "@/components/upi-qr";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PaidInfo = {
  payment_method: "cash" | "upi";
  amount_received?: number | null;
  change_returned?: number | null;
  account_label?: string | null;
};

type Props = {
  billId: string;
  billNumber: string;
  total: number;
  onPaid: (info: PaidInfo) => void;
  onCancel: () => void;
};

/**
 * Payment step shown after the cart. Owner picks Cash or UPI. For UPI the app
 * only DISPLAYS a per-bill dynamic QR for the customer to scan — it never opens
 * a UPI app or fires an intent on the owner's device.
 */
export function PaymentFlow({ billId, billNumber, total, onPaid, onCancel }: Props) {
  const [step, setStep] = useState<"method" | "cash" | "upi">("method");
  const [saving, setSaving] = useState(false);

  const finalizeCash = async (amountReceived: number, change: number) => {
    setSaving(true);
    const { error } = await supabase
      .from("bills")
      .update({
        payment_method: "cash",
        payment_status: "paid",
        amount_received: amountReceived,
        change_returned: change,
      })
      .eq("id", billId);
    setSaving(false);
    if (error) return toast.error(error.message);
    onPaid({ payment_method: "cash", amount_received: amountReceived, change_returned: change });
  };

  const finalizeUpi = async (account: UpiAccount) => {
    setSaving(true);
    const { error } = await supabase
      .from("bills")
      .update({
        payment_method: "upi",
        payment_status: "paid",
        upi_account_id: account.id,
        upi_id_used: account.upi_id,
      })
      .eq("id", billId);
    setSaving(false);
    if (error) return toast.error(error.message);
    onPaid({ payment_method: "upi", account_label: account.label });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-2 py-3">
        {step === "method" ? (
          <Button size="icon" variant="ghost" onClick={onCancel} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        ) : (
          <Button size="icon" variant="ghost" onClick={() => setStep("method")} aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="font-bold leading-tight truncate">Payment</h1>
          <p className="text-xs text-muted-foreground truncate">{billNumber}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-md">
          {step === "method" && (
            <MethodStep total={total} onCash={() => setStep("cash")} onUpi={() => setStep("upi")} />
          )}
          {step === "cash" && <CashStep total={total} saving={saving} onConfirm={finalizeCash} />}
          {step === "upi" && (
            <UpiStep billNumber={billNumber} total={total} saving={saving} onConfirm={finalizeUpi} />
          )}
        </div>
      </div>
    </div>
  );
}

function AmountHeader({ total }: { total: number }) {
  return (
    <div className="text-center mb-6">
      <div className="text-sm text-muted-foreground">Amount to collect</div>
      <div className="text-4xl font-black">₹{total.toFixed(2)}</div>
    </div>
  );
}

function MethodStep({ total, onCash, onUpi }: { total: number; onCash: () => void; onUpi: () => void }) {
  return (
    <div>
      <AmountHeader total={total} />
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCash}
          className="rounded-2xl border bg-card p-6 flex flex-col items-center gap-2 press-feedback"
        >
          <Banknote className="h-9 w-9 text-success" />
          <span className="font-semibold">Cash</span>
        </button>
        <button
          onClick={onUpi}
          className="rounded-2xl border bg-card p-6 flex flex-col items-center gap-2 press-feedback"
        >
          <QrCode className="h-9 w-9 text-primary" />
          <span className="font-semibold">UPI</span>
        </button>
      </div>
    </div>
  );
}

function CashStep({
  total, saving, onConfirm,
}: {
  total: number;
  saving: boolean;
  onConfirm: (amountReceived: number, change: number) => void;
}) {
  const [received, setReceived] = useState("");
  const receivedNum = Number(received || 0);
  const diff = receivedNum - total;
  const change = Math.max(0, diff); // change owed to customer, never negative
  const balanceDue = Math.max(0, -diff); // still owed by customer, never negative

  return (
    <div>
      <AmountHeader total={total} />
      <Label>Amount received</Label>
      <Input
        autoFocus
        value={received}
        onChange={(e) => setReceived(e.target.value)}
        type="number"
        inputMode="decimal"
        placeholder="0"
        className="text-2xl h-14 font-bold"
      />

      {received !== "" && (
        <div
          className={
            "mt-4 rounded-2xl border p-4 text-center " +
            (diff >= 0 ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10")
          }
        >
          {diff >= 0 ? (
            <>
              <div className="text-sm text-muted-foreground">Change to return</div>
              <div className="text-3xl font-black text-success-foreground">₹{change.toFixed(2)}</div>
            </>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">Balance due</div>
              <div className="text-3xl font-black text-destructive">₹{balanceDue.toFixed(2)}</div>
            </>
          )}
        </div>
      )}

      <Button
        className="w-full h-12 mt-6 text-base font-semibold"
        disabled={saving || received === ""}
        onClick={() => onConfirm(receivedNum, change)}
      >
        {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
        <Check className="h-5 w-5 mr-1" /> Confirm cash payment
      </Button>
    </div>
  );
}

function UpiStep({
  billNumber, total, saving, onConfirm,
}: {
  billNumber: string;
  total: number;
  saving: boolean;
  onConfirm: (account: UpiAccount) => void;
}) {
  const accounts = useUpiAccounts((s) => s.accounts);
  const fallback = useUpiAccounts(selectDefaultUpiAccount);

  // Step A — account picker: only when more than one account exists.
  const [picked, setPicked] = useState<UpiAccount | null>(accounts.length === 1 ? accounts[0] : null);
  const account = picked ?? (accounts.length === 1 ? accounts[0] : null);

  const uri = useMemo(
    () =>
      account?.upi_id
        ? buildUpiUri({ pa: account.upi_id, pn: account.payee_name, am: total, tn: billNumber })
        : "",
    [account, total, billNumber]
  );

  if (accounts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-muted-foreground">No UPI account configured yet.</p>
        <Button asChild className="mt-4">
          <Link to="/settings">Add one in Settings</Link>
        </Button>
      </div>
    );
  }

  // Step A — picker.
  if (!account) {
    return (
      <div>
        <h2 className="font-semibold text-center mb-1">Receive into which account?</h2>
        <p className="text-xs text-muted-foreground text-center mb-4">Tap the account for this payment.</p>
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => setPicked(a)}
                className="w-full text-left rounded-2xl border bg-card px-4 py-3 press-feedback flex items-center justify-between gap-3"
              >
                <span className="min-w-0">
                  <span className="font-semibold flex items-center gap-2">
                    {a.label || "Untitled"}
                    {a.id === fallback?.id && <Star className="h-3.5 w-3.5 text-primary fill-current" />}
                  </span>
                  <span className="block text-sm text-muted-foreground truncate">{a.upi_id}</span>
                </span>
                <ChevronLeft className="h-5 w-5 rotate-180 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Step B — dynamic QR + Step C — confirm.
  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-3">
        <div className="text-sm text-muted-foreground">Scan to pay</div>
        <div className="text-3xl font-black">₹{total.toFixed(2)}</div>
        <div className="text-sm font-medium mt-0.5">{account.label || account.payee_name || account.upi_id}</div>
        {account.payee_name && account.label && (
          <div className="text-xs text-muted-foreground">{account.payee_name}</div>
        )}
      </div>

      {uri && <UpiQR value={uri} size={260} />}

      <p className="text-xs text-muted-foreground text-center mt-3 max-w-xs">
        Customer scans with any UPI app — the ₹{total.toFixed(2)} amount is pre-filled. Tap Completed once
        you see the payment land in your bank app.
      </p>

      {accounts.length > 1 && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setPicked(null)}>
          Change account
        </Button>
      )}

      <Button
        className="w-full h-12 mt-4 text-base font-semibold"
        disabled={saving}
        onClick={() => onConfirm(account)}
      >
        {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
        <Check className="h-5 w-5 mr-1" /> Completed
      </Button>
      {/* NOTE: The app cannot auto-verify receipt of a UPI payment. True
          confirmation requires a paid bank/PSP reconciliation API; here the
          owner visually confirms the credit in their bank app and taps
          Completed. No gateway, SDK, or commission is involved. */}
    </div>
  );
}
