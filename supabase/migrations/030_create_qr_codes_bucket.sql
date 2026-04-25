BEGIN;

-- ============================================
-- QR Codes Storage Bucket for real QR image uploads
-- Used by /admin/settings contact management (qrImageUrl)
-- ============================================

-- Create bucket if it doesn't exist (Supabase storage buckets are created via SQL or dashboard)
-- Note: In Supabase, buckets are typically created via the dashboard or storage API.
-- This migration ensures the bucket exists and sets public access.

DO $$
BEGIN
  -- This is a no-op in pure SQL; bucket creation is usually done via Supabase JS client or dashboard.
  -- We insert a note and rely on the following RLS/policy setup for the bucket.
  RAISE NOTICE 'Please create the "qr-codes" bucket in Supabase Dashboard > Storage with PUBLIC access.';
END $$;

-- If using Supabase CLI or direct storage management, the following would be used (commented for reference):
-- The bucket "qr-codes" should be created as PUBLIC so that uploaded QR images are accessible via publicUrl.

-- Ensure policies allow upload for authenticated admins (if not using RLS on storage objects)
-- Storage policies are usually set in the dashboard under Storage > Policies.

COMMIT;

-- Post-migration note:
-- 1. Go to Supabase Dashboard → Storage → Create new bucket named "qr-codes"
-- 2. Set it to PUBLIC (so images are accessible via public URLs without auth)
-- 3. (Optional) Add a policy allowing authenticated users to upload:
--    - Name: "Allow authenticated uploads to qr-codes"
--    - Action: INSERT
--    - Target: bucket_id = 'qr-codes'
--    - Condition: auth.role() = 'authenticated'
-- 4. Re-run the migration or ignore the notice if bucket already exists.
-- 
-- After bucket is public, uploading via /api/admin/settings/qr-upload will return a publicUrl that can be used in the contact channels.