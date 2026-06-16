import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Returns true only when running inside the Capacitor native app (the Android
 * APK), false in a normal web browser.
 *
 * Detection runs in an effect so the server-rendered / prerendered markup and
 * the first client render always agree (both `false`); the value flips to
 * `true` after mount on the native build. The SSC splash covers this brief
 * transition on launch.
 *
 * Local testing override: append `?native=1` to the URL in a browser to force
 * the native (480px phone-column) layout, and `?native=0` to clear it. The
 * choice is remembered in localStorage. This never affects the real APK, which
 * is always native.
 */
export function useIsNative() {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform() || hasNativeOverride());
  }, []);

  return isNative;
}

function hasNativeOverride() {
  try {
    const param = new URLSearchParams(window.location.search).get("native");
    if (param === "1") localStorage.setItem("ssc:force-native", "1");
    else if (param === "0") localStorage.removeItem("ssc:force-native");
    return localStorage.getItem("ssc:force-native") === "1";
  } catch {
    return false;
  }
}
