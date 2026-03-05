// No import needed - using Deno.serve

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 30; // max requests per window
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_REQUESTS) {
    return false;
  }
  
  entry.count++;
  return true;
}

function getClientId(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// STB (Set-Top Box) headers to mimic legitimate STB devices
const stbHeaders = {
  'User-Agent': 'MAG250 MAG254 MAG256 Aura/1.0.0',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
  'X-Device-Type': 'stb',
  'X-Device-Model': 'MAG256',
};

// Alternative STB user agents for rotation
const stbUserAgents = [
  'MAG250 MAG254 MAG256 Aura/1.0.0',
  'Formuler Z8 Pro/1.0 (Linux; Android 9)',
  'BuzzTV XRS 4500/1.0.0',
  'MAG324/325 (Linux; Sigma SDK 4.X)',
  'DreamLink T2/1.0.0',
  'IPTV Smarters Pro/3.0.0 (Linux; STB)',
  'TiviMate/4.7.0 (STB)',
  'STB Emulator/1.2.0',
];

// Get STB headers with rotated user agent
function getStbHeaders(index: number = 0): Record<string, string> {
  return {
    ...stbHeaders,
    'User-Agent': stbUserAgents[index % stbUserAgents.length],
  };
}

// Determine content type from group/name
function getContentType(group: string, name: string): 'live' | 'movies' | 'series' | 'sports' {
  const groupLower = (group || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();

  // Sports detection - ONLY based on GROUP to avoid misclassifying channels
  // Channels like "beIN Drama" or "ESPN Documentary" should not be sports
  if (
    groupLower.includes('sport') ||
    (groupLower.includes('bein') && groupLower.includes('sport')) ||
    groupLower.includes('espn sport') ||
    groupLower.includes('fox sport') ||
    groupLower.includes('sky sport') ||
    groupLower.includes('nfl') ||
    groupLower.includes('nba') ||
    groupLower.includes('mlb') ||
    groupLower.includes('nhl')
  ) {
    return 'sports';
  }

  // Series detection (mostly group-driven)
  if (
    groupLower.includes('series') ||
    groupLower.includes('tv show') ||
    groupLower.includes('episode') ||
    groupLower.includes('season') ||
    groupLower.includes('netflix') ||
    groupLower.includes('hbo') ||
    groupLower.includes('amazon') ||
    groupLower.includes('prime') ||
    groupLower.includes('hulu')
  ) {
    return 'series';
  }

  // Movies/VOD detection: ONLY when the GROUP looks like VOD.
  // Prevents live channels named "Cinema" / "Movies" from being misclassified into Movies.
  if (
    groupLower.includes('vod') ||
    groupLower.includes('on demand') ||
    groupLower.includes('on-demand') ||
    groupLower.match(/\bmov\b/) !== null ||
    groupLower.includes(' movies') ||
    groupLower.startsWith('movies') ||
    groupLower.includes(' film')
  ) {
    return 'movies';
  }

  return 'live';
}

// Parse Xtream Codes credentials from M3U URL
function parseXtreamCredentials(url: string): { baseUrl: string; username: string; password: string } | null {
  try {
    const urlObj = new URL(url);
    const username = urlObj.searchParams.get('username');
    const password = urlObj.searchParams.get('password');

    if (username && password) {
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      return { baseUrl, username, password };
    }

    return null;
  } catch {
    return null;
  }
}

// Many providers give an Xtream-style M3U URL (get.php?username=...&password=...&type=m3u...).
// Using the Xtream JSON APIs for these often returns *huge* JSON arrays (40k+ items) that exceed function memory.
// For these URLs we should prefer streaming M3U parsing instead.
function isXtreamGetM3UUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    const type = (u.searchParams.get('type') || '').toLowerCase();
    return path.endsWith('/get.php') && type.includes('m3u');
  } catch {
    return false;
  }
}
type XtreamFetchResult = { items: any[]; total: number; tooLarge?: boolean };

