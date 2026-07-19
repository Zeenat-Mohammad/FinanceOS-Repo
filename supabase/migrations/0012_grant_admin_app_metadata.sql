-- Grant Finlo administrator privileges to the existing admin Auth user.
--
-- Admin access in the application is derived from Supabase Auth JWT app_metadata.
-- The existing public.is_app_admin() and public.get_admin_dashboard_summary()
-- functions already check for:
--   app_metadata.role = 'admin' | 'super_admin'
--   OR app_metadata.roles contains 'admin' | 'super_admin'
--
-- This migration updates auth.users.raw_app_meta_data for the existing
-- admin@finlofinance.com user. It preserves existing metadata keys such as
-- "provider" and "providers" by merging the new admin claims into the
-- current JSON object.
--
-- If the Auth user does not exist yet, this UPDATE affects zero rows and
-- completes successfully. It is safe to run multiple times.

update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'role', 'admin',
    'roles', jsonb_build_array('admin')
  )
where lower(email) = lower('admin@finlofinance.com');
