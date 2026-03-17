// ═══════════════════════════════════════════════════════════════
// Direct Client-Side Xtream API Fetcher
// Fetches directly from user's IP to bypass cloud IP blocks
// ═══════════════════════════════════════════════════════════════

import { Capacitor } from '@capacitor/core';
import { NormalizedChannel, ContentType } from './types';

const USER_AGENTS = [
  'IPTV Smarters Pro/3.1.5',
  'TiviMate/4.7.0 (Linux; Android 12)',
  'okhttp/4.12.0',
  'Dalvik/2.1.0 (Linux; U; Android 13)',
];

const NON_WEB_EXT = /^(mkv|avi|wmv|flv|mov|divx|rmvb|3gp)$/i;

const FETCH_TIMEOUT = 25000;

interface XtreamCredentials {
  baseUrl: string;
  username: string;
  password: string;
}

function buildApiUrl(creds: XtreamCredentials, action: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({
    username: creds.username,
    password: creds.password,
    action,
    ...extra,
  });
  return `${creds.baseUrl}/player_api.php?${params.toString()}`;
}

function buildHeaders(uaIndex = 0): Record<string, string> {
  return {
    'User-Agent': USER_AGENTS[uaIndex % USER_AGENTS.length],
    'Accept': '*/*',
    'Accept-Encoding': 'identity',
    'Connection': 'keep-alive',
  };
}

async function fetchWithTimeout(url: string, timeoutMs: number, uaIndex = 0): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (Capacitor.isNativePlatform()) {
      const { Http } = await import('@capacitor/http');
      const res = await Http.request({
        method: 'GET',
        url,
        headers: buildHeaders(uaIndex),
        readTimeout: timeoutMs,
        connectTimeout: timeoutMs,
      });
      clearTimeout(timer);
      if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
      return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    }

    const res = await fetch(url, {
      headers: buildHeaders(uaIndex),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function fixLogoUrl(url: string): string {
  if (!url) return '';
  return url.startsWith('http://') ? url.replace('http://', 'https://') : url;
}

function detectSportsCategory(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('sport') ||
    (lower.includes('bein') && lower.includes('sport')) ||
    lower.includes('espn') || lower.includes('fox sport') || lower.includes('sky sport');
}

// ── Live Streams ────────────────────────────────────────────

async function fetchLiveCategories(creds: XtreamCredentials): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const data = await fetchWithTimeout(buildApiUrl(creds, 'get_live_categories'), FETCH_TIMEOUT);
    if (Array.isArray(data)) {
      for (const cat of data) map.set(String(cat.category_id), cat.category_name || 'Uncategorized');
    }
  } catch (e) {
    console.warn('[XtreamDirect] Failed to fetch live categories:', e);
  }
  return map;
}

async function fetchLiveStreams(creds: XtreamCredentials, categoryMap: Map<string, string>, liveExt: string): Promise<NormalizedChannel[]> {
  try {
    const data = await fetchWithTimeout(buildApiUrl(creds, 'get_live_streams'), FETCH_TIMEOUT, 1);
    if (!Array.isArray(data)) return [];

    console.log(`[XtreamDirect] Live bulk: ${data.length} streams`);
    const seen = new Set<string>();
    return data.filter((s: any) => {
      const id = String(s.stream_id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }).map((s: any): NormalizedChannel => {
      const catName = categoryMap.get(String(s.category_id || '')) || 'Uncategorized';
      return {
        id: '',
        name: String(s.name || 'Unknown'),
        url: `${creds.baseUrl}/live/${creds.username}/${creds.password}/${s.stream_id}.${liveExt}`,
        logo: fixLogoUrl(s.stream_icon || ''),
        group: catName,
        type: detectSportsCategory(catName) ? 'sports' : 'live',
        providerId: '',
        streamId: Number(s.stream_id),
        epgChannelId: s.epg_channel_id || '',
      };
    });
  } catch (e) {
    console.warn('[XtreamDirect] Live bulk failed:', e);
    return [];
  }
}

// ── VOD / Movies ────────────────────────────────────────────

async function fetchMovieCategories(creds: XtreamCredentials): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const data = await fetchWithTimeout(buildApiUrl(creds, 'get_vod_categories'), FETCH_TIMEOUT, 2);
    if (Array.isArray(data)) {
      for (const cat of data) map.set(String(cat.category_id), cat.category_name || 'Uncategorized');
    }
  } catch (e) {
    console.warn('[XtreamDirect] Failed to fetch movie categories:', e);
  }
  return map;
}

