-- Remover trial automático: novos stands entram sem acesso até pagar ou usar cupom
ALTER TABLE public.lojistas ALTER COLUMN trial_ends_at SET DEFAULT now();

-- Coluna informativa (não bloqueia nada). Preenchida por gatilhos abaixo.
ALTER TABLE public.lojistas
  ADD COLUMN IF NOT EXISTS activated_via text;

-- Atualizar redeem_coupon para marcar activated_via='coupon'
CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _coupon public.coupons%ROWTYPE;
  _new_end timestamptz;
  _current_end timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lojistas WHERE id = _uid) THEN
    RAISE EXCEPTION 'Apenas lojistas podem resgatar cupons';
  END IF;

  SELECT * INTO _coupon FROM public.coupons WHERE upper(code) = upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cupom inválido'; END IF;
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
        subscription_active = true,
        activated_via = 'coupon'
    WHERE id = _uid;
  PERFORM set_config('app.bypass_admin_check', 'off', true);

  INSERT INTO public.coupon_redemptions (coupon_id, lojista_id, granted_days)
    VALUES (_coupon.id, _uid, _coupon.duration_days);
  UPDATE public.coupons SET used_count = used_count + 1 WHERE id = _coupon.id;

  RETURN jsonb_build_object('granted_days', _coupon.duration_days, 'new_end', _new_end);
END;
$function$;

-- Atualizar grant_lojista_access para marcar activated_via='admin'
CREATE OR REPLACE FUNCTION public.grant_lojista_access(_lojista_id uuid, _days integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _new_end timestamptz;
  _current_end timestamptz;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Apenas admins';
  END IF;
  IF _days <= 0 OR _days > 3650 THEN RAISE EXCEPTION 'Dias inválidos'; END IF;

  SELECT trial_ends_at INTO _current_end FROM public.lojistas WHERE id = _lojista_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lojista não encontrado'; END IF;
  _new_end := GREATEST(COALESCE(_current_end, now()), now()) + (_days || ' days')::interval;

  PERFORM set_config('app.bypass_admin_check', 'on', true);
  UPDATE public.lojistas
    SET trial_ends_at = _new_end,
        subscription_active = true,
        activated_via = 'admin'
    WHERE id = _lojista_id;
  PERFORM set_config('app.bypass_admin_check', 'off', true);

  INSERT INTO public.admin_audit_log (admin_id, action, target_lojista_id, details)
    VALUES (_uid, 'grant_access', _lojista_id, jsonb_build_object('days', _days, 'new_end', _new_end));

  RETURN jsonb_build_object('new_end', _new_end);
END;
$function$;