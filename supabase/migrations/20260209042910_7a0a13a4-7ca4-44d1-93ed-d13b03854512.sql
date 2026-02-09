
-- App users table for custom username/password auth
CREATE TABLE public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Public can read for login validation (via edge function with service role)
-- No direct client access - all operations go through edge functions
CREATE POLICY "No direct access" ON public.app_users
  FOR ALL USING (false);

-- Insert default admin user (password: admin123 - should be changed)
-- Using pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.app_users (username, password_hash, display_name, is_admin)
VALUES ('admin', crypt('admin123', gen_salt('bf')), 'Administrator', true);
