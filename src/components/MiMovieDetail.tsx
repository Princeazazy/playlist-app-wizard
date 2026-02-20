import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Play, Star, Clock, Film, X, ThumbsUp, Heart, Tv } from 'lucide-react';
import { Channel } from '@/hooks/useIPTV';
import { useTMDB, TMDBDetailedItem } from '@/hooks/useTMDB';

interface MiMovieDetailProps {
  item: Channel;
  onBack: () => void;
  onPlay: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  onTrailerStateChange?: (playing: boolean) => void;
}

export const MiMovieDetail = ({
  item,
  onBack,
  onPlay,
  onToggleFavorite,
  isFavorite,
  onTrailerStateChange,
}: MiMovieDetailProps) => {
  const [tmdbData, setTmdbData] = useState<TMDBDetailedItem | null>(null);
  const [isLoadingTMDB, setIsLoadingTMDB] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const { search, getDetails } = useTMDB();

  useEffect(() => {
    const fetchTMDBData = async () => {
      setIsLoadingTMDB(true);
      try {
        const cleanName = item.name
          .replace(/[-_]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/\(\d{4}\)/g, '')
          .trim();
        
        const searchResults = await search(cleanName, 1);
        
        if (searchResults.results.length > 0) {
          const movieResult = searchResults.results.find(r => r.mediaType === 'movie') || searchResults.results[0];
          const details = await getDetails(movieResult.id, movieResult.mediaType);
          setTmdbData(details);
        }
      } catch (error) {
        console.error('Failed to fetch TMDB data:', error);
      } finally {
        setIsLoadingTMDB(false);
      }
    };

    fetchTMDBData();
  }, [item.name, search, getDetails]);

  // Notify parent about trailer state
  useEffect(() => {
    onTrailerStateChange?.(showTrailer);
  }, [showTrailer, onTrailerStateChange]);

  const posterUrl = item.logo || tmdbData?.posterUrl || tmdbData?.poster;
  const backdropUrl = tmdbData?.backdropUrl || tmdbData?.backdrop || item.logo;
  const trailerKey = tmdbData?.trailer?.key;
  const trailerUrl = trailerKey ? `https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0` : null;

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const formatVoteCount = (count?: number) => {
    if (!count) return null;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
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
              <img
                src={backdropUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Film className="w-20 h-20 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            
            {/* Play trailer button */}
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
        
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* Close trailer button */}
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
        {/* Year */}
        <p className="text-muted-foreground text-sm">
          {tmdbData?.year ? `Released ${tmdbData.year}` : item.year ? `Released ${item.year}` : ''}
        </p>
        
        {/* Title */}
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
            Movie
          </span>
        </div>

        {/* Rating & Stats */}
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
            onClick={onPlay}
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-primary rounded-2xl hover:bg-primary/80 transition-colors"
          >
            <Play className="w-6 h-6 text-primary-foreground fill-current" />
            <span className="text-primary-foreground font-medium text-lg">Play</span>
          </button>
          
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
        {(tmdbData?.overview || item.plot) && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-foreground mb-2">Synopsis</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {tmdbData?.overview || item.plot}
            </p>
          </div>
        )}

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
