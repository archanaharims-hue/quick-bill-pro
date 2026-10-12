CREATE TABLE public.passkeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  label text NOT NULL,
  code_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.passkeys TO authenticated;
GRANT ALL ON public.passkeys TO service_role;
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "passkeys owner read" ON public.passkeys FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "passkeys owner delete" ON public.passkeys FOR DELETE TO authenticated USING (auth.uid() = owner_id);