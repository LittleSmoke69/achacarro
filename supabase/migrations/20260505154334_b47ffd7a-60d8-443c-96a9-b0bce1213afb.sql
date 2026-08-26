CREATE POLICY "lojista lê logs das próprias propostas"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (
  template_name = 'proposta-recebida'
  AND message_id LIKE 'proposta-%-' || auth.uid()::text
);