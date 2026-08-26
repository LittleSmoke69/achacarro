ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS retoma_tem_danos boolean,
  ADD COLUMN IF NOT EXISTS retoma_fotos_danos text[];