import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RatingData {
  ratings: {
    imdb?: string;
    elcinema?: string;
    tmdb?: string;
  };
  bestRating: string | null;
  bestSource: 'imdb' | 'elcinema' | 'tmdb' | null;
  imdbId: string | null;
}

// In-memory cache with 2-hour TTL
const ratingsCache = new Map<string, { data: RatingData; ts: number }>();
const CACHE_TTL = 2 * 60 * 60 * 1000;
const pendingRequests = new Map<string, Promise<RatingData | null>>();

function getCacheKey(title: string, year?: string): string {
  return `${title}::${year || ''}`.toLowerCase();
}

export function useRatings(title: string, year?: string, mediaType?: string, imdbId?: string) {
  const [ratingData, setRatingData] = useState<RatingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!title) return;

    const key = getCacheKey(title, year);
    const cached = ratingsCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setRatingData(cached.data);
      return;
    }

    // Deduplicate in-flight requests
    let promise = pendingRequests.get(key);
    if (!promise) {
      promise = (async () => {
        try {
          const { data, error } = await supabase.functions.invoke('fetch-ratings', {
            body: { title, year, mediaType, imdbId },
          });
          if (error || !data?.success) return null;

          const result: RatingData = {
            ratings: data.ratings || {},
            bestRating: data.bestRating,
            bestSource: data.bestSource,
            imdbId: data.imdbId,
          };
          ratingsCache.set(key, { data: result, ts: Date.now() });
          return result;
        } catch {
          return null;
        } finally {
          pendingRequests.delete(key);
        }
      })();
      pendingRequests.set(key, promise);
    }

    setIsLoading(true);
    promise.then((result) => {
      if (result) setRatingData(result);
      setIsLoading(false);
    });
  }, [title, year, mediaType, imdbId]);

  return { ratingData, isLoading };
}

// Batch version for card lists - fetches ratings for multiple items
export function useRatingsBatch(items: Array<{ title: string; year?: string; mediaType?: string }>) {
  const [ratings, setRatings] = useState<Map<string, RatingData>>(new Map());

  useEffect(() => {
    if (!items.length) return;

    const uncached = items.filter((item) => {
      const key = getCacheKey(item.title, item.year);
      const cached = ratingsCache.get(key);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setRatings((prev) => new Map(prev).set(key, cached.data));
        return false;
      }
      return true;
    });

    // Fetch uncached items (max 5 concurrently to avoid overwhelming)
    const fetchBatch = async () => {
      const chunks = [];
      for (let i = 0; i < uncached.length; i += 5) {
        chunks.push(uncached.slice(i, i + 5));
      }

      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(async (item) => {
            const key = getCacheKey(item.title, item.year);
            if (pendingRequests.has(key)) {
              const result = await pendingRequests.get(key);
              if (result) setRatings((prev) => new Map(prev).set(key, result));
              return;
            }

            try {
              const { data, error } = await supabase.functions.invoke('fetch-ratings', {
                body: { title: item.title, year: item.year, mediaType: item.mediaType },
              });
              if (!error && data?.success) {
                const result: RatingData = {
                  ratings: data.ratings || {},
                  bestRating: data.bestRating,
                  bestSource: data.bestSource,
                  imdbId: data.imdbId,
                };
                ratingsCache.set(key, { data: result, ts: Date.now() });
                setRatings((prev) => new Map(prev).set(key, result));
              }
            } catch {}
          })
        );
      }
    };

    fetchBatch();
  }, [items.map((i) => i.title).join(',')]);

  const getRating = useCallback(
    (title: string, year?: string) => {
      const key = getCacheKey(title, year);
      return ratings.get(key) || null;
    },
    [ratings]
  );

  return { ratings, getRating };
}
