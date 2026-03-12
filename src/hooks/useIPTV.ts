import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { isNativeOrWebView } from '@/lib/platformDetect';
import { supabase } from '@/integrations/supabase/client';
import { getStoredPlaylistUrl } from '@/lib/playlistStorage';
import { getLocalChannels, hasLocalChannels, LocalChannel } from '@/lib/localPlaylistStorage';
import { getCachedChannels, setCachedChannels, clearLegacyCache } from '@/lib/channelCache';
import { getEnabledPlaylistUrls, migrateFromLegacyStorage } from '@/lib/multiPlaylistStorage';

export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  type?: 'live' | 'movies' | 'series' | 'sports';
  // Flag to indicate this is from local file upload (skip proxy)
  isLocal?: boolean;
  // Extended metadata for movies/series
  stream_id?: number;
  series_id?: number;
  rating?: string;
  year?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  duration?: string;
  container_extension?: string;
  backdrop_path?: string[];
}

// Clean channel name by replacing underscores/dashes with spaces and stripping common IPTV prefixes
// Examples: "AR:Al_Kahera_Wal_Nas" -> "Al Kahera Wal Nas", "UK-| BBC_News" -> "BBC News"
const cleanChannelName = (name: string): string => {
  let cleaned = name;
  cleaned = cleaned
    // Remove leading country-ish prefixes (AR:, UK-|, EG |, etc.)
    .replace(/^\s*[A-Z]{2,3}\s*[:\-|]\s*\|?\s*/i, '')
    // Remove category prefixes like "EN MOV", "AR MOV", "AR SER", "EN SER", etc.
    .replace(/^\s*[A-Z]{2}\s+(MOV|SER|SERIES|MOVIES?)\s*[:\-|]?\s*/i, '');
  cleaned = cleaned
    // Replace underscores/dashes with spaces
    .replace(/[_-]/g, ' ')
    // Replace pipe separators with spaced pipes for readability
    .replace(/\s*\|\s*/g, ' | ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
  // Name corrections
  const nameCorrections: Record<string, string> = {
    'misr quraan karim': 'Misr Quran Karim',
  };
  const corrected = nameCorrections[cleaned.toLowerCase()] || cleaned;
  // Title-case: capitalize first letter of each word (including after pipes, dashes, etc.)
  if (corrected.length === 0) return corrected;
  // If we already have a correction, return it as-is
  if (nameCorrections[cleaned.toLowerCase()]) return corrected;
  return corrected
    .split(/(\s+)/)
    .map(word => {
      if (word.trim().length === 0) return word;
      if (word === '|') return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
};

// Clean group names: preserve language/type prefixes (AR, EN, MOV, SER) that are needed for filtering
const cleanGroupName = (group: string): string => {
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
};

const normalizeChannel = (ch: Channel): Channel => ({
  ...ch,
  name: cleanChannelName(ch.name),
  group: ch.group ? cleanGroupName(ch.group) : ch.group,
});

const normalizeChannels = (chs: Channel[]): Channel[] => chs.map(normalizeChannel);

// Clear old localStorage cache on module load
clearLegacyCache();

// Migrate single playlist to multi-playlist system on first load
migrateFromLegacyStorage();

// Normalize a name for deduplication comparison
const normalizeForDedup = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]/g, '') // keep alphanumeric + Arabic chars
    .trim();
};

// Score a channel's metadata richness (higher = better)
const metadataScore = (ch: Channel): number => {
  let score = 0;
  if (ch.logo) score += 3;
  if (ch.rating) score += 2;
  if (ch.plot) score += 2;
  if (ch.year) score += 1;
  if (ch.cast) score += 1;
  if (ch.director) score += 1;
  if (ch.genre) score += 1;
  if (ch.backdrop_path?.length) score += 2;
  if (ch.duration) score += 1;
  // Prefer channels with actual stream URLs
  if (ch.url && ch.url.length > 10) score += 2;
  return score;
};

