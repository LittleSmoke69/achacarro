
CREATE OR REPLACE FUNCTION public.lojista_get_client_token(_lead_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _tok text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.propostas WHERE lead_id = _lead_id AND lojista_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem proposta para este lead';
  END IF;
  SELECT client_token INTO _tok FROM public.leads WHERE id = _lead_id;
  RETURN _tok;
END; $$;
REVOKE ALL ON FUNCTION public.lojista_get_client_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lojista_get_client_token(uuid) TO authenticated;
