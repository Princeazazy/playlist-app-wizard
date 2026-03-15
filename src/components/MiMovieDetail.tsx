import { useState, useEffect } from 'react';
import { ChevronLeft, Play, Star, Clock, Globe, Calendar, User, Search, Film, X } from 'lucide-react';
import { Channel } from '@/hooks/useIPTV';
import { useWeather } from '@/hooks/useWeather';
import { useTMDB, TMDBDetailedItem } from '@/hooks/useTMDB';
import { supabase } from '@/integrations/supabase/client';
import { WeatherIcon } from './shared/WeatherIcon';

interface MiMovieDetailProps {
  item: Channel;
  onBack: () => void;
  onPlay: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
}

export const MiMovieDetail = ({
  item,
  onBack,
  onPlay,
  onToggleFavorite,
  isFavorite,
}: MiMovieDetailProps) => {
  const [time, setTime] = useState(new Date());
  const [tmdbData, setTmdbData] = useState<TMDBDetailedItem | null>(null);
  const [isLoadingTMDB, setIsLoadingTMDB] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const weather = useWeather();
  const { search, getDetails } = useTMDB();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch TMDB data based on item name
  useEffect(() => {
    const fetchTMDBData = async () => {
      setIsLoadingTMDB(true);
      try {
        // Clean the item name for better search results
        const cleanName = item.name
          .replace(/[-_]/g, ' ')
          .replace(/\b(HDCAM|HDTC|HDRip|WEBRip|WEB-DL|WEBDL|BluRay|BRRip|DVDRip|CAM|TS|HC|HD|4K|1080p|720p|480p|HEVC|x264|x265|AAC|MP4|MKV|AVI)\b/gi, '')
          .replace(/\(\d{4}\)/g, '')
          .replace(/\d{4}$/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        const searchResults = await search(cleanName, 1);
        
        if (searchResults.results.length > 0) {
          // Get the first movie result (prioritize movies over TV)
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

  // Use TMDB data if available, otherwise fall back to item data
  const metadata = {
    genre: tmdbData?.genres?.map(g => g.name).join(', ') || item.genre || 'Unknown',
    rating: tmdbData?.rating?.toFixed(1) || item.rating || 'N/A',
    duration: tmdbData?.runtime ? `${Math.floor(tmdbData.runtime / 60)}h ${tmdbData.runtime % 60}m` : item.duration || 'Unknown',
    languages: 'EN',
    director: item.director || 'Unknown',
    ageRating: '+13',
    plot: tmdbData?.overview || item.plot || 'No description available.',
    year: tmdbData?.year || item.year || 'Unknown',
  };

  // Get poster URL - prefer item's own logo (from playlist provider), only use TMDB poster if no local logo exists
  const posterUrl = item.logo || tmdbData?.posterUrl || tmdbData?.poster || item.backdrop_path?.[0] || '/placeholder.svg';

  const trailerKey = tmdbData?.trailer?.key;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Trailer Modal */}
      {showTrailer && trailerKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="relative w-full max-w-4xl mx-4">
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
            <div className="rounded-2xl overflow-hidden aspect-video shadow-2xl">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
                title="Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
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
          <h1 className="text-xl font-semibold text-foreground">{item.name} Movie</h1>
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
      <main className="relative z-10 px-10 py-6">
        <div className="flex gap-10">
          {/* Poster */}
          <div className="w-[350px] flex-shrink-0">
            <div className="rounded-2xl overflow-hidden shadow-2xl bg-card">
              {posterUrl ? (
                <img 
                  src={posterUrl}
                  alt={item.name}
                  className="w-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-card flex items-center justify-center">
                  <Film className="w-20 h-20 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 max-w-2xl">
            {/* Genre */}
            <p className="text-muted-foreground text-lg">{metadata.genre}</p>
            
            {/* Title */}
            <h1 className="text-4xl font-bold text-foreground mt-2">{item.name}</h1>
            
            {/* Rating */}
            <div className="flex items-center gap-4 mt-4">
              <span className="text-lg text-muted-foreground">{metadata.rating}/10</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(parseFloat(metadata.rating) / 2)
                        ? 'mi-star-filled'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Metadata Row */}
            <div className="flex items-center gap-4 mt-6 flex-wrap">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span>{metadata.duration}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-5 h-5" />
                <span>{metadata.languages}</span>
              </div>
              <span className="mi-badge mi-badge-hd">HD</span>
              <span className="mi-badge mi-badge-epg">EPG</span>
            </div>

            {/* Director & Age */}
            <div className="flex items-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Director:</span>
                <span className="text-foreground">{metadata.director}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Age:</span>
                <span className="text-foreground">{metadata.ageRating}</span>
              </div>
            </div>

            {/* Plot */}
            <p className="text-muted-foreground mt-6 leading-relaxed line-clamp-6">
              {metadata.plot}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => trailerKey && setShowTrailer(true)}
                className={`flex-1 flex items-center justify-center gap-3 px-8 py-4 mi-card transition-colors ${trailerKey ? 'hover:bg-card cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                title={trailerKey ? 'Watch Trailer' : 'No trailer available'}
              >
                <Film className="w-6 h-6 text-muted-foreground" />
                <span className="text-foreground font-medium text-lg">Trailer</span>
              </button>
              
              <button 
                onClick={onPlay}
                className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-secondary rounded-2xl hover:bg-secondary/80 transition-colors"
              >
                <Play className="w-6 h-6 text-foreground fill-foreground" />
                <span className="text-foreground font-medium text-lg">Watch Now</span>
              </button>
              
              <button 
                onClick={onToggleFavorite}
                className="flex-1 flex items-center justify-center gap-3 px-8 py-4 mi-card hover:bg-card transition-colors"
              >
                <Star className={`w-6 h-6 ${isFavorite ? 'mi-star-filled' : 'text-muted-foreground'}`} />
                <span className="text-foreground font-medium text-lg">
                  {isFavorite ? 'Remove Favorite' : 'Add Favorite'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
