DROP POLICY IF EXISTS "lojista insere própria ação" ON public.lead_actions;
CREATE POLICY "lojista insere própria ação"
ON public.lead_actions
FOR INSERT
WITH CHECK (
  auth.uid() = lojista_id
  AND public.lojista_is_active(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.lead_id = lead_actions.lead_id
      AND p.lojista_id = auth.uid()
  )
);