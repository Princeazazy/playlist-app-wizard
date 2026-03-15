
CREATE TABLE public.user_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Provider',
  provider_type text NOT NULL CHECK (provider_type IN ('xtream', 'm3u', 'access_code')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  account_info jsonb,
  provider_name text,
  provider_logo text,
  settings jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_providers ENABLE ROW LEVEL SECURITY;

-- RLS: Only the edge function (service role) accesses this table
CREATE POLICY "No direct access to user_providers"
  ON public.user_providers FOR ALL TO public USING (false);

CREATE INDEX idx_user_providers_user_id ON public.user_providers(user_id);
