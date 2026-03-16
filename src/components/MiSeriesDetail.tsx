import { useState, useEffect, useCallback, memo } from 'react';
import { ChevronLeft, Play, Star, Clock, Globe, Calendar, User, Search, Tv, Loader2, RefreshCw } from 'lucide-react';
import { Channel } from '@/hooks/useIPTV';
import { useWeather } from '@/hooks/useWeather';
import { supabase } from '@/integrations/supabase/client';
import { getStoredPlaylistUrl } from '@/lib/playlistStorage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTMDB, TMDBDetailedItem } from '@/hooks/useTMDB';
import { WeatherIcon } from './shared/WeatherIcon';
import { ProviderConfig } from '@/lib/providers/types';
import { normalizePlaybackUrl } from '@/lib/playback/urlResolver';

interface Episode {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  info?: {
    duration?: string;
    plot?: string;
    releaseDate?: string;
    rating?: string;
    movie_image?: string;
  };
  url: string;
}

interface Season {
  season_number: number;
  name: string;
  episodes: Episode[];
}

interface SeriesInfo {
  info: {
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    rating: string;
    backdrop_path: string[];
  };
  seasons: Season[];
}

interface MiSeriesDetailProps {
  item: Channel;
  onBack: () => void;
  onPlayEpisode: (
    episodeUrl: string, 
    episodeTitle: string,
    episodeList?: Array<{ url: string; title: string }>,
    episodeIndex?: number
  ) => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  providerConfig?: ProviderConfig;
}

// Parse Xtream credentials from any playlist-style URL
function parseXtreamCredentials(url: string): { baseUrl: string; username: string; password: string } | null {
  try {
    const urlObj = new URL(url);
    const username = urlObj.searchParams.get('username');
    const password = urlObj.searchParams.get('password');
    if (username && password) {
      return { baseUrl: `${urlObj.protocol}//${urlObj.host}`, username, password };
    }
    return null;
  } catch { return null; }
}

// Build SeriesInfo from raw Xtream API response
function buildSeriesInfoFromRaw(
  rawData: any,
  creds: { baseUrl: string; username: string; password: string },
  seriesName: string,
  fallbackPlot: string
): SeriesInfo {
  const info = rawData?.info || {};
  const result: SeriesInfo = {
    info: {
      name: info.name || seriesName || '',
      cover: info.cover || '',
      plot: info.plot || fallbackPlot || '',
      cast: info.cast || '',
      director: info.director || '',
      genre: info.genre || '',
      releaseDate: info.releaseDate || info.releasedate || '',
      rating: info.rating || '',
      backdrop_path: Array.isArray(info.backdrop_path) ? info.backdrop_path : [],
    },
    seasons: [],
  };

  if (rawData?.episodes && typeof rawData.episodes === 'object') {
    const sortedSeasonNums = Object.keys(rawData.episodes)
      .map(Number)
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);

    for (const seasonNum of sortedSeasonNums) {
      const rawEps = rawData.episodes[String(seasonNum)];
      if (!Array.isArray(rawEps)) continue;
      const episodes: Episode[] = rawEps.map((ep: any) => {
        const rawExt = ep.container_extension || 'mp4';
        // Force web-playable extension — Xtream servers transcode by extension
        const NON_WEB = /^(mkv|avi|wmv|flv|mov|divx|rmvb|3gp)$/i;
        const ext = NON_WEB.test(rawExt) ? 'mp4' : rawExt;
        return {
          id: String(ep.id),
          episode_num: ep.episode_num || 0,
          title: ep.title || `Episode ${ep.episode_num}`,
          container_extension: ext,
          info: {
            duration: ep.info?.duration || '',
            plot: ep.info?.plot || '',
            releaseDate: ep.info?.releasedate || ep.info?.air_date || '',
            rating: ep.info?.rating || '',
            movie_image: ep.info?.movie_image || '',
          },
          url: `${creds.baseUrl}/series/${creds.username}/${creds.password}/${ep.id}.${ext}`,
        };
      }).sort((a: Episode, b: Episode) => a.episode_num - b.episode_num);

      result.seasons.push({ season_number: seasonNum, name: `Season ${seasonNum}`, episodes });
    }
  }
  return result;
}

