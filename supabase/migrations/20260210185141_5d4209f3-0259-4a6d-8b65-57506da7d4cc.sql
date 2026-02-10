
-- Create helper functions with extensions schema
CREATE OR REPLACE FUNCTION public.hash_app_password(_password text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT extensions.crypt(_password, extensions.gen_salt('bf'));
$$;

CREATE OR REPLACE FUNCTION public.verify_app_password(_username text, _password text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE username = _username
      AND password_hash = extensions.crypt(_password, password_hash)
  );
$$;

-- Insert admin user
INSERT INTO public.app_users (username, password_hash, display_name, is_admin, is_active)
VALUES (
  'princeazazy',
  extensions.crypt('Azazy@2001', extensions.gen_salt('bf')),
  'Prince Azazy',
  true,
  true
)
ON CONFLICT (username) DO NOTHING;
