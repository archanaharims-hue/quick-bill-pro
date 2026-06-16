# SSC — Quick Bill Pro

A mobile-first billing app for shop owners. React + TypeScript on TanStack Start (SSR), Supabase for data/auth, and Capacitor for the Android app (`com.ssc.app`).

## Features
- Category → product catalog with image upload (camera / gallery / URL, auto-compressed to WebP).
- Cart + billing with conditional discount (₹/%) and tax, live totals.
- Cash & free direct-UPI payments — on-screen dynamic QR (no gateway, no fees), per-account.
- Receipt-style success screen, share as a high-res PNG (native share sheet / Web Share).
- Bill history (deletable, offline-queued), Supabase storage usage meter.
- Fully customizable bill format (per-element alignment / size / labels / visibility).
- Biometric unlock (fingerprint / Face ID / device PIN) on the APK.
- SSC splash screen; mobile-only phone column in the APK, responsive on web.

## Develop
```bash
npm install
npm run dev          # web (http://localhost:8080) — use ?native=1 to preview the phone column
```
Requires a `.env` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (and SSR equivalents). `.env` is git-ignored.

## Database
Apply the SQL in `supabase/migrations/` (in filename order) via the Supabase SQL editor, then `NOTIFY pgrst, 'reload schema';`.

## Build the Android APK
```bash
npm run build:mobile         # static SPA build → dist/client
npx cap sync android
cd android
# Capacitor 7 needs JDK 21 (Android Studio's bundled JBR works):
#   $env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
./gradlew.bat assembleDebug  # → android/app/build/outputs/apk/debug/app-debug.apk
```
`npm run build` produces the normal SSR build for web hosting.
