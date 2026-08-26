CREATE OR REPLACE FUNCTION public.lojista_get_propostas()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _items jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'status', CASE
       WHEN p.status IN ('aceita','recusada') THEN p.status
       WHEN l.expires_at <= now() OR l.fechado THEN 'expirada'
       ELSE p.status END,
    'preco', p.preco,
    'marca_modelo', p.marca_modelo,
    'ano', p.ano, 'km', p.km, 'combustivel', p.combustivel, 'caixa', p.caixa,
    'descricao', p.descricao, 'mensagem', p.mensagem, 'fotos', p.fotos,
    'tem_garantia', p.tem_garantia, 'garantia_meses', p.garantia_meses,
    'aceita_retoma', p.aceita_retoma, 'valor_retoma', p.valor_retoma,
    'oferece_financiamento', p.oferece_financiamento, 'condicoes_financiamento', p.condicoes_financiamento,
    'distrito', p.distrito, 'extras', p.extras, 'link_anuncio', p.link_anuncio,
    'created_at', p.created_at, 'visualizada_at', p.visualizada_at,
    'aceita_at', p.aceita_at, 'recusada_at', p.recusada_at, 'motivo_recusa', p.motivo_recusa,
    'lead', jsonb_build_object(
      'id', l.id,
      'nome_parcial', CASE WHEN p.status IN ('aceita','negociando') THEN l.nome
                           ELSE split_part(l.nome,' ',1) || ' ' || left(coalesce(split_part(l.nome,' ',2),''),1) || '.' END,
      'nome_full', CASE WHEN p.status IN ('aceita','negociando') THEN l.nome ELSE NULL END,
      'email', CASE WHEN p.status IN ('aceita','negociando') THEN l.email ELSE NULL END,
      'whatsapp', CASE WHEN p.status IN ('aceita','negociando') THEN l.whatsapp ELSE NULL END,
      'marca_modelo', l.marca_modelo,
      'localizacao', l.localizacao,
      'preco_max', l.preco_max,
      'expires_at', l.expires_at,
      'fechado', l.fechado
    ),
    'negociacoes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'origem', n.origem, 'preco_proposto', n.preco_proposto,
        'mensagem', n.mensagem, 'created_at', n.created_at
      ) ORDER BY n.created_at)
      FROM public.proposta_negociacoes n WHERE n.proposta_id = p.id
    ), '[]'::jsonb)
  ) ORDER BY p.created_at DESC), '[]'::jsonb)
  INTO _items
  FROM public.propostas p
  JOIN public.leads l ON l.id = p.lead_id
  WHERE p.lojista_id = _uid;

  RETURN jsonb_build_object('propostas', _items);
END; $function$;