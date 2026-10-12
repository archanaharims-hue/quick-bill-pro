import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCompany } from "@/lib/company-store";
import { useBiometric } from "@/lib/biometric-store";
import { biometricAvailable, unlockWithBiometric } from "@/lib/biometric";
import { toast } from "sonner";
import { Loader2, ShoppingBag, Fingerprint, KeyRound } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { loginWithPasskey } from "@/lib/passkeys.functions";

// Neutral default tagline (no hardcoded marketing line / no "Tally").
const DEFAULT_TAGLINE = "Billing, made simple.";

export const Route = createFileRoute("/auth")({
  // Client-only: the login screen reads persisted local stores (company name,
  // biometric state), so rendering it on the server would cause a hydration
  // mismatch. The root shell + splash still SSR/prerender as before.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — SSC" },
      { name: "description", content: "Sign in to your billing account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const companyName = useCompany((s) => s.name);
  const companyLogo = useCompany((s) => s.logoUrl);
  const bioEnabled = useBiometric((s) => s.enabled);
  const setUnlocked = useBiometric((s) => s.setUnlocked);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [bioReady, setBioReady] = useState(false);
  const [code, setCode] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const loginFn = useServerFn(loginWithPasskey);

  const onPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { tokenHash } = await loginFn({ data: { code } });
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (error) throw error;
      setUnlocked(true);
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wrong passkey");
    } finally {
      setBusy(false);
    }
  };

  // Biometric unlock is APK-only and only offered once it's been enabled.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !bioEnabled) return;
    void biometricAvailable().then(setBioReady);
  }, [bioEnabled]);

  if (!loading && session) return <Navigate to="/" />;

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    setUnlocked(true); // just authenticated — don't immediately re-lock
    navigate({ to: "/" });
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setUnlocked(true);
    toast.success("Account created — you're in!");
    navigate({ to: "/" });
  };

  const onBiometric = async () => {
    setBusy(true);
    const ok = await unlockWithBiometric();
    setBusy(false);
    if (!ok) return toast.error("Couldn't verify. Use email and password.");
    setUnlocked(true);
    navigate({ to: "/" });
  };

  const title = companyName || "SSC";

  return (
    <div className="min-h-dvh grid place-items-center bg-gradient-to-b from-accent/40 to-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-soft overflow-hidden">
            {companyLogo ? (
              <img src={companyLogo} alt="" className="h-full w-full object-cover" />
            ) : (
              <ShoppingBag className="h-7 w-7" />
            )}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{DEFAULT_TAGLINE}</p>
          </div>
        </div>
        <div className="rounded-3xl border bg-card p-5 shadow-soft">
          {!showEmail ? (
            <form className="space-y-3" onSubmit={onPasskey}>
              <div>
                <Label>Passkey</Label>
                <Input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter your passkey"
                  autoFocus
                  required
                  className="text-center text-lg tracking-widest h-12"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <KeyRound className="h-4 w-4 mr-1" />} Unlock
              </Button>
              <button type="button" className="w-full text-xs text-muted-foreground underline" onClick={() => setShowEmail(true)}>
                Admin sign in with email
              </button>
            </form>
          ) : (
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form className="space-y-3 mt-3" onSubmit={onSignIn}>
                <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
                <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Sign in
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form className="space-y-3 mt-3" onSubmit={onSignUp}>
                <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
                <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>
            <button type="button" className="mt-3 w-full text-xs text-muted-foreground underline" onClick={() => setShowEmail(false)}>
              Use passkey instead
            </button>
          </Tabs>
          )}
        </div>

        {bioReady && (
          <>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={onBiometric} disabled={busy}>
              <Fingerprint className="h-4 w-4 mr-1" /> Unlock with fingerprint / Face ID
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label, type, value, onChange, autoComplete,
}: { label: string; type: string; value: string; onChange: (v: string) => void; autoComplete?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required />
    </div>
  );
}
