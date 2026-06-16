import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/components/bottom-nav";
import { BiometricLock } from "@/components/biometric-lock";
import { useBiometric } from "@/lib/biometric-store";
import { useIsNative } from "@/hooks/use-is-native";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Layout,
});

function Layout() {
  const { session, loading } = useAuth();
  const isNative = useIsNative();
  const bioEnabled = useBiometric((s) => s.enabled);
  const bioUnlocked = useBiometric((s) => s.unlocked);
  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" />;
  // Biometric lock (APK only): a valid session exists but the app must be
  // unlocked with fingerprint/Face ID/PIN before showing any content.
  if (Capacitor.isNativePlatform() && bioEnabled && !bioUnlocked) {
    return <BiometricLock />;
  }
  // Native + small-screen web use a fixed bottom bar (needs bottom padding).
  // md+ web uses the in-flow sticky top bar instead, so drop the bottom padding.
  return (
    <div className={cn("min-h-dvh", isNative ? "pb-20" : "pb-20 md:pb-0")}>
      {/* Rendered before the Outlet so the desktop top bar sits at the top of
          the flow; the bottom bars are position:fixed so order doesn't matter. */}
      <BottomNav />
      <Outlet />
    </div>
  );
}