const XTREAM_MAX_JSON_BYTES = 40 * 1024 * 1024; // 40MB safety cap per API response
const XTREAM_MAX_ITEMS_PER_RESPONSE = 25000; // Safe limit to avoid CPU timeout
const CATEGORY_FETCH_TIMEOUT = 10000; // 10s timeout per category fetch
const MAX_CATEGORIES_PER_TYPE = 500; // Reasonable category cap

function responseTooLarge(res: Response, maxBytes: number): boolean {
  const len = res.headers.get('content-length');
  if (!len) return false;
  const n = Number(len);
  return Number.isFinite(n) && n > maxBytes;
}

// Fetch with timeout helper
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// Fetch and process Xtream Codes live streams - IPTV Smarters compatible
// IPTV Smarters fetches ALL streams, so we do the same unless a limit is explicitly set
async function fetchXtreamLive(
  baseUrl: string,
  username: string,
  password: string,
  limit: number = 0
): Promise<XtreamFetchResult> {
  try {
    console.log('Fetching Xtream live categories...');
    const categoriesRes = await fetchWithTimeout(
      `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_categories`,
      { headers: getStbHeaders(0) },
      6000
    );
    
    if (!categoriesRes.ok) {
      console.error('Failed to fetch live categories:', categoriesRes.status);
      return { items: [], total: 0 };
    }
    
    const categories = await categoriesRes.json();
    const limitedCategories = Array.isArray(categories) ? categories.slice(0, MAX_CATEGORIES_PER_TYPE) : [];
    console.log(`Found ${categories?.length || 0} live categories, using ${limitedCategories.length}`);

    const categoryMap = new Map<string, string>();
    for (const cat of limitedCategories) {
      const id = String(cat.category_id);
      categoryMap.set(id, cat.category_name);
    }

    const effectiveLimit = limit > 0 ? Math.min(limit, XTREAM_MAX_ITEMS_PER_RESPONSE) : XTREAM_MAX_ITEMS_PER_RESPONSE;
    return await fetchXtreamLiveByCategory(baseUrl, username, password, categoryMap, effectiveLimit);
  } catch (err) {
    console.error('Error fetching Xtream live streams:', err);
    return { items: [], total: 0 };
  }
}

// Priority sort: Arabic/year-based categories first to ensure they're fetched before hitting limits
function prioritizeCategories(entries: [string, string][]): [string, string][] {
  return entries.sort(([, nameA], [, nameB]) => {
    const a = nameA.toLowerCase();
    const b = nameB.toLowerCase();
    const scoreA = getCategoryPriority(a);
    const scoreB = getCategoryPriority(b);
    return scoreA - scoreB;
  });
}

function getCategoryPriority(name: string): number {
  // Highest priority: Arabic 2026 content
  if ((name.includes('ar ') || name.includes('arabic') || name.includes('عرب')) && name.includes('2026')) return 0;
  // Ramadan
  if (name.includes('ramadan') || name.includes('رمضان')) return 1;
  // Arabic 2025
  if ((name.includes('ar ') || name.includes('arabic') || name.includes('عرب')) && name.includes('2025')) return 2;
  // Any other Arabic
  if (name.includes('ar ') || name.includes('arabic') || name.includes('عرب')) return 3;
  // English/Foreign year-based categories (ensure they load before generic content)
  if ((name.includes('english') || name.includes('foreign') || name.includes('en ') || name.includes('اجنبي') || name.includes('أجنبي')) && /20\d{2}/.test(name)) return 3.5;
  // Year-based categories
  if (/20\d{2}/.test(name)) return 4;
  // Everything else
  return 5;
}

