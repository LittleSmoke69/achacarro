
CREATE OR REPLACE FUNCTION public.check_coupon(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _coupon public.coupons%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'unauthorized');
  END IF;
  SELECT * INTO _coupon FROM public.coupons WHERE upper(code) = upper(trim(_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid');
  END IF;
  IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;
  IF _coupon.used_count >= _coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'exhausted',
      'used_count', _coupon.used_count, 'max_uses', _coupon.max_uses);
  END IF;
  IF EXISTS (SELECT 1 FROM public.coupon_redemptions WHERE coupon_id = _coupon.id AND lojista_id = _uid) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'already_used');
  END IF;
  RETURN jsonb_build_object('valid', true, 'duration_days', _coupon.duration_days,
    'remaining_uses', _coupon.max_uses - _coupon.used_count);
END;
$$;

REVOKE ALL ON FUNCTION public.check_coupon(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_coupon(text) TO authenticated;
