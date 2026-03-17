// ═══════════════════════════════════════════════════════════════
// Provider Service — Unified API for all provider types
// Uses direct client-side fetch first, edge functions as fallback
// ═══════════════════════════════════════════════════════════════

import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import {
  ProviderConfig,
  XtreamConfig,
  M3UConfig,
  AccessCodeConfig,
  XtreamAccountInfo,
  NormalizedChannel,
  ContentType,
  SeriesDetail,
} from './types';
import {
  applyPlaybackUrlPreferences,
  normalizePlaybackUrl,
} from '@/lib/playback/urlResolver';
import { isNativeOrWebView } from '@/lib/platformDetect';
import { fetchDirectPlaylistChannels } from './m3uDirectFetch';
import { fetchXtreamDirectFromClient, probeXtreamDirect } from './xtreamDirectClient';

// ── Xtream API Authentication ───────────────────────────────

export async function authenticateXtream(config: XtreamConfig): Promise<{
  success: boolean;
  error?: string;
  accountInfo?: XtreamAccountInfo;
  providerName?: string;
}> {
  try {
    const serverUrl = config.serverUrl.replace(/\/+$/, '');
    const apiUrl = `${serverUrl}/player_api.php?username=${encodeURIComponent(config.username)}&password=${encodeURIComponent(config.password)}`;

    // Try direct fetch first (works in native APK and when provider allows CORS)
    let accountData: any = null;

    try {
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'IPTV Smarters Pro/3.0.0' },
      });
      if (res.ok) {
        accountData = await res.json();
      }
    } catch {
      // CORS blocked or network error — try edge function
    }

    if (!accountData?.user_info) {
      const { data, error } = await supabase.functions.invoke('fetch-m3u', {
        body: { url: apiUrl, rawFetch: true },
      });

      if (error) throw new Error(error.message);

      if (data?.rawResponse) {
        accountData = typeof data.rawResponse === 'string' ? JSON.parse(data.rawResponse) : data.rawResponse;
      } else if (data?.user_info) {
        accountData = data;
      }
    }

    if (!accountData?.user_info) {
      return { success: false, error: 'Invalid credentials or server not responding' };
    }

    const ui = accountData.user_info;
    const si = accountData.server_info;

    if (ui.auth === 0) {
      return { success: false, error: 'Authentication failed. Check username and password.' };
    }

    if (ui.status === 'Disabled' || ui.status === 'Banned') {
      return { success: false, error: `Account ${ui.status.toLowerCase()}. Contact your provider.` };
    }

    const accountInfo: XtreamAccountInfo = {
      username: ui.username,
      status: ui.status || 'Active',
      expDate: ui.exp_date || null,
      isTrial: ui.is_trial === '1',
      activeCons: parseInt(ui.active_cons || '0'),
      maxConnections: parseInt(ui.max_connections || '1'),
      createdAt: ui.created_at || '',
      serverInfo: si ? {
        url: si.url || serverUrl,
        port: si.port || '',
        httpsPort: si.https_port || '',
        rtmpPort: si.rtmp_port || '',
        timezone: si.timezone || '',
        serverProtocol: si.server_protocol || 'http',
      } : undefined,
    };

    return { success: true, accountInfo, providerName: si?.url || serverUrl };
  } catch (err: any) {
    console.error('[ProviderService] Xtream auth failed:', err);
    return { success: false, error: err.message || 'Connection failed' };
  }
}

// ── Validate M3U URL ────────────────────────────────────────

const getProviderPlaylistUrls = (config: ProviderConfig): string[] => {
  if (config.type === 'xtream') {
    const serverUrl = config.serverUrl.replace(/\/+$/, '');
    return [
      `${serverUrl}/get.php?username=${encodeURIComponent(config.username)}&password=${encodeURIComponent(config.password)}&type=m3u_plus&output=ts`,
    ];
  }

  if (config.type === 'm3u') {
    return [config.m3uUrl, config.vpnUrl]
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => value.trim())
      .filter((value, index, array) => array.indexOf(value) === index);
  }

  if (config.type === 'access_code') {
    const serverUrl = config.serverUrl.replace(/\/+$/, '');
    return [
      `${serverUrl}/get.php?username=${encodeURIComponent(config.accessCode)}&password=${encodeURIComponent(config.accessCode)}&type=m3u_plus&output=ts`,
    ];
  }

  return [];
};

