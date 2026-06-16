-- =========================================================================
-- Conditional discount/tax on bills + storage/db usage RPCs (additive only)
-- =========================================================================

-- ---- New nullable columns on bills ------------------------------------------
-- `discount` / `tax` already hold the COMPUTED amounts; these store the raw
-- inputs so the bill can be re-explained:
--   discount_type  : 'amount' | 'percent'
--   discount_value : the number the owner typed (₹ for amount, % for percent)
--   tax_value      : tax percentage applied to the subtotal
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS discount_type  text,
  ADD COLUMN IF NOT EXISTS discount_value numeric,
  ADD COLUMN IF NOT EXISTS tax_value      numeric;

-- ---- Usage meter RPCs (free tier: 500 MB DB, 1024 MB storage) ----------------
-- SECURITY DEFINER so they report true project-wide usage past RLS. They expose
-- only aggregate byte counts, nothing sensitive.

CREATE OR REPLACE FUNCTION public.database_size_bytes()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pg_database_size(current_database());
$$;

CREATE OR REPLACE FUNCTION public.storage_usage_bytes()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, storage
AS $$
  -- Sum the byte size of every stored object across all buckets.
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)::bigint
  FROM storage.objects;
$$;

REVOKE EXECUTE ON FUNCTION public.database_size_bytes() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.storage_usage_bytes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.database_size_bytes() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.storage_usage_bytes() TO authenticated, service_role;
