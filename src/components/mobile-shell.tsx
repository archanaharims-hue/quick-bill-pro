import type { ReactNode } from "react";
import { useIsNative } from "@/hooks/use-is-native";

/**
 * Native app (Capacitor APK): constrains the UI to a phone-width column
 * (max 480px) centred on a dark backdrop — the mobile-only experience.
 *
 * Web browser: renders children full-width so the responsive desktop/tablet
 * layouts can use the real available width.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  const isNative = useIsNative();

  if (!isNative) {
    return <>{children}</>;
  }

  return (
    <div className="app-frame">
      <div className="app-shell">{children}</div>
    </div>
  );
}
