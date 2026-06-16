// Generates the "SSC" source icon/splash images that @capacitor/assets consumes.
// Run: node scripts/generate-app-assets.mjs   then   npx @capacitor/assets generate --android
import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("assets", { recursive: true });

const FONT = "Arial, Helvetica, sans-serif";

const gradient = (id, from, to) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
     <stop offset="0" stop-color="${from}"/>
     <stop offset="1" stop-color="${to}"/>
   </linearGradient>`;

const wordmark = (size, fontSize) =>
  `<text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="central"
     font-family="${FONT}" font-weight="800" font-size="${fontSize}"
     letter-spacing="${-fontSize * 0.06}" fill="#ffffff">SSC</text>`;

// Adaptive-icon foreground: transparent, wordmark kept inside the safe centre.
const iconForeground = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${wordmark(1024, 300)}
</svg>`;

// Adaptive-icon background: solid green gradient.
const iconBackground = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${gradient("g", "#22c07a", "#0f7a4d")}</defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
</svg>`;

// Legacy square icon: rounded green tile + wordmark.
const iconOnly = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${gradient("g", "#22c07a", "#0f7a4d")}</defs>
  <rect width="1024" height="1024" rx="190" fill="url(#g)"/>
  ${wordmark(1024, 360)}
</svg>`;

const splash = (from, to) => `
<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <defs>${gradient("g", from, to)}</defs>
  <rect width="2732" height="2732" fill="url(#g)"/>
  ${wordmark(2732, 460)}
</svg>`;

const jobs = [
  ["assets/icon-foreground.png", iconForeground],
  ["assets/icon-background.png", iconBackground],
  ["assets/icon-only.png", iconOnly],
  ["assets/splash.png", splash("#22c07a", "#0c5f3c")],
  ["assets/splash-dark.png", splash("#0f7a4d", "#06281a")],
];

for (const [out, svg] of jobs) {
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log("wrote", out);
}
