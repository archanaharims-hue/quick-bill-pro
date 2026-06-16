// Per-element bill formatting config. Presentation only — it never touches
// totals math or the Cash/UPI flow. The same object drives the Settings live
// preview, the success-screen bill, and the shared PNG.

export type Align = "left" | "center" | "right";
export type Size = "small" | "medium" | "large";
export type DateStyle = "long" | "short";

export type BillFormat = {
  logo: { visible: boolean; align: Align; size: Size };
  companyName: { visible: boolean; align: Align; size: Size; bold: boolean };
  address: { visible: boolean; align: Align; size: Size; text: string };
  invoice: { visible: boolean; align: Align; size: Size; text: string }; // text = label prefix
  date: { visible: boolean; align: Align; size: Size; style: DateStyle };
  items: { size: Size; align: Align; showQty: boolean; showRate: boolean };
  subtotal: { visible: boolean; size: Size; text: string };
  discount: { visible: boolean; size: Size; text: string };
  tax: { visible: boolean; size: Size; text: string };
  total: { size: Size; text: string; bold: boolean }; // always visible
  payment: { visible: boolean; align: Align; size: Size };
  balance: { visible: boolean; size: Size; text: string };
  upiLabel: { visible: boolean; size: Size };
  footer: { visible: boolean; align: Align; size: Size; text: string };
};

// Defaults reproduce the current receipt design (centered logo/name/invoice,
// no address/date/footer, items with qty + rate, bold Total, payment badge).
export const DEFAULT_BILL_FORMAT: BillFormat = {
  logo: { visible: true, align: "center", size: "medium" },
  companyName: { visible: true, align: "center", size: "medium", bold: true },
  address: { visible: false, align: "center", size: "small", text: "" },
  invoice: { visible: true, align: "center", size: "small", text: "" },
  date: { visible: false, align: "center", size: "small", style: "long" },
  items: { size: "medium", align: "left", showQty: true, showRate: true },
  subtotal: { visible: true, size: "small", text: "Subtotal" },
  discount: { visible: true, size: "small", text: "Discount" },
  tax: { visible: true, size: "small", text: "Tax" },
  total: { size: "large", text: "Total", bold: true },
  payment: { visible: true, align: "center", size: "small" },
  balance: { visible: true, size: "small", text: "Change returned" },
  upiLabel: { visible: true, size: "small" },
  footer: { visible: false, align: "center", size: "small", text: "Thank you!" },
};

// Font size (S/M/L → fixed px), scaled by element role.
const FONT_PX = {
  companyName: { small: 16, medium: 20, large: 26 },
  address: { small: 10, medium: 12, large: 14 },
  invoice: { small: 10, medium: 12, large: 14 },
  date: { small: 10, medium: 12, large: 14 },
  items: { small: 11, medium: 13, large: 15 },
  line: { small: 11, medium: 13, large: 15 }, // subtotal/discount/tax/payment/balance/upi
  total: { small: 18, medium: 24, large: 30 },
  footer: { small: 10, medium: 12, large: 14 },
} as const;

export type FontKind = keyof typeof FONT_PX;

export function fontPx(kind: FontKind, size: Size): number {
  return FONT_PX[kind][size];
}

export const LOGO_PX: Record<Size, number> = { small: 40, medium: 64, large: 96 };

export function alignText(a: Align): string {
  return a === "left" ? "text-left" : a === "right" ? "text-right" : "text-center";
}
export function alignJustify(a: Align): string {
  return a === "left" ? "justify-start" : a === "right" ? "justify-end" : "justify-center";
}

/** Merge a stored (possibly partial / older) config over the defaults so every
 *  key is always present. */
export function mergeBillFormat(partial?: unknown): BillFormat {
  const base: BillFormat = structuredClone(DEFAULT_BILL_FORMAT);
  if (!partial || typeof partial !== "object") return base;
  const p = partial as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof BillFormat)[]) {
    const incoming = p[key];
    if (incoming && typeof incoming === "object") {
      Object.assign(base[key], incoming);
    }
  }
  return base;
}
