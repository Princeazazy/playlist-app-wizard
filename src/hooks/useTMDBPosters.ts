import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache TMDB poster lookups in localStorage
const POSTER_CACHE_KEY = 'mi-player-tmdb-poster-cache-v3'; // v3: 1-hour refresh
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour - refresh frequently for new releases

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
export const useTMDBPosters = (channels: { name: string; logo?: string; year?: string }[]) => {
  const [posterMap, setPosterMap] = useState<Record<string, string>>({});
  const processedRef = useRef(new Set<string>());
  const isProcessingRef = useRef(false);
  const batchIdRef = useRef(0);

  useEffect(() => {
    const needPosters: { name: string; year?: string }[] = [];
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

      needPosters.push({ name: ch.name, year: ch.year });
    }

    if (Object.keys(initialMap).length > 0) {
      setPosterMap(prev => ({ ...prev, ...initialMap }));
    }

    // Deduplicate by name
    const seenNames = new Set<string>();
    const uniqueItems = needPosters.filter(item => {
      if (seenNames.has(item.name)) return false;
      seenNames.add(item.name);
      return true;
    });
    if (uniqueItems.length === 0 || isProcessingRef.current) return;

    isProcessingRef.current = true;
    const currentBatch = ++batchIdRef.current;

    const searchBatch = async () => {
      // Process in batches of 3 to avoid overwhelming TMDB
      for (let i = 0; i < uniqueItems.length; i += 3) {
        if (batchIdRef.current !== currentBatch) return; // Cancelled

        const batch = uniqueItems.slice(i, i + 3);
        batch.forEach(item => processedRef.current.add(item.name));

        const results: Record<string, string | null> = {};

        // Search each name on TMDB
        await Promise.all(batch.map(async ({ name, year }) => {
          const searchTerm = cleanForSearch(name);
          if (!searchTerm || searchTerm.length < 2) {
            results[name] = null;
            return;
          }

        try {
            // Try cleaned name first, then original Arabic name as fallback
            const searchTerms = [searchTerm];
            // Extract Arabic text from original name for fallback search
            const arabicMatch = name.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:\s+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*/);
            if (arabicMatch && arabicMatch[0] !== searchTerm) {
              searchTerms.push(arabicMatch[0].trim());
            }

            let foundPoster: string | null = null;

            for (const term of searchTerms) {
              if (foundPoster || !term || term.length < 2) continue;

              const { data, error } = await supabase.functions.invoke('tmdb-browse', {
                body: { action: 'search', query: term, page: 1 },
              });

              if (!error && data?.success && data.results?.length > 0) {
                // Find best match - prefer exact or close title match, and filter by year if available
                const termLower = term.toLowerCase();
                const itemYear = year || '';
                
                // First try: match by title AND year
                let bestMatch = year ? data.results.find((r: any) => {
                  const title = (r.title || '').toLowerCase();
                  const origTitle = (r.original_title || r.originalTitle || '').toLowerCase();
                  const resultYear = (r.year || r.release_date || r.first_air_date || '').substring(0, 4);
                  const titleMatch = title === termLower || origTitle === termLower ||
                         title.includes(termLower) || termLower.includes(title) ||
                         origTitle.includes(termLower) || termLower.includes(origTitle);
                  return titleMatch && resultYear === itemYear;
                }) : null;

                // Second try: match by title only, BUT only if no year was specified
                // If a year IS specified, don't fall back to wrong-year results
                if (!bestMatch && !year) {
                  bestMatch = data.results.find((r: any) => {
                    const title = (r.title || '').toLowerCase();
                    const origTitle = (r.original_title || r.originalTitle || '').toLowerCase();
                    return title === termLower || origTitle === termLower ||
                           title.includes(termLower) || termLower.includes(title) ||
                           origTitle.includes(termLower) || termLower.includes(origTitle);
                  }) || data.results[0];
                }

                if (bestMatch.poster) {
                  foundPoster = bestMatch.poster;
                }
              }
            }

            results[name] = foundPoster;
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
        if (i + 3 < uniqueItems.length) {
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
