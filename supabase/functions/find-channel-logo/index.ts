import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
} as const;

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const MAX_BATCH_SIZE = 20;

type ArtworkMediaType = "channel" | "movie" | "tv";

interface ArtworkItem {
  name: string;
  mediaType?: ArtworkMediaType;
  year?: string;
}

function toHttps(url: string): string {
  if (!url) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("http://")) return url.replace("http://", "https://");
  return url;
}

function cleanSearchName(name: string): string {
  return name
    // Strip country/provider prefixes like "KH:", "EG:", "AR |", "MA:", etc.
    .replace(/^\s*[A-Z]{2,4}\s*[:\-|]\s*\|?\s*/i, "")
    .replace(/^\s*[A-Z]{2}\s+(MOV|SER|SERIES|MOVIES?)\s*[:\-|]?\s*/i, "")
    // Strip quality/codec tags
    .replace(/\b(HD|SD|FHD|UHD|4K|1080P|720P|480P|HEVC|X264|X265|WEB[- ]?DL|WEBRIP|BLURAY|BRRIP|CAM|TS)\b/gi, "")
    // Strip "multi sub", "dubbed", "subbed" etc.
    .replace(/\b(multi\s*sub|dubbed|subbed|vostfr|vf|vo)\b/gi, "")
    // Strip trailing episode/season markers like "S01", "E12", "الحلقة 5"
    .replace(/\b[sS]\d{1,2}[eE]\d{1,2}\b/g, "")
    .replace(/\bS\d{1,2}\b$/i, "")
    .replace(/الحلقة\s*\d+/g, "")
    .replace(/[_|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractYear(value?: string): string | undefined {
  if (!value) return undefined;
  const m = value.match(/\b(19|20)\d{2}\b/);
  return m?.[0];
}

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: DEFAULT_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function pickImdbImage(html: string): string | null {
  const matches = html.match(/https:\/\/m\.media-amazon\.com\/images\/M\/[^"'\s)]+/g);
  if (!matches || matches.length === 0) return null;

  for (const raw of matches) {
    const cleaned = raw
      .replace(/\\u002F/g, "/")
      .replace(/\._V1_[^.]+(\.[a-zA-Z0-9]+)$/i, "._V1$1");
    if (cleaned.includes(".jpg") || cleaned.includes(".jpeg") || cleaned.includes(".png") || cleaned.includes(".webp")) {
      return toHttps(cleaned);
    }
  }

  return toHttps(matches[0]);
}

async function searchImdbArtwork(query: string): Promise<string | null> {
  const q = encodeURIComponent(cleanSearchName(query));
  if (!q) return null;

  const html = await fetchText(`https://www.imdb.com/find/?q=${q}&s=tt`);
  if (!html) return null;
  return pickImdbImage(html);
}

function pickElcinemaImage(html: string): string | null {
  const absoluteMedia = html.match(/https:\/\/media\.elcinema\.com\/uploads\/[^"'\s)]+/i)?.[0];
  if (absoluteMedia) return toHttps(absoluteMedia);

  const absoluteGeneric = html.match(/https:\/\/[^"'\s)]*elcinema[^"'\s)]*\.(?:jpg|jpeg|png|webp)/i)?.[0];
  if (absoluteGeneric) return toHttps(absoluteGeneric);

  const relativeUpload = html.match(/\/(?:uploads|media)\/[^"]+\.(?:jpg|jpeg|png|webp)/i)?.[0];
  if (relativeUpload) {
    if (relativeUpload.startsWith("/uploads/")) return `https://media.elcinema.com${relativeUpload}`;
    return `https://elcinema.com${relativeUpload}`;
  }

  return null;
}

async function searchElcinemaArtwork(query: string): Promise<string | null> {
  const cleaned = cleanSearchName(query);
  if (!cleaned) return null;

  const endpoints = [
    `https://elcinema.com/en/search/?q=${encodeURIComponent(cleaned)}`,
    `https://elcinema.com/ar/search/?q=${encodeURIComponent(cleaned)}`,
  ];

  for (const endpoint of endpoints) {
    const html = await fetchText(endpoint);
    if (!html) continue;
    const image = pickElcinemaImage(html);
    if (image) return image;
  }

  return null;
}

function scoreTitleMatch(query: string, candidateTitle: string, requestedYear?: string, candidateYear?: string): number {
  const q = query.toLowerCase().trim();
  const c = candidateTitle.toLowerCase().trim();
  if (!q || !c) return 0;

  let score = 0;
  if (q === c) score += 100;
  else if (c.includes(q) || q.includes(c)) score += 60;

  const qWords = q.split(/\s+/).filter(Boolean);
  const cWords = c.split(/\s+/).filter(Boolean);
  const overlap = qWords.filter((w) => cWords.includes(w)).length;
  if (qWords.length > 0) score += (overlap / qWords.length) * 40;

  // Year matching is critical — wrong year = likely wrong content
  if (requestedYear && candidateYear) {
    if (requestedYear === candidateYear) score += 30;
    else {
      const diff = Math.abs(parseInt(requestedYear) - parseInt(candidateYear));
      if (diff <= 1) score -= 5; // Adjacent year, minor penalty
      else score -= 30; // Wrong era, heavy penalty
    }
  }

  // Also check original_title match for Arabic content
  // (handled by caller passing both primary and original title)

  return score;
}

async function searchTMDBTitleArtwork(
  name: string,
  tmdbKey: string,
  mediaType: Exclude<ArtworkMediaType, "channel">,
  year?: string
): Promise<string | null> {
  const cleaned = cleanSearchName(name);
  if (!cleaned) return null;

  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const yearParam = year
    ? mediaType === "movie"
      ? `&primary_release_year=${year}`
      : `&first_air_date_year=${year}`
    : "";

  const terms = [cleaned];
  const arabic = name.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:\s+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*/);
  if (arabic && arabic[0].trim() && arabic[0].trim() !== cleaned) {
    terms.push(arabic[0].trim());
  }

  for (const term of terms) {
    const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${tmdbKey}&query=${encodeURIComponent(term)}&page=1${yearParam}`;

    try {
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!res.ok) continue;

      const data = await res.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      if (results.length === 0) continue;

      const best = results
        .map((r: any) => {
          const title = String(r.title || r.name || "");
          const date = String(r.release_date || r.first_air_date || "");
          const candidateYear = date.slice(0, 4) || undefined;
          const score = scoreTitleMatch(term, title, year, candidateYear);
          return { ...r, score };
        })
        .sort((a: any, b: any) => b.score - a.score)[0];

      if (best?.poster_path) return `${TMDB_IMAGE_BASE}/w500${best.poster_path}`;
      if (best?.backdrop_path) return `${TMDB_IMAGE_BASE}/w780${best.backdrop_path}`;
    } catch {
      // Continue to next fallback source
    }
  }

  return null;
}

// Try to find a real logo via TMDB network/company + TV search for channels
async function searchTMDBChannelArtwork(channelName: string, tmdbKey: string): Promise<string | null> {
  const cleaned = cleanSearchName(channelName);
  if (!cleaned) return null;

  try {
    const searchCompanyUrl = `https://api.themoviedb.org/3/search/company?api_key=${tmdbKey}&query=${encodeURIComponent(cleaned)}`;
    const companyRes = await fetch(searchCompanyUrl);

    if (companyRes.ok) {
      const data = await companyRes.json();
      if (Array.isArray(data?.results) && data.results.length > 0) {
        const exact = data.results.find(
          (r: any) =>
            String(r.name || "").toLowerCase() === cleaned.toLowerCase() && r.logo_path
        );
        const firstWithLogo = data.results.find((r: any) => r.logo_path);
        const match = exact || firstWithLogo;
        if (match?.logo_path) return `${TMDB_IMAGE_BASE}/w300${match.logo_path}`;
      }
    }

    const searchTvUrl = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(cleaned)}`;
    const tvRes = await fetch(searchTvUrl);

    if (tvRes.ok) {
      const tvData = await tvRes.json();
      const results = Array.isArray(tvData?.results) ? tvData.results : [];
      if (results.length > 0) {
        const best = results
          .map((r: any) => ({
            ...r,
            score: scoreTitleMatch(cleaned, String(r.name || "")),
          }))
          .sort((a: any, b: any) => b.score - a.score)[0];

        if (best?.poster_path) return `${TMDB_IMAGE_BASE}/w300${best.poster_path}`;
      }
    }
  } catch {
    // ignore and fall back to next source
  }

  return null;
}

// Generate a logo using the AI gateway (channel mode only)
async function generateLogo(channelName: string, lovableApiKey: string): Promise<string | null> {
  try {
    const prompt = `Create a simple, clean, professional TV channel logo for "${channelName}". The logo should be a square icon with the channel name or its initials stylized in a modern way, with a dark background. Make it look like a real TV network logo. Minimalist design, bold typography.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return imageData || null;
  } catch {
    return null;
  }
}

function sanitizeStorageName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const inputItems: ArtworkItem[] = Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body?.channelNames)
      ? body.channelNames.map((name: string) => ({ name, mediaType: "channel" as const }))
      : [];

    if (!Array.isArray(inputItems) || inputItems.length === 0) {
      return new Response(JSON.stringify({ error: "items or channelNames array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batch = inputItems
      .filter((item) => item && typeof item.name === "string" && item.name.trim().length > 0)
      .slice(0, MAX_BATCH_SIZE);

    const allowAiGeneration = body?.allowAiGeneration !== false;
    const tmdbKey = Deno.env.get("TMDB_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const canUseStorage = !!supabaseUrl && !!serviceRoleKey;
    const supabase = canUseStorage ? createClient(supabaseUrl, serviceRoleKey) : null;

    const results: Record<string, string | null> = {};

    for (const item of batch) {
      const name = item.name.trim();
      const mediaType: ArtworkMediaType =
        item.mediaType === "movie" || item.mediaType === "tv" || item.mediaType === "channel"
          ? item.mediaType
          : "channel";
      const year = extractYear(item.year);
      const searchName = cleanSearchName(name);

      if (!searchName) {
        results[name] = null;
        continue;
      }

      let artworkUrl: string | null = null;

      // For channel mode, first check generated storage logo to avoid repeated generation.
      if (mediaType === "channel" && allowAiGeneration && supabase) {
        const storageName = sanitizeStorageName(name);
        const { data: existingFile } = await supabase.storage.from("channel-logos").getPublicUrl(`${storageName}.png`);
        const existingPublicUrl = existingFile?.publicUrl;
        if (existingPublicUrl) {
          try {
            const head = await fetch(existingPublicUrl, { method: "HEAD" });
            if (head.ok) {
              results[name] = toHttps(existingPublicUrl);
              continue;
            }
          } catch {
            // ignore and continue fallback chain
          }
        }
      }

      if (mediaType === "channel") {
        // Channels: TMDB network/company first, then IMDb/Elcinema
        if (tmdbKey) artworkUrl = await searchTMDBChannelArtwork(searchName, tmdbKey);
        if (!artworkUrl) artworkUrl = await searchImdbArtwork(searchName);
        if (!artworkUrl) artworkUrl = await searchElcinemaArtwork(searchName);
      } else {
        // Movie/Series: try region-specific public databases + TMDB fallback
        const tryElcinemaFirst = containsArabic(searchName);

        if (tryElcinemaFirst) {
          artworkUrl = await searchElcinemaArtwork(searchName);
          if (!artworkUrl) artworkUrl = await searchImdbArtwork(searchName);
          if (!artworkUrl && tmdbKey) {
            artworkUrl = await searchTMDBTitleArtwork(searchName, tmdbKey, mediaType, year);
          }
        } else {
          artworkUrl = await searchImdbArtwork(searchName);
          if (!artworkUrl && tmdbKey) {
            artworkUrl = await searchTMDBTitleArtwork(searchName, tmdbKey, mediaType, year);
          }
          if (!artworkUrl) artworkUrl = await searchElcinemaArtwork(searchName);
        }
      }

      // Last fallback: AI-generated channel logo only (disabled for movie/tv posters)
      if (!artworkUrl && mediaType === "channel" && allowAiGeneration && lovableKey && supabase) {
        const base64Data = await generateLogo(name, lovableKey);
        if (base64Data) {
          try {
            const storageName = sanitizeStorageName(name);
            const base64Content = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");
            const binaryData = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));

            const { error: uploadError } = await supabase.storage
              .from("channel-logos")
              .upload(`${storageName}.png`, binaryData, {
                contentType: "image/png",
                upsert: true,
              });

            if (!uploadError) {
              const { data: publicUrl } = supabase.storage
                .from("channel-logos")
                .getPublicUrl(`${storageName}.png`);
              artworkUrl = publicUrl?.publicUrl || null;
            }
          } catch {
            // keep null
          }
        }
      }

      results[name] = artworkUrl ? toHttps(artworkUrl) : null;
    }

    return new Response(JSON.stringify({ logos: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("find-channel-logo error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
