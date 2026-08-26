
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS retoma_combustivel text,
  ADD COLUMN IF NOT EXISTS retoma_caixa text,
  ADD COLUMN IF NOT EXISTS retoma_valor_esperado numeric,
  ADD COLUMN IF NOT EXISTS retoma_fotos text[],
  ADD COLUMN IF NOT EXISTS financiamento_entrada numeric,
  ADD COLUMN IF NOT EXISTS financiamento_prestacao numeric,
  ADD COLUMN IF NOT EXISTS situacao_residencia text,
  ADD COLUMN IF NOT EXISTS situacao_profissional text,
  ADD COLUMN IF NOT EXISTS situacao_profissional_outros text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('retoma-fotos', 'retoma-fotos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read retoma fotos"
ON storage.objects FOR SELECT
USING (bucket_id = 'retoma-fotos');

CREATE POLICY "anyone upload retoma fotos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'retoma-fotos');
