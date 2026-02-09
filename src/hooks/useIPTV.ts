import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { getStoredPlaylistUrl } from '@/lib/playlistStorage';
import { getLocalChannels, hasLocalChannels, LocalChannel } from '@/lib/localPlaylistStorage';
import { getCachedChannels, setCachedChannels, clearLegacyCache } from '@/lib/channelCache';

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
  const cleaned = name
    // Remove leading country-ish prefixes (AR:, UK-|, EG |, etc.)
    .replace(/^\s*[A-Z]{2,3}\s*[:\-|]\s*\|?\s*/i, '')
    // Remove category prefixes like "EN MOV", "AR MOV", "AR SER", "EN SER", etc.
    .replace(/^\s*[A-Z]{2}\s+(MOV|SER|SERIES|MOVIES?)\s*[:\-|]?\s*/i, '')
    // Replace underscores/dashes with spaces
    .replace(/[_-]/g, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
  // Capitalize first letter
  if (cleaned.length === 0) return cleaned;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const normalizeChannel = (ch: Channel): Channel => ({
  ...ch,
  name: cleanChannelName(ch.name),
  group: ch.group ? cleanChannelName(ch.group) : ch.group,
});

const normalizeChannels = (chs: Channel[]): Channel[] => chs.map(normalizeChannel);

// Clear old localStorage cache on module load
clearLegacyCache();

// Convert local channels to Channel type
const convertLocalChannels = (localChannels: LocalChannel[]): Channel[] => {
  return localChannels.map(ch => ({
    ...ch,
    name: cleanChannelName(ch.name),
    isLocal: true, // Mark as local - player will skip proxy
  }));
};

export const useIPTV = (m3uUrl?: string) => {
  // Use provided URL or fall back to stored URL
  const effectiveUrl = m3uUrl || getStoredPlaylistUrl();
  
  console.log('useIPTV hook called with URL:', effectiveUrl);
  
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
  
  // If we have local channels, don't show loading state
  const [loading, setLoading] = useState(() => !hasLocal);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load from IndexedDB cache on mount
  useEffect(() => {
    if (hasLocal || cacheLoaded.current) return;
    
    const loadCache = async () => {
      const cached = await getCachedChannels();
      if (cached && cached.length > 0 && channels.length === 0) {
        const normalized = normalizeChannels(cached);
        console.log(`Loaded ${cached.length} channels from IndexedDB cache`);
        setChannels(normalized);
        setLoading(false);
      }
      cacheLoaded.current = true;
    };
    
    loadCache();
  }, [hasLocal, channels.length]);

  // Function to trigger a refresh without reloading the app
  const refresh = useCallback(() => {
    console.log('Refreshing channels...');
    // Re-check for local channels
    const freshLocal = getLocalChannels();
    if (freshLocal && freshLocal.length > 0) {
      console.log(`Refreshed with ${freshLocal.length} local channels`);
      setChannels(convertLocalChannels(freshLocal));
      setError(null);
      setLoading(false);
      return;
    }
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    console.log('useIPTV useEffect running');
    
    // If we have local channels from file upload, use those (Bocaletto approach)
    // This skips the edge function entirely - streams play directly from user's IP
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
        {
          id: 'demo-1',
          name: 'BBC News',
          url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8',
          logo: 'https://i.imgur.com/7iJVHmC.png',
          group: 'News'
        },
        {
          id: 'demo-2',
          name: 'Al Jazeera English',
          url: 'https://live-hls-web-aje.getaj.net/AJE/index.m3u8',
          logo: 'https://i.imgur.com/xEIhBDz.png',
          group: 'News'
        },
        {
          id: 'demo-3',
          name: 'France 24',
          url: 'https://static.france24.com/meta/android-icon-192x192.png',
          logo: 'https://i.imgur.com/EcMwBCN.png',
          group: 'News'
        },
        {
          id: 'demo-4',
          name: 'CNN',
          url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8',
          logo: 'https://i.imgur.com/KGBSdOa.png',
          group: 'News'
        },
        {
          id: 'demo-5',
          name: 'Sky News',
          url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8',
          logo: 'https://i.imgur.com/OUlToBV.png',
          group: 'News'
        },
        {
          id: 'demo-6',
          name: 'ESPN',
          url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8',
          logo: 'https://i.imgur.com/qKvjKY8.png',
          group: 'Sports'
        },
        {
          id: 'demo-7',
          name: 'Fox Sports',
          url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8',
          logo: 'https://i.imgur.com/YnzJ9Ck.png',
          group: 'Sports'
        },
        {
          id: 'demo-8',
          name: 'NBC Sports',
          url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8',
          logo: 'https://i.imgur.com/oMRLjuC.png',
          group: 'Sports'
        },
        {
          id: 'demo-9',
          name: 'Discovery',
          url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8',
          logo: 'https://i.imgur.com/vK2wvLq.png',
          group: 'Documentary'
        },
        {
          id: 'demo-10',
          name: 'National Geographic',
          url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8',
          logo: 'https://i.imgur.com/BPQASMZ.png',
          group: 'Documentary'
        },
        {
          id: 'demo-11',
          name: 'History Channel',
          url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8',
          logo: 'https://i.imgur.com/SJ9CnN7.png',
          group: 'Documentary'
        },
        {
          id: 'demo-12',
          name: 'HBO',
          url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8',
          logo: 'https://i.imgur.com/LzxlLVi.png',
          group: 'Entertainment'
        },
        {
          id: 'demo-13',
          name: 'Comedy Central',
          url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8',
          logo: 'https://i.imgur.com/g6VmEjF.png',
          group: 'Entertainment'
        },
        {
          id: 'demo-14',
          name: 'MTV',
          url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8',
          logo: 'https://i.imgur.com/BwANwNZ.png',
          group: 'Entertainment'
        },
        {
          id: 'demo-15',
          name: 'Cartoon Network',
          url: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index_5.m3u8',
          logo: 'https://i.imgur.com/vYBhzGO.png',
          group: 'Kids'
        }
      ];
      const mappedChannels = demoChannels.map((ch) => ({
        ...ch,
        type: (ch.group?.toLowerCase().includes('sport') ? 'sports' : 'live') as Channel['type'],
      }));
      setChannels(mappedChannels);
      setCachedChannels(mappedChannels);
      setError(null);
      setLoading(false);
    };
    
    const fetchM3U = async () => {
      console.log('fetchM3U function called');
      
      // No URL configured
      if (!effectiveUrl || !effectiveUrl.trim()) {
        console.log('No M3U URL provided, loading demo channels');
        loadDemoChannels();
        return;
      }
      
      // Check if running on native platform
      const isNative = Capacitor.isNativePlatform();

      try {
        setLoading(true);
        
        let content: string;
        
        if (isNative) {
          console.log('Fetching M3U using native HTTP...');
          // Dynamically import Capacitor HTTP
          const { Http } = await import('@capacitor/http');

          const response = await Http.request({
            method: 'GET',
            url: effectiveUrl,
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
          });

          if (response.status !== 200) {
            throw new Error(`Failed to fetch playlist. Status: ${response.status}`);
          }
          
          content = response.data;
        } else {
          // Web preview - use edge function proxy with Xtream API (IPTV Smarters compatible)
          console.log('Fetching channels using Xtream API via edge function...');
          const { data, error } = await supabase.functions.invoke('fetch-m3u', {
            body: { 
              url: effectiveUrl, 
              maxChannels: 100000, // high cap; backend still applies safety limits
              maxBytesMB: 40, 
              maxReturnPerType: 20000, // fetch more movies/series than before
              preferXtreamApi: true // Use Xtream API directly - IPTV Smarters compatible
            }
          });
          
          if (error) {
            console.error('Edge function error:', error);
            throw new Error(`Proxy error: ${error.message}`);
          }
          
          if (data?.blocked) {
            console.log('IPTV provider blocked proxy request, using demo channels');
            loadDemoChannels();
            return;
          }
          
          if (data?.error) {
            throw new Error(data.error);
          }
          
          // Edge function now returns pre-parsed channels with type
          if (data?.channels && Array.isArray(data.channels)) {
            console.log(`Received ${data.channels.length} pre-parsed channels from edge function`);
            console.log('Counts:', data.counts);
            
            // For series, we need to allow empty URLs since they need episode expansion
            const parsedChannels = data.channels
              .filter((ch: any) => ch.name && (ch.url || ch.type === 'series'))
              .map((ch: any, idx: number) => ({
                id: `channel-${idx}`,
                name: cleanChannelName(ch.name),
                url: ch.url || '',
                logo: ch.logo || undefined,
                group: cleanChannelName(ch.group || 'Live TV'),
                type: ch.type || 'live',
                // Preserve extended metadata
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
            
            if (parsedChannels.length === 0) {
              throw new Error('No valid channels found in playlist');
            }
            
            console.log(`Mapped ${parsedChannels.length} channels with types:`, {
              live: parsedChannels.filter((c: Channel) => c.type === 'live').length,
              movies: parsedChannels.filter((c: Channel) => c.type === 'movies').length,
              series: parsedChannels.filter((c: Channel) => c.type === 'series').length,
              sports: parsedChannels.filter((c: Channel) => c.type === 'sports').length,
            });
            
            setChannels(parsedChannels);
            // Cache asynchronously - don't block UI
            setCachedChannels(parsedChannels).catch(err => console.warn('Failed to cache:', err));
            setError(null);
            setLoading(false);
            return;
          }
          
          throw new Error('Invalid response from proxy');
        }
        
        // Native path: parse locally
        console.log('M3U fetch successful, parsing channels...');
        const parsedChannels = parseM3U(content);
        
        if (parsedChannels.length === 0) {
          throw new Error('No channels found in playlist. The M3U file may be empty or invalid.');
        }
        
        setChannels(parsedChannels);
        // Cache asynchronously - don't block UI
        setCachedChannels(parsedChannels).catch(err => console.warn('Failed to cache:', err));
        setError(null);
      } catch (err: any) {
        console.error('Error fetching M3U:', err);
        const errorMessage = err?.message || 'Failed to load channels';
        console.log('Error details:', errorMessage);
        
        if (!isNative) {
          // Fall back to demo channels for web
          console.log('Falling back to demo channels due to error');
          loadDemoChannels();
        } else {
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchM3U();
  }, [effectiveUrl, refreshKey]);

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
      const group = cleanChannelName(groupMatch ? groupMatch[1] : 'Uncategorized');

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
