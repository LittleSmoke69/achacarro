
REVOKE ALL ON FUNCTION public.redeem_coupon(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grant_lojista_access(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_lojista_access(uuid, integer) TO authenticated;
