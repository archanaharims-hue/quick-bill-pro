import { toPng } from "html-to-image";
import { Capacitor } from "@capacitor/core";

// Why PNG (DOM → image) instead of PDF:
// Capturing the already-rendered receipt node reproduces it 1:1 — same fonts,
// greens, spacing and logo — with no manual re-layout, and at pixelRatio 3 it's
// sharp enough to print. A jsPDF route would either need a hand-built layout or
// would just embed this same PNG inside a PDF, so PNG is the cleaner/sharper
// choice for a phone receipt.

/** Renders `node` to a high-res PNG and shares it via the native sheet (APK) or
 *  the Web Share API (web), falling back to a direct download. */
export async function shareReceipt(node: HTMLElement, billNumber: string) {
  const dataUrl = await toPng(node, {
    pixelRatio: 3,
    cacheBust: true,
    backgroundColor: "#ffffff",
  });
  const fileName = `${(billNumber || "receipt").replace(/[^\w-]/g, "_")}.png`;

  if (Capacitor.isNativePlatform()) {
    await shareNative(dataUrl, fileName);
  } else {
    await shareWeb(dataUrl, fileName, billNumber);
  }
}

async function shareNative(dataUrl: string, fileName: string) {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");
  const base64 = dataUrl.split(",")[1];
  const written = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  });
  await Share.share({ title: "Receipt", text: `Receipt ${fileName}`, files: [written.uri] });
}

async function shareWeb(dataUrl: string, fileName: string, billNumber: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], fileName, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: unknown) => boolean };

  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: "Receipt", text: `Receipt ${billNumber}` });
      return;
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return; // user dismissed the sheet
      // otherwise fall through to download
    }
  }

  // Fallback: direct download (browsers without file-share support).
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
