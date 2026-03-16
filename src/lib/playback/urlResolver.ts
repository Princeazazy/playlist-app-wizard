import { ProviderConfig } from '@/lib/providers/types';

const NON_WEB_EXTENSIONS = /\.(mkv|avi|wmv|flv|mov|webm|divx|rmvb|3gp)(\?.*)?$/i;
const XTREAM_STREAM_PATH = /^\/(live|movie|series)\//i;

export const extractServerBase = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    const match = url.match(/^(https?:\/\/[^\/\?]+)/i);
    return match ? match[1] : null;
  }
};

export const getPreferredServerBase = (config?: ProviderConfig): string | null => {
  if (!config) return null;

  if (config.type === 'm3u') {
    return extractServerBase(config.vpnUrl || config.m3uUrl);
  }

  if (config.type === 'xtream') {
    return extractServerBase(config.serverUrl);
  }

  if (config.type === 'access_code') {
    return extractServerBase(config.serverUrl);
  }

  return null;
};

export const coerceToWebPlayableUrl = (url: string): string => {
  if (!url || !NON_WEB_EXTENSIONS.test(url)) return url;
  return url.replace(/\.[a-z0-9]{2,5}(\?.*)?$/i, '.mp4$1');
};

export const rewriteUrlToPreferredServer = (url: string, config?: ProviderConfig): string => {
  if (!url) return url;

  const preferredBase = getPreferredServerBase(config);
  if (!preferredBase) return url;

  try {
    const parsed = new URL(url);
    const preferred = new URL(preferredBase);

    if (!XTREAM_STREAM_PATH.test(parsed.pathname)) {
      return url;
    }

    parsed.protocol = preferred.protocol;
    parsed.host = preferred.host;
    return parsed.toString();
  } catch {
    return url;
  }
};

export const normalizePlaybackUrl = (url: string, config?: ProviderConfig): string => {
  return coerceToWebPlayableUrl(rewriteUrlToPreferredServer(url, config));
};

export const applyPlaybackUrlPreferences = <T extends { url: string; containerExtension?: string }>(
  items: T[],
  config?: ProviderConfig,
): T[] => {
  return items.map((item) => {
    const normalizedUrl = normalizePlaybackUrl(item.url, config);
    const nextExtension = normalizedUrl !== item.url && NON_WEB_EXTENSIONS.test(item.url)
      ? 'mp4'
      : item.containerExtension;

    return {
      ...item,
      url: normalizedUrl,
      ...(nextExtension ? { containerExtension: nextExtension } : {}),
    };
  });
};