// Merge multiple channel arrays, deduplicating by name+type and keeping best quality
const mergeAndDeduplicate = (channelArrays: Channel[][]): Channel[] => {
  const seen = new Map<string, Channel>(); // key -> best channel
  
  for (const channels of channelArrays) {
    for (const ch of channels) {
      // Create a dedup key from normalized name + type
      const key = `${normalizeForDedup(ch.name)}__${ch.type || 'live'}`;
      
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, ch);
      } else {
        // Keep the one with richer metadata
        if (metadataScore(ch) > metadataScore(existing)) {
          seen.set(key, { ...ch, id: existing.id }); // Keep original ID for stability
        }
      }
    }
  }
  
  return Array.from(seen.values());
};

// Convert local channels to Channel type
const convertLocalChannels = (localChannels: LocalChannel[]): Channel[] => {
  return localChannels.map(ch => ({
    ...ch,
    name: cleanChannelName(ch.name),
    isLocal: true, // Mark as local - player will skip proxy
  }));
};

// Fetch a single playlist URL via edge function and return parsed channels
const fetchSinglePlaylist = async (
  url: string,
  sourceIndex: number,
  retryCount: number = 0,
  options?: {
    maxChannels?: number;
    maxBytesMB?: number;
    maxReturnPerType?: number;
    preferXtreamApi?: boolean;
    forceXtreamApi?: boolean;
  }
): Promise<Channel[]> => {
  const {
    maxChannels = 150000,
    maxBytesMB = 80,
    maxReturnPerType = 50000,
    preferXtreamApi = false,
    forceXtreamApi = false,
  } = options ?? {};

  const isCapacitorNative = Capacitor.isNativePlatform();
  
  if (isCapacitorNative) {
    try {
      const { Http } = await import('@capacitor/http');
      const response = await Http.request({
        method: 'GET',
        url,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (response.status !== 200) {
        throw new Error(`Failed to fetch playlist. Status: ${response.status}`);
      }
      return parseM3U(response.data);
    } catch (e) {
      console.warn('Capacitor HTTP failed, falling back to edge function:', e);
    }
  }
  
  // Web: use backend parser, prefer raw M3U first for provider compatibility
  const { data, error } = await supabase.functions.invoke('fetch-m3u', {
    body: {
      url,
      maxChannels,
      maxBytesMB,
      maxReturnPerType,
      preferXtreamApi,
      forceXtreamApi,
    }
  });
  
  if (error) throw new Error(`Proxy error: ${error.message}`);
  if (data?.blocked) return [];
  if (data?.error) throw new Error(data.error);
  
  if (data?.channels && Array.isArray(data.channels)) {
    console.log(`[Playlist ${sourceIndex + 1}] Received ${data.channels.length} channels`, data.counts);
    
    // If we got 0 channels, retry up to 2 times with delay (provider rate-limiting)
    if (data.channels.length === 0 && retryCount < 2) {
      const delay = (retryCount + 1) * 5000;
      console.log(`[Playlist ${sourceIndex + 1}] Got 0 channels, retrying in ${delay / 1000}s (attempt ${retryCount + 2}/3)...`);
      await new Promise(r => setTimeout(r, delay));
      return fetchSinglePlaylist(url, sourceIndex, retryCount + 1, options);
    }
    
    return data.channels
      .filter((ch: any) => ch.name && (ch.url || ch.type === 'series'))
      .map((ch: any, idx: number) => ({
        id: `src${sourceIndex}-ch${idx}`,
        name: cleanChannelName(ch.name),
        url: ch.url || '',
        logo: ch.logo || undefined,
        group: cleanGroupName(ch.group || 'Live TV'),
        type: ch.type || 'live',
        stream_id: ch.stream_id,
        series_id: ch.series_id,
        rating: ch.rating,
        year: ch.year,
        plot: ch.plot,
        cast: ch.cast,
        director: ch.director,
        genre: ch.genre,
        duration: ch.duration,
        container_extension: ch.container_extension,
        backdrop_path: ch.backdrop_path,
      }));
  }
  
  return [];
};

export const useIPTV = (m3uUrl?: string) => {
  // Use provided URL or fall back to stored URL
  const effectiveUrl = m3uUrl || getStoredPlaylistUrl();
  
  // Get all enabled playlist URLs (multi-playlist support) - memoize to avoid re-render loop
  const allUrls = getEnabledPlaylistUrls();
  const playlistUrls = allUrls.length > 0 ? allUrls : (effectiveUrl ? [effectiveUrl] : []);
  // Stable string key for useEffect dependency
  const playlistUrlsKey = useRef(playlistUrls.join(','));
  // Only update the key if the URLs actually changed
  if (playlistUrls.join(',') !== playlistUrlsKey.current) {
    playlistUrlsKey.current = playlistUrls.join(',');
  }
  
  // Check for local channels first (from file upload - Bocaletto approach)
  const localChannels = getLocalChannels();
  const hasLocal = hasLocalChannels();
  
  // Initialize with local channels if available
  const [channels, setChannels] = useState<Channel[]>(() => {
    if (hasLocal && localChannels) {
      console.log(`Using ${localChannels.length} locally uploaded channels (direct playback - no proxy)`);
      return convertLocalChannels(localChannels);
    }
    return [];
  });
  
  // Track if we've loaded from cache yet
  const cacheLoaded = useRef(false);
  const previousPlaylistKeyRef = useRef(playlistUrlsKey.current);
  
  // If we have local channels, don't show loading state
  const [loading, setLoading] = useState(() => !hasLocal);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // When playlist source changes, clear current list so stale provider channels never render
  useEffect(() => {
    if (previousPlaylistKeyRef.current !== playlistUrlsKey.current) {
      previousPlaylistKeyRef.current = playlistUrlsKey.current;
      cacheLoaded.current = false;
      setChannels([]);
      setError(null);
      setLoading(true);
    }
  }, [playlistUrlsKey.current]);

  // Load from IndexedDB cache on mount (prefer exact source cache, fall back to stale cache for instant boot)
  useEffect(() => {
    if (hasLocal || cacheLoaded.current) return;
    
    const loadCache = async () => {
      const exactCached = await getCachedChannels(playlistUrlsKey.current);
      const cached = exactCached ?? await getCachedChannels();
      const usedStaleCache = !exactCached && !!cached;

      if (cached && cached.length > 0 && channels.length === 0) {
        const normalized = normalizeChannels(cached);
        if (usedStaleCache) {
          console.log(`Loaded ${cached.length} channels from stale IndexedDB cache for instant startup; refreshing in background`);
        } else {
          console.log(`Loaded ${cached.length} channels from IndexedDB cache`);
        }
        setChannels(normalized);
        setLoading(false);
      }
      cacheLoaded.current = true;
    };
    
    loadCache();
  }, [hasLocal, channels.length, playlistUrlsKey.current]);

  // Function to trigger a refresh without reloading the app
  const refresh = useCallback(async () => {
    console.log('Refreshing channels - clearing cache first...');
    // Clear IndexedDB cache so we get fresh data
    try {
      const { clearChannelCache } = await import('@/lib/channelCache');
      await clearChannelCache();
      console.log('Cache cleared, triggering fresh fetch...');
    } catch (e) {
      console.warn('Failed to clear cache:', e);
    }
    // Re-check for local channels
    const freshLocal = getLocalChannels();
    if (freshLocal && freshLocal.length > 0) {
      console.log(`Refreshed with ${freshLocal.length} local channels`);
      setChannels(convertLocalChannels(freshLocal));
      setError(null);
      setLoading(false);
      return;
    }
    setChannels([]);
    setLoading(true);
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    console.log('useIPTV useEffect running');
    
    // If we have local channels from file upload, use those (Bocaletto approach)
    const freshLocal = getLocalChannels();
    if (freshLocal && freshLocal.length > 0) {
      console.log(`Using ${freshLocal.length} locally uploaded channels - direct playback enabled`);
      setChannels(convertLocalChannels(freshLocal));
      setError(null);
      setLoading(false);
      return;
    }
    
    const loadDemoChannels = () => {
      console.log('Loading demo channels - real channels will work in native app or upload M3U file');
      const demoChannels: Channel[] = [
        { id: 'demo-1', name: 'BBC News', url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8', logo: 'https://i.imgur.com/7iJVHmC.png', group: 'News' },
        { id: 'demo-2', name: 'Al Jazeera English', url: 'https://live-hls-web-aje.getaj.net/AJE/index.m3u8', logo: 'https://i.imgur.com/xEIhBDz.png', group: 'News' },
        { id: 'demo-3', name: 'France 24', url: 'https://static.france24.com/meta/android-icon-192x192.png', logo: 'https://i.imgur.com/EcMwBCN.png', group: 'News' },
        { id: 'demo-4', name: 'CNN', url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8', logo: 'https://i.imgur.com/KGBSdOa.png', group: 'News' },
        { id: 'demo-5', name: 'Sky News', url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8', logo: 'https://i.imgur.com/OUlToBV.png', group: 'News' },
        { id: 'demo-6', name: 'ESPN', url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8', logo: 'https://i.imgur.com/qKvjKY8.png', group: 'Sports' },
        { id: 'demo-7', name: 'Fox Sports', url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8', logo: 'https://i.imgur.com/YnzJ9Ck.png', group: 'Sports' },
        { id: 'demo-8', name: 'NBC Sports', url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8', logo: 'https://i.imgur.com/oMRLjuC.png', group: 'Sports' },
        { id: 'demo-9', name: 'Discovery', url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8', logo: 'https://i.imgur.com/vK2wvLq.png', group: 'Documentary' },
        { id: 'demo-10', name: 'National Geographic', url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8', logo: 'https://i.imgur.com/BPQASMZ.png', group: 'Documentary' },
        { id: 'demo-11', name: 'History Channel', url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8', logo: 'https://i.imgur.com/SJ9CnN7.png', group: 'Documentary' },
        { id: 'demo-12', name: 'HBO', url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8', logo: 'https://i.imgur.com/LzxlLVi.png', group: 'Entertainment' },
        { id: 'demo-13', name: 'Comedy Central', url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8', logo: 'https://i.imgur.com/g6VmEjF.png', group: 'Entertainment' },
        { id: 'demo-14', name: 'MTV', url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8', logo: 'https://i.imgur.com/BwANwNZ.png', group: 'Entertainment' },
        { id: 'demo-15', name: 'Cartoon Network', url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8', logo: 'https://i.imgur.com/vYBhzGO.png', group: 'Kids' },
      ];
      const mappedChannels = demoChannels.map((ch) => ({
        ...ch,
        type: (ch.group?.toLowerCase().includes('sport') ? 'sports' : 'live') as Channel['type'],
      }));
      setChannels(mappedChannels);
      setCachedChannels(mappedChannels, playlistUrlsKey.current);
      setError(null);
      setLoading(false);
    };
    
    const fetchAllPlaylists = async () => {
      console.log('fetchAllPlaylists called');
      
      if (playlistUrls.length === 0) {
        console.log('No playlist URLs configured, loading demo channels');
        loadDemoChannels();
        return;
      }
      
      try {
        // Only show loading spinner if we have NO cached data yet
        const hasCachedData = channels.length > 0;
        if (!hasCachedData) {
          setLoading(true);
        }

        // Fast bootstrap gets first usable catalog quickly, then full sync runs in background
        const bootstrapFetchOptions = {
          maxChannels: 30000,
          maxBytesMB: 24,
          maxReturnPerType: 3500,
          preferXtreamApi: false,
        };

        const fullFetchOptions = {
          maxChannels: 150000,
          maxBytesMB: 80,
          maxReturnPerType: 50000,
          preferXtreamApi: false,
        };

        const activeFetchOptions = hasCachedData ? fullFetchOptions : bootstrapFetchOptions;
        console.log(`Fetching ${playlistUrls.length} playlist(s) progressively [${hasCachedData ? 'full' : 'fast-bootstrap'}]...`);

        const completedArrays: Channel[][] = [];
        const errors: string[] = [];
        
        // Start all fetches in parallel but handle each as it resolves
        const promises = playlistUrls.map((url, idx) => 
          fetchSinglePlaylist(url, idx, 0, activeFetchOptions)
            .then(result => {
              console.log(`Playlist ${idx + 1}: ${result.length} channels loaded`);
              if (result.length > 0) {
                completedArrays.push(result);
                
                // Immediately update UI with what we have so far
                let merged: Channel[];
                if (completedArrays.length === 1) {
                  merged = completedArrays[0];
                } else {
                  merged = mergeAndDeduplicate([...completedArrays]);
                }
                merged = merged.map((ch, i) => ({ ...ch, id: `channel-${i}` }));
                
                console.log(`Progressive update (${completedArrays.length}/${playlistUrls.length}):`, {
                  live: merged.filter(c => c.type === 'live').length,
                  movies: merged.filter(c => c.type === 'movies').length,
                  series: merged.filter(c => c.type === 'series').length,
                  sports: merged.filter(c => c.type === 'sports').length,
                });
                
                setChannels(merged);
                setLoading(false);
                
                // Cache progressively too
                setCachedChannels(merged, playlistUrlsKey.current).catch(err => console.warn('Failed to cache:', err));
              }
              return result;
            })
            .catch(err => {
              console.error(`Playlist ${idx + 1} failed:`, err);
              errors.push(`Playlist ${idx + 1}: ${err?.message || 'Unknown error'}`);
              return [] as Channel[];
            })
        );
        
        // Wait for all to finish
        await Promise.all(promises);
        
        if (completedArrays.length === 0) {
          if (errors.length > 0) {
            if (hasCachedData) {
              console.warn('All playlists failed, keeping cached data');
              setLoading(false);
              return;
            }
            throw new Error(errors.join('; '));
          }
          if (!hasCachedData) {
            loadDemoChannels();
          }
          return;
        }

        // If we bootstrapped without cache, fetch full catalog in background without blocking UI
        if (!hasCachedData) {
          const runBackgroundFullSync = async () => {
            try {
              console.log('Starting background full catalog sync...');
              const fullResults = await Promise.all(
                playlistUrls.map((url, idx) =>
                  fetchSinglePlaylist(url, idx, 0, fullFetchOptions).catch((err) => {
                    console.warn(`Background full sync failed for playlist ${idx + 1}:`, err);
                    return [] as Channel[];
                  })
                )
              );

              const nonEmpty = fullResults.filter((arr) => arr.length > 0);
              if (nonEmpty.length === 0) return;

              let merged: Channel[] =
                nonEmpty.length === 1 ? nonEmpty[0] : mergeAndDeduplicate(nonEmpty);
              merged = merged.map((ch, i) => ({ ...ch, id: `channel-${i}` }));

              setChannels((prev) => (merged.length > prev.length ? merged : prev));
              setCachedChannels(merged, playlistUrlsKey.current).catch((err) =>
                console.warn('Failed to cache full sync:', err)
              );

              console.log(`Background full catalog sync complete: ${merged.length} channels`);
            } catch (err) {
              console.warn('Background full catalog sync failed:', err);
            }
          };

          void runBackgroundFullSync();
        }
        
        // Only log partial failures as warnings, don't show error UI if we have channels
        if (errors.length > 0) {
          console.warn('Some playlists failed (non-blocking):', errors.join('; '));
        }
        setError(null);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching playlists:', err);
        const errorMessage = err?.message || 'Failed to load channels';
        
        if (channels.length > 0) {
          console.log('Background refresh failed, keeping cached data');
          setLoading(false);
          return;
        }
        
        if (!isNativeOrWebView()) {
          console.log('Falling back to demo channels due to error');
          loadDemoChannels();
        } else {
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAllPlaylists();
  }, [playlistUrlsKey.current, refreshKey]);

  return { channels, loading, error, refresh };
};

const parseM3U = (content: string): Channel[] => {
  const lines = content.split('\n');
  const channels: Channel[] = [];
  let currentChannel: Partial<Channel> = {};

  const getContentType = (
    group: string = '',
    name: string = ''
  ): NonNullable<Channel['type']> => {
    const groupLower = group.toLowerCase();

    // Sports detection - ONLY based on GROUP to avoid misclassifying channels
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
      groupLower.includes('tvshow') ||
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

    // Movies/VOD detection: ONLY treat as movies when the GROUP looks like VOD.
    // This prevents live channels like "Nile Cinema" / "Top Movies" from being misclassified.
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
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupMatch = line.match(/group-title="([^"]*)"/);
      const nameMatch = line.split(',').pop();

      const name = cleanChannelName(nameMatch?.trim() || 'Unknown Channel');
      const group = cleanGroupName(groupMatch ? groupMatch[1] : 'Uncategorized');

      currentChannel = {
        id: `channel-${channels.length}`,
        name,
        logo: logoMatch ? logoMatch[1] : undefined,
        group,
        type: getContentType(group, name),
      };
    } else if (line && !line.startsWith('#') && currentChannel.name) {
      currentChannel.url = line;

      // Include live + movies + series (native parsing)
      channels.push(currentChannel as Channel);

      currentChannel = {};
    }
  }

  return channels;
};
