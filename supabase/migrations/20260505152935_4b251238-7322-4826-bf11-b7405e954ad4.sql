-- Add counters to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS propostas_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours');

CREATE INDEX IF NOT EXISTS idx_leads_expires_at ON public.leads(expires_at);

-- Propostas table
CREATE TABLE IF NOT EXISTS public.propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  lojista_id uuid NOT NULL,
  mensagem text NOT NULL,
  preco numeric NOT NULL,
  marca_modelo text,
  ano integer,
  km integer,
  link_anuncio text,
  aceita_retoma boolean NOT NULL DEFAULT false,
  oferece_financiamento boolean NOT NULL DEFAULT false,
  condicoes_financiamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, lojista_id)
);

CREATE INDEX IF NOT EXISTS idx_propostas_lead ON public.propostas(lead_id);
CREATE INDEX IF NOT EXISTS idx_propostas_lojista ON public.propostas(lojista_id);

ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

-- Lead actions (ignorar / interessado)
CREATE TABLE IF NOT EXISTS public.lead_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  lojista_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ignorado','interessado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, lojista_id)
);

ALTER TABLE public.lead_actions ENABLE ROW LEVEL SECURITY;

-- Helper: lead state
CREATE OR REPLACE FUNCTION public.lead_state(_lead_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN l.propostas_count >= 10 THEN 'completo'
    WHEN l.expires_at <= now() THEN 'expirado'
    ELSE 'ativo'
  END
  FROM public.leads l WHERE l.id = _lead_id
$$;

-- Trigger: enforce limit + bump counter
CREATE OR REPLACE FUNCTION public.enforce_proposta_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cnt int;
  exp timestamptz;
BEGIN
  SELECT propostas_count, expires_at INTO cnt, exp FROM public.leads WHERE id = NEW.lead_id FOR UPDATE;
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

DROP TRIGGER IF EXISTS trg_enforce_proposta_limit ON public.propostas;
CREATE TRIGGER trg_enforce_proposta_limit
BEFORE INSERT ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.enforce_proposta_limit();

-- RLS: propostas
CREATE POLICY "lojista insere própria proposta"
ON public.propostas FOR INSERT TO authenticated
WITH CHECK (auth.uid() = lojista_id AND public.lojista_is_active(auth.uid()));

CREATE POLICY "lojista lê próprias propostas"
ON public.propostas FOR SELECT TO authenticated
USING (auth.uid() = lojista_id OR public.has_role(auth.uid(), 'admin'));

-- RLS: lead_actions
CREATE POLICY "lojista insere própria ação"
ON public.lead_actions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = lojista_id AND public.lojista_is_active(auth.uid()));

CREATE POLICY "lojista lê próprias ações"
ON public.lead_actions FOR SELECT TO authenticated
USING (auth.uid() = lojista_id);

CREATE POLICY "lojista atualiza própria ação"
ON public.lead_actions FOR UPDATE TO authenticated
USING (auth.uid() = lojista_id);