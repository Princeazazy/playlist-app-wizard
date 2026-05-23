-- Cache for AI-resolved category logos
CREATE TABLE IF NOT EXISTS public.category_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  raw_name TEXT NOT NULL,
  canonical_name TEXT,
  category TEXT,
  logo_url TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_logos_key ON public.category_logos(cache_key);

ALTER TABLE public.category_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read category logos"
ON public.category_logos FOR SELECT
USING (true);

-- Cache for AI-categorized playlist groupings
CREATE TABLE IF NOT EXISTS public.category_canonical (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_name TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL,
  kind TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_canonical_raw ON public.category_canonical(raw_name);

ALTER TABLE public.category_canonical ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read canonical"
ON public.category_canonical FOR SELECT
USING (true);

-- Public bucket for generated logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-logos', 'category-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read category-logos bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-logos');