async function fetchMovieStreams(creds: XtreamCredentials, categoryMap: Map<string, string>): Promise<NormalizedChannel[]> {
  try {
    const data = await fetchWithTimeout(buildApiUrl(creds, 'get_vod_streams'), FETCH_TIMEOUT, 2);
    if (!Array.isArray(data)) return [];

    console.log(`[XtreamDirect] Movies bulk: ${data.length} streams`);
    const seen = new Set<string>();
    return data.filter((s: any) => {
      const id = String(s.stream_id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }).map((s: any): NormalizedChannel => {
      const catName = categoryMap.get(String(s.category_id || '')) || 'Uncategorized';
      const rawExt = s.container_extension || 'mp4';
      const ext = NON_WEB_EXT.test(rawExt) ? 'mp4' : rawExt;
      return {
        id: '',
        name: String(s.name || 'Unknown Movie'),
        url: `${creds.baseUrl}/movie/${creds.username}/${creds.password}/${s.stream_id}.${ext}`,
        logo: fixLogoUrl(s.stream_icon || ''),
        group: catName,
        type: 'movies',
        providerId: '',
        streamId: Number(s.stream_id),
        rating: s.rating || '',
        year: s.year || '',
        duration: s.duration || '',
        containerExtension: ext,
      };
    });
  } catch (e) {
    console.warn('[XtreamDirect] Movies bulk failed:', e);
    return [];
  }
}

// ── Series ──────────────────────────────────────────────────

async function fetchSeriesCategories(creds: XtreamCredentials): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const data = await fetchWithTimeout(buildApiUrl(creds, 'get_series_categories'), FETCH_TIMEOUT, 3);
    if (Array.isArray(data)) {
      for (const cat of data) map.set(String(cat.category_id), cat.category_name || 'Uncategorized');
    }
  } catch (e) {
    console.warn('[XtreamDirect] Failed to fetch series categories:', e);
  }
  return map;
}

async function fetchSeriesStreams(creds: XtreamCredentials, categoryMap: Map<string, string>): Promise<NormalizedChannel[]> {
  try {
    const data = await fetchWithTimeout(buildApiUrl(creds, 'get_series'), FETCH_TIMEOUT, 3);
    if (!Array.isArray(data)) return [];

    console.log(`[XtreamDirect] Series bulk: ${data.length} items`);
    const seen = new Set<string>();
    return data.filter((s: any) => {
      const id = String(s.series_id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }).map((s: any): NormalizedChannel => {
      const catName = categoryMap.get(String(s.category_id || '')) || 'Uncategorized';
      return {
        id: '',
        name: String(s.name || 'Unknown Series'),
        url: '', // Series don't have direct URLs - resolved on episode select
        logo: fixLogoUrl(s.cover || ''),
        group: catName,
        type: 'series',
        providerId: '',
        seriesId: Number(s.series_id),
        rating: s.rating || '',
        year: s.releaseDate || s.year || '',
        genre: s.genre || '',
        plot: '', // Stripped in bulk for performance
      };
    });
  } catch (e) {
    console.warn('[XtreamDirect] Series bulk failed:', e);
    return [];
  }
}

// ── Main Entry Point ────────────────────────────────────────

export async function fetchXtreamDirectFromClient(
  baseUrl: string,
  username: string,
  password: string,
  providerId: string,
): Promise<NormalizedChannel[]> {
  const creds: XtreamCredentials = {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    username,
    password,
  };

  console.log(`[XtreamDirect] Starting direct client-side fetch from ${creds.baseUrl}...`);
  const startTime = Date.now();

  // Fetch all categories in parallel
  const [liveCats, movieCats, seriesCats] = await Promise.all([
    fetchLiveCategories(creds),
    fetchMovieCategories(creds),
    fetchSeriesCategories(creds),
  ]);

  const totalCats = liveCats.size + movieCats.size + seriesCats.size;
  console.log(`[XtreamDirect] Categories loaded: ${liveCats.size} live, ${movieCats.size} movie, ${seriesCats.size} series`);

  if (totalCats === 0) {
    console.warn('[XtreamDirect] No categories found — provider may be blocking this IP too');
    throw new Error('Provider returned no categories. IP may be blocked.');
  }

  // Fetch all streams in parallel
  const [live, movies, series] = await Promise.all([
    fetchLiveStreams(creds, liveCats, 'm3u8'),
    fetchMovieStreams(creds, movieCats),
    fetchSeriesStreams(creds, seriesCats),
  ]);

  // Assign provider ID and merge
  const all = [...live, ...movies, ...series].map((ch, i) => ({
    ...ch,
    id: `${providerId}-ch-${i}`,
    providerId,
  }));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[XtreamDirect] ✅ Loaded ${all.length} items in ${elapsed}s (${live.length} live, ${movies.length} movies, ${series.length} series)`);

  return all;
}

// ── Probe: quick auth check to see if direct access works ───

export async function probeXtreamDirect(baseUrl: string, username: string, password: string): Promise<boolean> {
  try {
    const creds = { baseUrl: baseUrl.replace(/\/+$/, ''), username, password };
    const data = await fetchWithTimeout(buildApiUrl(creds, 'get_live_categories'), 8000);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}
