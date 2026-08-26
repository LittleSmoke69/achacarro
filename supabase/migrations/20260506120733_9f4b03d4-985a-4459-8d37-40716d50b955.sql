-- Add status column to propostas for accepted/rejected tracking
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'enviada';

-- Validate status values
CREATE OR REPLACE FUNCTION public.validate_proposta_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('enviada','aceita','recusada') THEN
    RAISE EXCEPTION 'Invalid proposta status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_proposta_status ON public.propostas;
CREATE TRIGGER trg_validate_proposta_status
  BEFORE INSERT OR UPDATE ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.validate_proposta_status();

-- Allow admins to update proposta status
DROP POLICY IF EXISTS "admin updates propostas" ON public.propostas;
CREATE POLICY "admin updates propostas" ON public.propostas
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin dashboard stats RPC (period: 'today','7d','30d','all')
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats(_period text DEFAULT 'all')
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _since timestamptz;
  _result jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito';
  END IF;

  _since := CASE _period
    WHEN 'today' THEN date_trunc('day', now())
    WHEN '7d'    THEN now() - interval '7 days'
    WHEN '30d'   THEN now() - interval '30 days'
    ELSE 'epoch'::timestamptz
  END;

  SELECT jsonb_build_object(
    'clientes',          (SELECT count(DISTINCT email) FROM public.leads WHERE created_at >= _since),
    'lojistas',          (SELECT count(*) FROM public.lojistas WHERE created_at >= _since),
    'lojistas_aprovados',(SELECT count(*) FROM public.lojistas WHERE status='aprovado' AND created_at >= _since),
    'leads_total',       (SELECT count(*) FROM public.leads WHERE created_at >= _since),
    'leads_ativos',      (SELECT count(*) FROM public.leads WHERE created_at >= _since AND propostas_count < 10 AND expires_at > now()),
    'leads_expirados',   (SELECT count(*) FROM public.leads WHERE created_at >= _since AND expires_at <= now()),
    'leads_ignorados',   (SELECT count(DISTINCT lead_id) FROM public.lead_actions WHERE created_at >= _since AND action='ignorado'),
    'propostas_total',   (SELECT count(*) FROM public.propostas WHERE created_at >= _since),
    'propostas_aceitas', (SELECT count(*) FROM public.propostas WHERE created_at >= _since AND status='aceita'),
    'propostas_recusadas',(SELECT count(*) FROM public.propostas WHERE created_at >= _since AND status='recusada')
  ) INTO _result;

  RETURN _result;
END; $$;

-- Admin lead list with computed metrics
CREATE OR REPLACE FUNCTION public.admin_leads_overview(_period text DEFAULT 'all')
RETURNS TABLE(
  id uuid, nome text, localizacao text, tipo_compra text, preco_max numeric,
  state text, propostas_count integer, ignorados_count bigint,
  created_at timestamptz, expires_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _since timestamptz;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito';
  END IF;
  _since := CASE _period
    WHEN 'today' THEN date_trunc('day', now())
    WHEN '7d'    THEN now() - interval '7 days'
    WHEN '30d'   THEN now() - interval '30 days'
    ELSE 'epoch'::timestamptz
  END;

  RETURN QUERY
  SELECT l.id, l.nome, l.localizacao, l.tipo_compra, l.preco_max,
    CASE WHEN l.propostas_count >= 10 THEN 'completo'
         WHEN l.expires_at <= now() THEN 'expirado'
         ELSE 'ativo' END,
    l.propostas_count,
    COALESCE((SELECT count(*) FROM public.lead_actions a WHERE a.lead_id = l.id AND a.action='ignorado'), 0),
    l.created_at, l.expires_at
  FROM public.leads l
  WHERE l.created_at >= _since
  ORDER BY l.created_at DESC;
END; $$;