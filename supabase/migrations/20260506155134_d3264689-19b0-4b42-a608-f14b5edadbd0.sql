
-- Allow 'negociando' status
CREATE OR REPLACE FUNCTION public.validate_proposta_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('enviada','visualizada','negociando','aceita','recusada') THEN
    RAISE EXCEPTION 'Invalid proposta status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

-- Negotiations table
CREATE TABLE IF NOT EXISTS public.proposta_negociacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  origem text NOT NULL CHECK (origem IN ('cliente','lojista')),
  preco_proposto numeric,
  mensagem text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proposta_negociacoes_proposta ON public.proposta_negociacoes(proposta_id, created_at);

ALTER TABLE public.proposta_negociacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lojista reads own negociacoes" ON public.proposta_negociacoes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = proposta_id AND (p.lojista_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE POLICY "admin updates negociacoes" ON public.proposta_negociacoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Client sends counter-offer via token
CREATE OR REPLACE FUNCTION public.client_negociar_proposta(
  _token text, _proposta_id uuid, _preco numeric, _mensagem text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _cli public.leads%ROWTYPE; _prop public.propostas%ROWTYPE; _loj public.lojistas%ROWTYPE;
BEGIN
  IF _preco IS NULL OR _preco <= 0 THEN RAISE EXCEPTION 'Preço inválido'; END IF;

  SELECT * INTO _cli FROM public.leads WHERE client_token = _token;
  IF _cli.id IS NULL THEN RAISE EXCEPTION 'Token inválido'; END IF;

  SELECT * INTO _prop FROM public.propostas WHERE id = _proposta_id AND lead_id = _cli.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada'; END IF;
  IF _prop.status IN ('aceita','recusada') THEN
    RAISE EXCEPTION 'Proposta já foi finalizada';
  END IF;

  INSERT INTO public.proposta_negociacoes (proposta_id, origem, preco_proposto, mensagem)
    VALUES (_proposta_id, 'cliente', _preco, _mensagem);

  UPDATE public.propostas SET status = 'negociando' WHERE id = _proposta_id;

  SELECT * INTO _loj FROM public.lojistas WHERE id = _prop.lojista_id;

  RETURN jsonb_build_object(
    'ok', true,
    'lojista_email', _loj.email,
    'lojista_empresa', _loj.empresa,
    'cliente_nome', _cli.nome,
    'marca_modelo', _prop.marca_modelo,
    'preco_original', _prop.preco,
    'preco_proposto', _preco,
    'mensagem', _mensagem
  );
END; $$;

-- Update get_propostas to include negotiation history
CREATE OR REPLACE FUNCTION public.client_get_propostas(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _lead public.leads%ROWTYPE; _items jsonb;
BEGIN
  SELECT * INTO _lead FROM public.leads WHERE client_token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Token inválido'; END IF;

  UPDATE public.propostas
    SET status = 'visualizada', visualizada_at = now()
    WHERE lead_id = _lead.id AND status = 'enviada';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'status', p.status, 'preco', p.preco, 'marca_modelo', p.marca_modelo,
    'ano', p.ano, 'km', p.km, 'combustivel', p.combustivel, 'caixa', p.caixa,
    'descricao', p.descricao, 'mensagem', p.mensagem, 'fotos', p.fotos,
    'tem_garantia', p.tem_garantia, 'garantia_meses', p.garantia_meses,
    'aceita_retoma', p.aceita_retoma, 'valor_retoma', p.valor_retoma,
    'oferece_financiamento', p.oferece_financiamento, 'condicoes_financiamento', p.condicoes_financiamento,
    'distrito', p.distrito, 'extras', p.extras, 'link_anuncio', p.link_anuncio,
    'created_at', p.created_at, 'visualizada_at', p.visualizada_at,
    'aceita_at', p.aceita_at, 'recusada_at', p.recusada_at,
    'lojista', jsonb_build_object('empresa', l.empresa, 'whatsapp', l.whatsapp, 'email', l.email),
    'negociacoes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'origem', n.origem, 'preco_proposto', n.preco_proposto,
        'mensagem', n.mensagem, 'created_at', n.created_at
      ) ORDER BY n.created_at)
      FROM public.proposta_negociacoes n WHERE n.proposta_id = p.id
    ), '[]'::jsonb)
  ) ORDER BY p.created_at DESC), '[]'::jsonb) INTO _items
  FROM public.propostas p
  LEFT JOIN public.lojistas l ON l.id = p.lojista_id
  WHERE p.lead_id = _lead.id;

  RETURN jsonb_build_object(
    'lead', jsonb_build_object(
      'id', _lead.id, 'nome', _lead.nome, 'marca_modelo', _lead.marca_modelo,
      'fechado', _lead.fechado, 'expires_at', _lead.expires_at, 'propostas_count', _lead.propostas_count
    ),
    'propostas', _items
  );
END; $$;
