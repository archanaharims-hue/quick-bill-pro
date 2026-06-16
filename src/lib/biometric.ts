import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

// Biometric unlock helpers. Native-only (APK). The OS decides the method —
// fingerprint, Face ID, or the device PIN/pattern fallback — because we request
// biometric auth with `allowDeviceCredential`. Plugin/storage modules are
// dynamically imported so the web/SSR bundle never evaluates native code.

const TOKEN_KEY = "ssc.biometric.refresh_token";

/** True if biometrics (or a secure device lock we can fall back to) are usable. */
export async function biometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    const info = await BiometricAuth.checkBiometry();
    // We allow the device-credential fallback, so a secured device counts too.
    return info.isAvailable || info.deviceIsSecure;
  } catch {
    return false;
  }
}

/** Shows the OS biometric prompt. Resolves true on success, false on cancel/fail. */
export async function biometricPrompt(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    await BiometricAuth.authenticate({
      reason: "Unlock SSC",
      androidTitle: "Unlock SSC",
      androidSubtitle: "Use your fingerprint, face, or device PIN",
      allowDeviceCredential: true, // let the OS fall back to PIN / pattern
      androidConfirmationRequired: false,
      cancelTitle: "Use password",
    });
    return true;
  } catch {
    return false;
  }
}

export async function storeRefreshToken(token: string): Promise<void> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: TOKEN_KEY, value: token });
  } catch {
    /* ignore */
  }
}

export async function readRefreshToken(): Promise<string | null> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    return value ?? null;
  } catch {
    return null;
  }
}

export async function clearRefreshToken(): Promise<void> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key: TOKEN_KEY });
  } catch {
    /* ignore */
  }
}

/**
 * Runs the biometric prompt and ensures there's a live Supabase session
 * afterwards — restoring it from the stored refresh token if needed.
 */
export async function unlockWithBiometric(): Promise<boolean> {
  const ok = await biometricPrompt();
  if (!ok) return false;

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    const token = await readRefreshToken();
    if (!token) return false;
    const { error } = await supabase.auth.refreshSession({ refresh_token: token });
    if (error) return false;
  }
  return true;
}
