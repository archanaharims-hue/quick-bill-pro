-- =========================================================================
-- UPI ACCOUNTS + BILL PAYMENT FIELDS  (additive only — no drops/alters)
--
-- Free direct-UPI billing: the owner stores their own UPI IDs and the app only
-- renders on-screen QR codes for customers to scan. No payment gateway, no SDK,
-- no commission — money moves bank-to-bank on UPI rails.
-- =========================================================================

-- ---- New table: upi_accounts -------------------------------------------------
-- user_id is added (beyond the requested fields) so RLS matches the existing
-- owner-scoped tables (categories/products/bills).
CREATE TABLE IF NOT EXISTS public.upi_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,
  upi_id text,
  payee_name text,
  is_default boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.upi_accounts TO authenticated;
GRANT ALL ON public.upi_accounts TO service_role;
ALTER TABLE public.upi_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "upi_accounts owner all" ON public.upi_accounts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS upi_accounts_user_sort_idx
  ON public.upi_accounts(user_id, sort_order);

-- ---- New nullable columns on bills ------------------------------------------
-- payment_method already exists; IF NOT EXISTS keeps this safe + idempotent.
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS payment_method  text,            -- 'cash' | 'upi'
  ADD COLUMN IF NOT EXISTS payment_status  text,            -- 'pending' | 'paid'
  ADD COLUMN IF NOT EXISTS amount_received numeric,
  ADD COLUMN IF NOT EXISTS change_returned numeric,
  ADD COLUMN IF NOT EXISTS upi_account_id  uuid REFERENCES public.upi_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS upi_id_used     text;            -- snapshot of the UPI ID used
