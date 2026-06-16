import { useEffect, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlignLeft, AlignCenter, AlignRight, FileSliders, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBillFormat } from "@/lib/bill-format-store";
import { useCompany } from "@/lib/company-store";
import { ImagePicker } from "@/components/image-picker";
import { BillReceipt, type ReceiptData } from "@/components/bill-receipt";
import type { Align, BillFormat, Size } from "@/lib/bill-format";

/** Settings → Bill format: a control group per receipt element + a live preview.
 *  Drives the actual success-screen bill and the shared file via the same store. */
export function BillFormatSection() {
  const format = useBillFormat((s) => s.format);
  const update = useBillFormat((s) => s.update);
  const syncFmt = useBillFormat((s) => s.sync);
  const reset = useBillFormat((s) => s.reset);

  const companyName = useCompany((s) => s.name);
  const companyLogo = useCompany((s) => s.logoUrl);
  const companyUpdate = useCompany((s) => s.update);
  const companySync = useCompany((s) => s.sync);

  const [previewMethod, setPreviewMethod] = useState<"cash" | "upi">("upi");

  useEffect(() => {
    void syncFmt();
    void companySync();
  }, [syncFmt, companySync]);

  // Update a single element's settings.
  const patch = <K extends keyof BillFormat>(el: K, data: Partial<BillFormat[K]>) =>
    update((f) => ({ ...f, [el]: { ...f[el], ...data } }));

  const sample: ReceiptData = {
    company: { name: companyName || "Your Shop", logoUrl: companyLogo },
    billNumber: "INV-0001",
    date: new Date().toISOString(),
    items: [
      { name: "Tea", price: 15, quantity: 2 },
      { name: "Sugar 1kg", price: 55, quantity: 1 },
      { name: "Biscuits", price: 30, quantity: 3 },
    ],
    subtotal: 175,
    discount: 17.5,
    tax: 8.75,
    total: 166.25,
    paymentMethod: previewMethod,
    accountLabel: "Indian bank",
    changeReturned: previewMethod === "cash" ? 34 : 0,
    format,
  };

  return (
    <section className="rounded-2xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <FileSliders className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold leading-tight">Bill format</h2>
            <p className="text-xs text-muted-foreground">Style every element of the receipt.</p>
          </div>
        </div>
        <button
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={reset}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Live preview */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Live preview</span>
            <Seg
              value={previewMethod}
              onChange={setPreviewMethod}
              options={[{ val: "upi", label: "UPI" }, { val: "cash", label: "Cash" }]}
            />
          </div>
          <div className="rounded-2xl bg-[#e7e9ee] p-3">
            <div className="mx-auto max-w-[320px]">
              <BillReceipt data={sample} />
            </div>
          </div>
        </div>

        {/* Per-element control groups */}
        <Group title="Logo" visible={format.logo.visible} onVisible={(v) => patch("logo", { visible: v })}>
          <ImagePicker value={companyLogo} onChange={(full) => companyUpdate({ logoUrl: full })} />
          <Ctrl label="Alignment"><AlignCtrl value={format.logo.align} onChange={(a) => patch("logo", { align: a })} /></Ctrl>
          <Ctrl label="Size"><SizeCtrl value={format.logo.size} onChange={(s) => patch("logo", { size: s })} /></Ctrl>
        </Group>

        <Group title="Company name" visible={format.companyName.visible} onVisible={(v) => patch("companyName", { visible: v })}>
          <Input value={companyName} onChange={(e) => companyUpdate({ name: e.target.value })} placeholder="Shop name" />
          <Ctrl label="Alignment"><AlignCtrl value={format.companyName.align} onChange={(a) => patch("companyName", { align: a })} /></Ctrl>
          <Ctrl label="Font size"><SizeCtrl value={format.companyName.size} onChange={(s) => patch("companyName", { size: s })} /></Ctrl>
          <Ctrl label="Bold"><Switch checked={format.companyName.bold} onCheckedChange={(v) => patch("companyName", { bold: v })} /></Ctrl>
        </Group>

        <Group title="Address & phone" visible={format.address.visible} onVisible={(v) => patch("address", { visible: v })}>
          <Textarea
            value={format.address.text}
            onChange={(e) => patch("address", { text: e.target.value })}
            rows={2}
            placeholder={"123 Market Rd\n+91 98765 43210"}
          />
          <Ctrl label="Alignment"><AlignCtrl value={format.address.align} onChange={(a) => patch("address", { align: a })} /></Ctrl>
          <Ctrl label="Font size"><SizeCtrl value={format.address.size} onChange={(s) => patch("address", { size: s })} /></Ctrl>
        </Group>

        <Group title="Invoice number" visible={format.invoice.visible} onVisible={(v) => patch("invoice", { visible: v })}>
          <Input
            value={format.invoice.text}
            onChange={(e) => patch("invoice", { text: e.target.value })}
            placeholder='Label prefix, e.g. "Invoice" / "Bill No" (optional)'
          />
          <Ctrl label="Alignment"><AlignCtrl value={format.invoice.align} onChange={(a) => patch("invoice", { align: a })} /></Ctrl>
          <Ctrl label="Font size"><SizeCtrl value={format.invoice.size} onChange={(s) => patch("invoice", { size: s })} /></Ctrl>
        </Group>

        <Group title="Date" visible={format.date.visible} onVisible={(v) => patch("date", { visible: v })}>
          <Ctrl label="Format">
            <Seg
              value={format.date.style}
              onChange={(s) => patch("date", { style: s })}
              options={[{ val: "long", label: "16 Jun 2026" }, { val: "short", label: "16/06/2026" }]}
            />
          </Ctrl>
          <Ctrl label="Alignment"><AlignCtrl value={format.date.align} onChange={(a) => patch("date", { align: a })} /></Ctrl>
          <Ctrl label="Font size"><SizeCtrl value={format.date.size} onChange={(s) => patch("date", { size: s })} /></Ctrl>
        </Group>

        <Group title="Item rows">
          <Ctrl label="Font size"><SizeCtrl value={format.items.size} onChange={(s) => patch("items", { size: s })} /></Ctrl>
          <Ctrl label="Alignment"><AlignCtrl value={format.items.align} onChange={(a) => patch("items", { align: a })} /></Ctrl>
          <Ctrl label="Show Qty column"><Switch checked={format.items.showQty} onCheckedChange={(v) => patch("items", { showQty: v })} /></Ctrl>
          <Ctrl label="Show Rate column"><Switch checked={format.items.showRate} onCheckedChange={(v) => patch("items", { showRate: v })} /></Ctrl>
        </Group>

        <LabelLineGroup title="Subtotal" el="subtotal" format={format} patch={patch} />
        <LabelLineGroup title="Discount" el="discount" format={format} patch={patch} />
        <LabelLineGroup title="Tax" el="tax" format={format} patch={patch} />

        <Group title="Total">
          <Input value={format.total.text} onChange={(e) => patch("total", { text: e.target.value })} placeholder="Total" />
          <Ctrl label="Font size"><SizeCtrl value={format.total.size} onChange={(s) => patch("total", { size: s })} /></Ctrl>
          <Ctrl label="Bold"><Switch checked={format.total.bold} onCheckedChange={(v) => patch("total", { bold: v })} /></Ctrl>
        </Group>

        <Group title="Payment method line" visible={format.payment.visible} onVisible={(v) => patch("payment", { visible: v })}>
          <Ctrl label="Alignment"><AlignCtrl value={format.payment.align} onChange={(a) => patch("payment", { align: a })} /></Ctrl>
          <Ctrl label="Font size"><SizeCtrl value={format.payment.size} onChange={(s) => patch("payment", { size: s })} /></Ctrl>
        </Group>

        <LabelLineGroup title="Balance / change line" el="balance" format={format} patch={patch} />

        <Group title="UPI account label" visible={format.upiLabel.visible} onVisible={(v) => patch("upiLabel", { visible: v })}>
          <Ctrl label="Font size"><SizeCtrl value={format.upiLabel.size} onChange={(s) => patch("upiLabel", { size: s })} /></Ctrl>
        </Group>

        <Group title="Footer / thank-you" visible={format.footer.visible} onVisible={(v) => patch("footer", { visible: v })}>
          <Input value={format.footer.text} onChange={(e) => patch("footer", { text: e.target.value })} placeholder="Thank you!" />
          <Ctrl label="Alignment"><AlignCtrl value={format.footer.align} onChange={(a) => patch("footer", { align: a })} /></Ctrl>
          <Ctrl label="Font size"><SizeCtrl value={format.footer.size} onChange={(s) => patch("footer", { size: s })} /></Ctrl>
        </Group>
      </div>
    </section>
  );
}

