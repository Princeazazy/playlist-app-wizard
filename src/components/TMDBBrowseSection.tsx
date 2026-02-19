import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Star, Film, Tv, TrendingUp, Loader2, Moon } from 'lucide-react';
import { useTMDB, TMDBItem } from '@/hooks/useTMDB';
import { useTMDBPosters } from '@/hooks/useTMDBPosters';
import { Channel } from '@/hooks/useIPTV';
import { InfiniteMarquee } from './shared/InfiniteMarquee';

interface TMDBBrowseSectionProps {
  onSelectItem?: (item: TMDBItem) => void;
  channels?: Channel[];
  onChannelSelect?: (channel: Channel) => void;
}

const MediaMarqueeCard = ({ item, onClick }: { item: TMDBItem; onClick?: () => void }) => (
  <motion.button
    whileHover={{ scale: 1.05, y: -8 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className="group relative w-[180px]"
  >
    <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-card border border-white/[0.06] relative shadow-lg shadow-black/40 group-hover:shadow-primary/20 group-hover:border-primary/30 transition-all duration-300">
      {item.poster ? (
        <img src={item.poster} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" draggable={false} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          {item.mediaType === 'tv' ? <Tv className="w-10 h-10 text-muted-foreground" /> : <Film className="w-10 h-10 text-muted-foreground" />}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-primary/30">
            <Play className="w-4 h-4 text-primary-foreground fill-current ml-0.5" />
          </div>
          <div className="text-left">
            <p className="text-white text-xs font-semibold truncate max-w-[100px]">{item.title}</p>
            {item.year && <p className="text-white/60 text-[10px]">{item.year}</p>}
          </div>
        </div>
      </div>
      {item.rating && item.rating > 0 && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-[10px] font-bold text-white">{item.rating.toFixed(1)}</span>
        </div>
      )}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-primary/80 backdrop-blur-sm">
        <span className="text-[10px] font-bold text-primary-foreground uppercase">{item.mediaType === 'tv' ? 'TV' : 'Movie'}</span>
      </div>
    </div>
  </motion.button>
);

const PlaylistMarqueeCard = ({ channel, onClick, tmdbPoster }: { channel: Channel; onClick?: () => void; tmdbPoster?: string }) => {
  const cleanName = (name: string) => name.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
  const posterUrl = tmdbPoster || channel.logo;

  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -8 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="group relative w-[180px]"
    >
      <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-card border border-white/[0.06] relative shadow-lg shadow-black/40 group-hover:shadow-primary/20 group-hover:border-primary/30 transition-all duration-300">
        {posterUrl ? (
          <img src={posterUrl} alt={channel.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" draggable={false}
            onError={(e) => {
              if (tmdbPoster && channel.logo && e.currentTarget.src !== channel.logo) {
                e.currentTarget.src = channel.logo;
              } else {
                e.currentTarget.style.display = 'none';
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Film className="w-10 h-10 text-primary/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-primary/30">
              <Play className="w-4 h-4 text-primary-foreground fill-current ml-0.5" />
            </div>
            <p className="text-white text-xs font-semibold truncate max-w-[100px]">{cleanName(channel.name)}</p>
          </div>
        </div>
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-500/80 backdrop-blur-sm">
          <span className="text-[10px] font-bold text-white uppercase">Arabic</span>
        </div>
      </div>
    </motion.button>
  );
};

// Section wrapper with PulseGOC-style curved container
const MarqueeSection = ({
  title,
  icon: Icon,
  badge,
  children,
}: {
  title: string;
  icon: typeof Film;
  badge?: string;
  children: React.ReactNode;
}) => (
  <div className="relative">
    {/* Curved container top */}
    <div className="relative rounded-t-[2.5rem] overflow-hidden" style={{
      background: 'linear-gradient(180deg, hsl(265 45% 10%) 0%, transparent 100%)',
    }}>
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(hsl(200 90% 55%) 1px, transparent 1px), linear-gradient(90deg, hsl(200 90% 55%) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div className="px-6 pt-6 pb-2 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
          background: 'linear-gradient(135deg, hsl(200 90% 55% / 0.2), hsl(240 80% 60% / 0.1))',
          border: '1px solid hsl(200 90% 55% / 0.2)',
        }}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>
        {badge && (
          <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-primary-foreground" style={{
            background: 'linear-gradient(135deg, hsl(200 90% 55%), hsl(240 80% 60%))',
            boxShadow: '0 0 12px hsl(200 90% 55% / 0.4)',
          }}>{badge}</span>
        )}
      </div>
    </div>
    <div className="py-4">
      {children}
    </div>
  </div>
);

export const TMDBBrowseSection = ({ onSelectItem, channels = [], onChannelSelect }: TMDBBrowseSectionProps) => {
  const { getTrending, getMovies, getTVShows, error } = useTMDB();
  const [trending, setTrending] = useState<TMDBItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBItem[]>([]);
  const [popularTV, setPopularTV] = useState<TMDBItem[]>([]);
  const [loadingState, setLoadingState] = useState({ trending: true, movies: true, tv: true });

  const isSportsContent = (ch: Channel) => {
    const nameLower = ch.name.toLowerCase();
    const groupLower = ch.group?.toLowerCase() || '';
    return nameLower.includes('wwe') || nameLower.includes('wrestling') || nameLower.includes('sport') || groupLower.includes('sport') || groupLower.includes('wwe');
  };

  const ramadanShows = useMemo(() => {
    return channels.filter(ch => {
      const group = ch.group || '';
      return (group.includes('رمضان 2026 مسلسلات مصرية') || (group.includes('مسلسلات مصرية') && group.includes('2026'))) && !isSportsContent(ch);
    }).slice(0, 24);
  }, [channels]);

  const arabicSeries = useMemo(() => {
    return channels.filter(ch => {
      const group = ch.group || '';
      const gl = group.toLowerCase();
      return (gl.includes('ar ser 2026') || gl.includes('arabic series 2026') || group.includes('مسلسلات عربي 2026') || group.includes('مسلسلات عربية 2026')) && !isSportsContent(ch);
    }).slice(0, 24);
  }, [channels]);

  const arabicMovies = useMemo(() => {
    return channels.filter(ch => {
      const group = ch.group || '';
      const gl = group.toLowerCase();
      return (gl.includes('ar mov 2026') || gl.includes('ar mov 2025') || gl.includes('arabic movies 2026') || gl.includes('arabic movies 2025') || (group.includes('أفلام عربية') && (group.includes('2026') || group.includes('2025')))) && !isSportsContent(ch);
    }).sort((a, b) => {
      const gA = a.group?.includes('2026') ? 2026 : 2025;
      const gB = b.group?.includes('2026') ? 2026 : 2025;
      return gB - gA;
    }).slice(0, 24);
  }, [channels]);

  // TMDB poster hooks for playlist rows
  const { getPosterForChannel: getRamadanPoster } = useTMDBPosters(ramadanShows);
  const { getPosterForChannel: getSeriesPoster } = useTMDBPosters(arabicSeries);
  const { getPosterForChannel: getMoviePoster } = useTMDBPosters(arabicMovies);

  useEffect(() => {
    const loadContent = async () => {
      const [trendingData, moviesData, tvData] = await Promise.all([
        getTrending().finally(() => setLoadingState(s => ({ ...s, trending: false }))),
        getMovies('popular').finally(() => setLoadingState(s => ({ ...s, movies: false }))),
        getTVShows('popular').finally(() => setLoadingState(s => ({ ...s, tv: false }))),
      ]);
      setTrending(trendingData.slice(0, 18));
      setPopularMovies(moviesData.results.slice(0, 18));
      setPopularTV(tvData.results.slice(0, 18));
    };
    loadContent();
    const refreshInterval = setInterval(loadContent, 30 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [getTrending, getMovies, getTVShows]);

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
        <p className="text-destructive text-sm">Failed to load content: {error}</p>
      </div>
    );
  }

  const renderLoading = () => (
    <div className="flex items-center justify-center h-[200px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Hero header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
          background: 'linear-gradient(135deg, hsl(200 90% 55% / 0.2), hsl(240 80% 60% / 0.1))',
          border: '1px solid hsl(200 90% 55% / 0.25)',
          boxShadow: '0 0 20px hsl(200 90% 55% / 0.15)',
        }}>
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Browse Movies & Series</h2>
          <p className="text-sm text-muted-foreground">Discover trending content • Click to view details & trailers</p>
        </div>
      </div>

      {/* Ramadan 2026 */}
      {ramadanShows.length > 0 && (
        <MarqueeSection title="Ramadan 2026 Series" icon={Moon} badge="NEW">
          <InfiniteMarquee speed={40} direction="left">
            {ramadanShows.map(ch => (
              <PlaylistMarqueeCard key={ch.id} channel={ch} tmdbPoster={getRamadanPoster(ch.name)} onClick={() => onChannelSelect?.(ch)} />
            ))}
          </InfiniteMarquee>
        </MarqueeSection>
      )}

      {/* Arabic Series */}
      {arabicSeries.length > 0 && (
        <MarqueeSection title="Latest Arabic Series" icon={Tv}>
          <InfiniteMarquee speed={35} direction="right">
            {arabicSeries.map(ch => (
              <PlaylistMarqueeCard key={ch.id} channel={ch} tmdbPoster={getSeriesPoster(ch.name)} onClick={() => onChannelSelect?.(ch)} />
            ))}
          </InfiniteMarquee>
        </MarqueeSection>
      )}

      {/* Arabic Movies */}
      {arabicMovies.length > 0 && (
        <MarqueeSection title="Latest Arabic Movies" icon={Film}>
          <InfiniteMarquee speed={38} direction="left">
            {arabicMovies.map(ch => (
              <PlaylistMarqueeCard key={ch.id} channel={ch} tmdbPoster={getMoviePoster(ch.name)} onClick={() => onChannelSelect?.(ch)} />
            ))}
          </InfiniteMarquee>
        </MarqueeSection>
      )}

      {/* Trending */}
      <MarqueeSection title="Trending Now" icon={TrendingUp} badge="HOT">
        {loadingState.trending ? renderLoading() : trending.length > 0 ? (
          <InfiniteMarquee speed={45} direction="left">
            {trending.map(item => (
              <MediaMarqueeCard key={`${item.id}-${item.mediaType}`} item={item} onClick={() => onSelectItem?.(item)} />
            ))}
          </InfiniteMarquee>
        ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground">No content</div>}
      </MarqueeSection>

      {/* Popular Movies */}
      <MarqueeSection title="Popular Movies" icon={Film}>
        {loadingState.movies ? renderLoading() : popularMovies.length > 0 ? (
          <InfiniteMarquee speed={42} direction="right">
            {popularMovies.map(item => (
              <MediaMarqueeCard key={`${item.id}-${item.mediaType}`} item={item} onClick={() => onSelectItem?.(item)} />
            ))}
          </InfiniteMarquee>
        ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground">No content</div>}
      </MarqueeSection>

      {/* Popular TV */}
      <MarqueeSection title="Popular TV Shows" icon={Tv}>
        {loadingState.tv ? renderLoading() : popularTV.length > 0 ? (
          <InfiniteMarquee speed={40} direction="left">
            {popularTV.map(item => (
              <MediaMarqueeCard key={`${item.id}-${item.mediaType}`} item={item} onClick={() => onSelectItem?.(item)} />
            ))}
          </InfiniteMarquee>
        ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground">No content</div>}
      </MarqueeSection>
    </div>
  );
};