export async function validateM3UUrl(config: M3UConfig): Promise<{
  success: boolean;
  error?: string;
  channelCount?: number;
}> {
  const playlistUrls = getProviderPlaylistUrls(config);
  let lastError: unknown;

  const validateViaBackend = async (playlistUrl: string): Promise<number> => {
    const { data, error } = await supabase.functions.invoke('fetch-m3u', {
      body: { url: playlistUrl, maxChannels: 100, maxBytesMB: 5, maxReturnPerType: 50, preferXtreamApi: false, forceXtreamApi: false },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return Array.isArray(data?.channels) ? data.channels.length : 0;
  };

  const validateDirectOnDevice = async (playlistUrl: string): Promise<number> => {
    if (!isNativeOrWebView()) return 0;
    const channels = await fetchDirectPlaylistChannels(playlistUrl, { maxChannels: 100, maxBytesMB: 5 });
    return channels.length;
  };

  try {
    for (const playlistUrl of playlistUrls) {
      try {
        const directCount = await validateDirectOnDevice(playlistUrl);
        if (directCount > 0) return { success: true, channelCount: directCount };
      } catch (error) {
        lastError = error;
      }

      try {
        const backendCount = await validateViaBackend(playlistUrl);
        if (backendCount > 0) return { success: true, channelCount: backendCount };
      } catch (error) {
        lastError = error;
      }
    }

    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : 'No channels found in playlist. Check the URL.',
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch playlist' };
  }
}

// ── Extract Xtream credentials from any config ──────────────

function extractXtreamCredentials(config: ProviderConfig): { baseUrl: string; username: string; password: string } | null {
  if (config.type === 'xtream') {
    return {
      baseUrl: config.serverUrl.replace(/\/+$/, ''),
      username: config.username,
      password: config.password,
    };
  }

  if (config.type === 'access_code') {
    return {
      baseUrl: config.serverUrl.replace(/\/+$/, ''),
      username: config.accessCode,
      password: config.accessCode,
    };
  }

  // Check if M3U URL is actually an Xtream get.php URL
  if (config.type === 'm3u') {
    try {
      const url = new URL(config.m3uUrl);
      const username = url.searchParams.get('username');
      const password = url.searchParams.get('password');
      if (username && password && url.pathname.includes('get.php')) {
        return { baseUrl: `${url.protocol}//${url.host}`, username, password };
      }
    } catch { /* not xtream */ }
  }

  return null;
}

// ── Fetch Content ───────────────────────────────────────────

export async function fetchProviderContent(
  config: ProviderConfig,
  providerId: string,
  options?: {
    maxChannels?: number;
    maxBytesMB?: number;
    maxReturnPerType?: number;
    signal?: AbortSignal;
  }
): Promise<NormalizedChannel[]> {
  const {
    maxChannels = 250000,
    maxBytesMB = 60,
    maxReturnPerType = 100000,
  } = options || {};

  const playlistUrls = getProviderPlaylistUrls(config);
  const primaryPlaylistUrl = playlistUrls[0];

  if (!primaryPlaylistUrl) {
    throw new Error('Unknown provider type');
  }

  // ── Strategy 1: Direct on-device M3U fetch (native APK) ──
  if (isNativeOrWebView()) {
    for (const playlistUrl of playlistUrls) {
      try {
        console.log(`[ProviderService] Attempting direct device playlist fetch: ${playlistUrl}`);
        const channels = await fetchDirectPlaylistChannels(playlistUrl, { maxChannels, maxBytesMB });
        if (channels.length > 0) {
          const normalized = normalizeChannels(channels, providerId);
          console.log(`[ProviderService] Direct device fetch loaded ${normalized.length} items`);
          return applyPlaybackUrlPreferences(normalized, config);
        }
      } catch (error) {
        console.warn('[ProviderService] Direct device playlist fetch failed:', error);
      }
    }
  }

  // ── Strategy 2: Direct Xtream JSON API from client ────────
  // This uses the user's IP, bypassing cloud IP blocks
  const xtreamCreds = extractXtreamCredentials(config);
  if (xtreamCreds) {
    try {
      console.log('[ProviderService] Trying direct client-side Xtream API fetch...');
      const directChannels = await fetchXtreamDirectFromClient(
        xtreamCreds.baseUrl,
        xtreamCreds.username,
        xtreamCreds.password,
        providerId,
      );

      if (directChannels.length > 0) {
        console.log(`[ProviderService] ✅ Direct Xtream fetch succeeded: ${directChannels.length} items`);
        return applyPlaybackUrlPreferences(directChannels, config);
      }
    } catch (err) {
      console.warn('[ProviderService] Direct Xtream fetch failed, falling back to edge function:', err);
    }
  }

  // ── Strategy 3: Edge function Xtream API (server-side) ────
  const isXtreamCompatible = config.type === 'xtream' || config.type === 'access_code' || primaryPlaylistUrl.includes('get.php');

  if (isXtreamCompatible) {
    console.log('[ProviderService] Fetching via 3 parallel Xtream calls (edge function)...');
    const baseBody = {
      url: primaryPlaylistUrl,
      maxChannels,
      maxBytesMB,
      maxReturnPerType,
      preferXtreamApi: true,
      forceXtreamApi: true,
    };

    const [liveRes, moviesRes, seriesRes] = await Promise.all([
      supabase.functions.invoke('fetch-m3u', { body: { ...baseBody, contentTypes: ['live'] } }),
      supabase.functions.invoke('fetch-m3u', { body: { ...baseBody, contentTypes: ['movies'] } }),
      supabase.functions.invoke('fetch-m3u', { body: { ...baseBody, contentTypes: ['series'] } }),
    ]);

    const allChannels: any[] = [];
    const errors: string[] = [];

    for (const [label, res] of [['live', liveRes], ['movies', moviesRes], ['series', seriesRes]] as const) {
      if (res.error) {
        console.error(`[ProviderService] ${label} fetch error:`, res.error.message);
        errors.push(`${label}: ${res.error.message}`);
        continue;
      }
      if (res.data?.error) {
        console.error(`[ProviderService] ${label} data error:`, res.data.error);
        errors.push(`${label}: ${res.data.error}`);
        continue;
      }
      const channels = res.data?.channels;
      if (Array.isArray(channels)) {
        console.log(`[ProviderService] ${label}: ${channels.length} items`);
        allChannels.push(...channels);
      }
    }

    if (allChannels.length > 0) {
      const normalized = normalizeChannels(allChannels, providerId);
      return applyPlaybackUrlPreferences(normalized, config);
    }

    // If edge function also returned nothing, try M3U fallback
    console.warn('[ProviderService] Xtream API returned no content, falling back to standard M3U parsing');
  }

  // ── Strategy 4: Standard M3U parsing via edge function ────
  return fallbackToStandardM3U(playlistUrls, providerId, config, maxChannels, maxBytesMB, maxReturnPerType);
}

async function fallbackToStandardM3U(
  playlistUrls: string[],
  providerId: string,
  config: ProviderConfig,
  maxChannels: number,
  maxBytesMB: number,
  maxReturnPerType: number,
): Promise<NormalizedChannel[]> {
  let lastError: unknown;

  for (const playlistUrl of playlistUrls) {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-m3u', {
        body: { url: playlistUrl, maxChannels, maxBytesMB, maxReturnPerType, preferXtreamApi: false, forceXtreamApi: false },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!Array.isArray(data?.channels) || data.channels.length === 0) continue;

      const normalized = normalizeChannels(data.channels, providerId);
      return applyPlaybackUrlPreferences(normalized, config);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error('No channels found in playlist');
}

/** Normalize raw channel data into our common model */
function normalizeChannels(rawChannels: any[], providerId: string): NormalizedChannel[] {
  const shouldCleanText = rawChannels.length <= 20000;

  return rawChannels
    .filter((ch: any) => ch.name && (ch.url || ch.type === 'series'))
    .map((ch: any, idx: number): NormalizedChannel => ({
      id: `${providerId}-ch-${idx}`,
      name: shouldCleanText ? cleanChannelName(ch.name) : String(ch.name || '').trim(),
      url: ch.url || '',
      logo: ch.logo || undefined,
      group: ch.group
        ? (shouldCleanText ? cleanGroupName(ch.group) : String(ch.group).trim())
        : 'Uncategorized',
      type: (ch.type || 'live') as ContentType,
      providerId,
      streamId: ch.stream_id,
      seriesId: ch.series_id,
      rating: ch.rating,
      year: ch.year,
      plot: ch.plot,
      cast: ch.cast,
      director: ch.director,
      genre: ch.genre,
      duration: ch.duration,
      containerExtension: ch.container_extension,
      backdropPath: ch.backdrop_path,
    }));
}

// ── Series Info ─────────────────────────────────────────────

export async function fetchSeriesInfo(
  seriesId: number,
  config: ProviderConfig
): Promise<SeriesDetail | null> {
  const creds = extractXtreamCredentials(config);
  if (!creds) return null;

  // Try direct client-side fetch first
  try {
    const apiUrl = `${creds.baseUrl}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}&action=get_series_info&series_id=${seriesId}`;
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'IPTV Smarters Pro/3.1.5' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.info || data?.episodes) {
        console.log('[ProviderService] Series info loaded via direct client fetch');
        return mapSeriesResponse(data, creds);
      }
    }
  } catch {
    console.warn('[ProviderService] Direct series info fetch failed, trying edge function');
  }

  // Fallback to edge function
  let playlistUrl: string;
  if (config.type === 'xtream') {
    const serverUrl = config.serverUrl.replace(/\/+$/, '');
    playlistUrl = `${serverUrl}/get.php?username=${encodeURIComponent(config.username)}&password=${encodeURIComponent(config.password)}&type=m3u_plus&output=ts`;
  } else if (config.type === 'm3u') {
    playlistUrl = config.vpnUrl || config.m3uUrl;
  } else {
    return null;
  }

  const { data, error } = await supabase.functions.invoke('fetch-series-info', {
    body: { playlistUrl, seriesId: String(seriesId) },
  });

  if (error || !data || data.error) return null;

  return {
    info: {
      name: data.info?.name || '',
      cover: data.info?.cover || '',
      plot: data.info?.plot || '',
      cast: data.info?.cast || '',
      director: data.info?.director || '',
      genre: data.info?.genre || '',
      releaseDate: data.info?.releaseDate || '',
      rating: data.info?.rating || '',
      backdropPath: data.info?.backdrop_path || [],
    },
    seasons: (data.seasons || []).map((s: any) => ({
      seasonNumber: s.season_number,
      name: s.name,
      episodes: (s.episodes || []).map((e: any) => ({
        id: e.id,
        episodeNum: e.episode_num,
        title: e.title,
        containerExtension: e.container_extension,
        url: e.url,
        info: e.info,
      })),
    })),
  };
}