// Group for the simple "label + font size + show/hide" elements.
function LabelLineGroup({
  title, el, format, patch,
}: {
  title: string;
  el: "subtotal" | "discount" | "tax" | "balance";
  format: BillFormat;
  patch: <K extends keyof BillFormat>(el: K, data: Partial<BillFormat[K]>) => void;
}) {
  const cfg = format[el];
  return (
    <Group title={title} visible={cfg.visible} onVisible={(v) => patch(el, { visible: v })}>
      <Input value={cfg.text} onChange={(e) => patch(el, { text: e.target.value })} placeholder="Label" />
      <Ctrl label="Font size"><SizeCtrl value={cfg.size} onChange={(s) => patch(el, { size: s })} /></Ctrl>
    </Group>
  );
}

function Group({
  title, visible, onVisible, children,
}: {
  title: string;
  visible?: boolean;
  onVisible?: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {onVisible && <Switch checked={visible} onCheckedChange={onVisible} />}
      </div>
      <div className={cn("space-y-2.5", visible === false && "pointer-events-none opacity-50")}>{children}</div>
    </div>
  );
}

function Ctrl({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Seg<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { val: T; label: ReactNode }[];
}) {
  return (
    <div className="inline-flex rounded-lg border p-0.5">
      {options.map((o) => (
        <button
          key={o.val}
          type="button"
          onClick={() => onChange(o.val)}
          className={cn(
            "grid h-7 min-w-7 place-items-center rounded-md px-2 text-xs font-medium",
            value === o.val ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function AlignCtrl({ value, onChange }: { value: Align; onChange: (a: Align) => void }) {
  return (
    <Seg
      value={value}
      onChange={onChange}
      options={[
        { val: "left", label: <AlignLeft className="h-4 w-4" /> },
        { val: "center", label: <AlignCenter className="h-4 w-4" /> },
        { val: "right", label: <AlignRight className="h-4 w-4" /> },
      ]}
    />
  );
}

function SizeCtrl({ value, onChange }: { value: Size; onChange: (s: Size) => void }) {
  return (
    <Seg
      value={value}
      onChange={onChange}
      options={[
        { val: "small", label: "S" },
        { val: "medium", label: "M" },
        { val: "large", label: "L" },
      ]}
    />
  );
}
