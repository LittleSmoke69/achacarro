
-- 1. Drop unused security definer function
DROP FUNCTION IF EXISTS public.has_active_subscription(uuid, text);

-- 2. Tighten lojista_is_active: require subscription_active AND (trial not expired OR has active stripe subscription)
CREATE OR REPLACE FUNCTION public.lojista_is_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.lojistas l
    WHERE l.id = _user_id
      AND l.status <> 'rejeitado'
      AND l.subscription_active = true
      AND (
        l.trial_ends_at > now()
        OR EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.user_id = _user_id
            AND (
              (s.status IN ('active','trialing','past_due') AND (s.current_period_end IS NULL OR s.current_period_end > now()))
              OR (s.status = 'canceled' AND s.current_period_end > now())
            )
        )
      )
  )
$function$;

-- 3. Restrict bucket MIME types
UPDATE storage.buckets
  SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
  WHERE id = 'retoma-fotos';

UPDATE storage.buckets
  SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
  WHERE id = 'lojista-docs';

-- 4. DELETE policies for buckets
CREATE POLICY "admins delete retoma fotos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'retoma-fotos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "owners delete lojista docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lojista-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "admins delete lojista docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lojista-docs' AND public.has_role(auth.uid(), 'admin'));
