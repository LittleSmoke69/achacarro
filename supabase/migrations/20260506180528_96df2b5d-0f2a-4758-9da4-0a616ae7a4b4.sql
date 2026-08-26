
CREATE OR REPLACE FUNCTION public.admin_get_propostas_with_email(_limit int DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _items jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito';
  END IF;

  WITH latest_log AS (
    SELECT DISTINCT ON (l.message_id)
      l.message_id, l.status, l.created_at, l.error_message, l.recipient_email,
      (l.metadata->>'proposta_id') AS proposta_id_meta,
      (l.metadata->>'lojista_id') AS lojista_id_meta
    FROM public.email_send_log l
    WHERE l.template_name = 'proposta-recebida'
    ORDER BY l.message_id, l.created_at DESC
  ),
  per_proposta AS (
    SELECT p.id AS proposta_id,
      (
        SELECT jsonb_build_object(
          'message_id', ll.message_id,
          'status', ll.status,
          'created_at', ll.created_at,
          'error_message', ll.error_message,
          'recipient', ll.recipient_email
        )
        FROM latest_log ll
        LEFT JOIN public.leads ld ON ld.email = ll.recipient_email
        WHERE ll.proposta_id_meta = p.id::text
           OR (ll.lojista_id_meta = p.lojista_id::text AND ld.id = p.lead_id)
        ORDER BY ll.created_at DESC
        LIMIT 1
      ) AS email
    FROM public.propostas p
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'lead_id', p.lead_id,
    'lojista_id', p.lojista_id,
    'marca_modelo', p.marca_modelo,
    'ano', p.ano,
    'preco', p.preco,
    'status', p.status,
    'created_at', p.created_at,
    'lead', jsonb_build_object('nome', l.nome, 'email', l.email, 'localizacao', l.localizacao),
    'lojista', jsonb_build_object('empresa', lo.empresa, 'email', lo.email),
    'email', pp.email
  ) ORDER BY p.created_at DESC), '[]'::jsonb)
  INTO _items
  FROM public.propostas p
  LEFT JOIN public.leads l ON l.id = p.lead_id
  LEFT JOIN public.lojistas lo ON lo.id = p.lojista_id
  LEFT JOIN per_proposta pp ON pp.proposta_id = p.id
  LIMIT _limit;

  RETURN jsonb_build_object('propostas', _items);
END $$;
