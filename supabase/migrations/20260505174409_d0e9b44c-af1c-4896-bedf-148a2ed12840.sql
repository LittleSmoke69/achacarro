
-- Fix search_path on email queue functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = 'public';
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = 'public';
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = 'public';
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = 'public';

-- Revoke broad access from all SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lojista_is_active(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lead_state(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_coupon(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_coupon(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grant_lojista_access(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;

-- Grant only to authenticated for in-app functions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lojista_is_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_coupon(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_lojista_access(uuid, integer) TO authenticated;

-- Email queue functions: service_role only (called from edge functions)
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