export const MiSeriesDetail = ({
  item,
  onBack,
  onPlayEpisode,
  onToggleFavorite,
  isFavorite,
  providerConfig,
}: MiSeriesDetailProps) => {
  const [time, setTime] = useState(new Date());
  const weather = useWeather();
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [tmdbData, setTmdbData] = useState<TMDBDetailedItem | null>(null);
  const [fetchMethod, setFetchMethod] = useState<'idle' | 'direct' | 'edge' | 'done'>('idle');
  const { search: tmdbSearch, getDetails } = useTMDB();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch TMDB data based on item name
  useEffect(() => {
    const fetchTMDBData = async () => {
      try {
        const cleanName = item.name
          .replace(/[-_]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/\(\d{4}\)/g, '')
          .trim();
        
        const searchResults = await tmdbSearch(cleanName, 1);
        
        if (searchResults.results.length > 0) {
          const tvResult = searchResults.results.find(r => r.mediaType === 'tv') || searchResults.results[0];
          const details = await getDetails(tvResult.id, tvResult.mediaType);
          setTmdbData(details);
        }
      } catch (error) {
        console.error('Failed to fetch TMDB data:', error);
      }
    };

    fetchTMDBData();
  }, [item.name, tmdbSearch, getDetails]);

  // Resolve playlist URL from provider config or stored URL
  const getPlaylistUrl = useCallback((): string => {
    if (providerConfig) {
      if (providerConfig.type === 'xtream') {
        const serverUrl = providerConfig.serverUrl.replace(/\/+$/, '');
        return `${serverUrl}/get.php?username=${encodeURIComponent(providerConfig.username)}&password=${encodeURIComponent(providerConfig.password)}&type=m3u_plus&output=ts`;
      }
      if (providerConfig.type === 'm3u') return providerConfig.vpnUrl || providerConfig.m3uUrl;
      if (providerConfig.type === 'access_code') {
        const serverUrl = providerConfig.serverUrl.replace(/\/+$/, '');
        return `${serverUrl}/get.php?username=${encodeURIComponent(providerConfig.accessCode)}&password=${encodeURIComponent(providerConfig.accessCode)}&type=m3u_plus&output=ts`;
      }
    }
    return getStoredPlaylistUrl();
  }, [providerConfig]);

  // Fetch series info — try client-side DIRECT first (user IP whitelisted), then edge function
  const fetchSeriesData = useCallback(async () => {
    if (!item.series_id) {
      setError('No series ID available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSeriesInfo(null);

    const playlistUrl = getPlaylistUrl();
    if (!playlistUrl) {
      setError('No playlist URL configured');
      setLoading(false);
      return;
    }

    const creds = parseXtreamCredentials(playlistUrl);
    let resolved = false;

    // === Attempt 1: Direct client-side fetch (user's browser IP is whitelisted by provider) ===
    if (creds) {
      setFetchMethod('direct');
      const apiUrl = `${creds.baseUrl}/player_api.php?username=${creds.username}&password=${creds.password}&action=get_series_info&series_id=${item.series_id}`;
      
      try {
        console.log(`[SeriesDetail] Direct fetch: series_id=${item.series_id}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeout);
        
        if (res.ok) {
          const rawText = await res.text();
          try {
            const rawData = JSON.parse(rawText);
            if (rawData && typeof rawData === 'object' && !Array.isArray(rawData) && Object.keys(rawData).length > 0) {
              const info = buildSeriesInfoFromRaw(rawData, creds, item.name, item.plot || '');
              console.log(`[SeriesDetail] ✅ Direct fetch success: ${info.seasons.length} seasons`);
              setSeriesInfo(info);
              if (info.seasons.length > 0) {
                setSelectedSeason(info.seasons[0].season_number);
              }
              resolved = true;
            }
          } catch (parseErr) {
            console.warn('[SeriesDetail] Direct fetch returned non-JSON:', parseErr);
          }
        } else {
          console.warn(`[SeriesDetail] Direct fetch returned ${res.status}`);
        }
      } catch (directErr: any) {
        // CORS or network error — expected on web, fall through to edge function
        console.warn('[SeriesDetail] Direct fetch failed (likely CORS):', directErr.message);
      }
    }

    // === Attempt 2: Edge function fallback ===
    if (!resolved) {
      setFetchMethod('edge');
      try {
        console.log(`[SeriesDetail] Edge function fetch: series_id=${item.series_id}`);
        const { data, error: fnError } = await supabase.functions.invoke('fetch-series-info', {
          body: {
            playlistUrl,
            seriesId: item.series_id,
            seriesName: item.name,
            fallbackPlot: item.plot || '',
          },
        });

        if (fnError) {
          console.error('[SeriesDetail] Edge function error:', fnError);
          setError('Failed to load series information');
          setLoading(false);
          setFetchMethod('done');
          return;
        }

        if (data?.error) {
          setError(data.error);
          setLoading(false);
          setFetchMethod('done');
          return;
        }

        setSeriesInfo(data);
        if (data?.seasons?.length > 0) {
          setSelectedSeason(data.seasons[0].season_number);
        }

        // Log warning if provider blocked
        if (data?.warning) {
          console.warn(`[SeriesDetail] ${data.warning}`);
        }
      } catch (err) {
        console.error('[SeriesDetail] Edge function failed:', err);
        setError('Failed to load series');
      }
    }

    setLoading(false);
    setFetchMethod('done');
  }, [item.series_id, item.name, item.plot, getPlaylistUrl]);

  useEffect(() => {
    fetchSeriesData();
  }, [fetchSeriesData]);

  // Get poster URL - provider's cover first, TMDB as fallback
  const posterUrl = seriesInfo?.info?.cover || item.logo || tmdbData?.posterUrl || tmdbData?.poster || item.backdrop_path?.[0] || '/placeholder.svg';

  const currentSeason = seriesInfo?.seasons?.find(s => s.season_number === selectedSeason);
  const episodes = currentSeason?.episodes || [];

  const metadata = {
    genre: tmdbData?.genres?.map(g => g.name).join(', ') || seriesInfo?.info?.genre || item.genre || 'Unknown',
    rating: tmdbData?.rating?.toFixed(1) || seriesInfo?.info?.rating || item.rating || 'N/A',
    languages: 'EN',
    director: seriesInfo?.info?.director || item.director || 'Unknown',
    ageRating: '+13',
    plot: tmdbData?.overview || seriesInfo?.info?.plot || item.plot || 'No description available.',
    year: tmdbData?.year || seriesInfo?.info?.releaseDate?.split('-')[0] || item.year || 'Unknown',
    cast: seriesInfo?.info?.cast || item.cast || '',
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background blur image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl scale-110"
        style={{ backgroundImage: `url(${posterUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/80" />
      
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-10 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all duration-100"
          >
            <ChevronLeft className="w-6 h-6 text-muted-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">{item.name}</h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-6">
          <span className="text-foreground font-medium text-lg">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex items-center gap-2 text-muted-foreground">
            <WeatherIcon icon={weather.icon} />
            <span>{weather.displayTemp}</span>
          </div>
          <button className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="w-12 h-12 rounded-full bg-primary overflow-hidden ring-2 ring-primary/30">
            <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <User className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-10 py-4 flex gap-10 h-[calc(100vh-120px)] overflow-hidden">
        {/* Left Side - Poster & Info */}
        <ScrollArea className="w-[320px] flex-shrink-0">
          <div className="flex flex-col pr-2">
          {/* Poster */}
          <div className="rounded-2xl overflow-hidden shadow-2xl mb-6 bg-card">
            {posterUrl ? (
              <img 
                src={posterUrl}
                alt={item.name}
                className="w-full object-contain"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-card flex items-center justify-center">
                <Tv className="w-20 h-20 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Series Info */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">{metadata.genre}</p>
            <h2 className="text-2xl font-bold text-foreground">{item.name}</h2>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{metadata.rating}/10</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(parseFloat(metadata.rating) / 2)
                        ? 'mi-star-filled'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{metadata.year}</span>
              </div>
              <span className="mi-badge mi-badge-hd">HD</span>
              <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                {seriesInfo?.seasons?.length || 0} Seasons
              </span>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-4">
              {metadata.plot}
            </p>

            {/* Favorite Button */}
            <button 
              onClick={onToggleFavorite}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 mi-card hover:bg-card transition-colors mt-4"
            >
              <Star className={`w-5 h-5 ${isFavorite ? 'mi-star-filled' : 'text-muted-foreground'}`} />
              <span className="text-foreground font-medium">
                {isFavorite ? 'Remove Favorite' : 'Add Favorite'}
              </span>
            </button>
          </div>
          </div>
        </ScrollArea>

        {/* Right Side - Seasons & Episodes */}
        <div className="flex-1 flex flex-col min-w-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground">
                  {fetchMethod === 'direct' ? 'Loading episodes...' : 
                   fetchMethod === 'edge' ? 'Fetching from server...' : 
                   'Loading episodes...'}
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <p className="text-destructive mb-2">{error}</p>
                <p className="text-muted-foreground text-sm">
                  Episodes may not be available for this series
                </p>
                <button
                  onClick={fetchSeriesData}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Season Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {seriesInfo?.seasons?.map((season) => (
                  <button
                    key={season.season_number}
                    onClick={() => setSelectedSeason(season.season_number)}
                    className={`px-5 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                      selectedSeason === season.season_number
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    Season {season.season_number}
                  </button>
                ))}
              </div>

              {/* Episodes List */}
              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-4">
                  {episodes.map((episode, index) => {
                    const episodeList = episodes.map((ep, i) => ({
                      url: ep.url,
                      title: `Episode ${i + 1}`,
                    }));
                    
                    return (
                      <button
                        key={episode.id}
                        onClick={() => onPlayEpisode(episode.url, `Episode ${index + 1}`, episodeList, index)}
                        className="group w-full flex items-center gap-4 p-3 bg-card rounded-xl hover:ring-2 hover:ring-primary/50 transition-all text-left"
                      >
                        {/* Episode Number */}
                        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-foreground">{index + 1}</span>
                        </div>
                        
                        {/* Episode Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-foreground font-medium truncate">
                            Episode {index + 1}
                          </h3>
                          {episode.info?.duration && (
                            <p className="text-muted-foreground text-sm">{episode.info.duration}</p>
                          )}
                        </div>
                        
                        {/* Play Icon */}
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-colors">
                          <Play className="w-5 h-5 text-primary group-hover:text-primary-foreground fill-primary group-hover:fill-primary-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                {episodes.length === 0 && !loading && (
                  <div className="text-center py-10 space-y-4">
                    <p className="text-muted-foreground">No episodes available for this season</p>
                    <button
                      onClick={fetchSeriesData}
                      className="px-4 py-2 bg-card border border-border rounded-xl text-foreground hover:bg-card/80 transition-colors inline-flex items-center gap-2 text-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retry Loading
                    </button>
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
