const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function cleanTitle(name: string): string {
  return (name || "")
    .replace(/^\s*[A-Z]{2,4}\s*[:\-|]+\s*/i, "")
    .replace(/\s*[:\-|]+\s*[A-Z]{2,4}\s*$/i, "")
    .replace(/\bTAR\b/gi, "")
    .replace(/\bAR\b/gi, "")
    .replace(/\b(HD|SD|FHD|UHD|4K|1080P|720P|HEVC|WEB[- ]?DL|BLURAY|CAM)\b/gi, "")
    .replace(/\(\d{4}\)/g, "")
    .replace(/[_|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractArabicText(text: string): string {
  const arabic = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+/g);
  return arabic ? arabic.join(" ").trim() : "";
}

function decodeHtml(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([\da-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}

function stripHtml(input: string): string {
  return decodeHtml(input).replace(/<[^>]*>/g, "").trim();
}

// Fetch IMDB rating via OMDB API
async function fetchIMDBRating(title: string, year?: string): Promise<{ imdbRating: string; imdbId: string } | null> {
  const omdbKey = Deno.env.get("OMDB_API_KEY");
  if (!omdbKey) return null;

  try {
    const params = new URLSearchParams({ apikey: omdbKey, t: title, type: "movie" });
    if (year) params.set("y", year);

    let res = await fetch(`https://www.omdbapi.com/?${params}`);
    let data = await res.json();

    // If not found as movie, try series
    if (data.Response === "False") {
      params.set("type", "series");
      res = await fetch(`https://www.omdbapi.com/?${params}`);
      data = await res.json();
    }

    // If still not found and has Arabic, try without year
    if (data.Response === "False" && year) {
      params.delete("y");
      params.set("type", "movie");
      res = await fetch(`https://www.omdbapi.com/?${params}`);
      data = await res.json();
    }

    if (data.Response === "True" && data.imdbRating && data.imdbRating !== "N/A") {
      return { imdbRating: data.imdbRating, imdbId: data.imdbID || "" };
    }
    return null;
  } catch (e) {
    console.error("OMDB fetch error:", e);
    return null;
  }
}

// Fetch IMDB rating by IMDB ID directly
async function fetchIMDBRatingById(imdbId: string): Promise<string | null> {
  const omdbKey = Deno.env.get("OMDB_API_KEY");
  if (!omdbKey || !imdbId) return null;

  try {
    const res = await fetch(`https://www.omdbapi.com/?apikey=${omdbKey}&i=${imdbId}`);
    const data = await res.json();
    if (data.Response === "True" && data.imdbRating && data.imdbRating !== "N/A") {
      return data.imdbRating;
    }
    return null;
  } catch {
    return null;
  }
}

// Scrape elcinema.com rating for Arabic content
async function fetchElcinemaRating(arabicTitle: string): Promise<{ rating: string; source: string } | null> {
  try {
    const searchUrl = `https://elcinema.com/search/?s=${encodeURIComponent(arabicTitle)}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "ar,en;q=0.9",
      },
    });
    const html = await res.text();

    // Find first result link
    const linkMatch = html.match(/href="(\/work\/\d+[^"]*)"/);
    if (!linkMatch) return null;

    const workUrl = `https://elcinema.com${linkMatch[1]}`;
    const workRes = await fetch(workUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "ar,en;q=0.9",
      },
    });
    const workHtml = await workRes.text();

    // Look for rating on the page - elcinema uses different patterns
    // Pattern 1: rating value in structured data
    const ratingMatch = workHtml.match(/"ratingValue"\s*:\s*"?([\d.]+)"?/);
    if (ratingMatch) {
      return { rating: ratingMatch[1], source: "elcinema" };
    }

    // Pattern 2: rating in the page content
    const ratingAlt = workHtml.match(/class="[^"]*rating[^"]*"[^>]*>\s*([\d.]+)/i);
    if (ratingAlt) {
      return { rating: ratingAlt[1], source: "elcinema" };
    }

    return null;
  } catch (e) {
    console.error("Elcinema fetch error:", e);
    return null;
  }
}

// Fetch TMDB rating
async function fetchTMDBRating(title: string, year?: string, mediaType?: string): Promise<{ rating: string; tmdbId: number; imdbId?: string } | null> {
  const tmdbKey = Deno.env.get("TMDB_API_KEY");
  if (!tmdbKey) return null;

  try {
    const type = mediaType === "tv" ? "tv" : "movie";
    const params = new URLSearchParams({ api_key: tmdbKey, query: title });
    if (year) params.set(type === "movie" ? "year" : "first_air_date_year", year);

    const res = await fetch(`https://api.themoviedb.org/3/search/${type}?${params}`);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const item = data.results[0];
      const rating = item.vote_average;

      // Get IMDB ID from TMDB details
      let imdbId: string | undefined;
      try {
        const detailRes = await fetch(`https://api.themoviedb.org/3/${type}/${item.id}/external_ids?api_key=${tmdbKey}`);
        const detailData = await detailRes.json();
        imdbId = detailData.imdb_id;
      } catch {}

      if (rating && rating > 0) {
        return { rating: rating.toFixed(1), tmdbId: item.id, imdbId };
      }
    }
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, year, mediaType, imdbId, tmdbId } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ success: false, error: "Title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanedTitle = cleanTitle(title);
    const arabicTitle = extractArabicText(title);
    const hasArabic = arabicTitle.length > 2;

    const ratings: Record<string, string> = {};
    let resolvedImdbId = imdbId || "";

    // Strategy: run all fetches in parallel for speed
    const promises: Promise<void>[] = [];

    // 1. IMDB via OMDB - try by ID first, then by title
    promises.push(
      (async () => {
        if (imdbId) {
          const r = await fetchIMDBRatingById(imdbId);
          if (r) { ratings.imdb = r; return; }
        }
        // Try English title
        const r = await fetchIMDBRating(cleanedTitle, year);
        if (r) {
          ratings.imdb = r.imdbRating;
          resolvedImdbId = r.imdbId;
        }
      })()
    );

    // 2. elcinema - only for Arabic content
    if (hasArabic) {
      promises.push(
        (async () => {
          const r = await fetchElcinemaRating(arabicTitle);
          if (r) ratings.elcinema = r.rating;
        })()
      );
    }

    // 3. TMDB rating + get IMDB ID if we don't have one
    promises.push(
      (async () => {
        const r = await fetchTMDBRating(cleanedTitle, year, mediaType);
        if (r) {
          ratings.tmdb = r.rating;
          if (!resolvedImdbId && r.imdbId) {
            resolvedImdbId = r.imdbId;
            // Now try OMDB with this ID
            if (!ratings.imdb) {
              const imdbR = await fetchIMDBRatingById(r.imdbId);
              if (imdbR) ratings.imdb = imdbR;
            }
          }
        }
      })()
    );

    await Promise.all(promises);

    // Pick best rating: IMDB > elcinema > TMDB
    const bestRating = ratings.imdb || ratings.elcinema || ratings.tmdb || null;
    const bestSource = ratings.imdb ? "imdb" : ratings.elcinema ? "elcinema" : ratings.tmdb ? "tmdb" : null;

    return new Response(
      JSON.stringify({
        success: true,
        ratings,
        bestRating,
        bestSource,
        imdbId: resolvedImdbId || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Ratings fetch error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
