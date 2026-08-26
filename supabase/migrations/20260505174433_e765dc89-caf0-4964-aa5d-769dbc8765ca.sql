
REVOKE ALL ON FUNCTION public.enforce_proposta_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_lojista() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_new_lojista() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_lojista_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_lojista_admin_fields() FROM PUBLIC, anon, authenticated;
