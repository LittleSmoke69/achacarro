
-- 1. Apply the missing trigger (THIS IS THE CRITICAL FIX)
DROP TRIGGER IF EXISTS protect_lojista_admin_fields_trg ON public.lojistas;
CREATE TRIGGER protect_lojista_admin_fields_trg
  BEFORE UPDATE ON public.lojistas
  FOR EACH ROW EXECUTE FUNCTION public.protect_lojista_admin_fields();

DROP TRIGGER IF EXISTS validate_lojista_status_trg ON public.lojistas;
CREATE TRIGGER validate_lojista_status_trg
  BEFORE INSERT OR UPDATE ON public.lojistas
  FOR EACH ROW EXECUTE FUNCTION public.validate_lojista_status();

-- 2. Simplify lojista_is_active: trial OR active subscription, regardless of doc approval
--    (user chose: trial imediato, sem revisão)
CREATE OR REPLACE FUNCTION public.lojista_is_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lojistas
    WHERE id = _user_id
      AND status <> 'rejeitado'
      AND (subscription_active = true OR trial_ends_at > now())
  )
$$;

-- 3. Auto-approve new lojistas on signup (trial imediato)
ALTER TABLE public.lojistas ALTER COLUMN status SET DEFAULT 'aprovado';

-- 4. Approve any existing pending lojistas to activate the trial
UPDATE public.lojistas SET status = 'aprovado' WHERE status = 'pendente';

-- 5. Auto-create user_roles row for new lojista signups via trigger (cleaner than client insert)
CREATE OR REPLACE FUNCTION public.handle_new_lojista()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'lojista')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_lojista_created ON public.lojistas;
CREATE TRIGGER on_lojista_created
  AFTER INSERT ON public.lojistas
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_lojista();
