// After a `vite build --mode mobile` (TanStack Start SPA mode), the static
// entry document is emitted as dist/client/_shell.html. Capacitor expects an
// index.html at the web-dir root, so we copy it into place.
import { copyFileSync, existsSync } from "node:fs";

const shell = "dist/client/_shell.html";
const index = "dist/client/index.html";

if (!existsSync(shell)) {
  console.error(
    `[postbuild-spa] ${shell} not found. Run 'vite build --mode mobile' first.`,
  );
  process.exit(1);
}

copyFileSync(shell, index);
console.log(`[postbuild-spa] Wrote ${index} (Capacitor entry point).`);
