
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS combustivel text,
  ADD COLUMN IF NOT EXISTS caixa text,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS tem_garantia boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS garantia_meses integer,
  ADD COLUMN IF NOT EXISTS distrito text,
  ADD COLUMN IF NOT EXISTS disponibilidade text,
  ADD COLUMN IF NOT EXISTS extras text,
  ADD COLUMN IF NOT EXISTS revisao_recente boolean,
  ADD COLUMN IF NOT EXISTS historico_manutencao boolean,
  ADD COLUMN IF NOT EXISTS fotos text[] DEFAULT '{}'::text[];

INSERT INTO storage.buckets (id, name, public)
VALUES ('proposta-fotos', 'proposta-fotos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "proposta fotos public read" ON storage.objects;
CREATE POLICY "proposta fotos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'proposta-fotos');

DROP POLICY IF EXISTS "lojista uploads own proposta fotos" ON storage.objects;
CREATE POLICY "lojista uploads own proposta fotos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'proposta-fotos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "lojista updates own proposta fotos" ON storage.objects;
CREATE POLICY "lojista updates own proposta fotos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'proposta-fotos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "lojista deletes own proposta fotos" ON storage.objects;
CREATE POLICY "lojista deletes own proposta fotos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proposta-fotos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
