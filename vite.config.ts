import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

// Plain TanStack Start config using public plugins only.
// The previous third-party build-config wrapper (which bundled a dev-only
// component tagger / watermark) has been removed so no external branding can
// be re-injected on rebuild.
//
// Build modes:
//   - `vite build`                -> normal SSR build (for web hosting).
//   - `vite build --mode mobile`  -> static SPA build with a prerendered
//                                    index.html in dist/client, used to package
//                                    the native Android (Capacitor) app.
export default defineConfig(({ mode }) => {
  const isMobile = mode === "mobile";

  return {
    server: { host: "::", port: 8080 },
    css: { transformer: "lightningcss" },
    // The deployed server runs in a Worker with no runtime module resolution,
    // so every dependency must be bundled into the server output.
    ssr: { noExternal: true },

    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
        server: { entry: "server" },
        // Mobile build: emit a fully static client SPA (dist/client/index.html)
        // so it can be bundled into the Capacitor Android app.
        ...(isMobile ? { spa: { enabled: true } } : {}),
      }),
      viteReact(),
    ],
  };
});
