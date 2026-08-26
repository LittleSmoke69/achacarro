CREATE OR REPLACE FUNCTION public.lojista_get_lead_contact(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _lead public.leads%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.propostas WHERE lead_id = _lead_id AND lojista_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem proposta para este lead';
  END IF;
  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id;
  RETURN jsonb_build_object(
    'nome', _lead.nome,
    'email', _lead.email,
    'whatsapp', _lead.whatsapp,
    'client_token', _lead.client_token
  );
END; $$;

REVOKE ALL ON FUNCTION public.lojista_get_lead_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lojista_get_lead_contact(uuid) TO authenticated;