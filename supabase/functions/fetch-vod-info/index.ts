import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stbHeaders = {
  "User-Agent": "MAG250 MAG254 MAG256 Aura/1.0.0",
  "Accept": "*/*",
  "Connection": "keep-alive",
  "X-Device-Type": "stb",
};

const browserHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
};

function cleanSearchName(name: string): string {
  return (name || "")
    .replace(/^\s*[A-Z]{2,4}\s*[:\-|]\s*\|?\s*/i, "")
    .replace(/^\s*[A-Z]{2}\s+(MOV|SER|SERIES|MOVIES?)\s*[:\-|]?\s*/i, "")
    .replace(/\b(HD|SD|FHD|UHD|4K|1080P|720P|480P|HEVC|X264|X265|WEB[- ]?DL|WEBRIP|BLURAY|BRRIP|CAM|TS)\b/gi, "")
    .replace(/\b(multi\s*sub|dubbed|subbed|vostfr|vf|vo)\b/gi, "")
    .replace(/\b[sS]\d{1,2}[eE]\d{1,2}\b/g, "")
    .replace(/\bS\d{1,2}\b$/i, "")
    .replace(/الحلقة\s*\d+/g, "")
    .replace(/[_|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([\da-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSynopsis(value: string | null | undefined): string {
  const cleaned = stripHtml(String(value || ""));
  if (!cleaned) return "";
  if (/^(no\s+description\s+available\.?|n\/a|none|null|undefined)$/i.test(cleaned)) return "";
  return cleaned;
}

async function fetchText(url: string, headers: Record<string, string> = browserHeaders, timeoutMs = 8000): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, redirect: "follow", signal: controller.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractElcinemaWorkPath(searchHtml: string): string | null {
  const patterns = [
    /href=["'](\/(?:en|ar)\/work\/\d+[^"']*)["']/i,
    /href=["'](\/work\/\d+[^"']*)["']/i,
  ];

  for (const pattern of patterns) {
    const match = searchHtml.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function extractMetaTagContent(html: string, attr: "property" | "name", attrValue: string): string {
  const firstPattern = new RegExp(`<meta[^>]*${attr}=["']${attrValue}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i");
  const secondPattern = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*${attr}=["']${attrValue}["'][^>]*>`, "i");
  return firstPattern.exec(html)?.[1] || secondPattern.exec(html)?.[1] || "";
}

function extractSynopsisFromElcinemaHtml(html: string): string {
  const ogDescription = normalizeSynopsis(extractMetaTagContent(html, "property", "og:description"));
  if (ogDescription) return ogDescription;

  const metaDescription = normalizeSynopsis(extractMetaTagContent(html, "name", "description"));
  if (metaDescription) return metaDescription;

  const scriptMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scriptMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        const jsonLdDescription = normalizeSynopsis(node?.description || "");
        if (jsonLdDescription) return jsonLdDescription;
      }
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }

  const paragraphMatch = html.match(/<p[^>]*class=["'][^"']*(?:story|synopsis|plot|desc)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  const paragraphDescription = normalizeSynopsis(paragraphMatch?.[1] || "");
  if (paragraphDescription) return paragraphDescription;

  return "";
}

async function fetchElcinemaSynopsis(title: string): Promise<string> {
  const cleanedTitle = cleanSearchName(title);
  if (!cleanedTitle) return "";

  const searchUrls = [
    `https://elcinema.com/ar/search/?q=${encodeURIComponent(cleanedTitle)}`,
    `https://elcinema.com/en/search/?q=${encodeURIComponent(cleanedTitle)}`,
  ];

  for (const searchUrl of searchUrls) {
    const searchHtml = await fetchText(searchUrl);
    if (!searchHtml) continue;

    const workPath = extractElcinemaWorkPath(searchHtml);
    if (!workPath) continue;

    const detailUrl = workPath.startsWith("http") ? workPath : `https://elcinema.com${workPath}`;
    const detailHtml = await fetchText(detailUrl);
    if (!detailHtml) continue;

    const synopsis = extractSynopsisFromElcinemaHtml(detailHtml);
    if (synopsis) return synopsis;
  }

  return "";
}

/**
 * Parses Xtream API credentials from a movie/series URL.
 * URL patterns:
 *   {baseUrl}/movie/{username}/{password}/{stream_id}.{ext}
 *   {baseUrl}/series/{username}/{password}/{stream_id}.{ext}
 */
function parseXtreamUrl(url: string): {
  baseUrl: string;
  username: string;
  password: string;
  streamId: string;
  type: "movie" | "series";
} | null {
  try {
    const match = url.match(
      /^(https?:\/\/[^\/]+)\/(movie|series)\/([^\/]+)\/([^\/]+)\/(\d+)/
    );
    if (!match) return null;
    return {
      baseUrl: match[1],
      type: match[2] as "movie" | "series",
      username: match[3],
      password: match[4],
      streamId: match[5],
    };
  } catch {
    return null;
  }
}

async function fetchVodPayload(apiUrls: string[], baseUrl: string): Promise<{ data: any | null; status: number | null }> {
  const headerProfiles: Array<Record<string, string>> = [
    stbHeaders,
    { ...stbHeaders, Origin: baseUrl, Referer: `${baseUrl}/` },
    browserHeaders,
    { ...browserHeaders, Origin: baseUrl, Referer: `${baseUrl}/` },
  ];

  let lastStatus: number | null = null;

  for (const apiUrl of apiUrls) {
    for (const headers of headerProfiles) {
      try {
        const response = await fetch(apiUrl, {
          headers,
          redirect: "follow",
        });

        lastStatus = response.status;

        if (!response.ok) {
          continue;
        }

        const payload = await response.json();
        return { data: payload, status: response.status };
      } catch (error) {
        console.warn("[fetch-vod-info] Candidate request failed:", apiUrl, error instanceof Error ? error.message : String(error));
      }
    }
  }

  return { data: null, status: lastStatus };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { streamUrl, mediaTitle, mediaType } = await req.json();

    if (!streamUrl && !mediaTitle) {
      return new Response(
        JSON.stringify({ error: "streamUrl or mediaTitle required", subtitles: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subtitles: Array<{ url: string; language: string; label: string }> = [];
    let providerPayload: any = null;
    let providerStatus: number | null = null;
    let baseUrl = "";

    const parsed = streamUrl ? parseXtreamUrl(streamUrl) : null;

    if (parsed) {
      baseUrl = parsed.baseUrl;
      const { username, password, streamId, type } = parsed;
      const action = type === "movie" ? "get_vod_info" : "get_series_info";
      const idParam = type === "movie" ? "vod_id" : "series_id";
      const primaryApiUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=${action}&${idParam}=${streamId}`;
      const apiUrls = [primaryApiUrl];

      if (primaryApiUrl.startsWith("https://")) {
        apiUrls.push(primaryApiUrl.replace("https://", "http://"));
      }

      console.log(`[fetch-vod-info] Fetching ${action} for ID ${streamId}`);
      const providerResult = await fetchVodPayload(apiUrls, baseUrl);
      providerPayload = providerResult.data;
      providerStatus = providerResult.status;
    }

    const extractSubs = (subsData: any) => {
      if (!subsData) return;

      if (Array.isArray(subsData)) {
        for (const sub of subsData) {
          if (sub.file || sub.url || sub.link) {
            let subUrl = sub.file || sub.url || sub.link;
            if (subUrl && !subUrl.startsWith("http") && baseUrl) {
              subUrl = `${baseUrl}${subUrl.startsWith("/") ? "" : "/"}${subUrl}`;
            }
            subtitles.push({
              url: subUrl,
              language: sub.language || sub.lang || sub.code || "Unknown",
              label: sub.label || sub.language || sub.lang || `Subtitle ${subtitles.length + 1}`,
            });
          }
        }
      } else if (typeof subsData === "object") {
        for (const [lang, url] of Object.entries(subsData)) {
          if (typeof url === "string" && url.length > 0) {
            let subUrl = url;
            if (!subUrl.startsWith("http") && baseUrl) {
              subUrl = `${baseUrl}${subUrl.startsWith("/") ? "" : "/"}${subUrl}`;
            }
            subtitles.push({
              url: subUrl,
              language: lang,
              label: lang,
            });
          } else if (typeof url === "object" && url !== null) {
            const subObj = url as any;
            let subUrl = subObj.file || subObj.url || subObj.link || "";
            if (subUrl && !subUrl.startsWith("http") && baseUrl) {
              subUrl = `${baseUrl}${subUrl.startsWith("/") ? "" : "/"}${subUrl}`;
            }
            if (subUrl) {
              subtitles.push({
                url: subUrl,
                language: lang,
                label: subObj.label || subObj.language || lang,
              });
            }
          }
        }
      }
    };

    // Extract subtitles from any known payload shape
    extractSubs(providerPayload?.info?.subtitles);
    extractSubs(providerPayload?.info?.subs);
    extractSubs(providerPayload?.movie_data?.subtitles);
    extractSubs(providerPayload?.movie_data?.subs);
    extractSubs(providerPayload?.subtitles);
    extractSubs(providerPayload?.subs);
    extractSubs(providerPayload?.info?.movie_subtitles);

    const info = providerPayload?.info || providerPayload?.movie_data || {};

    let plot = normalizeSynopsis(
      info.plot || info.description || info.storyline || info.synopsis || ""
    );
    let synopsisSource: "provider" | "elcinema" | "none" = plot ? "provider" : "none";

    if (!plot) {
      const fallbackTitle = String(mediaTitle || info.name || info.movie_name || info.title || "");
      if (fallbackTitle) {
        plot = await fetchElcinemaSynopsis(fallbackTitle);
        if (plot) synopsisSource = "elcinema";
      }
    }

    console.log(`[fetch-vod-info] subtitles=${subtitles.length} synopsis=${plot ? "yes" : "no"} source=${synopsisSource}`);

    return new Response(
      JSON.stringify({
        subtitles,
        plot,
        synopsisSource,
        providerStatus,
        // Include audio track info if available
        audioTracks: info.audio_tracks || info.audio || [],
        // Container info
        container: info.container_extension || info.container || "",
        // Bitrate info
        bitrate: info.bitrate || 0,
        duration: info.duration || info.duration_secs || "",
        mediaType: mediaType || parsed?.type || "movie",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[fetch-vod-info] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message, subtitles: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});