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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { streamUrl } = await req.json();

    if (!streamUrl) {
      return new Response(
        JSON.stringify({ error: "streamUrl required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = parseXtreamUrl(streamUrl);
    if (!parsed) {
      return new Response(
        JSON.stringify({ error: "Could not parse Xtream API credentials from URL", subtitles: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { baseUrl, username, password, streamId, type } = parsed;

    // Call Xtream API to get VOD/series info
    const action = type === "movie" ? "get_vod_info" : "get_series_info";
    const idParam = type === "movie" ? "vod_id" : "series_id";
    const apiUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=${action}&${idParam}=${streamId}`;

    console.log(`[fetch-vod-info] Fetching ${action} for ID ${streamId}`);

    const res = await fetch(apiUrl, {
      headers: stbHeaders,
      redirect: "follow",
    });

    if (!res.ok) {
      console.error(`[fetch-vod-info] API error: ${res.status}`);
      return new Response(
        JSON.stringify({ error: `API returned ${res.status}`, subtitles: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();

    // Extract subtitles from the response
    // Xtream API returns subtitles in various formats depending on the provider:
    // - data.info.subtitles (array of {file, language})
    // - data.movie_data.subtitles
    // - data.info.subs (alternative key)
    const subtitles: Array<{ url: string; language: string; label: string }> = [];

    const extractSubs = (subsData: any) => {
      if (!subsData) return;
      
      if (Array.isArray(subsData)) {
        for (const sub of subsData) {
          if (sub.file || sub.url || sub.link) {
            let subUrl = sub.file || sub.url || sub.link;
            // Make relative URLs absolute
            if (subUrl && !subUrl.startsWith("http")) {
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
        // Some providers use {lang_code: url} format
        for (const [lang, url] of Object.entries(subsData)) {
          if (typeof url === "string" && url.length > 0) {
            let subUrl = url;
            if (!subUrl.startsWith("http")) {
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
            if (subUrl && !subUrl.startsWith("http")) {
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

    // Try all known locations for subtitle data
    extractSubs(data?.info?.subtitles);
    extractSubs(data?.info?.subs);
    extractSubs(data?.movie_data?.subtitles);
    extractSubs(data?.movie_data?.subs);
    extractSubs(data?.subtitles);
    extractSubs(data?.subs);

    // Also check for subtitle files in the stream info
    if (data?.info?.movie_subtitles) {
      extractSubs(data.info.movie_subtitles);
    }

    console.log(`[fetch-vod-info] Found ${subtitles.length} subtitle tracks`);

    // Also return any useful metadata we found
    const info = data?.info || data?.movie_data || {};

    return new Response(
      JSON.stringify({
        subtitles,
        // Include audio track info if available
        audioTracks: info.audio_tracks || info.audio || [],
        // Container info
        container: info.container_extension || info.container || "",
        // Bitrate info
        bitrate: info.bitrate || 0,
        duration: info.duration || info.duration_secs || "",
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
