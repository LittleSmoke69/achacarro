
-- Coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  duration_days integer NOT NULL CHECK (duration_days > 0 AND duration_days <= 3650),
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin reads coupons" ON public.coupons
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin inserts coupons" ON public.coupons
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "admin updates coupons" ON public.coupons
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin deletes coupons" ON public.coupons
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Redemptions
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  lojista_id uuid NOT NULL,
  granted_days integer NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, lojista_id)
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lojista reads own redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = lojista_id OR public.has_role(auth.uid(), 'admin'));

-- Update trigger to allow bypass via session config
CREATE OR REPLACE FUNCTION public.protect_lojista_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF current_setting('app.bypass_admin_check', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.subscription_active IS DISTINCT FROM OLD.subscription_active
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'Not allowed to modify admin fields';
  END IF;
  RETURN NEW;
END;
$function$;

-- Redeem coupon
CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _coupon public.coupons%ROWTYPE;
  _new_end timestamptz;
  _current_end timestamptz;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lojistas WHERE id = _uid) THEN
    RAISE EXCEPTION 'Apenas lojistas podem resgatar cupons';
  END IF;

  SELECT * INTO _coupon FROM public.coupons WHERE upper(code) = upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cupom inválido';
  END IF;
  IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at < now() THEN
    RAISE EXCEPTION 'Cupom expirado';
  END IF;
  IF _coupon.used_count >= _coupon.max_uses THEN
    RAISE EXCEPTION 'Cupom esgotado';
  END IF;
  IF EXISTS (SELECT 1 FROM public.coupon_redemptions WHERE coupon_id = _coupon.id AND lojista_id = _uid) THEN
    RAISE EXCEPTION 'Já usaste este cupom';
  END IF;

  SELECT trial_ends_at INTO _current_end FROM public.lojistas WHERE id = _uid;
  _new_end := GREATEST(COALESCE(_current_end, now()), now()) + (_coupon.duration_days || ' days')::interval;

  PERFORM set_config('app.bypass_admin_check', 'on', true);
  UPDATE public.lojistas
    SET trial_ends_at = _new_end,
        subscription_active = true
    WHERE id = _uid;
  PERFORM set_config('app.bypass_admin_check', 'off', true);

  INSERT INTO public.coupon_redemptions (coupon_id, lojista_id, granted_days)
    VALUES (_coupon.id, _uid, _coupon.duration_days);
  UPDATE public.coupons SET used_count = used_count + 1 WHERE id = _coupon.id;

  RETURN jsonb_build_object('granted_days', _coupon.duration_days, 'new_end', _new_end);
END;
$$;

-- Admin grant
CREATE OR REPLACE FUNCTION public.grant_lojista_access(_lojista_id uuid, _days integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_end timestamptz;
  _current_end timestamptz;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Apenas admins';
  END IF;
  IF _days <= 0 OR _days > 3650 THEN
    RAISE EXCEPTION 'Dias inválidos';
  END IF;

  SELECT trial_ends_at INTO _current_end FROM public.lojistas WHERE id = _lojista_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lojista não encontrado';
  END IF;
  _new_end := GREATEST(COALESCE(_current_end, now()), now()) + (_days || ' days')::interval;

  PERFORM set_config('app.bypass_admin_check', 'on', true);
  UPDATE public.lojistas
    SET trial_ends_at = _new_end,
        subscription_active = true
    WHERE id = _lojista_id;
  PERFORM set_config('app.bypass_admin_check', 'off', true);

  INSERT INTO public.admin_audit_log (admin_id, action, target_lojista_id, details)
    VALUES (_uid, 'grant_access', _lojista_id, jsonb_build_object('days', _days, 'new_end', _new_end));

  RETURN jsonb_build_object('new_end', _new_end);
END;
$$;
