import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Star, Film, Tv, TrendingUp, Loader2, Moon } from 'lucide-react';
import { useTMDB, TMDBItem } from '@/hooks/useTMDB';
import { useTMDBPosters } from '@/hooks/useTMDBPosters';
import { Channel } from '@/hooks/useIPTV';

interface TMDBBrowseSectionProps {
  onSelectItem?: (item: TMDBItem) => void;
  channels?: Channel[];
  onChannelSelect?: (channel: Channel) => void;
}

const ITEMS_PER_PAGE = 6;

// Lightweight card - NO framer-motion, pure CSS transitions
const MediaCard = ({ item, onClick }: { item: TMDBItem; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="flex-shrink-0 w-full group relative transition-transform duration-200 hover:scale-105 hover:-translate-y-1 active:scale-[0.98]"
  >
    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-card border border-border/30 relative">
      {item.poster ? (
        <img
          src={item.poster}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          {item.mediaType === 'tv' ? (
            <Tv className="w-10 h-10 text-muted-foreground" />
          ) : (
            <Film className="w-10 h-10 text-muted-foreground" />
          )}
        </div>
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <Play className="w-5 h-5 text-primary-foreground fill-current" />
        </div>
      </div>
      
      {item.rating && item.rating > 0 && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-medium text-white">{item.rating.toFixed(1)}</span>
        </div>
      )}
      
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-primary/80 backdrop-blur-sm">
        <span className="text-[10px] font-bold text-primary-foreground uppercase">
          {item.mediaType === 'tv' ? 'TV' : 'Movie'}
        </span>
      </div>
    </div>
    
    <div className="mt-2 px-1">
      <h4 className="text-sm font-medium text-foreground truncate">{item.title}</h4>
      {item.year && (
        <p className="text-xs text-muted-foreground">{item.year}</p>
      )}
    </div>
  </button>
);

// Lightweight playlist card - NO framer-motion
const PlaylistCard = ({ channel, onClick, tmdbPoster }: { channel: Channel; onClick?: () => void; tmdbPoster?: string }) => {
  const cleanName = (name: string) => name.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
  const yearMatch = channel.name.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : null;
  const posterUrl = tmdbPoster || channel.logo;

  // Detect language/type badge from group name
  const getBadge = () => {
    const group = (channel.group || '').toLowerCase();
    if (/عربي|arabic|^ar\s|مصر|خليج|مغرب/i.test(channel.group || '')) return { label: 'Arabic', color: 'bg-emerald-500/80' };
    if (/french|français|^fr\s/i.test(group)) return { label: 'French', color: 'bg-blue-500/80' };
    if (/turkish|ترك/i.test(group)) return { label: 'Turkish', color: 'bg-red-500/80' };
    if (/korean|كور/i.test(group)) return { label: 'Korean', color: 'bg-pink-500/80' };
    if (/indian|hindi|bollywood|هند/i.test(group)) return { label: 'Indian', color: 'bg-orange-500/80' };
    if (/german|deutsch/i.test(group)) return { label: 'German', color: 'bg-yellow-600/80' };
    if (/asia/i.test(group)) return { label: 'Asian', color: 'bg-teal-500/80' };
    if (/cartoon|kids|enfants|أطفال|disney|animation|children/i.test(group)) return { label: 'Family', color: 'bg-purple-500/80' };
    if (/english|foreign|^en\s|مترجم|اجنبي|أجنبي|subtitled|vod/i.test(group)) return { label: 'English', color: 'bg-sky-500/80' };
    return { label: 'VOD', color: 'bg-slate-500/80' };
  };
  const badge = getBadge();
  
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-full group relative transition-transform duration-200 hover:scale-105 hover:-translate-y-1 active:scale-[0.98]"
    >
      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-card border border-border/30 relative">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={channel.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
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
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Play className="w-5 h-5 text-primary-foreground fill-current" />
          </div>
        </div>
        
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded ${badge.color} backdrop-blur-sm`}>
          <span className="text-[10px] font-bold text-white uppercase">{badge.label}</span>
        </div>
      </div>
      
      <div className="mt-2 px-1">
        <h4 className="text-sm font-medium text-foreground truncate">{cleanName(channel.name)}</h4>
        {year && <p className="text-xs text-muted-foreground">{year}</p>}
      </div>
    </button>
  );
};

const CategoryRow = ({ 
  title, 
  icon: Icon, 
  items, 
  onSelectItem,
  loading 
}: { 
  title: string; 
  icon: typeof Film;
  items: TMDBItem[]; 
  onSelectItem?: (item: TMDBItem) => void;
  loading?: boolean;
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  
  const visibleItems = items.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  useEffect(() => {
    if (items.length <= ITEMS_PER_PAGE || isPaused) return;
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length, totalPages, isPaused]);

  return (
    <div 
      className="space-y-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        
        {!loading && totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentPage ? 'bg-primary w-4' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 transition-opacity duration-300">
          {visibleItems.map((item) => (
            <MediaCard
              key={`${item.id}-${item.mediaType}-${currentPage}`}
              item={item}
              onClick={() => onSelectItem?.(item)}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground">
          No content available
        </div>
      )}
    </div>
  );
};

const PlaylistRow = ({ 
  title, 
  icon: Icon, 
  channels, 
  onChannelSelect 
}: { 
  title: string; 
  icon: typeof Film;
  channels: Channel[]; 
  onChannelSelect?: (channel: Channel) => void;
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const totalPages = Math.ceil(channels.length / ITEMS_PER_PAGE);
  const { getPosterForChannel } = useTMDBPosters(channels);
  
  const visibleItems = channels.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  useEffect(() => {
    if (channels.length <= ITEMS_PER_PAGE || isPaused) return;
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 5000);
    return () => clearInterval(interval);
  }, [channels.length, totalPages, isPaused]);

  if (channels.length === 0) return null;

  return (
    <div 
      className="space-y-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentPage ? 'bg-primary w-4' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
      
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="grid grid-cols-3 md:grid-cols-6 gap-3"
          >
            {visibleItems.map((channel) => (
              <PlaylistCard
                key={`${channel.id}-${currentPage}`}
                channel={channel}
                tmdbPoster={getPosterForChannel(channel.name)}
                onClick={() => onChannelSelect?.(channel)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export const TMDBBrowseSection = React.memo(({ onSelectItem, channels = [], onChannelSelect }: TMDBBrowseSectionProps) => {
  const { getTrending, getMovies, getTVShows, error } = useTMDB();
  const [trending, setTrending] = useState<TMDBItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBItem[]>([]);
  const [popularTV, setPopularTV] = useState<TMDBItem[]>([]);
  const [loadingState, setLoadingState] = useState({
    trending: true,
    movies: true,
    tv: true,
  });

  // Helper to exclude sports/WWE content
  const isSportsContent = (ch: Channel) => {
    const nameLower = ch.name.toLowerCase();
    const groupLower = ch.group?.toLowerCase() || '';
    return nameLower.includes('wwe') || 
           nameLower.includes('wrestling') ||
           nameLower.includes('sport') ||
           groupLower.includes('sport') ||
           groupLower.includes('wwe');
  };


  // Debug: log unique series/movie group names to understand provider naming
  useEffect(() => {
    if (channels.length === 0) return;
    const seriesGroups = new Set<string>();
    const movieGroups = new Set<string>();
    channels.forEach(ch => {
      if (ch.type === 'series') seriesGroups.add(ch.group || '(none)');
      if (ch.type === 'movies') movieGroups.add(ch.group || '(none)');
    });
    console.log('[TMDBBrowse] Series groups:', [...seriesGroups].sort());
    console.log('[TMDBBrowse] Movie groups:', [...movieGroups].sort());
  }, [channels]);

  // Known Ramadan 2026 Egyptian series titles for name-based matching
  const RAMADAN_2026_KEYWORDS = [
    'قفطان خديجة', 'حالات نادرة', 'الضارية', 'ورد وشوكولاتة', 'كارثة طبيعية',
    'أب ولكن', 'إفراج', 'رأس الأفعى', 'رأس الأفعي',
    'صحاب الأرض', 'أصحاب الأرض', 'كان يا مكان', 'كان ياما كان',
    'فن الحرب', 'كلهم بيحبوا مودي', 'وننسى اللي كان', 'وننسي اللي كان',
    'درش', 'علي كلاي', 'فخر الدلتا', 'على قد الحب',
    'أولاد الراعي', 'الكينج', 'مناعة', 'اتنين غيرنا', 'حكاية نرجس',
    'عين سحرية', 'عرض وطلب', 'توابع', 'اللون الأزرق', 'فرصة أخيرة',
    'النص التاني', 'النص الثاني', 'بيبو', 'حد أقصى',
    'المصيدة', 'السوق الحرة', 'اسأل روحك', 'قطر صغنطوط',
    'الست موناليزا', 'بابا وماما جيران', 'المتر سمير',
    'هي كيميا', 'سوا سوا', 'السرايا الصفراء', 'حق ضايع', 
    'إعلام وراثة', 'روج أسود', 'the voice أحلى صوت',
  ];

  // Ramadan 2026 Egyptian Series — match by group OR by known title names
  const ramadanShows = useMemo(() => {
    const ramadanContent = channels.filter(ch => {
      if (ch.type !== 'series') return false;
      
      const group = ch.group || '';
      const groupLower = group.toLowerCase();
      const nameLower = ch.name.toLowerCase();
      const nameClean = ch.name.trim();

      // Explicit exclusions
      const isExcluded = nameLower.includes('ramadan premiere') || 
                         nameLower.includes('رمضان premiere') ||
                         nameClean.includes('جرس إنذار');
      if (isExcluded) return false;

      // Method 1: Group-based matching (ramadan/egyptian + 2026)
      const isRamadanGroup = group.includes('رمضان') || groupLower.includes('ramadan');
      const isEgyptian = group.includes('مصري') || groupLower.includes('egypt') || group.includes('مصر');
      const has2026 = group.includes('2026');
      
      const groupMatch = (isRamadanGroup && has2026) || (isEgyptian && has2026);
      
      if (groupMatch) {
        // Exclude non-Egyptian regional groups
        const isNonEgyptian = groupLower.includes('خليجي') || groupLower.includes('gulf') ||
                              groupLower.includes('شامي') || groupLower.includes('levant') ||
                              groupLower.includes('مغرب') || groupLower.includes('maghreb') ||
                              groupLower.includes('turkish') || groupLower.includes('تركي');
        if (isNonEgyptian) return false;
        return true;
      }

      // Method 2: Name-based matching — known Ramadan 2026 Egyptian show titles
      const isKnownTitle = RAMADAN_2026_KEYWORDS.some(title => 
        nameClean.includes(title) || nameLower.includes(title.toLowerCase())
      );
      if (isKnownTitle) return true;

      return false;
    });
    
    console.log(`[TMDBBrowse] Ramadan 2026 matches: ${ramadanContent.length}`);
    
    // Deduplicate by name
    const seen = new Set<string>();
    const deduped = ramadanContent.filter(ch => {
      const key = ch.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduped.slice(0, 50);
  }, [channels]);

  const arabicSeries = useMemo(() => {
    // Build a set of Ramadan show names to exclude from this row
    const ramadanNames = new Set(ramadanShows.map(ch => ch.name.trim().toLowerCase()));
    
    const arabicContent = channels.filter(ch => {
      if (ch.type !== 'series') return false;
      // Skip if already in Ramadan row
      if (ramadanNames.has(ch.name.trim().toLowerCase())) return false;
      const group = ch.group || '';
      const groupLower = group.toLowerCase();
      // Skip Ramadan groups
      if (group.includes('رمضان') || groupLower.includes('ramadan')) return false;
      // Broad Arabic detection
      const isArabic = /عرب|مسلسلات|مصر|خليج|سعود|لبنان|سوري|arabic|^ar[\s|:\-]/i.test(group);
      return isArabic && !isSportsContent(ch);
    });
    return arabicContent.sort((a, b) => {
      const groupA = a.group || '';
      const groupB = b.group || '';
      const scoreMap = (g: string) => {
        if (g.includes('2026')) return 3;
        if (g.includes('تعرض حاليا') || g.toLowerCase().includes('now showing')) return 2;
        if (g.includes('2025')) return 1;
        return 0;
      };
      return scoreMap(groupB) - scoreMap(groupA);
    }).slice(0, 30);
  }, [channels]);

  const arabicMovies = useMemo(() => {
    const movieChannels = channels.filter(ch => ch.type === 'movies');
    const arabicContent = movieChannels.filter(ch => {
      const group = ch.group || '';
      const nameLower = ch.name.toLowerCase();
      // Broad Arabic detection
      const isArabicGroup = /عرب|أفلام|مصر|خليج|arabic|^ar[\s|:\-]/i.test(group);
      const isExcluded = nameLower.includes('ramadan premiere') || nameLower.includes('رمضان premiere') || ch.name.includes('جرس إنذار');
      return isArabicGroup && !isSportsContent(ch) && !isExcluded;
    });
    // Sort by actual year (from metadata), then by group year, newest first
    return arabicContent.sort((a, b) => {
      const getYear = (ch: Channel) => {
        if (ch.year) {
          const y = parseInt(ch.year);
          if (!isNaN(y)) return y;
        }
        // Fallback: extract from group name
        const match = ch.group?.match(/20\d{2}/);
        return match ? parseInt(match[0]) : 2000;
      };
      return getYear(b) - getYear(a);
    }).slice(0, 24);
  }, [channels]);


  const familyMovies = useMemo(() => {
    const movieChannels = channels.filter(ch => ch.type === 'movies');
    const content = movieChannels.filter(ch => {
      const group = (ch.group || '').toLowerCase();
      // Pull specifically from Cartoon groups in movies
      const isCartoon = /cartoon|كرتون|رسوم/i.test(group);
      return isCartoon && !isSportsContent(ch);
    });
    // Fallback: if no cartoon group found, try broader family/kids/disney keywords
    if (content.length === 0) {
      const fallback = movieChannels.filter(ch => {
        const group = (ch.group || '').toLowerCase();
        return /family|kids|enfants|أطفال|disney|pixar|animation|children/i.test(group) && !isSportsContent(ch);
      });
      return fallback.slice(0, 30);
    }
    return content.slice(0, 30);
  }, [channels]);

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
    
    const refreshInterval = setInterval(() => {
      loadContent();
    }, 30 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [getTrending, getMovies, getTVShows]);

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
        <p className="text-destructive text-sm">Failed to load content: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Browse Movies & Series</h2>
          <p className="text-sm text-muted-foreground">Discover trending content • Click to view details & trailers</p>
        </div>
      </div>
      
      <div className="space-y-6">
        {ramadanShows.length > 0 && (
          <PlaylistRow title="Ramadan 2026 Series" icon={Moon} channels={ramadanShows} onChannelSelect={onChannelSelect} />
        )}
        
        {arabicSeries.length > 0 && (
          <PlaylistRow title="Top Rated Arabic Series" icon={Tv} channels={arabicSeries} onChannelSelect={onChannelSelect} />
        )}
        
        {arabicMovies.length > 0 && (
          <PlaylistRow title="Latest Arabic Movies" icon={Film} channels={arabicMovies} onChannelSelect={onChannelSelect} />
        )}
        
        <CategoryRow title="Trending Now" icon={TrendingUp} items={trending} onSelectItem={onSelectItem} loading={loadingState.trending} />
        <CategoryRow title="Popular Movies" icon={Film} items={popularMovies} onSelectItem={onSelectItem} loading={loadingState.movies} />
        <CategoryRow title="Popular TV Shows" icon={Tv} items={popularTV} onSelectItem={onSelectItem} loading={loadingState.tv} />
      </div>
    </div>
  );
});
