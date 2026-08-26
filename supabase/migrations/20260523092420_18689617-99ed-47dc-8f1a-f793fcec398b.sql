-- 1) Tighten lead_actions UPDATE policy: prevent mutating lead_id to a lead the lojista has no proposta for
DROP POLICY IF EXISTS "lojista atualiza própria ação" ON public.lead_actions;
CREATE POLICY "lojista atualiza própria ação"
ON public.lead_actions
FOR UPDATE
TO authenticated
USING (auth.uid() = lojista_id)
WITH CHECK (
  auth.uid() = lojista_id
  AND EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.lead_id = lead_actions.lead_id
      AND p.lojista_id = auth.uid()
  )
);

-- 2) Revoke EXECUTE from anon on SECURITY DEFINER functions that internally rely on auth.uid()
REVOKE EXECUTE ON FUNCTION public.lojista_get_propostas() FROM anon;
REVOKE EXECUTE ON FUNCTION public.lojista_get_client_token(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lojista_responder_contraproposta(uuid, text, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_propostas_with_email(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_lead_full_history(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_soft_delete_lojista(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_soft_delete_lead(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_soft_delete_proposta(uuid, text) FROM anon;

-- 3) Restrict public listing on proposta-fotos bucket: keep direct object read (URLs are unguessable)
--    but prevent enumerating the bucket contents via list/SELECT without object name.
DROP POLICY IF EXISTS "proposta fotos public read" ON storage.objects;
CREATE POLICY "proposta fotos public read by name"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'proposta-fotos' AND name IS NOT NULL);