function mapSeriesResponse(data: any, creds: { baseUrl: string; username: string; password: string }): SeriesDetail {
  const info = data.info || {};
  const episodesMap = data.episodes || {};

  const seasons: SeriesDetail['seasons'] = [];

  for (const [seasonNum, episodes] of Object.entries(episodesMap)) {
    if (!Array.isArray(episodes)) continue;

    const NON_WEB = /^(mkv|avi|wmv|flv|mov|divx|rmvb|3gp)$/i;

    seasons.push({
      seasonNumber: parseInt(seasonNum),
      name: `Season ${seasonNum}`,
      episodes: episodes.map((ep: any) => {
        const rawExt = ep.container_extension || 'mp4';
        const ext = NON_WEB.test(rawExt) ? 'mp4' : rawExt;
        return {
          id: String(ep.id),
          episodeNum: parseInt(ep.episode_num || '0'),
          title: ep.title || `Episode ${ep.episode_num}`,
          containerExtension: ext,
          url: `${creds.baseUrl}/series/${creds.username}/${creds.password}/${ep.id}.${ext}`,
          info: ep.info ? {
            duration: ep.info.duration,
            plot: ep.info.plot,
            releaseDate: ep.info.releasedate || ep.info.air_date,
            rating: ep.info.rating,
            movieImage: ep.info.movie_image,
          } : undefined,
        };
      }),
    });
  }

  // Sort seasons
  seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);

  return {
    info: {
      name: info.name || '',
      cover: info.cover || '',
      plot: info.plot || '',
      cast: info.cast || '',
      director: info.director || '',
      genre: info.genre || '',
      releaseDate: info.releaseDate || '',
      rating: info.rating || '',
      backdropPath: Array.isArray(info.backdrop_path) ? info.backdrop_path : [],
    },
    seasons,
  };
}

