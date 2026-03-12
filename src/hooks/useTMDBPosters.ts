import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache poster lookups in localStorage
const POSTER_CACHE_KEY = 'mi-player-artwork-cache-v4';
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface PosterCacheEntry {
  url: string | null;
  timestamp: number;
}

type PosterCache = Record<string, PosterCacheEntry>;

type MediaHint = 'movie' | 'tv';

const getCache = (): PosterCache => {
  try {
    const raw = localStorage.getItem(POSTER_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveCache = (cache: PosterCache): void => {
  try {
    localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify(cache));
  } catch {
    const entries = Object.entries(cache);
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const trimmed = Object.fromEntries(entries.slice(Math.floor(entries.length / 2)));
    try {
      localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore
    }
  }
};

const buildCacheKey = (name: string, mediaTypeHint?: MediaHint, year?: string): string =>
  `${mediaTypeHint || 'auto'}::${year || ''}::${name}`;

const getCachedPoster = (cacheKey: string): string | null | undefined => {
  const cache = getCache();
  const entry = cache[cacheKey];
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) return undefined;
  return entry.url;
};

const setCachedPosters = (posters: Record<string, string | null>): void => {
  const cache = getCache();
  const now = Date.now();
  for (const [key, url] of Object.entries(posters)) {
    cache[key] = { url, timestamp: now };
  }
  saveCache(cache);
};

interface PosterLookupItem {
  name: string;
  logo?: string;
  year?: string;
  type?: string;
}

const inferMediaType = (item: PosterLookupItem, mediaTypeHint?: MediaHint): 'movie' | 'tv' => {
  if (mediaTypeHint) return mediaTypeHint;
  if (item.type === 'series') return 'tv';
  return 'movie';
};

/**
 * Resolves posters for content using multi-source backend fallbacks:
 * Provider artwork -> elcinema/IMDb/TMDB -> placeholder
 */
export const useTMDBPosters = (channels: PosterLookupItem[], mediaTypeHint?: MediaHint) => {
  const [posterMap, setPosterMap] = useState<Record<string, string>>({});
  const processedRef = useRef(new Set<string>());
  const isProcessingRef = useRef(false);
  const batchIdRef = useRef(0);

  useEffect(() => {
    const needPosters: PosterLookupItem[] = [];
    const initialMap: Record<string, string> = {};

    for (const ch of channels) {
      const cacheKey = buildCacheKey(ch.name, mediaTypeHint, ch.year);
      if (processedRef.current.has(cacheKey)) continue;

      const cached = getCachedPoster(cacheKey);
      if (cached !== undefined) {
        if (cached) initialMap[ch.name] = cached;
        processedRef.current.add(cacheKey);
        continue;
      }

      needPosters.push(ch);
    }

    if (Object.keys(initialMap).length > 0) {
      setPosterMap((prev) => ({ ...prev, ...initialMap }));
    }

    const seen = new Set<string>();
    const uniqueItems = needPosters.filter((item) => {
      const key = buildCacheKey(item.name, mediaTypeHint, item.year);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (uniqueItems.length === 0 || isProcessingRef.current) return;

    isProcessingRef.current = true;
    const currentBatch = ++batchIdRef.current;

    const run = async () => {
      for (let i = 0; i < uniqueItems.length; i += 8) {
        if (batchIdRef.current !== currentBatch) return;

        const batch = uniqueItems.slice(i, i + 8);
        batch.forEach((item) => {
          processedRef.current.add(buildCacheKey(item.name, mediaTypeHint, item.year));
        });

        try {
          const { data, error } = await supabase.functions.invoke('find-channel-logo', {
            body: {
              items: batch.map((item) => ({
                name: item.name,
                year: item.year,
                mediaType: inferMediaType(item, mediaTypeHint),
              })),
              allowAiGeneration: false,
            },
          });

          const logos: Record<string, string | null> = !error && data?.logos ? data.logos : {};

          const cacheWrites: Record<string, string | null> = {};
          const validPosters: Record<string, string> = {};

          for (const item of batch) {
            const cacheKey = buildCacheKey(item.name, mediaTypeHint, item.year);
            const url = logos[item.name] ?? null;
            cacheWrites[cacheKey] = url;
            if (url) validPosters[item.name] = url;
          }

          setCachedPosters(cacheWrites);

          if (Object.keys(validPosters).length > 0) {
            setPosterMap((prev) => ({ ...prev, ...validPosters }));
          }
        } catch (e) {
          console.error('Artwork batch lookup failed:', e);
        }

        if (i + 8 < uniqueItems.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      isProcessingRef.current = false;
    };

    run();
  }, [channels, mediaTypeHint]);

  const getPosterForChannel = useCallback(
    (channelName: string, existingLogo?: string): string | undefined => {
      return existingLogo || posterMap[channelName];
    },
    [posterMap],
  );

  return { posterMap, getPosterForChannel };
};
