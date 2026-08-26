
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('lojista', 'admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Lojista profile
CREATE TABLE public.lojistas (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa text NOT NULL,
  nif text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  localizacao text NOT NULL,
  marcas text NOT NULL,
  faixa_preco text NOT NULL,
  tipo_veiculos text NOT NULL,
  aceita_retoma boolean NOT NULL DEFAULT false,
  faz_financiamento boolean NOT NULL DEFAULT false,
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  subscription_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lojistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lojista reads own" ON public.lojistas FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "lojista updates own" ON public.lojistas FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "lojista inserts own" ON public.lojistas FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Leads (buyer requests). Anyone can submit. Only active lojistas can read.
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  marca_modelo text NOT NULL,
  preco_max numeric NOT NULL,
  ano_min int NOT NULL,
  tipo_carro text NOT NULL,
  combustivel text NOT NULL,
  caixa text NOT NULL,
  localizacao text NOT NULL,
  tem_retoma boolean NOT NULL DEFAULT false,
  precisa_financiamento boolean NOT NULL DEFAULT false,
  urgencia text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can submit lead" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.lojista_is_active(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lojistas
    WHERE id = _user_id AND (subscription_active = true OR trial_ends_at > now())
  )
$$;

CREATE POLICY "active lojistas read leads" ON public.leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'lojista') AND public.lojista_is_active(auth.uid()));

-- Lead status per lojista
CREATE TABLE public.lead_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  lojista_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'novo',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, lojista_id)
);
ALTER TABLE public.lead_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lojista reads own status" ON public.lead_status FOR SELECT TO authenticated USING (auth.uid() = lojista_id);
CREATE POLICY "lojista inserts own status" ON public.lead_status FOR INSERT TO authenticated WITH CHECK (auth.uid() = lojista_id);
CREATE POLICY "lojista updates own status" ON public.lead_status FOR UPDATE TO authenticated USING (auth.uid() = lojista_id);
