REVOKE EXECUTE ON FUNCTION public.get_my_proposta_email_logs(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_proposta_email_logs(uuid) TO authenticated;