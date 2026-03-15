import React, { useState, useEffect, useMemo } from 'react';

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
const MIN_ITEMS_TO_SHOW_ROW = 3;

const containsArabicText = (text: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);

const getFilledPageItems = <T,>(items: T[], currentPage: number, pageSize: number): T[] => {
  if (items.length === 0) return [];

  const maxItems = items.length < pageSize ? items.length : pageSize;
  const start = currentPage * pageSize;

  return Array.from({ length: maxItems }, (_, index) => items[(start + index) % items.length]);
};

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
          onError={(e) => {
            const target = e.currentTarget;
            if (target.dataset.fallbackApplied !== '1') {
              target.dataset.fallbackApplied = '1';
              target.src = '/placeholder.svg';
            } else {
              target.style.display = 'none';
            }
          }}
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
  // PRIORITY: Provider's original artwork first, TMDB as fallback only
  const posterUrl = channel.logo || tmdbPoster;

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
              const target = e.currentTarget;
              if (tmdbPoster && channel.logo && target.src !== channel.logo) {
                target.src = channel.logo;
              } else if (target.dataset.fallbackApplied !== '1') {
                target.dataset.fallbackApplied = '1';
                target.src = '/placeholder.svg';
              } else {
                target.style.display = 'none';
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

  const visibleItems = getFilledPageItems(items, currentPage, ITEMS_PER_PAGE);

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
      ) : items.length >= MIN_ITEMS_TO_SHOW_ROW ? (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 transition-opacity duration-300">
          {visibleItems.map((item, index) => (
            <MediaCard
              key={`${item.id}-${item.mediaType}-${currentPage}-${index}`}
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

  const visibleItems = getFilledPageItems(channels, currentPage, ITEMS_PER_PAGE);

  useEffect(() => {
    if (channels.length <= ITEMS_PER_PAGE || isPaused) return;

    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 5000);

    return () => clearInterval(interval);
  }, [channels.length, totalPages, isPaused]);

  if (channels.length < MIN_ITEMS_TO_SHOW_ROW) return null;

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
      
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 transition-opacity duration-300">
        {visibleItems.map((channel, index) => (
          <PlaylistCard
            key={`${channel.id}-${currentPage}-${index}`}
            channel={channel}
            tmdbPoster={getPosterForChannel(channel.name)}
            onClick={() => onChannelSelect?.(channel)}
          />
        ))}
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

  // Ramadan 2026 Egyptian Series — ONLY from groups explicitly containing رمضان/ramadan + 2026 + مصري/egyptian
  const ramadanShows = useMemo(() => {
    const ramadanContent = channels.filter(ch => {
      if (ch.type !== 'series') return false;
      
      const group = ch.group || '';
      const groupLower = group.toLowerCase();

      // STRICT: Match "SRS | RAMADAN EGYPT 26" pattern
      // Group must contain "ramadan" AND "egypt" AND ("26" or "2026")
      const isRamadan = groupLower.includes('ramadan') || group.includes('رمضان');
      const isEgyptian = groupLower.includes('egypt') || group.includes('مصر') || group.includes('مصري');
      const is2026 = /\b26\b/.test(group) || group.includes('2026');
      
      if (!(isRamadan && isEgyptian && is2026)) return false;

      // Exclude non-Egyptian groups
      if (/khaliji|خليجي|sham|شامي|maghreb|مغرب|turkish|تركي/i.test(group)) return false;

      // Exclude animated/kids/cartoon content
      const nameLower = ch.name.toLowerCase();
      const combinedText = nameLower + ' ' + groupLower;
      if (/cartoon|كرتون|رسوم|animat|أطفال|kids|children|طيور الجنة|سبيس تون|spacetoon|disney|سعود وسارة|روضة القرآن|قصص الأنبياء|قصص القران|حكايات|مغامرات.*للأطفال|براعم|جنى|كراميش|toyor|baby|junior|nick|cn |boomerang|قناة ماجد|majid|مرح|قصص اطفال|نون|noon kids|baraem|jeem|jeemtv/i.test(combinedText)) return false;

      // Blacklist specific titles
      const titleBlacklist = [
        'هكذا اسماء الله الحسنى', 'hakatha asmaa', 'كابتن شديد', 'captain shedeed',
        'أنس ai', 'انس ai', 'الضحايا', 'عائلة مصرية جدا', 'إثبات نسب', 'اثبات نسب',
        'آدم ج2', 'ادم ج2', 'adam ج2', 'وادي ميسان', 'wadi maysan',
        'انا وهو وهم', 'أنا وهو وهم', 'me him & them', 'me him and them',
        'إعلام وراثة', 'اعلام وراثة', 'المصيدة'
      ];
      if (titleBlacklist.some(t => nameLower.includes(t.toLowerCase()))) return false;

      return true;
    });
    
    console.log(`[TMDBBrowse] Ramadan 2026 Egyptian matches: ${ramadanContent.length}`);
    
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

      const name = ch.name || '';
      const nameLower = name.toLowerCase();
      const group = ch.group || '';
      const groupLower = group.toLowerCase();

      // Skip if already in Ramadan row
      if (ramadanNames.has(name.trim().toLowerCase())) return false;

      // Skip Ramadan groups
      if (group.includes('رمضان') || groupLower.includes('ramadan')) return false;

      // Must be Arabic-tagged group
      const isArabicGroup = /عرب|مسلسلات|مصر|خليج|سعود|لبنان|سوري|arabic|^ar[\s|:\-]/i.test(group);
      if (!isArabicGroup) return false;

      // Remove obvious non-Arabic/subbed entries
      if (/\bsubs?\b|subbed|subtitle|vostfr|english|eng\b|foreign/i.test(nameLower)) return false;

      // Exclude sports and kids/cartoon content
      if (isSportsContent(ch)) return false;
      if (/cartoon|كرتون|رسوم|animat|kids|children|disney|pixar|cuphead/i.test(`${nameLower} ${groupLower}`)) return false;

      // STRICT: Title itself must contain Arabic script to avoid English titles in Arabic groups
      const cleanedName = name.replace(/^\s*[A-Z]{2,4}\s*[:\-|]\s*/i, '').replace(/^\s*subs?\s*[:\-|]?\s*/i, '').trim();
      if (!containsArabicText(cleanedName)) return false;

      return true;
    });

    return arabicContent
      .sort((a, b) => {
        const groupA = a.group || '';
        const groupB = b.group || '';
        const scoreMap = (g: string) => {
          if (g.includes('2026')) return 3;
          if (g.includes('تعرض حاليا') || g.toLowerCase().includes('now showing')) return 2;
          if (g.includes('2025')) return 1;
          return 0;
        };
        return scoreMap(groupB) - scoreMap(groupA);
      })
      .slice(0, 30);
  }, [channels, ramadanShows]);

  const arabicMovies = useMemo(() => {
    
    const movieChannels = channels.filter(ch => ch.type === 'movies');
    const arabicContent = movieChannels.filter(ch => {
      const group = ch.group || '';
      const name = ch.name;
      const nameLower = name.toLowerCase();
      
      // Group must be Arabic-tagged
      const isArabicGroup = /عرب|أفلام|مصر|خليج|arabic|^ar[\s|:\-]/i.test(group);
      if (!isArabicGroup) return false;
      
      // Exclude known bad content
      const isExcluded = nameLower.includes('ramadan premiere') || nameLower.includes('رمضان premiere') || name.includes('جرس إنذار');
      if (isExcluded) return false;
      
      // Exclude sports/wrestling
      if (isSportsContent(ch)) return false;
      
      // Exclude cartoons/animated content
      if (/cartoon|كرتون|رسوم|animat|cuphead|مغامرات كوكو|disney|pixar|dreamworks/i.test(nameLower + ' ' + group.toLowerCase())) return false;
      
      // STRICT: The movie name itself must contain Arabic text OR be from a specific Arab country group
      // This prevents English movies tagged in Arabic groups from appearing
      const hasArabicInName = containsArabicText(name);
      const isCountrySpecificGroup = /مصر|egypt|خليج|gulf|مغرب|morocco|جزائر|algeria|سعود|saudi|لبنان|leban|سوري|syria|عراق|iraq|تونس|tunis/i.test(group);
      
      if (!hasArabicInName && !isCountrySpecificGroup) {
        // Pure English/Latin name in a generic "Arabic" group — likely not Arabic content
        // Allow only if the cleaned name is very short (likely transliterated)
        const cleanedName = name.replace(/^\s*[A-Z]{2,3}\s*[:\-|]\s*/i, '').trim();
        if (cleanedName.length > 3 && !/[:\-|]/.test(cleanedName)) return false;
      }
      
      // Exclude content older than 2010
      const yearMatch = (ch.year || group).match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        const y = parseInt(yearMatch[0]);
        if (y < 2010) return false;
      }
      
      return true;
    });
    
    // Sort newest first
    return arabicContent.sort((a, b) => {
      const getYear = (ch: Channel) => {
        if (ch.year) {
          const y = parseInt(ch.year);
          if (!isNaN(y)) return y;
        }
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
