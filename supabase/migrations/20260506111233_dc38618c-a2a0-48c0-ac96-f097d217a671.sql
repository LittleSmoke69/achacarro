
DROP POLICY IF EXISTS "anyone upload retoma fotos" ON storage.objects;
CREATE POLICY "anyone upload retoma fotos"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'retoma-fotos'
  AND lower(coalesce((storage.foldername(name))[1], '')) <> ''
  AND (
    lower(name) LIKE '%.jpg'
    OR lower(name) LIKE '%.jpeg'
    OR lower(name) LIKE '%.png'
    OR lower(name) LIKE '%.webp'
    OR lower(name) LIKE '%.gif'
  )
  AND coalesce((metadata->>'size')::bigint, 0) <= 10485760
);
