DELETE FROM public.propostas WHERE lojista_id NOT IN (SELECT id FROM public.lojistas);
ALTER TABLE public.propostas
  ADD CONSTRAINT propostas_lojista_id_fkey FOREIGN KEY (lojista_id) REFERENCES public.lojistas(id) ON DELETE CASCADE;