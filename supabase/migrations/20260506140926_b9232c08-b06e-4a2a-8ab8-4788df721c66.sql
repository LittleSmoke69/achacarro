
CREATE OR REPLACE FUNCTION public.client_decide_proposta(_token text, _proposta_id uuid, _decisao text, _motivo text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lead_id uuid; _prop public.propostas%ROWTYPE; _cli public.leads%ROWTYPE; _loj public.lojistas%ROWTYPE;
BEGIN
  IF _decisao NOT IN ('aceita','recusada') THEN
    RAISE EXCEPTION 'Decisão inválida';
  END IF;
  SELECT * INTO _cli FROM public.leads WHERE client_token = _token;
  IF _cli.id IS NULL THEN RAISE EXCEPTION 'Token inválido'; END IF;

  SELECT * INTO _prop FROM public.propostas WHERE id = _proposta_id AND lead_id = _cli.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada'; END IF;
  IF _prop.status IN ('aceita','recusada') THEN
    RAISE EXCEPTION 'Proposta já foi %', _prop.status;
  END IF;

  UPDATE public.propostas
    SET status = _decisao,
        aceita_at = CASE WHEN _decisao='aceita' THEN now() ELSE aceita_at END,
        recusada_at = CASE WHEN _decisao='recusada' THEN now() ELSE recusada_at END,
        motivo_recusa = CASE WHEN _decisao='recusada' THEN _motivo ELSE motivo_recusa END
    WHERE id = _proposta_id;

  SELECT * INTO _loj FROM public.lojistas WHERE id = _prop.lojista_id;

  RETURN jsonb_build_object(
    'ok', true,
    'lojista_email', _loj.email,
    'lojista_empresa', _loj.empresa,
    'cliente_nome', _cli.nome,
    'cliente_email', _cli.email,
    'cliente_whatsapp', _cli.whatsapp,
    'preco', _prop.preco,
    'marca_modelo', _prop.marca_modelo
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.client_decide_proposta(text, uuid, text, text) TO anon, authenticated;
