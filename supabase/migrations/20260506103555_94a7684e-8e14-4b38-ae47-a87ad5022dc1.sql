
-- 1. Restrict admin_audit_log DELETE explicitly (no one can delete)
CREATE POLICY "no one deletes audit log"
ON public.admin_audit_log
FOR DELETE
TO authenticated
USING (false);

-- 2. Replace predictable LIKE-pattern policy on email_send_log with metadata-based check.
-- The current policy matches `message_id LIKE 'proposta-%-' || uid`, which is fragile and
-- can be abused if message_id format ever changes. We drop it and check metadata->>'lojista_id' instead.
DROP POLICY IF EXISTS "lojista lê logs das próprias propostas" ON public.email_send_log;

CREATE POLICY "lojista reads own proposta email logs"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (
  template_name = 'proposta-recebida'
  AND (metadata->>'lojista_id') = (auth.uid())::text
);

-- 3. Server-side validation for proposta link_anuncio: only http(s) URLs allowed.
CREATE OR REPLACE FUNCTION public.validate_proposta_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.link_anuncio IS NOT NULL AND length(trim(NEW.link_anuncio)) > 0 THEN
    IF NEW.link_anuncio !~* '^https?://[^\s]+$' THEN
      RAISE EXCEPTION 'link_anuncio deve começar com http:// ou https://';
    END IF;
    IF length(NEW.link_anuncio) > 2048 THEN
      RAISE EXCEPTION 'link_anuncio demasiado longo';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_proposta_link_trg ON public.propostas;
CREATE TRIGGER validate_proposta_link_trg
BEFORE INSERT OR UPDATE ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.validate_proposta_link();
