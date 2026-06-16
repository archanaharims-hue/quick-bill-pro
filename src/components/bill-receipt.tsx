import { Banknote, QrCode } from "lucide-react";
import { format as formatDate } from "date-fns";
import {
  type BillFormat,
  fontPx,
  alignText,
  alignJustify,
  LOGO_PX,
} from "@/lib/bill-format";

export type ReceiptItem = { name: string; price: number; quantity: number };

export type ReceiptData = {
  company: { name: string; logoUrl: string | null };
  billNumber: string;
  date: string; // ISO
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "upi";
  accountLabel?: string | null;
  changeReturned?: number | null;
  format: BillFormat;
};

/**
 * Receipt whose every element (logo, name, address, invoice, date, items,
 * subtotal/discount/tax, total, payment, balance, UPI label, footer) is
 * positioned/sized/labelled by `data.format`. The exact same component renders
 * the Settings preview, the success screen, and the shared PNG, so all three
 * always match. Colours are hard-set to a light palette for clean capture.
 */
export function BillReceipt({ data }: { data: ReceiptData }) {
  const {
    company, billNumber, date, items, subtotal, discount, tax, total,
    paymentMethod, accountLabel, changeReturned, format: f,
  } = data;

  const hasBreakdown = discount > 0 || tax > 0;
  const dateText = date
    ? formatDate(new Date(date), f.date.style === "short" ? "dd/MM/yyyy" : "dd MMM yyyy")
    : "";

  return (
    <div className="w-full rounded-3xl border bg-white p-6 text-[#18181b]">
      {f.logo.visible && company.logoUrl && (
        <div className={`flex ${alignJustify(f.logo.align)} mb-2`}>
          <img
            src={company.logoUrl}
            alt=""
            crossOrigin="anonymous"
            className="rounded-2xl border object-cover"
            style={{ width: LOGO_PX[f.logo.size], height: LOGO_PX[f.logo.size] }}
          />
        </div>
      )}

      {f.companyName.visible && company.name && (
        <div
          className={`${alignText(f.companyName.align)} tracking-tight ${f.companyName.bold ? "font-black" : "font-normal"}`}
          style={{ fontSize: fontPx("companyName", f.companyName.size) }}
        >
          {company.name}
        </div>
      )}

      {f.address.visible && f.address.text && (
        <div
          className={`${alignText(f.address.align)} whitespace-pre-line text-[#3f3f46]`}
          style={{ fontSize: fontPx("address", f.address.size) }}
        >
          {f.address.text}
        </div>
      )}

      {f.invoice.visible && (
        <div
          className={`${alignText(f.invoice.align)} text-[#71717a] mt-0.5`}
          style={{ fontSize: fontPx("invoice", f.invoice.size) }}
        >
          {f.invoice.text ? `${f.invoice.text} ` : ""}{billNumber}
        </div>
      )}

      {f.date.visible && dateText && (
        <div
          className={`${alignText(f.date.align)} text-[#71717a]`}
          style={{ fontSize: fontPx("date", f.date.size) }}
        >
          {dateText}
        </div>
      )}

      <div className="my-4 border-t border-dashed border-[#d4d4d8]" />

      <ul className="space-y-2" style={{ fontSize: fontPx("items", f.items.size) }}>
        {items.map((it, i) => {
          const parts: string[] = [];
          if (f.items.showRate) parts.push(`₹${it.price.toFixed(2)}`);
          if (f.items.showQty) parts.push(`× ${it.quantity}`);
          return (
            <li key={i} className="flex items-start justify-between gap-3">
              <span className={`min-w-0 flex-1 break-words ${alignText(f.items.align)}`}>{it.name || "Item"}</span>
              <span className="shrink-0 tabular-nums text-right text-[#3f3f46]">
                {parts.length > 0 && <>{parts.join(" ")} = </>}
                <span className="font-semibold text-[#18181b]">₹{(it.price * it.quantity).toFixed(2)}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="my-4 border-t border-dashed border-[#d4d4d8]" />

      {hasBreakdown && (
        <div className="mb-2 space-y-1 text-[#3f3f46]" style={{ fontSize: fontPx("line", "small") }}>
          {f.subtotal.visible && (
            <Row label={f.subtotal.text} value={`₹${subtotal.toFixed(2)}`} size={fontPx("line", f.subtotal.size)} />
          )}
          {f.discount.visible && discount > 0 && (
            <Row label={f.discount.text} value={`−₹${discount.toFixed(2)}`} size={fontPx("line", f.discount.size)} />
          )}
          {f.tax.visible && tax > 0 && (
            <Row label={f.tax.text} value={`+₹${tax.toFixed(2)}`} size={fontPx("line", f.tax.size)} />
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className={f.total.bold ? "font-bold" : "font-normal"} style={{ fontSize: fontPx("total", "small") }}>
          {f.total.text}
        </span>
        <span
          className={`tabular-nums ${f.total.bold ? "font-black" : "font-normal"}`}
          style={{ fontSize: fontPx("total", f.total.size) }}
        >
          ₹{total.toFixed(2)}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-1" style={{ fontSize: fontPx("line", f.payment.size) }}>
        {f.payment.visible && (
          <div className={`flex ${alignJustify(f.payment.align)}`}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f4f5] px-3 py-1 font-semibold">
              {paymentMethod === "cash" ? (
                <><Banknote className="h-4 w-4 text-success" /> Paid · Cash</>
              ) : (
                <><QrCode className="h-4 w-4 text-primary" /> Paid · UPI</>
              )}
            </span>
          </div>
        )}
        {f.balance.visible && paymentMethod === "cash" && (changeReturned ?? 0) > 0 && (
          <span className="text-center text-[#71717a]" style={{ fontSize: fontPx("line", f.balance.size) }}>
            {f.balance.text} ₹{Number(changeReturned).toFixed(2)}
          </span>
        )}
        {f.upiLabel.visible && paymentMethod === "upi" && accountLabel && (
          <span className="text-center text-[#71717a]" style={{ fontSize: fontPx("line", f.upiLabel.size) }}>
            Received in {accountLabel}
          </span>
        )}
      </div>

      {f.footer.visible && f.footer.text && (
        <div
          className={`mt-4 ${alignText(f.footer.align)} text-[#3f3f46]`}
          style={{ fontSize: fontPx("footer", f.footer.size) }}
        >
          {f.footer.text}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, size }: { label: string; value: string; size: number }) {
  return (
    <div className="flex justify-between" style={{ fontSize: size }}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