// ── Build stream URL for a channel ──────────────────────────

export function buildStreamUrl(channel: NormalizedChannel, config: ProviderConfig): string {
  if (channel.url && (channel.url.startsWith('http://') || channel.url.startsWith('https://'))) {
    return normalizePlaybackUrl(channel.url, config);
  }

  const NON_WEB = /^(mkv|avi|wmv|flv|mov|divx|rmvb|3gp)$/i;
  const shouldPreferM3u8 = isNativeOrWebView() && !Capacitor.isNativePlatform();
  const liveExtension = shouldPreferM3u8 ? 'm3u8' : 'ts';

  if ((config.type === 'xtream' || config.type === 'access_code') && channel.streamId) {
    const serverUrl = config.serverUrl.replace(/\/+$/, '');
    const rawExt = channel.containerExtension || liveExtension;
    if (channel.type === 'movies') {
      const ext = NON_WEB.test(rawExt) ? 'mp4' : rawExt;
      const credential = config.type === 'xtream' ? config : { username: config.accessCode, password: config.accessCode };
      return normalizePlaybackUrl(`${serverUrl}/movie/${credential.username}/${credential.password}/${channel.streamId}.${ext}`, config);
    }
    if (channel.type === 'series') {
      const ext = NON_WEB.test(rawExt) ? 'mp4' : rawExt;
      const credential = config.type === 'xtream' ? config : { username: config.accessCode, password: config.accessCode };
      return normalizePlaybackUrl(`${serverUrl}/series/${credential.username}/${credential.password}/${channel.streamId}.${ext}`, config);
    }
    const credential = config.type === 'xtream' ? config : { username: config.accessCode, password: config.accessCode };
    return normalizePlaybackUrl(`${serverUrl}/live/${credential.username}/${credential.password}/${channel.streamId}.${liveExtension}`, config);
  }

  return normalizePlaybackUrl(channel.url, config);
}

// ── Name cleaning ───────────────────────────────────────────

function cleanChannelName(name: string): string {
  let cleaned = name;
  cleaned = cleaned
    .replace(/^\s*[A-Z]{2,3}\s*[:\-|]\s*\|?\s*/i, '')
    .replace(/^\s*[A-Z]{2}\s+(MOV|SER|SERIES|MOVIES?)\s*[:\-|]?\s*/i, '');
  cleaned = cleaned
    .replace(/[_-]/g, ' ')
    .replace(/\s*\|\s*/g, ' | ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length === 0) return cleaned;
  return cleaned
    .split(/(\s+)/)
    .map(word => {
      if (word.trim().length === 0) return word;
      if (word === '|') return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

function cleanGroupName(group: string): string {
  let cleaned = group;
  cleaned = cleaned
    .replace(/[_-]/g, ' ')
    .replace(/\s*\|\s*/g, ' | ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length === 0) return cleaned;
  return cleaned
    .split(/(\s+)/)
    .map(word => {
      if (word.trim().length === 0) return word;
      if (word === '|') return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}
