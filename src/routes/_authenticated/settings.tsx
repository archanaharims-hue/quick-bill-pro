import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft, Plus, Pencil, Trash2, QrCode, Star, Wallet,
  Building2, HardDrive, Database, RefreshCw, Loader2, Save, Fingerprint,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useUpiAccounts, type UpiAccount } from "@/lib/upi-store";
import { useCompany } from "@/lib/company-store";
import { useBiometric } from "@/lib/biometric-store";
import { biometricAvailable } from "@/lib/biometric";
import { buildUpiUri } from "@/lib/upi";
import { UpiQR } from "@/components/upi-qr";
import { ImagePicker } from "@/components/image-picker";
import { BillFormatSection } from "@/components/bill-format-settings";
import { DisplaySection, PasskeySection } from "@/components/display-passkey-settings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — SSC" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const accounts = useUpiAccounts((s) => s.accounts);
  const sync = useUpiAccounts((s) => s.sync);
  const setDefault = useUpiAccounts((s) => s.setDefault);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UpiAccount | null>(null);
  const [deleting, setDeleting] = useState<UpiAccount | null>(null);
  const [testing, setTesting] = useState<UpiAccount | null>(null);

  useEffect(() => {
    void sync();
  }, [sync]);

  return (
    <div className="mx-auto max-w-2xl lg:max-w-3xl">
      <header className="sticky top-0 md:top-16 z-30 bg-background/90 backdrop-blur border-b">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2 py-3">
          <Link to="/" className="h-10 w-10 grid place-items-center rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold">Settings</h1>
          <span />
        </div>
      </header>

      <div className="p-4 space-y-4">
        <DisplaySection />
        <PasskeySection />
        <BillFormatSection />

        <section className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold leading-tight">UPI accounts</h2>
                <p className="text-xs text-muted-foreground">Customers scan these to pay you directly.</p>
              </div>
            </div>
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {accounts.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No UPI accounts yet. Add at least one (e.g. <span className="font-medium">name@oksbi</span>).
            </div>
          ) : (
            <ul className="divide-y">
              {accounts.map((a) => (
                <li key={a.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{a.label || "Untitled"}</span>
                        {a.is_default && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5">
                            <Star className="h-3 w-3 fill-current" /> Default
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{a.upi_id || "—"}</div>
                      {a.payee_name && <div className="text-xs text-muted-foreground truncate">{a.payee_name}</div>}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setTesting(a)} disabled={!a.upi_id}>
                      <QrCode className="h-4 w-4 mr-1" /> Test QR
                    </Button>
                    {!a.is_default && (
                      <Button size="sm" variant="ghost" onClick={() => setDefault(a.id)}>
                        <Star className="h-4 w-4 mr-1" /> Make default
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(a)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-xs text-muted-foreground px-1">
          Free direct-UPI: every QR points to one of your own UPI IDs and money moves bank-to-bank on
          UPI rails. No payment gateway, SDK, or commission is involved.
        </p>

        <BiometricSection />

        <StorageSection />
      </div>

      <AccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editing}
        isFirst={accounts.length === 0}
      />

      <TestQrDialog account={testing} onClose={() => setTesting(null)} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete UPI account?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.label || deleting?.upi_id}" will be removed. Past bills keep their snapshot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) {
                  useUpiAccounts.getState().deleteAccount(deleting.id);
                  toast.success("Account deleted");
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

function BiometricSection() {
  const native = Capacitor.isNativePlatform();
  const enabled = useBiometric((s) => s.enabled);
  const enable = useBiometric((s) => s.enable);
  const disable = useBiometric((s) => s.disable);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (native) void biometricAvailable().then(setAvailable);
  }, [native]);

  if (!native) {
    return (
      <section className="rounded-2xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <Fingerprint className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold leading-tight">Biometric unlock</h2>
            <p className="text-xs text-muted-foreground">Available on the Android app.</p>
          </div>
        </div>
      </section>
    );
  }

  const onToggle = async (v: boolean) => {
    setBusy(true);
    if (v) {
      const ok = await enable();
      toast[ok ? "success" : "error"](
        ok ? "Biometric unlock enabled" : "No fingerprint / Face ID set up on this device."
      );
    } else {
      await disable();
      toast.success("Biometric unlock turned off");
    }
    setBusy(false);
  };

  return (
    <section className="rounded-2xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold leading-tight">Biometric unlock</h2>
            <p className="text-xs text-muted-foreground">Fingerprint / Face ID / device PIN.</p>
          </div>
        </div>
        <Switch checked={enabled} disabled={busy || !available} onCheckedChange={onToggle} />
      </div>
      <div className="p-4 space-y-2">
        <p className="text-xs text-muted-foreground">
          {available
            ? "Sign in once with your password, then unlock with your fingerprint, face, or device PIN."
            : "Set up a fingerprint, face, or screen lock in your device settings to use this."}
        </p>
        {enabled && (
          <Button variant="outline" size="sm" onClick={() => onToggle(false)} disabled={busy}>
            Forget device
          </Button>
        )}
      </div>
    </section>
  );
}

function StorageSection() {
  const [dbBytes, setDbBytes] = useState<number | null>(null);
  const [fileBytes, setFileBytes] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [dbRes, fileRes] = await Promise.all([
      supabase.rpc("database_size_bytes"),
      supabase.rpc("storage_usage_bytes"),
    ]);
    if (!dbRes.error) setDbBytes(Number(dbRes.data));
    if (!fileRes.error) setFileBytes(Number(fileRes.data));
    if (dbRes.error || fileRes.error) toast.error("Couldn't read usage (run the storage RPC SQL?)");
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  return (
    <section className="rounded-2xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold leading-tight">Storage</h2>
            <p className="text-xs text-muted-foreground">Free-tier usage.</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={load} disabled={loading} aria-label="Refresh usage">
          <RefreshCw className={"h-5 w-5" + (loading ? " animate-spin" : "")} />
        </Button>
      </div>
      <div className="p-4 space-y-4">
        <Meter icon={Database} label="Database" bytes={dbBytes} limitMB={500} />
        <Meter icon={HardDrive} label="File / image storage" bytes={fileBytes} limitMB={1024} />
      </div>
    </section>
  );
}

function Meter({
  icon: Icon, label, bytes, limitMB,
}: {
  icon: typeof Database;
  label: string;
  bytes: number | null;
  limitMB: number;
}) {
  const usedMB = bytes == null ? null : bytes / (1024 * 1024);
  const pct = usedMB == null ? 0 : Math.min(100, (usedMB / limitMB) * 100);
  const danger = pct >= 90;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" /> {label}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {usedMB == null ? "—" : usedMB.toFixed(1)} MB / {limitMB} MB
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={"h-full rounded-full " + (danger ? "bg-destructive" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-right text-[11px] text-muted-foreground tabular-nums">
        {usedMB == null ? "" : `${pct.toFixed(1)}%`}
      </div>
    </div>
  );
}

function AccountFormDialog({
  open, onOpenChange, account, isFirst,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  account: UpiAccount | null;
  isFirst: boolean;
}) {
  const addAccount = useUpiAccounts((s) => s.addAccount);
  const updateAccount = useUpiAccounts((s) => s.updateAccount);

  const [label, setLabel] = useState("");
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(account?.label ?? "");
      setUpiId(account?.upi_id ?? "");
      setPayeeName(account?.payee_name ?? "");
      // First account is default by default.
      setIsDefault(account?.is_default ?? isFirst);
    }
  }, [open, account, isFirst]);

  const onSave = async () => {
    if (!upiId.trim()) return toast.error("UPI ID is required");
    const data = {
      label: label.trim() || null,
      upi_id: upiId.trim(),
      payee_name: payeeName.trim() || null,
      is_default: isDefault,
    };
    if (account) {
      await updateAccount(account.id, data);
      if (isDefault && !account.is_default) await useUpiAccounts.getState().setDefault(account.id);
      toast.success("Account updated");
    } else {
      await addAccount(data);
      if (isDefault) {
        const created = useUpiAccounts.getState().accounts.find((a) => a.upi_id === data.upi_id);
        if (created) await useUpiAccounts.getState().setDefault(created.id);
      }
      toast.success("Account added");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Edit UPI account" : "New UPI account"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. SBI" />
          </div>
          <div>
            <Label>UPI ID</Label>
            <Input
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="name@oksbi"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <Label>Payee name (optional)</Label>
            <Input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="Shown to customer" />
          </div>
          <div className="flex items-center justify-between rounded-xl border px-3 py-2">
            <span className="text-sm font-medium">Set as default</span>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestQrDialog({ account, onClose }: { account: UpiAccount | null; onClose: () => void }) {
  const uri = account?.upi_id
    ? buildUpiUri({ pa: account.upi_id, pn: account.payee_name, am: 1, tn: "TEST" })
    : "";
  return (
    <Dialog open={!!account} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Test QR · ₹1</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          {uri && <UpiQR value={uri} size={220} />}
          <div className="text-center">
            <div className="font-semibold">{account?.label || account?.upi_id}</div>
            <div className="text-xs text-muted-foreground break-all">{account?.upi_id}</div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Scan with another phone's UPI app to verify this ID resolves to your account. Don't actually pay.
          </p>
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
