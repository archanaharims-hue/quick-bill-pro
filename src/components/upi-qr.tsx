import { QRCodeCanvas } from "qrcode.react";

/**
 * Renders a UPI payment string as a large, high-contrast on-screen QR.
 * This is display-only — scanning happens on the *customer's* phone. The
 * owner's device never opens a UPI app or fires an intent.
 */
export function UpiQR({ value, size = 240 }: { value: string; size?: number }) {
  return (
    <div className="inline-flex rounded-2xl bg-white p-4 shadow-soft">
      <QRCodeCanvas
        value={value}
        size={size}
        level="M"
        marginSize={2}
        bgColor="#ffffff"
        fgColor="#000000"
      />
    </div>
  );
}
