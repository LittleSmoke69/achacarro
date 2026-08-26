
-- Remove dealer access to email_send_log (recipient_email leak)
DROP POLICY IF EXISTS "lojista reads own proposta email logs" ON public.email_send_log;

-- Provide a SECURITY DEFINER RPC that returns only non-sensitive columns
CREATE OR REPLACE FUNCTION public.get_my_proposta_email_logs(_lead_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  message_id text,
  status text,
  created_at timestamptz,
  error_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.message_id, l.status, l.created_at, l.error_message
  FROM public.email_send_log l
  WHERE l.template_name = 'proposta-recebida'
    AND (l.metadata->>'lojista_id') = (auth.uid())::text
    AND (
      _lead_id IS NULL
      OR l.message_id = 'proposta-' || _lead_id::text || '-' || (auth.uid())::text
    );
$$;

REVOKE ALL ON FUNCTION public.get_my_proposta_email_logs(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_proposta_email_logs(uuid) TO authenticated;
