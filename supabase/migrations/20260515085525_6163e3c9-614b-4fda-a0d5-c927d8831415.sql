-- 1. Add soft-delete columns
ALTER TABLE public.lojistas
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS idx_lojistas_deleted_at ON public.lojistas(deleted_at);
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON public.leads(deleted_at);
CREATE INDEX IF NOT EXISTS idx_propostas_deleted_at ON public.propostas(deleted_at);

-- 2. Update lojista_is_active to exclude deleted lojistas
CREATE OR REPLACE FUNCTION public.lojista_is_active(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.lojistas l
    WHERE l.id = _user_id
      AND l.deleted_at IS NULL
      AND l.status <> 'rejeitado'
      AND l.subscription_active = true
      AND (
        l.trial_ends_at > now()
        OR EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.user_id = _user_id
            AND (
              (s.status IN ('active','trialing','past_due') AND (s.current_period_end IS NULL OR s.current_period_end > now()))
              OR (s.status = 'canceled' AND s.current_period_end > now())
            )
        )
      )
  )
$function$;

-- 3. Update get_leads_for_lojista to skip deleted leads
CREATE OR REPLACE FUNCTION public.get_leads_for_lojista()
 RETURNS TABLE(id uuid, nome text, email text, whatsapp text, marca_modelo text, preco_max numeric, ano_min integer, tipo_carro text, combustivel text, caixa text, localizacao text, tem_retoma boolean, precisa_financiamento boolean, urgencia text, created_at timestamp with time zone, expires_at timestamp with time zone, propostas_count integer, tipo_compra text, ano_max integer, km_max integer, versao text, cor text, extras text, marcas_preferidas text, observacoes text, forma_pagamento text, retoma_marca text, retoma_modelo text, retoma_ano integer, retoma_km integer, retoma_estado text, retoma_combustivel text, retoma_caixa text, retoma_valor_esperado numeric, retoma_observacoes text, retoma_fotos text[], financiamento_entrada numeric, financiamento_prestacao numeric, situacao_residencia text, situacao_profissional text, situacao_profissional_outros text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    l.id,
    CASE WHEN p.lead_id IS NOT NULL THEN l.nome ELSE NULL END,
    CASE WHEN p.lead_id IS NOT NULL THEN l.email ELSE NULL END,
    CASE WHEN p.lead_id IS NOT NULL THEN l.whatsapp ELSE NULL END,
    l.marca_modelo, l.preco_max, l.ano_min,
    l.tipo_carro, l.combustivel, l.caixa,
    l.localizacao, l.tem_retoma, l.precisa_financiamento,
    l.urgencia, l.created_at, l.expires_at, l.propostas_count,
    l.tipo_compra, l.ano_max, l.km_max, l.versao, l.cor, l.extras,
    l.marcas_preferidas, l.observacoes, l.forma_pagamento,
    l.retoma_marca, l.retoma_modelo, l.retoma_ano, l.retoma_km,
    l.retoma_estado, l.retoma_combustivel, l.retoma_caixa,
    l.retoma_valor_esperado, l.retoma_observacoes, l.retoma_fotos,
    l.financiamento_entrada, l.financiamento_prestacao,
    l.situacao_residencia, l.situacao_profissional, l.situacao_profissional_outros
  FROM public.leads l
  LEFT JOIN LATERAL (
    SELECT pr.lead_id FROM public.propostas pr
    WHERE pr.lead_id = l.id AND pr.lojista_id = auth.uid() AND pr.deleted_at IS NULL
    LIMIT 1
  ) p ON true
  WHERE public.has_role(auth.uid(), 'lojista')
    AND public.lojista_is_active(auth.uid())
    AND l.deleted_at IS NULL
  ORDER BY l.created_at DESC;
$function$;

-- 4. Update lojista_get_propostas to skip deleted
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
       WHEN l.expires_at <= now() OR l.fechado OR l.deleted_at IS NOT NULL THEN 'expirada'
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
  WHERE p.lojista_id = _uid
    AND p.deleted_at IS NULL
    AND l.deleted_at IS NULL;

  RETURN jsonb_build_object('propostas', _items);
END; $function$;

-- 5. Update client_get_propostas to skip deleted lead/propostas
CREATE OR REPLACE FUNCTION public.client_get_propostas(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _lead public.leads%ROWTYPE; _items jsonb;
BEGIN
  SELECT * INTO _lead FROM public.leads WHERE client_token = _token AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Token inválido'; END IF;

  UPDATE public.propostas
    SET status = 'visualizada', visualizada_at = now()
    WHERE lead_id = _lead.id AND status = 'enviada' AND deleted_at IS NULL;

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
  WHERE p.lead_id = _lead.id AND p.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'lead', jsonb_build_object(
      'id', _lead.id, 'nome', _lead.nome, 'marca_modelo', _lead.marca_modelo,
      'fechado', _lead.fechado, 'expires_at', _lead.expires_at, 'propostas_count', _lead.propostas_count
    ),
    'propostas', _items
  );
END; $function$;

-- 6. Admin soft-delete RPCs
CREATE OR REPLACE FUNCTION public.admin_soft_delete_lojista(_lojista_id uuid, _reason text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Apenas admins';
  END IF;
  PERFORM set_config('app.bypass_admin_check', 'on', true);
  UPDATE public.lojistas
    SET deleted_at = now(),
        deleted_by = _uid,
        subscription_active = false
    WHERE id = _lojista_id AND deleted_at IS NULL;
  PERFORM set_config('app.bypass_admin_check', 'off', true);

  INSERT INTO public.admin_audit_log (admin_id, action, target_lojista_id, details)
    VALUES (_uid, 'soft_delete_lojista', _lojista_id, jsonb_build_object('reason', _reason, 'at', now()));

  RETURN jsonb_build_object('ok', true, 'deleted_at', now());
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_soft_delete_lead(_lead_id uuid, _reason text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _affected_props int;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Apenas admins';
  END IF;
  UPDATE public.leads
    SET deleted_at = now(), deleted_by = _uid
    WHERE id = _lead_id AND deleted_at IS NULL;
  UPDATE public.propostas
    SET deleted_at = now(), deleted_by = _uid
    WHERE lead_id = _lead_id AND deleted_at IS NULL;
  GET DIAGNOSTICS _affected_props = ROW_COUNT;

  INSERT INTO public.admin_audit_log (admin_id, action, target_lojista_id, details)
    VALUES (_uid, 'soft_delete_lead', NULL,
      jsonb_build_object('lead_id', _lead_id, 'propostas_arquivadas', _affected_props, 'reason', _reason, 'at', now()));

  RETURN jsonb_build_object('ok', true, 'propostas_arquivadas', _affected_props);
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_soft_delete_proposta(_proposta_id uuid, _reason text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _prop public.propostas%ROWTYPE;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Apenas admins';
  END IF;
  SELECT * INTO _prop FROM public.propostas WHERE id = _proposta_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada'; END IF;

  UPDATE public.propostas
    SET deleted_at = now(), deleted_by = _uid
    WHERE id = _proposta_id AND deleted_at IS NULL;

  INSERT INTO public.admin_audit_log (admin_id, action, target_lojista_id, details)
    VALUES (_uid, 'soft_delete_proposta', _prop.lojista_id,
      jsonb_build_object('proposta_id', _proposta_id, 'lead_id', _prop.lead_id,
        'lojista_id', _prop.lojista_id, 'reason', _reason, 'at', now()));

  RETURN jsonb_build_object('ok', true);
END; $function$;