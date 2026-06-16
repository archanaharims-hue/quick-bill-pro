-- =========================================================================
-- Per-element bill format config (additive, nullable). Stored as a single JSON
-- blob on the owner's profile; presentation-only (no totals/payment changes).
-- =========================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bill_format jsonb;
