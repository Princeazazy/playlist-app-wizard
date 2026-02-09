import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache TMDB poster lookups in localStorage
const POSTER_CACHE_KEY = 'mi-player-tmdb-poster-cache';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface PosterCacheEntry {
  url: string | null;
  timestamp: number;
}

type PosterCache = Record<string, PosterCacheEntry>;

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
    // Storage full - trim old entries
    const entries = Object.entries(cache);
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const trimmed = Object.fromEntries(entries.slice(entries.length / 2));
    try {
      localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify(trimmed));
    } catch { /* ignore */ }
  }
};

const getCachedPoster = (name: string): string | null | undefined => {
  const cache = getCache();
  const entry = cache[name];
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) return undefined;
  return entry.url;
};

const setCachedPosters = (posters: Record<string, string | null>): void => {
  const cache = getCache();
  const now = Date.now();
  for (const [name, url] of Object.entries(posters)) {
    cache[name] = { url, timestamp: now };
  }
  saveCache(cache);
};

// Clean a channel name for TMDB search
const cleanForSearch = (name: string): string => {
  return name
    // Remove common IPTV prefixes like "AR:" "EG:" "AR SER:" "AR MOV:"
    .replace(/^\s*[A-Z]{2,3}\s*[:\-|]\s*\|?\s*/i, '')
    .replace(/^\s*[A-Z]{2}\s+(MOV|SER|SERIES|MOVIES?)\s*[:\-|]?\s*/i, '')
    // Remove quality tags
    .replace(/\b(HD|SD|FHD|4K|UHD|720p|1080p|2160p)\b/gi, '')
    // Remove year in parentheses but keep it for search context
    .replace(/[_-]/g, ' ')
    // Remove episode/season markers
    .replace(/\bS\d+\s*E\d+\b/gi, '')
    .replace(/\bE\d+\b/gi, '')
    .replace(/\bEP?\s*\d+\b/gi, '')
    // Remove trailing episode numbers like "01" "02" at end
    .replace(/\s+\d{1,3}\s*$/, '')
    // Remove special chars
    .replace(/[|:]/g, ' ')
    // Remove common IPTV suffixes
    .replace(/\b(multi\s*sub|dubbed|subbed|dub)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Hook that resolves TMDB posters for a list of channels.
 * Searches TMDB by channel name and returns proper movie/show poster URLs.
 */
export const useTMDBPosters = (channels: { name: string; logo?: string }[]) => {
  const [posterMap, setPosterMap] = useState<Record<string, string>>({});
  const processedRef = useRef(new Set<string>());
  const isProcessingRef = useRef(false);
  const batchIdRef = useRef(0);

  useEffect(() => {
    const needPosters: string[] = [];
    const initialMap: Record<string, string> = {};

    for (const ch of channels) {
      if (processedRef.current.has(ch.name)) continue;

      // Check cache
      const cached = getCachedPoster(ch.name);
      if (cached !== undefined) {
        if (cached) initialMap[ch.name] = cached;
        processedRef.current.add(ch.name);
        continue;
      }

      needPosters.push(ch.name);
    }

    if (Object.keys(initialMap).length > 0) {
      setPosterMap(prev => ({ ...prev, ...initialMap }));
    }

    const uniqueNames = [...new Set(needPosters)];
    if (uniqueNames.length === 0 || isProcessingRef.current) return;

    isProcessingRef.current = true;
    const currentBatch = ++batchIdRef.current;

    const searchBatch = async () => {
      // Process in batches of 3 to avoid overwhelming TMDB
      for (let i = 0; i < uniqueNames.length; i += 3) {
        if (batchIdRef.current !== currentBatch) return; // Cancelled

        const batch = uniqueNames.slice(i, i + 3);
        batch.forEach(name => processedRef.current.add(name));

        const results: Record<string, string | null> = {};

        // Search each name on TMDB
        await Promise.all(batch.map(async (name) => {
          const searchTerm = cleanForSearch(name);
          if (!searchTerm || searchTerm.length < 2) {
            results[name] = null;
            return;
          }

          try {
            const { data, error } = await supabase.functions.invoke('tmdb-browse', {
              body: { action: 'search', query: searchTerm, page: 1 },
            });

            if (!error && data?.success && data.results?.length > 0) {
              // Find best match - prefer exact or close title match
              const searchLower = searchTerm.toLowerCase();
              const bestMatch = data.results.find((r: any) => 
                r.title?.toLowerCase().includes(searchLower) || 
                searchLower.includes(r.title?.toLowerCase())
              ) || data.results[0];

              results[name] = bestMatch.poster || null;
            } else {
              results[name] = null;
            }
          } catch {
            results[name] = null;
          }
        }));

        // Cache and update state
        setCachedPosters(results);

        const validPosters: Record<string, string> = {};
        for (const [name, url] of Object.entries(results)) {
          if (url) validPosters[name] = url;
        }

        if (Object.keys(validPosters).length > 0) {
          setPosterMap(prev => ({ ...prev, ...validPosters }));
        }

        // Delay between batches
        if (i + 3 < uniqueNames.length) {
          await new Promise(r => setTimeout(r, 800));
        }
      }
      isProcessingRef.current = false;
    };

    searchBatch();
  }, [channels]);

  const getPosterForChannel = useCallback((channelName: string, existingLogo?: string): string | undefined => {
    // Always prefer TMDB poster over playlist logo (which is often a scene still)
    return posterMap[channelName] || existingLogo;
  }, [posterMap]);

  return { posterMap, getPosterForChannel };
};
