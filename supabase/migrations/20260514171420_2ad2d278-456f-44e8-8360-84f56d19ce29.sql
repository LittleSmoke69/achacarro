
CREATE OR REPLACE FUNCTION public.admin_lead_full_history(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _lead public.leads%ROWTYPE;
  _stands jsonb;
  _propostas jsonb;
  _timeline jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito';
  END IF;

  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado';
  END IF;

  -- Stands that received the lead (from email_send_log) merged with ignored & proposta info
  WITH received AS (
    SELECT DISTINCT ON ((esl.metadata->>'lojista_id')::uuid)
      (esl.metadata->>'lojista_id')::uuid AS lojista_id,
      esl.created_at AS received_at,
      esl.status AS email_status
    FROM public.email_send_log esl
    WHERE esl.template_name = 'novo-lead-lojista'
      AND (esl.metadata->>'lead_id') = _lead_id::text
    ORDER BY (esl.metadata->>'lojista_id')::uuid, esl.created_at ASC
  ),
  ign AS (
    SELECT lojista_id, MIN(created_at) AS ignored_at
    FROM public.lead_actions
    WHERE lead_id = _lead_id AND action = 'ignorado'
    GROUP BY lojista_id
  ),
  prop AS (
    SELECT lojista_id, MIN(created_at) AS proposta_at, MIN(id::text) AS first_proposta_id
    FROM public.propostas
    WHERE lead_id = _lead_id
    GROUP BY lojista_id
  ),
  vis AS (
    SELECT lojista_id, MAX(updated_at) AS visto_at
    FROM public.lead_status
    WHERE lead_id = _lead_id
    GROUP BY lojista_id
  ),
  all_lojistas AS (
    SELECT lojista_id FROM received
    UNION SELECT lojista_id FROM ign
    UNION SELECT lojista_id FROM prop
    UNION SELECT lojista_id FROM vis
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'lojista_id', a.lojista_id,
    'empresa', l.empresa,
    'email', l.email,
    'whatsapp', l.whatsapp,
    'received_at', r.received_at,
    'visto_at', v.visto_at,
    'ignored_at', i.ignored_at,
    'proposta_at', p.proposta_at
  ) ORDER BY COALESCE(r.received_at, i.ignored_at, p.proposta_at)), '[]'::jsonb)
  INTO _stands
  FROM all_lojistas a
  LEFT JOIN public.lojistas l ON l.id = a.lojista_id
  LEFT JOIN received r ON r.lojista_id = a.lojista_id
  LEFT JOIN ign i ON i.lojista_id = a.lojista_id
  LEFT JOIN prop p ON p.lojista_id = a.lojista_id
  LEFT JOIN vis v ON v.lojista_id = a.lojista_id;

  -- Propostas with negotiations
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'lojista_id', p.lojista_id,
    'lojista', jsonb_build_object('empresa', lo.empresa, 'email', lo.email, 'whatsapp', lo.whatsapp),
    'status', p.status,
    'preco', p.preco,
    'marca_modelo', p.marca_modelo,
    'ano', p.ano, 'km', p.km,
    'combustivel', p.combustivel, 'caixa', p.caixa,
    'descricao', p.descricao, 'mensagem', p.mensagem,
    'fotos', p.fotos, 'extras', p.extras,
    'tem_garantia', p.tem_garantia, 'garantia_meses', p.garantia_meses,
    'aceita_retoma', p.aceita_retoma, 'valor_retoma', p.valor_retoma,
    'oferece_financiamento', p.oferece_financiamento,
    'condicoes_financiamento', p.condicoes_financiamento,
    'distrito', p.distrito, 'link_anuncio', p.link_anuncio,
    'created_at', p.created_at,
    'visualizada_at', p.visualizada_at,
    'aceita_at', p.aceita_at,
    'recusada_at', p.recusada_at,
    'motivo_recusa', p.motivo_recusa,
    'negociacoes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', n.id, 'origem', n.origem,
        'preco_proposto', n.preco_proposto,
        'mensagem', n.mensagem, 'created_at', n.created_at
      ) ORDER BY n.created_at)
      FROM public.proposta_negociacoes n WHERE n.proposta_id = p.id
    ), '[]'::jsonb)
  ) ORDER BY p.created_at), '[]'::jsonb)
  INTO _propostas
  FROM public.propostas p
  LEFT JOIN public.lojistas lo ON lo.id = p.lojista_id
  WHERE p.lead_id = _lead_id;

  -- Build chronological timeline
  WITH events AS (
    SELECT _lead.created_at AS at, 'lead_criado' AS type,
           jsonb_build_object('nome', _lead.nome) AS payload
    UNION ALL
    SELECT esl.created_at, 'lead_enviado',
           jsonb_build_object('lojista_id', esl.metadata->>'lojista_id',
             'empresa', (SELECT empresa FROM public.lojistas WHERE id::text = esl.metadata->>'lojista_id'))
    FROM public.email_send_log esl
    WHERE esl.template_name = 'novo-lead-lojista'
      AND (esl.metadata->>'lead_id') = _lead_id::text
    UNION ALL
    SELECT a.created_at, 'lead_ignorado',
           jsonb_build_object('lojista_id', a.lojista_id,
             'empresa', (SELECT empresa FROM public.lojistas WHERE id = a.lojista_id))
    FROM public.lead_actions a
    WHERE a.lead_id = _lead_id AND a.action = 'ignorado'
    UNION ALL
    SELECT p.created_at, 'proposta_enviada',
           jsonb_build_object('proposta_id', p.id, 'lojista_id', p.lojista_id,
             'empresa', (SELECT empresa FROM public.lojistas WHERE id = p.lojista_id),
             'preco', p.preco)
    FROM public.propostas p WHERE p.lead_id = _lead_id
    UNION ALL
    SELECT p.visualizada_at, 'proposta_visualizada',
           jsonb_build_object('proposta_id', p.id,
             'empresa', (SELECT empresa FROM public.lojistas WHERE id = p.lojista_id))
    FROM public.propostas p WHERE p.lead_id = _lead_id AND p.visualizada_at IS NOT NULL
    UNION ALL
    SELECT p.aceita_at, 'proposta_aceita',
           jsonb_build_object('proposta_id', p.id,
             'empresa', (SELECT empresa FROM public.lojistas WHERE id = p.lojista_id),
             'preco', p.preco)
    FROM public.propostas p WHERE p.lead_id = _lead_id AND p.aceita_at IS NOT NULL
    UNION ALL
    SELECT p.recusada_at, 'proposta_recusada',
           jsonb_build_object('proposta_id', p.id,
             'empresa', (SELECT empresa FROM public.lojistas WHERE id = p.lojista_id),
             'motivo', p.motivo_recusa)
    FROM public.propostas p WHERE p.lead_id = _lead_id AND p.recusada_at IS NOT NULL
    UNION ALL
    SELECT n.created_at,
           CASE WHEN n.origem = 'cliente' THEN 'negociacao_cliente' ELSE 'negociacao_lojista' END,
           jsonb_build_object('proposta_id', n.proposta_id, 'origem', n.origem,
             'preco_proposto', n.preco_proposto, 'mensagem', n.mensagem,
             'empresa', (SELECT lo.empresa FROM public.propostas pp
                         JOIN public.lojistas lo ON lo.id = pp.lojista_id
                         WHERE pp.id = n.proposta_id))
    FROM public.proposta_negociacoes n
    JOIN public.propostas p ON p.id = n.proposta_id
    WHERE p.lead_id = _lead_id
    UNION ALL
    SELECT _lead.fechado_at, 'lead_fechado', '{}'::jsonb
    WHERE _lead.fechado_at IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'at', at, 'type', type, 'payload', payload
  ) ORDER BY at), '[]'::jsonb)
  INTO _timeline FROM events WHERE at IS NOT NULL;

  RETURN jsonb_build_object(
    'lead', to_jsonb(_lead),
    'stands', _stands,
    'propostas', _propostas,
    'timeline', _timeline
  );
END;
$$;
