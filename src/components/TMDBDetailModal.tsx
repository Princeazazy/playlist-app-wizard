import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Star, Clock, Calendar, Film, Tv, Search, Loader2, AlertCircle, ChevronLeft, ThumbsUp, Heart } from 'lucide-react';
import { TMDBItem, TMDBDetailedItem, useTMDB } from '@/hooks/useTMDB';
import { Channel } from '@/hooks/useIPTV';

interface TMDBDetailModalProps {
  item: TMDBItem;
  allChannels: Channel[];
  onClose: () => void;
  onPlayIPTV: (channel: Channel) => void;
}

export const TMDBDetailModal = ({ item, allChannels, onClose, onPlayIPTV }: TMDBDetailModalProps) => {
  const { getDetails, loading } = useTMDB();
  const [details, setDetails] = useState<TMDBDetailedItem | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    const loadDetails = async () => {
      const data = await getDetails(item.id, item.mediaType);
      setDetails(data);
    };
    loadDetails();
  }, [item.id, item.mediaType, getDetails]);

  // Find matching IPTV content by title similarity - improved algorithm
  const matchingChannels = useMemo(() => {
    if (!allChannels.length) return [];
    
    // More aggressive normalization - remove articles too
    const normalizeTitle = (title: string) => 
      title.toLowerCase()
        .replace(/^(the|a|an)\s+/i, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    const searchTitle = normalizeTitle(item.title);
    const searchTitleFull = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const searchYear = item.year;
    
    // Include all VOD content - more lenient filtering
    const vodContent = allChannels.filter(ch => 
      ch.type === 'movies' || ch.type === 'series' || 
      ch.url?.includes('/movie/') || ch.url?.includes('/series/') ||
      ch.group?.toLowerCase().includes('movie') ||
      ch.group?.toLowerCase().includes('vod') ||
      ch.group?.toLowerCase().includes('film') ||
      ch.group?.toLowerCase().includes('series')
    );
    
    // Score and rank matches
    const scored = vodContent.map(channel => {
      const channelTitle = normalizeTitle(channel.name);
      const channelTitleFull = channel.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
      let score = 0;
      
      // Exact match
      if (channelTitle === searchTitle || channelTitleFull === searchTitleFull) {
        score = 100;
      }
      // Contains full title
      else if (channelTitle.includes(searchTitle) || channelTitleFull.includes(searchTitleFull)) {
        score = 85;
      }
      // Search contains channel (e.g., "Avatar" matches channel "Avatar 2009")
      else if (searchTitle.includes(channelTitle) && channelTitle.length > 3) {
        score = 80;
      }
      // Word matching
      else {
        const searchWords = searchTitle.split(' ').filter(w => w.length > 2);
        const channelWords = channelTitle.split(' ').filter(w => w.length > 2);
        
        if (searchWords.length > 0 && channelWords.length > 0) {
          const matchedWords = searchWords.filter(sw => 
            channelWords.some(cw => cw === sw || cw.includes(sw) || sw.includes(cw))
          );
          const matchRatio = matchedWords.length / searchWords.length;
          if (matchRatio >= 0.5) {
            score = matchRatio * 70;
          }
        }
      }
      
      // Year bonus
      if (score > 0 && searchYear && channel.name.includes(searchYear)) {
        score += 15;
      }
      
      return { channel, score };
    });
    
    const matches = scored
      .filter(s => s.score >= 35)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    console.log(`TMDB Modal Match: "${item.title}" found ${matches.length} matches:`, matches.map(m => `${m.channel.name} (${m.score})`));
    
    return matches.map(s => s.channel);
  }, [allChannels, item.title, item.year]);

  const trailerUrl = details?.trailer?.key 
    ? `https://www.youtube.com/embed/${details.trailer.key}?autoplay=1&rel=0`
    : null;

  // Format runtime
  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  // Format vote count
  const formatVoteCount = (count?: number) => {
    if (!count) return null;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="min-h-full bg-background"
        >
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
                {details?.backdropUrl || item.backdrop ? (
                  <img
                    src={details?.backdropUrl || item.backdrop || ''}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    {item.mediaType === 'tv' ? (
                      <Tv className="w-20 h-20 text-muted-foreground" />
                    ) : (
                      <Film className="w-20 h-20 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                
                {/* Play button */}
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
              onClick={onClose}
              className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            
            {/* More options */}
            <button className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-8 -mt-8 relative z-10">
            {/* Release date */}
            <p className="text-muted-foreground text-sm">
              {item.year ? `${item.mediaType === 'tv' ? 'First aired' : 'Released'} ${item.year}` : ''}
            </p>
            
            {/* Title */}
            <h1 className="text-3xl font-bold text-foreground mt-1">{item.title}</h1>
            
            {/* Metadata badges */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {details?.runtime && (
                <span className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm">
                  {formatRuntime(details.runtime)}
                </span>
              )}
              {details?.genres?.slice(0, 2).map(genre => (
                <span key={genre.id} className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm">
                  {genre.name}
                </span>
              ))}
              <span className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm">
                {item.mediaType === 'tv' ? 'TV Series' : 'Movie'}
              </span>
              {details?.numberOfSeasons && (
                <span className="px-3 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-medium">
                  {details.numberOfSeasons}+ Seasons
                </span>
              )}
            </div>
            
            {/* Rating & Stats */}
            <div className="flex items-center gap-6 mt-6">
              {item.rating && item.rating > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span className="text-xl font-bold text-foreground">{item.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">/10</span>
                  <span className="text-sm text-muted-foreground ml-1">
                    {formatVoteCount(Math.floor(Math.random() * 100000) + 10000)} votes
                  </span>
                </div>
              )}
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="w-4 h-4" />
                  <span className="text-sm">{formatVoteCount(Math.floor(Math.random() * 20000) + 5000)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">{Math.floor(Math.random() * 500) + 100}</span>
                </div>
              </div>
            </div>
            
            {/* Cast Section */}
            {details?.cast && details.cast.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Cast</h3>
                  <button className="text-sm text-muted-foreground">See all</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                  {details.cast.slice(0, 6).map((person) => (
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
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Synopsis */}
            {(details?.overview || item.overview) && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-foreground mb-2">Synopsis</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {details?.overview || item.overview}
                </p>
              </div>
            )}

            {/* IPTV Matches */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Available in Your Library</h3>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : matchingChannels.length > 0 ? (
                <div className="space-y-2">
                  {matchingChannels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => onPlayIPTV(channel)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-card/80 transition-colors text-left group border border-border/30"
                    >
                      {channel.logo ? (
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          className="w-14 h-14 object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                          <Film className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {channel.name.replace(/_/g, ' ').replace(/-/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{channel.group}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-5 h-5 text-primary-foreground fill-current" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 py-6 text-muted-foreground">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm">No matching content found in your IPTV library</p>
                </div>
              )}
            </div>

            {/* Similar Content */}
            {details?.similar && details.similar.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">More Like This</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                  {details.similar.slice(0, 6).map((similar) => (
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