// Fallback: fetch live streams category by category if bulk fetch fails
async function fetchXtreamLiveByCategory(
  baseUrl: string,
  username: string,
  password: string,
  categoryMap: Map<string, string>,
  limit: number
): Promise<XtreamFetchResult> {
  const items: any[] = [];
  const seenStreamIds = new Set<string>();
  let total = 0;
  const categoryEntries = prioritizeCategories(Array.from(categoryMap.entries()));
  const categoryIds = categoryEntries.map(([id]) => id);

  // Fetch categories in parallel batches of 5
  const batchSize = 5;
  for (let i = 0; i < categoryIds.length && items.length < limit; i += batchSize) {
    const batch = categoryIds.slice(i, i + batchSize);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (categoryId) => {
        const categoryName = categoryMap.get(categoryId) || 'Uncategorized';
        const url = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams&category_id=${encodeURIComponent(categoryId)}`;

        try {
          const res = await fetchWithTimeout(url, { headers: getStbHeaders(1) }, CATEGORY_FETCH_TIMEOUT);
          if (!res.ok) return { categoryId, categoryName, streams: [] };

          const streams = await res.json().catch(() => null);
          return { categoryId, categoryName, streams: Array.isArray(streams) ? streams : [] };
        } catch {
          return { categoryId, categoryName, streams: [] };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status !== 'fulfilled') continue;
      const { categoryId, categoryName, streams } = result.value;
      
      total += streams.length;

      for (const stream of streams) {
        if (items.length >= limit) break;

        const streamId = String(stream.stream_id);
        if (seenStreamIds.has(streamId)) continue;
        seenStreamIds.add(streamId);

        const streamUrl = `${baseUrl}/live/${username}/${password}/${stream.stream_id}.m3u8`;
        const categoryLower = categoryName.toLowerCase();
        // Only classify as sports based on CATEGORY name, not channel name
        // This prevents regular channels like "beIN Drama" from being misclassified
        const isSports = categoryLower.includes('sport') || 
          (categoryLower.includes('bein') && categoryLower.includes('sport')) || 
          categoryLower.includes('espn') ||
          categoryLower.includes('fox sport') ||
          categoryLower.includes('sky sport');

        items.push({
          name: stream.name || 'Unknown Channel',
          url: streamUrl,
          logo: stream.stream_icon || '',
          group: categoryName,
          type: isSports ? 'sports' : 'live',
          stream_id: streamId,
          epg_channel_id: stream.epg_channel_id || '',
          num: stream.num,
          tv_archive: stream.tv_archive || 0,
          category_id: categoryId,
        });
      }
    }
  }

  console.log(`Collected ${items.length} live items (limit ${limit})`);
  return { items, total };
}

// Fetch Xtream Codes VOD (movies) - IPTV Smarters compatible
async function fetchXtreamMovies(
  baseUrl: string,
  username: string,
  password: string,
  limit: number = 0
): Promise<XtreamFetchResult> {
  try {
    console.log('Fetching Xtream VOD categories...');
    const categoriesRes = await fetchWithTimeout(
      `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_vod_categories`,
      { headers: getStbHeaders(2) },
      6000
    );

    if (!categoriesRes.ok) {
      console.error('Failed to fetch VOD categories:', categoriesRes.status);
      return { items: [], total: 0 };
    }

    const categories = await categoriesRes.json();
    const limitedCategories = Array.isArray(categories) ? categories.slice(0, MAX_CATEGORIES_PER_TYPE) : [];
    console.log(`Found ${categories?.length || 0} VOD categories, using ${limitedCategories.length}`);

    const categoryMap = new Map<string, string>();
    for (const cat of limitedCategories) {
      categoryMap.set(String(cat.category_id), cat.category_name);
    }

    const effectiveLimit = limit > 0 ? Math.min(limit, XTREAM_MAX_ITEMS_PER_RESPONSE) : XTREAM_MAX_ITEMS_PER_RESPONSE;
    const result = await fetchXtreamVodByCategory(baseUrl, username, password, categoryMap, effectiveLimit);
    return result;
  } catch (err) {
    console.error('Error fetching Xtream VOD:', err);
    return { items: [], total: 0 };
  }
}

async function fetchXtreamVodByCategory(
  baseUrl: string,
  username: string,
  password: string,
  categoryMap: Map<string, string>,
  limit: number
): Promise<XtreamFetchResult> {
  const items: any[] = [];
  const seenStreamIds = new Set<string>();
  let total = 0;
  const categoryEntries = prioritizeCategories(Array.from(categoryMap.entries()));

  // Fetch in parallel batches of 5
  const batchSize = 5;
  for (let i = 0; i < categoryEntries.length && items.length < limit; i += batchSize) {
    const batch = categoryEntries.slice(i, i + batchSize);
    
    const batchResults = await Promise.allSettled(
      batch.map(async ([categoryId, categoryName]) => {
        try {
          const res = await fetchWithTimeout(
            `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_vod_streams&category_id=${encodeURIComponent(categoryId)}`,
            { headers: getStbHeaders(3) },
            CATEGORY_FETCH_TIMEOUT
          );
          if (!res.ok) return { categoryId, categoryName, streams: [] };

          const streams = await res.json().catch(() => null);
          return { categoryId, categoryName, streams: Array.isArray(streams) ? streams : [] };
        } catch {
          return { categoryId, categoryName, streams: [] };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status !== 'fulfilled') continue;
      const { categoryId, categoryName, streams } = result.value;
      
      total += streams.length;

      for (const stream of streams) {
        if (items.length >= limit) break;

        const streamId = String(stream.stream_id);
        if (seenStreamIds.has(streamId)) continue;
        seenStreamIds.add(streamId);

        const ext = stream.container_extension || 'mp4';
        items.push({
          name: stream.name || 'Unknown Movie',
          url: `${baseUrl}/movie/${username}/${password}/${stream.stream_id}.${ext}`,
          logo: stream.stream_icon || '',
          group: categoryName,
          type: 'movies' as const,
          stream_id: streamId,
          category_id: categoryId,
          rating: stream.rating || '',
          year: stream.year || '',
          plot: stream.plot || '',
          genre: stream.genre || '',
          duration: stream.duration || '',
          container_extension: ext,
        });
      }
    }
  }

  console.log(`Collected ${items.length} movie items (limit ${limit})`);
  return { items, total };
}

async function fetchXtreamSeries(
  baseUrl: string,
  username: string,
  password: string,
  limit: number = 0
): Promise<XtreamFetchResult> {
  try {
    console.log('Fetching Xtream series categories...');
    const categoriesRes = await fetchWithTimeout(
      `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_series_categories`,
      { headers: getStbHeaders(4) },
      6000
    );

    if (!categoriesRes.ok) {
      console.error('Failed to fetch series categories:', categoriesRes.status);
      return { items: [], total: 0 };
    }

    const categories = await categoriesRes.json();
    const limitedCategories = Array.isArray(categories) ? categories.slice(0, MAX_CATEGORIES_PER_TYPE) : [];
    console.log(`Found ${categories?.length || 0} series categories, using ${limitedCategories.length}`);

    const categoryMap = new Map<string, string>();
    for (const cat of limitedCategories) {
      categoryMap.set(String(cat.category_id), cat.category_name);
    }

    const effectiveLimit = limit > 0 ? Math.min(limit, XTREAM_MAX_ITEMS_PER_RESPONSE) : XTREAM_MAX_ITEMS_PER_RESPONSE;
    const result = await fetchXtreamSeriesByCategory(baseUrl, username, password, categoryMap, effectiveLimit);
    return result;
  } catch (err) {
    console.error('Error fetching Xtream series:', err);
    return { items: [], total: 0 };
  }
}

async function fetchXtreamSeriesByCategory(
  baseUrl: string,
  username: string,
  password: string,
  categoryMap: Map<string, string>,
  limit: number
): Promise<XtreamFetchResult> {
  const items: any[] = [];
  const seenSeriesIds = new Set<string>();
  let total = 0;
  const categoryEntries = prioritizeCategories(Array.from(categoryMap.entries()));

  // Fetch in parallel batches of 5
  const batchSize = 5;
  for (let i = 0; i < categoryEntries.length && items.length < limit; i += batchSize) {
    const batch = categoryEntries.slice(i, i + batchSize);
    
    const batchResults = await Promise.allSettled(
      batch.map(async ([categoryId, categoryName]) => {
        try {
          const res = await fetchWithTimeout(
            `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_series&category_id=${encodeURIComponent(categoryId)}`,
            { headers: getStbHeaders(5) },
            CATEGORY_FETCH_TIMEOUT
          );
          if (!res.ok) return { categoryId, categoryName, streams: [] };

          const streams = await res.json().catch(() => null);
          return { categoryId, categoryName, streams: Array.isArray(streams) ? streams : [] };
        } catch {
          return { categoryId, categoryName, streams: [] };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status !== 'fulfilled') continue;
      const { categoryId, categoryName, streams } = result.value;
      
      total += streams.length;

      for (const stream of streams) {
        if (items.length >= limit) break;

        const seriesId = String(stream.series_id);
        if (seenSeriesIds.has(seriesId)) continue;
        seenSeriesIds.add(seriesId);

        items.push({
          name: stream.name || 'Unknown Series',
          url: '',
          logo: stream.cover || '',
          group: categoryName,
          type: 'series' as const,
          series_id: seriesId,
          category_id: categoryId,
          rating: stream.rating || '',
          rating_5based: stream.rating_5based || 0,
          year: stream.releaseDate || stream.year || '',
          plot: stream.plot || '',
          cast: stream.cast || '',
          director: stream.director || '',
          genre: stream.genre || '',
          backdrop_path: stream.backdrop_path || [],
          tmdb_id: stream.tmdb_id || '',
          last_modified: stream.last_modified || '',
          _baseUrl: baseUrl,
          _username: username,
          _password: password,
        });
      }
    }
  }

  console.log(`Collected ${items.length} series items (limit ${limit})`);
  return { items, total };
}

// Parse M3U content as we stream it
function parseM3UContent(chunk: string, existingChannels: { name: string; url: string; logo: string; group: string; type: string }[], partialLine: string): {
  channels: { name: string; url: string; logo: string; group: string; type: string }[];
  remainingPartial: string;
} {
  const content = partialLine + chunk;
  const lines = content.split('\n');
  
  const remainingPartial = chunk.endsWith('\n') ? '' : lines.pop() || '';
  
  let currentChannel: { name: string; url: string; logo: string; group: string; type: string } | null = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('#EXTINF:')) {
      const nameMatch = trimmedLine.match(/,(.+)$/);
      const logoMatch = trimmedLine.match(/tvg-logo="([^"]+)"/);
      const groupMatch = trimmedLine.match(/group-title="([^"]+)"/);
      
      const name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';
      const group = groupMatch ? groupMatch[1] : 'Uncategorized';
      const type = getContentType(group, name);
      
      currentChannel = {
        name,
        url: '',
        logo: logoMatch ? logoMatch[1] : '',
        group,
        type
      };
    } else if (currentChannel && trimmedLine && !trimmedLine.startsWith('#')) {
      currentChannel.url = trimmedLine;
      existingChannels.push(currentChannel);
      currentChannel = null;
    }
  }
  
  return { channels: existingChannels, remainingPartial };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting check
  const clientId = getClientId(req);
  if (!checkRateLimit(clientId)) {
    console.warn('Rate limit exceeded for client:', clientId);
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      url,
      maxChannels = 10000,
      maxBytesMB = 20,
      maxReturnPerType = 3000,
      preferXtreamApi = true,
      forceXtreamApi = false, // New: force Xtream API even for get.php URLs
    } = (body ?? {}) as Record<string, unknown>;

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enforce stricter limits to prevent timeout
    const safeMaxReturnPerType =
      typeof maxReturnPerType === 'number' && Number.isFinite(maxReturnPerType) && maxReturnPerType > 0
        ? Math.min(maxReturnPerType, XTREAM_MAX_ITEMS_PER_RESPONSE)
        : XTREAM_MAX_ITEMS_PER_RESPONSE;

    const rawMaxChannels = typeof maxChannels === 'number' ? maxChannels : Number(maxChannels);
    const safeMaxChannels = Number.isFinite(rawMaxChannels)
      ? Math.min(Math.max(rawMaxChannels, 0), 200000)
      : 100000;

    const stopAfterChannels = Math.min(safeMaxChannels, safeMaxReturnPerType * 3);

    const rawMaxBytesMB = typeof maxBytesMB === 'number' ? maxBytesMB : Number(maxBytesMB);
    const safeMaxBytesMB = Number.isFinite(rawMaxBytesMB)
      ? Math.min(Math.max(rawMaxBytesMB, 1), 60)
      : 50;

    console.log('Processing URL:', url);

    // Check if this is an Xtream Codes URL
    const xtreamCreds = parseXtreamCredentials(url);
    const isGetM3U = isXtreamGetM3UUrl(url);

    // Use Xtream API when:
    // 1. We have valid credentials AND
    // 2. Either forceXtreamApi is set, OR (preferXtreamApi is set AND it's not a get.php URL)
    // forceXtreamApi bypasses the get.php safety check - useful when we know Xtream API works
    const canUseXtreamApi = !!xtreamCreds && (forceXtreamApi || (preferXtreamApi && !isGetM3U));

    if (xtreamCreds && preferXtreamApi && isGetM3U && !forceXtreamApi) {
      console.log('Xtream get.php detected; forcing streaming M3U parsing (override preferXtreamApi). Use forceXtreamApi=true to override.');
    }

    if (canUseXtreamApi) {
      console.log('preferXtreamApi=true, fetching via Xtream API (IPTV Smarters compatible)...');
      const { baseUrl, username, password } = xtreamCreds;

      const limit = safeMaxReturnPerType;
      console.log(`Using limit: ${limit} per content type (to prevent memory overflow)`);

      // Fetch content types SEQUENTIALLY to avoid CPU spike
      const liveResult = await fetchXtreamLive(baseUrl, username, password, limit);
      const moviesResult = await fetchXtreamMovies(baseUrl, username, password, limit);
      const seriesResult = await fetchXtreamSeries(baseUrl, username, password, limit);

      const returnedChannels = [
        ...liveResult.items,
        ...moviesResult.items,
        ...seriesResult.items,
      ];

      return new Response(
        JSON.stringify({
          channels: returnedChannels,
          totalParsed: returnedChannels.length,
          totalAvailable: liveResult.total + moviesResult.total + seriesResult.total,
          isXtream: true,
          counts: {
            live: liveResult.items.length,
            movies: moviesResult.items.length,
            series: seriesResult.items.length,
          },
          totals: {
            live: liveResult.total,
            movies: moviesResult.total,
            series: seriesResult.total,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fall back to M3U parsing (preferred for resource safety)
    if (xtreamCreds && !preferXtreamApi) {
      console.log('Xtream credentials detected, but using streaming M3U parsing (preferXtreamApi=false)');
    }
    if (xtreamCreds && isGetM3U) {
      console.log('Xtream get.php M3U detected, using streaming M3U parsing to avoid huge JSON API payloads');
    }

    console.log('Using M3U parsing...');

    // Android APK User-Agents to bypass web restrictions
    const userAgents = [
      'Dalvik/2.1.0 (Linux; U; Android 13; Pixel 7 Pro Build/TQ3A.230805.001)',
      'okhttp/4.12.0',
      'IPTV Smarters Pro/3.1.5',
      'TiviMate/4.7.0 (Linux; Android 12; SM-S908B)',
      'GSE SMART IPTV/7.4 (Android 11; TV)',
      'Kodi/20.2 (Linux; Android 12; SHIELD Android TV Build/SQ3A.220705.003.A1)',
    ];

    const tryXtreamFallback = async (upstreamStatus?: number): Promise<Response | null> => {
      if (!xtreamCreds) return null;

      console.log('Falling back to Xtream API (category-by-category)...');
      const { baseUrl, username, password } = xtreamCreds;
      const limit = safeMaxReturnPerType;

      // Sequential to avoid CPU spike
      const liveResult = await fetchXtreamLive(baseUrl, username, password, limit);
      const moviesResult = await fetchXtreamMovies(baseUrl, username, password, limit);
      const seriesResult = await fetchXtreamSeries(baseUrl, username, password, limit);

      const returnedChannels = [
        ...liveResult.items,
        ...moviesResult.items,
        ...seriesResult.items,
      ];

      if (returnedChannels.length === 0) return null;

      return new Response(
        JSON.stringify({
          channels: returnedChannels,
          totalParsed: returnedChannels.length,
          totalAvailable: liveResult.total + moviesResult.total + seriesResult.total,
          isXtream: true,
          m3u_blocked: true,
          upstream_status: upstreamStatus ?? null,
          counts: {
            live: liveResult.items.length,
            movies: moviesResult.items.length,
            series: seriesResult.items.length,
          },
          totals: {
            live: liveResult.total,
            movies: moviesResult.total,
            series: seriesResult.total,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    };

    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // Reduced timeout

      try {
        console.log(`Attempt ${attempt} with user agent: ${userAgents[attempt - 1] || userAgents[0]}`);

        const urlObj = new URL(url);
        const referer = `${urlObj.protocol}//${urlObj.host}/`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': userAgents[(attempt - 1) % userAgents.length] || userAgents[0],
            'Referer': referer,
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive',
            'X-Requested-With': 'com.nst.iptvsmarterstvbox',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: controller.signal,
          redirect: 'follow'
        });

        clearTimeout(timeoutId);

        console.log(`Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          console.error(`Failed to fetch m3u on attempt ${attempt}:`, response.status, response.statusText);

          // If this looks like an Xtream-style URL, fall back quickly to the Xtream API.
          // Many providers block datacenter fetching of get.php M3U, but allow player_api.php.
          const fallback = await tryXtreamFallback(response.status);
          if (fallback) return fallback;

          if (attempt === 2) {
            return new Response(
              JSON.stringify({
                blocked: true,
                upstream_status: response.status,
                error: `Failed to fetch m3u file: ${response.status} ${response.statusText}`,
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        const channels: { name: string; url: string; logo: string; group: string; type: string }[] = [];
        let partialLine = '';
        let bytesRead = 0;
        const maxBytes = safeMaxBytesMB * 1024 * 1024;

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          bytesRead += value.length;
          const chunk = decoder.decode(value, { stream: true });

          const result = parseM3UContent(chunk, channels, partialLine);
          partialLine = result.remainingPartial;

          if (channels.length >= stopAfterChannels || bytesRead >= maxBytes) {
            console.log(`Stopping early: ${channels.length} channels, ${bytesRead} bytes read`);
            reader.cancel();
            break;
          }
        }

        console.log(`Parsed ${channels.length} channels from M3U stream`);
        
        if (channels.length === 0) {
          console.error('No channels parsed');
          if (attempt === 4) {
            return new Response(
              JSON.stringify({ error: 'No channels found in playlist' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          continue;
        }
        
        // Count by type
        const counts = {
          live: channels.filter((c) => c.type === 'live').length,
          movies: channels.filter((c) => c.type === 'movies').length,
          series: channels.filter((c) => c.type === 'series').length,
          sports: channels.filter((c) => c.type === 'sports').length,
        };

        console.log('Channel counts by type:', counts);

        const returnedChannels = safeMaxReturnPerType > 0
          ? [
              ...channels.filter((c) => c.type === 'live').slice(0, safeMaxReturnPerType),
              ...channels.filter((c) => c.type === 'sports').slice(0, safeMaxReturnPerType),
              ...channels.filter((c) => c.type === 'movies').slice(0, safeMaxReturnPerType),
              ...channels.filter((c) => c.type === 'series').slice(0, safeMaxReturnPerType),
            ]
          : channels;

        return new Response(
          JSON.stringify({ channels: returnedChannels, totalParsed: channels.length, isXtream: false, counts }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error(`Fetch error on attempt ${attempt}:`, fetchError);
        lastError = fetchError;

        const fallback = await tryXtreamFallback(undefined);
        if (fallback) return fallback;

        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError || new Error('Failed to fetch m3u after multiple attempts');
  } catch (error) {
    console.error('Error in fetch-m3u:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
