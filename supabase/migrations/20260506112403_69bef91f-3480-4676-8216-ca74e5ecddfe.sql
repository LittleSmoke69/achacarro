
-- 1. Tighten lead_actions UPDATE: prevent reassigning to another lojista
DROP POLICY IF EXISTS "lojista atualiza própria ação" ON public.lead_actions;
CREATE POLICY "lojista atualiza própria ação"
ON public.lead_actions
FOR UPDATE
TO authenticated
USING (auth.uid() = lojista_id)
WITH CHECK (auth.uid() = lojista_id);

-- 2. SECURITY DEFINER RPC that returns leads with masked contact info
--    unless the calling lojista has already submitted a proposta for that lead.
CREATE OR REPLACE FUNCTION public.get_leads_for_lojista()
RETURNS TABLE (
  id uuid, nome text, email text, whatsapp text,
  marca_modelo text, preco_max numeric, ano_min integer,
  tipo_carro text, combustivel text, caixa text,
  localizacao text, tem_retoma boolean, precisa_financiamento boolean,
  urgencia text, created_at timestamptz, expires_at timestamptz, propostas_count integer,
  tipo_compra text, ano_max integer, km_max integer, versao text, cor text, extras text,
  marcas_preferidas text, observacoes text, forma_pagamento text,
  retoma_marca text, retoma_modelo text, retoma_ano integer, retoma_km integer,
  retoma_estado text, retoma_combustivel text, retoma_caixa text,
  retoma_valor_esperado numeric, retoma_observacoes text, retoma_fotos text[],
  financiamento_entrada numeric, financiamento_prestacao numeric,
  situacao_residencia text, situacao_profissional text, situacao_profissional_outros text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
    WHERE pr.lead_id = l.id AND pr.lojista_id = auth.uid()
    LIMIT 1
  ) p ON true
  WHERE public.has_role(auth.uid(), 'lojista')
    AND public.lojista_is_active(auth.uid())
  ORDER BY l.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_leads_for_lojista() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leads_for_lojista() TO authenticated;

-- 3. Replace the lojista SELECT policy on leads with a masked view via RPC.
--    Lojistas no longer get full SELECT on the table; they must use the RPC.
DROP POLICY IF EXISTS "active lojistas read leads" ON public.leads;
