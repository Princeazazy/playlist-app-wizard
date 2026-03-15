import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const stbHeaders = {
  "User-Agent": "IPTV Smarters Pro/3.0.0 (Linux; STB)",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
  "Connection": "keep-alive",
};

const browserHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
};

function parseXtreamCredentials(url: string): { baseUrl: string; username: string; password: string } | null {
  try {
    const urlObj = new URL(url);
    const username = urlObj.searchParams.get("username");
    const password = urlObj.searchParams.get("password");
    if (username && password) {
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      return { baseUrl, username, password };
    }
    return null;
  } catch {
    return null;
  }
}

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

async function fetchSeriesPayload(apiUrls: string[], baseUrl: string): Promise<{ data: any | null; status: number | null }> {
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
        const response = await fetch(apiUrl, { headers, redirect: "follow" });
        lastStatus = response.status;

        if (!response.ok) {
          continue;
        }

        const rawText = await response.text();
        const parsed = JSON.parse(rawText);

        if (!parsed || Array.isArray(parsed) || (typeof parsed === "object" && Object.keys(parsed).length === 0)) {
          return { data: null, status: response.status };
        }

        return { data: parsed, status: response.status };
      } catch (error) {
        console.warn("[fetch-series-info] Candidate request failed:", apiUrl, error instanceof Error ? error.message : String(error));
      }
    }
  }

  return { data: null, status: lastStatus };
}

interface Episode {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  info?: {
    duration?: string;
    plot?: string;
    releaseDate?: string;
    rating?: string;
    movie_image?: string;
  };
  url: string;
}

interface Season {
  season_number: number;
  name: string;
  episodes: Episode[];
}

interface SeriesInfo {
  info: {
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    rating: string;
    backdrop_path: string[];
  };
  seasons: Season[];
  warning?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      playlistUrl,
      seriesId,
      seriesName,
      fallbackPlot,
    } = body as {
      playlistUrl?: string;
      seriesId?: string;
      seriesName?: string;
      fallbackPlot?: string;
    };

    if (!playlistUrl || !seriesId) {
      return new Response(
        JSON.stringify({ error: "playlistUrl and seriesId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creds = parseXtreamCredentials(playlistUrl);
    if (!creds) {
      return new Response(
        JSON.stringify({ error: "Invalid Xtream Codes URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { baseUrl, username, password } = creds;
    const primaryApiUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_series_info&series_id=${seriesId}`;
    const apiUrls = [primaryApiUrl];

    if (primaryApiUrl.startsWith("https://")) {
      apiUrls.push(primaryApiUrl.replace("https://", "http://"));
    }

    console.log(`[fetch-series-info] Fetching series_id=${seriesId} from ${baseUrl}`);

    const { data, status } = await fetchSeriesPayload(apiUrls, baseUrl);
    const info = data?.info || {};

    const seriesInfo: SeriesInfo = {
      info: {
        name: info.name || seriesName || "",
        cover: info.cover || "",
        plot: normalizeSynopsis(info.plot) || normalizeSynopsis(fallbackPlot),
        cast: info.cast || "",
        director: info.director || "",
        genre: info.genre || "",
        releaseDate: info.releaseDate || info.releasedate || "",
        rating: info.rating || "",
        backdrop_path: Array.isArray(info.backdrop_path) ? info.backdrop_path : [],
      },
      seasons: [],
    };

    // Process episodes by season when provider details are available
    if (data?.episodes && typeof data.episodes === "object") {
      const episodesBySeason: Record<string, Episode[]> = {};

      for (const [seasonNum, episodes] of Object.entries(data.episodes)) {
        if (!Array.isArray(episodes)) continue;

        episodesBySeason[seasonNum] = episodes.map((ep: any) => {
          const ext = ep.container_extension || "mp4";
          return {
            id: String(ep.id),
            episode_num: ep.episode_num || 0,
            title: ep.title || `Episode ${ep.episode_num}`,
            container_extension: ext,
            info: {
              duration: ep.info?.duration || "",
              plot: ep.info?.plot || "",
              releaseDate: ep.info?.releasedate || ep.info?.air_date || "",
              rating: ep.info?.rating || "",
              movie_image: ep.info?.movie_image || "",
            },
            url: `${baseUrl}/series/${username}/${password}/${ep.id}.${ext}`,
          };
        });
      }

      const sortedSeasonNums = Object.keys(episodesBySeason)
        .map(Number)
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

      for (const seasonNum of sortedSeasonNums) {
        const episodes = episodesBySeason[String(seasonNum)] || [];
        episodes.sort((a, b) => a.episode_num - b.episode_num);
        seriesInfo.seasons.push({
          season_number: seasonNum,
          name: `Season ${seasonNum}`,
          episodes,
        });
      }
    }

    // Plot fallback to elcinema when provider + playlist have no synopsis
    if (!seriesInfo.info.plot && (seriesInfo.info.name || seriesName)) {
      const fallbackTitle = seriesInfo.info.name || seriesName || "";
      seriesInfo.info.plot = await fetchElcinemaSynopsis(fallbackTitle);
    }

    if (!data) {
      if (status === 451) {
        seriesInfo.warning = "Provider blocked detailed series endpoint (451). Showing fallback metadata.";
      } else if (status) {
        seriesInfo.warning = `Provider details endpoint returned ${status}. Showing fallback metadata.`;
      } else {
        seriesInfo.warning = "Provider details endpoint unavailable. Showing fallback metadata.";
      }
    }

    console.log(`[fetch-series-info] seasons=${seriesInfo.seasons.length} plot=${seriesInfo.info.plot ? "yes" : "no"}`);

    return new Response(
      JSON.stringify(seriesInfo),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[fetch-series-info] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});