
-- Token + closed flag on leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS client_token text UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  ADD COLUMN IF NOT EXISTS fechado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fechado_at timestamptz;

-- Backfill nulls
UPDATE public.leads SET client_token = replace(gen_random_uuid()::text, '-', '') WHERE client_token IS NULL;
ALTER TABLE public.leads ALTER COLUMN client_token SET NOT NULL;

-- Tracking columns on propostas
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS visualizada_at timestamptz,
  ADD COLUMN IF NOT EXISTS aceita_at timestamptz,
  ADD COLUMN IF NOT EXISTS recusada_at timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_recusa text;

-- Allow 'visualizada' as well
CREATE OR REPLACE FUNCTION public.validate_proposta_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('enviada','visualizada','aceita','recusada') THEN
    RAISE EXCEPTION 'Invalid proposta status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

-- Block new proposals on closed leads
CREATE OR REPLACE FUNCTION public.enforce_proposta_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cnt int; exp timestamptz; closed boolean;
BEGIN
  SELECT propostas_count, expires_at, fechado INTO cnt, exp, closed
    FROM public.leads WHERE id = NEW.lead_id FOR UPDATE;
  IF closed THEN
    RAISE EXCEPTION 'Lead encerrado pelo cliente';
  END IF;
  IF cnt >= 10 THEN
    RAISE EXCEPTION 'Lead atingiu limite de 10 propostas';
  END IF;
  IF exp <= now() THEN
    RAISE EXCEPTION 'Lead expirou';
  END IF;
  IF NOT public.lojista_is_active(NEW.lojista_id) THEN
    RAISE EXCEPTION 'Lojista sem assinatura ativa';
  END IF;
  IF NOT public.has_role(NEW.lojista_id, 'lojista') THEN
    RAISE EXCEPTION 'Sem permissão de lojista';
  END IF;
  UPDATE public.leads SET propostas_count = propostas_count + 1 WHERE id = NEW.lead_id;
  RETURN NEW;
END; $$;

-- RPCs for client (token-based, no login)
CREATE OR REPLACE FUNCTION public.client_get_propostas(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _lead public.leads%ROWTYPE; _items jsonb;
BEGIN
  SELECT * INTO _lead FROM public.leads WHERE client_token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Token inválido'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'status', p.status,
    'preco', p.preco,
    'marca_modelo', p.marca_modelo,
    'ano', p.ano,
    'km', p.km,
    'combustivel', p.combustivel,
    'caixa', p.caixa,
    'descricao', p.descricao,
    'mensagem', p.mensagem,
    'fotos', p.fotos,
    'tem_garantia', p.tem_garantia,
    'garantia_meses', p.garantia_meses,
    'aceita_retoma', p.aceita_retoma,
    'valor_retoma', p.valor_retoma,
    'oferece_financiamento', p.oferece_financiamento,
    'condicoes_financiamento', p.condicoes_financiamento,
    'distrito', p.distrito,
    'extras', p.extras,
    'link_anuncio', p.link_anuncio,
    'created_at', p.created_at,
    'visualizada_at', p.visualizada_at,
    'aceita_at', p.aceita_at,
    'recusada_at', p.recusada_at,
    'lojista', jsonb_build_object('empresa', l.empresa, 'whatsapp', l.whatsapp, 'email', l.email)
  ) ORDER BY p.created_at DESC), '[]'::jsonb) INTO _items
  FROM public.propostas p
  LEFT JOIN public.lojistas l ON l.id = p.lojista_id
  WHERE p.lead_id = _lead.id;

  -- Mark as visualizada (first view)
  UPDATE public.propostas
    SET status = 'visualizada', visualizada_at = now()
    WHERE lead_id = _lead.id AND status = 'enviada';

  RETURN jsonb_build_object(
    'lead', jsonb_build_object(
      'id', _lead.id,
      'nome', _lead.nome,
      'marca_modelo', _lead.marca_modelo,
      'fechado', _lead.fechado,
      'expires_at', _lead.expires_at,
      'propostas_count', _lead.propostas_count
    ),
    'propostas', _items
  );
END; $$;

CREATE OR REPLACE FUNCTION public.client_decide_proposta(_token text, _proposta_id uuid, _decisao text, _motivo text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lead_id uuid; _prop public.propostas%ROWTYPE;
BEGIN
  IF _decisao NOT IN ('aceita','recusada') THEN
    RAISE EXCEPTION 'Decisão inválida';
  END IF;
  SELECT id INTO _lead_id FROM public.leads WHERE client_token = _token;
  IF _lead_id IS NULL THEN RAISE EXCEPTION 'Token inválido'; END IF;

  SELECT * INTO _prop FROM public.propostas WHERE id = _proposta_id AND lead_id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada'; END IF;
  IF _prop.status IN ('aceita','recusada') THEN
    RAISE EXCEPTION 'Proposta já foi % ', _prop.status;
  END IF;

  UPDATE public.propostas
    SET status = _decisao,
        aceita_at = CASE WHEN _decisao='aceita' THEN now() ELSE aceita_at END,
        recusada_at = CASE WHEN _decisao='recusada' THEN now() ELSE recusada_at END,
        motivo_recusa = CASE WHEN _decisao='recusada' THEN _motivo ELSE motivo_recusa END
    WHERE id = _proposta_id;

  RETURN jsonb_build_object('ok', true, 'lojista_id', _prop.lojista_id);
END; $$;

CREATE OR REPLACE FUNCTION public.client_close_lead(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lead_id uuid;
BEGIN
  SELECT id INTO _lead_id FROM public.leads WHERE client_token = _token;
  IF _lead_id IS NULL THEN RAISE EXCEPTION 'Token inválido'; END IF;
  UPDATE public.leads SET fechado = true, fechado_at = now() WHERE id = _lead_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

REVOKE ALL ON FUNCTION public.client_get_propostas(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.client_decide_proposta(text, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.client_close_lead(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_get_propostas(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_decide_proposta(text, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_close_lead(text) TO anon, authenticated;
