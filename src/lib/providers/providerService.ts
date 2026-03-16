// ═══════════════════════════════════════════════════════════════
// Provider Service — Unified API for all provider types
// Uses edge functions for actual fetching (CORS-safe)
// ═══════════════════════════════════════════════════════════════

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

// ── Xtream API Authentication ───────────────────────────────

export async function authenticateXtream(config: XtreamConfig): Promise<{
  success: boolean;
  error?: string;
  accountInfo?: XtreamAccountInfo;
  providerName?: string;
}> {
  try {
    // Normalize server URL
    const serverUrl = config.serverUrl.replace(/\/+$/, '');
    const apiUrl = `${serverUrl}/player_api.php?username=${encodeURIComponent(config.username)}&password=${encodeURIComponent(config.password)}`;

    // Use edge function to avoid CORS
    const { data, error } = await supabase.functions.invoke('fetch-m3u', {
      body: {
        url: apiUrl,
        rawFetch: true,
      },
    });

    if (error) throw new Error(error.message);

    // The edge function may return the raw JSON or we parse it
    let accountData: any;
    if (data?.rawResponse) {
      accountData = typeof data.rawResponse === 'string' ? JSON.parse(data.rawResponse) : data.rawResponse;
    } else if (data?.user_info) {
      accountData = data;
    } else {
      // Try direct fetch as fallback
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'IPTV Smarters Pro/3.0.0' },
      }).catch(() => null);
      if (res?.ok) {
        accountData = await res.json();
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

    return {
      success: true,
      accountInfo,
      providerName: si?.url || serverUrl,
    };
  } catch (err: any) {
    console.error('[ProviderService] Xtream auth failed:', err);
    return { success: false, error: err.message || 'Connection failed' };
  }
}

// ── Validate M3U URL ────────────────────────────────────────

export async function validateM3UUrl(config: M3UConfig): Promise<{
  success: boolean;
  error?: string;
  channelCount?: number;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-m3u', {
      body: {
        url: config.m3uUrl,
        maxChannels: 100,
        maxBytesMB: 2,
        maxReturnPerType: 25,
      },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);

    const count = data?.channels?.length || 0;
    if (count === 0) {
      return { success: false, error: 'No channels found in playlist. Check the URL.' };
    }

    return { success: true, channelCount: count };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch playlist' };
  }
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

  let m3uUrl: string;

  if (config.type === 'xtream') {
    const serverUrl = config.serverUrl.replace(/\/+$/, '');
    m3uUrl = `${serverUrl}/get.php?username=${encodeURIComponent(config.username)}&password=${encodeURIComponent(config.password)}&type=m3u_plus&output=ts`;
  } else if (config.type === 'm3u') {
    m3uUrl = config.m3uUrl;
  } else if (config.type === 'access_code') {
    const serverUrl = config.serverUrl.replace(/\/+$/, '');
    m3uUrl = `${serverUrl}/get.php?username=${encodeURIComponent(config.accessCode)}&password=${encodeURIComponent(config.accessCode)}&type=m3u_plus&output=ts`;
  } else {
    throw new Error('Unknown provider type');
  }

  const isXtreamCompatible = config.type === 'xtream' || config.type === 'access_code' || m3uUrl.includes('get.php');

  // For Xtream-compatible providers, split into 3 parallel calls by content type
  // to avoid exceeding edge function memory limits on large catalogs (93k+ items)
  if (isXtreamCompatible) {
    console.log('[ProviderService] Fetching via 3 parallel Xtream calls (live/movies/series)...');
    const baseBody = {
      url: m3uUrl,
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

    if (allChannels.length === 0 && errors.length > 0) {
      throw new Error(`Failed to fetch content: ${errors.join('; ')}`);
    }

    const normalized = normalizeChannels(allChannels, providerId);
    return applyPlaybackUrlPreferences(normalized, config);
  }

  // Non-Xtream: single M3U call
  const { data, error } = await supabase.functions.invoke('fetch-m3u', {
    body: {
      url: m3uUrl,
      maxChannels,
      maxBytesMB,
      maxReturnPerType,
      preferXtreamApi: true,
      forceXtreamApi: false,
    },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  if (!data?.channels || !Array.isArray(data.channels)) {
    return [];
  }

  const normalized = normalizeChannels(data.channels, providerId);
  return applyPlaybackUrlPreferences(normalized, config);
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

  if (error || !data) return null;
  if (data.error) return null;

  // Map to our normalized format
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

// ── Build stream URL for a channel ──────────────────────────

export function buildStreamUrl(channel: NormalizedChannel, config: ProviderConfig): string {
  // If channel already has a full URL, use it
  if (channel.url && (channel.url.startsWith('http://') || channel.url.startsWith('https://'))) {
    return channel.url;
  }

  const NON_WEB = /^(mkv|avi|wmv|flv|mov|divx|rmvb|3gp)$/i;

  if (config.type === 'xtream' && channel.streamId) {
    const serverUrl = (config as XtreamConfig).serverUrl.replace(/\/+$/, '');
    const rawExt = channel.containerExtension || 'ts';
    if (channel.type === 'movies') {
      const ext = NON_WEB.test(rawExt) ? 'mp4' : rawExt;
      return `${serverUrl}/movie/${config.username}/${config.password}/${channel.streamId}.${ext}`;
    }
    if (channel.type === 'series') {
      const ext = NON_WEB.test(rawExt) ? 'mp4' : rawExt;
      return `${serverUrl}/series/${config.username}/${config.password}/${channel.streamId}.${ext}`;
    }
    return `${serverUrl}/live/${config.username}/${config.password}/${channel.streamId}.ts`;
  }

  return channel.url;
}

// ── Name cleaning (moved from useIPTV) ──────────────────────

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
