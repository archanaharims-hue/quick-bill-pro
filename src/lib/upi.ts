// -----------------------------------------------------------------------------
// Free direct-UPI helpers.
//
// This builds a standard UPI deep-link string that the app ONLY renders as an
// on-screen QR code for the customer to scan with their own UPI app. There is
// NO payment gateway, NO SDK, and NO commission — money moves bank-to-bank on
// UPI rails directly into the owner's account. The owner's device never opens
// an app or fires an intent; it just displays the QR image.
// -----------------------------------------------------------------------------

export type UpiUriParts = {
  /** Payee VPA / UPI ID, e.g. "name@oksbi" (the `pa` param). */
  pa: string;
  /** Payee name (the `pn` param). */
  pn?: string | null;
  /** Amount in INR (the `am` param). Omit/empty for an amount-less QR. */
  am?: number | string | null;
  /** Transaction note, e.g. the bill number (the `tn` param). */
  tn?: string | null;
};

/**
 * Builds a `upi://pay?...` URI. Values are percent-encoded (spaces as %20) so
 * UPI apps parse them reliably. Always sets `cu=INR`.
 *
 * Passing a numeric `am` produces a DYNAMIC QR: the customer's UPI app auto-fills
 * the amount and the customer types nothing.
 */
export function buildUpiUri({ pa, pn, am, tn }: UpiUriParts): string {
  const enc = encodeURIComponent;
  let uri = `upi://pay?pa=${enc(pa.trim())}`;
  if (pn && pn.trim()) uri += `&pn=${enc(pn.trim())}`;
  if (am != null && am !== "") {
    const amount = typeof am === "number" ? am.toFixed(2) : String(am);
    uri += `&am=${enc(amount)}`;
  }
  uri += `&cu=INR`;
  if (tn && tn.trim()) uri += `&tn=${enc(tn.trim())}`;
  return uri;
}
