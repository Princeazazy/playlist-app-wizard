
-- Create storage bucket for channel logos
INSERT INTO storage.buckets (id, name, public) VALUES ('channel-logos', 'channel-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Channel logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'channel-logos');

-- Allow service role / edge functions to upload
CREATE POLICY "Service role can upload channel logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'channel-logos');
