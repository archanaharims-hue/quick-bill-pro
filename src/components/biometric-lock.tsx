import { useEffect, useRef, useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBiometric } from "@/lib/biometric-store";
import { unlockWithBiometric } from "@/lib/biometric";
import { useCompany } from "@/lib/company-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Shown by the authenticated layout when biometric unlock is enabled and the
 * app hasn't been unlocked this launch. Auto-prompts on mount; falls back to
 * email/password (sign out → /auth) on demand.
 */
export function BiometricLock() {
  const setUnlocked = useBiometric((s) => s.setUnlocked);
  const companyName = useCompany((s) => s.name) || "SSC";
  const [busy, setBusy] = useState(false);
  const prompted = useRef(false);

  const unlock = async () => {
    setBusy(true);
    const ok = await unlockWithBiometric();
    setBusy(false);
    if (ok) setUnlocked(true);
    else toast.error("Couldn't verify. Try again or use your password.");
  };

  // Auto-prompt once on launch.
  useEffect(() => {
    if (prompted.current) return;
    prompted.current = true;
    void unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usePassword = async () => {
    // Drop the session so the auth guard routes to the email/password screen.
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-dvh grid place-items-center bg-gradient-to-b from-accent/40 to-background p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
          <Fingerprint className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{companyName}</h1>
          <p className="text-sm text-muted-foreground">Locked — verify to continue</p>
        </div>
        <Button className="w-full" onClick={unlock} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Fingerprint className="h-4 w-4 mr-1" />}
          Unlock with fingerprint / Face ID
        </Button>
        <button className="text-sm text-muted-foreground underline" onClick={usePassword}>
          Use password instead
        </button>
      </div>
    </div>
  );
}
