
-- 1. Replace permissive lead INSERT policy
DROP POLICY IF EXISTS "anyone can submit lead" ON public.leads;
CREATE POLICY "anyone can submit lead" ON public.leads
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(trim(nome)) > 0
  AND length(trim(email)) > 3
  AND length(trim(whatsapp)) > 5
  AND length(trim(localizacao)) > 0
);

-- 2. Remove always-true insert policy on admin_notifications
-- Trigger notify_admin_new_lojista runs as SECURITY DEFINER (owner) so RLS is bypassed
DROP POLICY IF EXISTS "service inserts notifications" ON public.admin_notifications;

-- 3. Storage: drop broad public SELECT on retoma-fotos (bucket stays public for direct URLs)
DROP POLICY IF EXISTS "public read retoma fotos" ON storage.objects;

-- 4. Revoke EXECUTE on trigger-only SECURITY DEFINER functions from anon/authenticated/public
REVOKE EXECUTE ON FUNCTION public.handle_new_lojista() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admin_new_lojista() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_lojista_admin_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_lojista_status() FROM PUBLIC, anon, authenticated;

-- 5. RLS helper functions: keep accessible only to authenticated (needed for RLS evaluation), revoke from anon/public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lojista_is_active(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lojista_is_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated;
