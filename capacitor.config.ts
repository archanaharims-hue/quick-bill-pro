import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ssc.app",
  appName: "SSC",
  // Static SPA bundle produced by `npm run build:mobile`.
  webDir: "dist/client",
  plugins: {
    SplashScreen: {
      // Native OS launch splash (shown before the web view loads). The in-app
      // animated "SSC" splash takes over once the web bundle renders.
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#0f7a4d",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
