import { useState, useEffect, memo } from 'react';
import { ChevronLeft, Play, Star, Film, Tv, Loader2, X } from 'lucide-react';
import { Channel } from '@/hooks/useIPTV';
import { supabase } from '@/integrations/supabase/client';
import { getStoredPlaylistUrl } from '@/lib/playlistStorage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTMDB, TMDBDetailedItem } from '@/hooks/useTMDB';

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
  onTrailerStateChange?: (playing: boolean) => void;
}

export const MiSeriesDetail = ({
  item,
  onBack,
  onPlayEpisode,
  onToggleFavorite,
  isFavorite,
  onTrailerStateChange,
}: MiSeriesDetailProps) => {
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [tmdbData, setTmdbData] = useState<TMDBDetailedItem | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const { search: tmdbSearch, getDetails } = useTMDB();

  // Fetch TMDB data
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

  // Notify parent about trailer state
  useEffect(() => {
    onTrailerStateChange?.(showTrailer);
  }, [showTrailer, onTrailerStateChange]);

  // Fetch series info with seasons/episodes
  useEffect(() => {
    const fetchSeriesInfo = async () => {
      if (!item.series_id) {
        setError('No series ID available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const playlistUrl = getStoredPlaylistUrl();
        if (!playlistUrl) {
          setError('No playlist URL configured');
          setLoading(false);
          return;
        }

        const { data, error: fnError } = await supabase.functions.invoke('fetch-series-info', {
          body: { playlistUrl, seriesId: item.series_id },
        });

        if (fnError) {
          setError('Failed to load series information');
          setLoading(false);
          return;
        }

        if (data?.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        setSeriesInfo(data);
        if (data?.seasons?.length > 0) {
          setSelectedSeason(data.seasons[0].season_number);
        }
      } catch (err) {
        setError('Failed to load series');
      } finally {
        setLoading(false);
      }
    };

    fetchSeriesInfo();
  }, [item.series_id]);

  const backdropUrl = tmdbData?.backdropUrl || tmdbData?.backdrop || seriesInfo?.info?.cover || item.logo;
  const trailerKey = tmdbData?.trailer?.key;
  const trailerUrl = trailerKey ? `https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0` : null;

  const currentSeason = seriesInfo?.seasons?.find(s => s.season_number === selectedSeason);
  const episodes = currentSeason?.episodes || [];

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Backdrop / Trailer */}
      <div className="relative h-[50vh] overflow-hidden">
        {showTrailer && trailerUrl ? (
          <iframe
            src={trailerUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            {backdropUrl ? (
              <img src={backdropUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Tv className="w-20 h-20 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            
            {trailerUrl && (
              <button
                onClick={() => setShowTrailer(true)}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors shadow-2xl"
              >
                <Play className="w-8 h-8 text-white fill-current ml-1" />
              </button>
            )}
          </>
        )}
        
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {showTrailer && (
          <button
            onClick={() => setShowTrailer(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-6 pb-8 -mt-8 relative z-10">
        <p className="text-muted-foreground text-sm">
          {tmdbData?.year ? `First aired ${tmdbData.year}` : ''}
        </p>
        
        <h1 className="text-3xl font-bold text-foreground mt-1">{item.name}</h1>
        
        {/* Metadata badges */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {tmdbData?.runtime && (
            <span className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm">
              {formatRuntime(tmdbData.runtime)}
            </span>
          )}
          {tmdbData?.genres?.slice(0, 2).map(genre => (
            <span key={genre.id} className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm">
              {genre.name}
            </span>
          ))}
          <span className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm">
            TV Series
          </span>
          {tmdbData?.numberOfSeasons && (
            <span className="px-3 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-medium">
              {tmdbData.numberOfSeasons}+ Seasons
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-6 mt-6">
          {tmdbData?.rating && tmdbData.rating > 0 && (
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="text-xl font-bold text-foreground">{tmdbData.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">/10</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button 
            onClick={() => trailerKey && setShowTrailer(true)}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-muted rounded-2xl transition-colors ${trailerKey ? 'hover:bg-muted/80 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
          >
            <Film className="w-6 h-6 text-foreground" />
            <span className="text-foreground font-medium text-lg">Trailer</span>
          </button>
          
          <button 
            onClick={onToggleFavorite}
            className="w-14 h-14 flex items-center justify-center bg-muted rounded-2xl hover:bg-muted/80 transition-colors"
          >
            <Star className={`w-6 h-6 ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
          </button>
        </div>

        {/* Cast Section */}
        {tmdbData?.cast && tmdbData.cast.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Cast</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
              {tmdbData.cast.slice(0, 6).map((person) => (
                <div key={person.id} className="flex-shrink-0 w-20 text-center">
                  {person.profile_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                      alt={person.name}
                      className="w-20 h-20 object-cover rounded-2xl mx-auto shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-muted mx-auto flex items-center justify-center">
                      <span className="text-2xl text-muted-foreground">{person.name[0]}</span>
                    </div>
                  )}
                  <p className="text-xs font-medium text-foreground mt-2 truncate">{person.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{person.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Synopsis */}
        {(tmdbData?.overview || seriesInfo?.info?.plot || item.plot) && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-foreground mb-2">Synopsis</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {tmdbData?.overview || seriesInfo?.info?.plot || item.plot}
            </p>
          </div>
        )}

        {/* Episodes Section */}
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Episodes</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="text-muted-foreground text-sm py-4">{error}</p>
          ) : (
            <>
              {/* Season Tabs */}
              {seriesInfo?.seasons && seriesInfo.seasons.length > 1 && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 hide-scrollbar">
                  {seriesInfo.seasons.map((season) => (
                    <button
                      key={season.season_number}
                      onClick={() => setSelectedSeason(season.season_number)}
                      className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all text-sm ${
                        selectedSeason === season.season_number
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      Season {season.season_number}
                    </button>
                  ))}
                </div>
              )}

              {/* Episode List */}
              <div className="space-y-2">
                {episodes.map((episode, index) => {
                  const episodeList = episodes.map((ep, i) => ({
                    url: ep.url,
                    title: `Episode ${i + 1}`,
                  }));
                  
                  return (
                    <button
                      key={episode.id}
                      onClick={() => onPlayEpisode(episode.url, `Episode ${index + 1}`, episodeList, index)}
                      className="group w-full flex items-center gap-4 p-3 bg-card rounded-xl hover:ring-2 hover:ring-primary/50 transition-all text-left border border-border/30"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-foreground">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-foreground font-medium truncate text-sm">Episode {index + 1}</h3>
                        {episode.info?.duration && (
                          <p className="text-muted-foreground text-xs">{episode.info.duration}</p>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-colors">
                        <Play className="w-4 h-4 text-primary group-hover:text-primary-foreground fill-primary group-hover:fill-primary-foreground" />
                      </div>
                    </button>
                  );
                })}
                {episodes.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-6">No episodes available</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Similar Content */}
        {tmdbData?.similar && tmdbData.similar.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">More Like This</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
              {tmdbData.similar.slice(0, 6).map((similar) => (
                <div key={similar.id} className="flex-shrink-0 w-28">
                  <div className="aspect-[2/3] rounded-xl overflow-hidden bg-card">
                    {similar.poster ? (
                      <img src={similar.poster} alt={similar.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Film className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground mt-2 truncate">{similar.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
