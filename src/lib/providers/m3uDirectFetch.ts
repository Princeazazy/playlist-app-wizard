import { Capacitor } from '@capacitor/core';
import { ContentType } from './types';

export interface DirectPlaylistChannel {
  name: string;
  url: string;
  logo?: string;
  group?: string;
  type: ContentType;
  epg_channel_id?: string;
  container_extension?: string;
}

const DEVICE_FETCH_USER_AGENTS = [
  'Dalvik/2.1.0 (Linux; U; Android 13; Pixel 7 Pro Build/TQ3A.230805.001)',
  'okhttp/4.12.0',
  'IPTV Smarters Pro/3.1.5',
  'TiviMate/4.7.0 (Linux; Android 12; SM-S908B)',
];

const NON_WEB_EXTENSION = /\.(mkv|avi|wmv|flv|mov|webm|divx|rmvb|3gp)(\?.*)?$/i;

const cleanExtInfValue = (value?: string) => (value || '').trim();

const inferContentType = (group: string, name: string, url: string): ContentType => {
  const groupLower = group.toLowerCase();
  const nameLower = name.toLowerCase();
  const urlLower = url.toLowerCase();

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

  if (
    urlLower.includes('/series/') ||
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

  if (
    urlLower.includes('/movie/') ||
    groupLower.includes('vod') ||
    groupLower.includes('on demand') ||
    groupLower.includes('on-demand') ||
    /\bmov\b/.test(groupLower) ||
    groupLower.includes(' movies') ||
    groupLower.startsWith('movies') ||
    groupLower.includes(' film') ||
    nameLower.includes('1080p')
  ) {
    return 'movies';
  }

  return 'live';
};

const extractContainerExtension = (url: string): string | undefined => {
  const match = url.match(/\.([a-z0-9]{2,5})(?:\?.*)?$/i);
  if (!match) return undefined;
  return NON_WEB_EXTENSION.test(url) ? 'mp4' : match[1].toLowerCase();
};

const parseExtInfAttributes = (line: string) => {
  const attributes: Record<string, string> = {};
  const attrRegex = /([\w-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(line)) !== null) {
    attributes[match[1]] = match[2];
  }

  const commaIndex = line.indexOf(',');
  const displayName = commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : '';

  return { attributes, displayName };
};

const parsePlaylistContent = (content: string, maxChannels: number): DirectPlaylistChannel[] => {
  const lines = content.split(/\r?\n/);
  const channels: DirectPlaylistChannel[] = [];
  let pendingMeta: {
    name: string;
    logo?: string;
    group?: string;
    epg_channel_id?: string;
  } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      const { attributes, displayName } = parseExtInfAttributes(line);
      pendingMeta = {
        name: cleanExtInfValue(attributes['tvg-name']) || displayName || 'Unknown Channel',
        logo: cleanExtInfValue(attributes['tvg-logo']) || undefined,
        group: cleanExtInfValue(attributes['group-title']) || 'Uncategorized',
        epg_channel_id: cleanExtInfValue(attributes['tvg-id']) || undefined,
      };
      continue;
    }

    if (line.startsWith('#')) continue;
    if (!pendingMeta) continue;

    const type = inferContentType(pendingMeta.group || '', pendingMeta.name, line);
    channels.push({
      name: pendingMeta.name,
      url: line,
      logo: pendingMeta.logo,
      group: pendingMeta.group,
      type,
      epg_channel_id: pendingMeta.epg_channel_id,
      container_extension: extractContainerExtension(line),
    });

    pendingMeta = null;
    if (channels.length >= maxChannels) break;
  }

  return channels;
};

const buildHeaders = (userAgent: string) => ({
  'User-Agent': userAgent,
  'Accept': '*/*',
  'Accept-Encoding': 'identity',
  'Connection': 'keep-alive',
  'X-Requested-With': 'com.nst.iptvsmarterstvbox',
  'Accept-Language': 'en-US,en;q=0.9',
});

const fetchWithBrowser = async (url: string, userAgent: string): Promise<string> => {
  const response = await fetch(url, {
    headers: buildHeaders(userAgent),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Direct fetch failed with status ${response.status}`);
  }

  return await response.text();
};

const fetchWithCapacitor = async (url: string, userAgent: string): Promise<string> => {
  const { Http } = await import('@capacitor/http');
  const response = await Http.request({
    method: 'GET',
    url,
    headers: buildHeaders(userAgent),
    readTimeout: 25000,
    connectTimeout: 25000,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Direct fetch failed with status ${response.status}`);
  }

  return typeof response.data === 'string' ? response.data : String(response.data || '');
};

export async function fetchDirectPlaylistChannels(
  url: string,
  options?: { maxChannels?: number; maxBytesMB?: number },
): Promise<DirectPlaylistChannel[]> {
  const maxChannels = options?.maxChannels ?? 250000;
  const maxBytes = (options?.maxBytesMB ?? 80) * 1024 * 1024;
  let lastError: unknown;

  for (const userAgent of DEVICE_FETCH_USER_AGENTS) {
    try {
      const text = Capacitor.isNativePlatform()
        ? await fetchWithCapacitor(url, userAgent)
        : await fetchWithBrowser(url, userAgent);

      if (!text) continue;
      if (text.length > maxBytes) {
        console.warn(`[ProviderService] Direct playlist exceeded byte limit (${text.length})`);
      }

      const channels = parsePlaylistContent(text, maxChannels);
      if (channels.length > 0) return channels;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Direct playlist fetch failed');
}
