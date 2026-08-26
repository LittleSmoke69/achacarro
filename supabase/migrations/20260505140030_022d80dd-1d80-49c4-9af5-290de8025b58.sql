-- 1. Replace lojista_is_active to require active Stripe subscription
CREATE OR REPLACE FUNCTION public.lojista_is_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lojistas l
    WHERE l.id = _user_id
      AND l.status <> 'rejeitado'
      AND l.subscription_active = true
  )
$$;

-- 2. admin_notifications table
CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  lojista_id uuid,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read notifications" ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update notifications" ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow inserts from the registration trigger (security definer) and service role
CREATE POLICY "service inserts notifications" ON public.admin_notifications
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- 3. Trigger: when new lojista row is inserted, create notification
CREATE OR REPLACE FUNCTION public.notify_admin_new_lojista()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, lojista_id, payload)
  VALUES ('new_lojista', NEW.id, jsonb_build_object(
    'empresa', NEW.empresa, 'email', NEW.email, 'nif', NEW.nif
  ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_new_lojista
AFTER INSERT ON public.lojistas
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_lojista();

-- 4. Existing trigger for status validation re-attach (ensure validate runs)
DROP TRIGGER IF EXISTS trg_validate_lojista_status ON public.lojistas;
CREATE TRIGGER trg_validate_lojista_status
BEFORE INSERT OR UPDATE ON public.lojistas
FOR EACH ROW EXECUTE FUNCTION public.validate_lojista_status();

DROP TRIGGER IF EXISTS trg_protect_lojista_admin_fields ON public.lojistas;
CREATE TRIGGER trg_protect_lojista_admin_fields
BEFORE UPDATE ON public.lojistas
FOR EACH ROW EXECUTE FUNCTION public.protect_lojista_admin_fields();

DROP TRIGGER IF EXISTS trg_handle_new_lojista ON public.lojistas;
CREATE TRIGGER trg_handle_new_lojista
AFTER INSERT ON public.lojistas
FOR EACH ROW EXECUTE FUNCTION public.handle_new_lojista();