-- Add new columns to lojistas
ALTER TABLE public.lojistas
  ADD COLUMN IF NOT EXISTS nome_responsavel text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS morada text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS tipos_carro text,
  ADD COLUMN IF NOT EXISTS regiao text,
  ADD COLUMN IF NOT EXISTS tem_garantia boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aceita_particular boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS aceita_revenda boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS doc_atividade_url text,
  ADD COLUMN IF NOT EXISTS doc_responsavel_url text,
  ADD COLUMN IF NOT EXISTS doc_morada_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';

-- Validation trigger for status values
CREATE OR REPLACE FUNCTION public.validate_lojista_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pendente','aprovado','rejeitado') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_lojista_status ON public.lojistas;
CREATE TRIGGER trg_validate_lojista_status
BEFORE INSERT OR UPDATE OF status ON public.lojistas
FOR EACH ROW EXECUTE FUNCTION public.validate_lojista_status();

-- Update lojista_is_active to require approval
CREATE OR REPLACE FUNCTION public.lojista_is_active(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lojistas
    WHERE id = _user_id
      AND status = 'aprovado'
      AND (subscription_active = true OR trial_ends_at > now())
  )
$$;

-- Admin can read/update all lojistas
DROP POLICY IF EXISTS "admin reads all lojistas" ON public.lojistas;
CREATE POLICY "admin reads all lojistas" ON public.lojistas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin updates lojistas" ON public.lojistas;
CREATE POLICY "admin updates lojistas" ON public.lojistas
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Prevent regular lojistas from changing their own status/subscription via UPDATE policy
-- (existing "lojista updates own" remains; admin-only fields enforced via trigger)
CREATE OR REPLACE FUNCTION public.protect_lojista_admin_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.subscription_active IS DISTINCT FROM OLD.subscription_active
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'Not allowed to modify admin fields';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_lojista_admin_fields ON public.lojistas;
CREATE TRIGGER trg_protect_lojista_admin_fields
BEFORE UPDATE ON public.lojistas
FOR EACH ROW EXECUTE FUNCTION public.protect_lojista_admin_fields();

-- Storage bucket for lojista documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lojista-docs', 'lojista-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: lojista uploads/reads own folder; admin reads all
DROP POLICY IF EXISTS "lojista upload own docs" ON storage.objects;
CREATE POLICY "lojista upload own docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lojista-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "lojista read own docs" ON storage.objects;
CREATE POLICY "lojista read own docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lojista-docs' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  ));

DROP POLICY IF EXISTS "lojista update own docs" ON storage.objects;
CREATE POLICY "lojista update own docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lojista-docs' AND auth.uid()::text = (storage.foldername(name))[1]);