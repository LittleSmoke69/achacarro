CREATE OR REPLACE FUNCTION public.client_get_propostas(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _lead public.leads%ROWTYPE; _items jsonb;
BEGIN
  SELECT * INTO _lead FROM public.leads WHERE client_token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Token inválido'; END IF;

  UPDATE public.propostas
    SET status = 'visualizada', visualizada_at = now()
    WHERE lead_id = _lead.id AND status = 'enviada';

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
END; $function$;