import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Star, Film, Tv, X } from 'lucide-react';
import { useTMDB, TMDBItem } from '@/hooks/useTMDB';
import { Channel } from '@/hooks/useIPTV';
import { RatingBadge } from '@/components/shared/RatingBadge';

interface ScreenSaverItem {
  id: string;
  title: string;
  backdrop: string;
  overview?: string;
  rating?: number;
  year?: string;
  mediaType: 'movie' | 'tv';
  source: 'tmdb' | 'provider';
  tmdbItem?: TMDBItem;
}

interface ScreenSaverProps {
  onDismiss: () => void;
  onSelectItem?: (item: TMDBItem) => void;
  channels?: Channel[];
}

const SLIDE_DURATION = 8000;
const TRANSITION_DURATION = 1500;

// Languages to EXCLUDE from screensaver
const EXCLUDED_LANGUAGES = new Set([
  'ja', 'ko', 'zh', 'th', 'vi', 'id', 'ms', 'tl',
  'hi', 'ta', 'te', 'ml', 'kn', 'bn', 'mr', 'pa',
  'cn',
]);

const toOriginalBackdrop = (url: string) =>
  url.replace('/w780/', '/original/').replace('/w1280/', '/original/');

const preloadImage = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject();
    img.src = src;
  });

// Check if a channel is Arabic Ramadan 2026 or latest Arabic content
const isRamadan2026 = (ch: Channel): boolean => {
  const group = (ch.group || '').toLowerCase();
  const name = (ch.name || '').toLowerCase();
  return (
    (group.includes('ramadan') || group.includes('رمضان')) &&
    (group.includes('26') || group.includes('2026') || name.includes('2026'))
  );
};

const isLatestArabic = (ch: Channel): boolean => {
  const group = (ch.group || '').toLowerCase();
  const name = (ch.name || '');
  // Must have Arabic characters in name
  const hasArabic = /[\u0600-\u06FF]/.test(name);
  if (!hasArabic) return false;
  // Check for Arabic movie/series groups
  const arabicKeywords = ['عربي', 'arabic', 'مصر', 'egypt', 'مغرب', 'جزائر'];
  const isArabicGroup = arabicKeywords.some((kw) => group.includes(kw));
  // Check year
  const recentYear = /202[4-6]/.test(group) || /202[4-6]/.test(name);
  return isArabicGroup || recentYear;
};

// Exclusion list
const EXCLUDED_TITLES = [
  'ramadan premiere', 'بريميير رمضان', 'جرس إنذار',
  'المداح', 'سواها البخت', 'روضة القرآن', 'قصص الأنبياء',
  'الذراري الحمر',
];

const isExcludedTitle = (name: string): boolean => {
  const lower = name.toLowerCase();
  return EXCLUDED_TITLES.some((t) => lower.includes(t.toLowerCase()));
};

// Clean provider title: remove prefixes/suffixes like "AR -", "- AR", "TAR", etc.
const cleanProviderTitle = (name: string): string => {
  return name
    .replace(/^\s*[A-Z]{2,4}\s*[:\-|]+\s*/i, '')   // Leading "AR -", "TAR |"
    .replace(/\s*[:\-|]+\s*[A-Z]{2,4}\s*$/i, '')    // Trailing "- AR", "- TAR"
    .replace(/\bTAR\b/gi, '')                         // "TAR" anywhere
    .replace(/\bAR\b/gi, '')                          // "AR" anywhere  
    .replace(/\s*[-|:]+\s*$/g, '')                    // Leftover trailing separators
    .replace(/^\s*[-|:]+\s*/g, '')                    // Leftover leading separators
    .replace(/\s+/g, ' ')
    .trim();
};

export const ScreenSaver: React.FC<ScreenSaverProps> = ({ onDismiss, onSelectItem, channels = [] }) => {
  const [items, setItems] = useState<ScreenSaverItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isReady, setIsReady] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const { getTrending } = useTMDB();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadedRef = useRef(false);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const loadContent = async () => {
      try {
        // 1. Fetch TMDB trending (filtered)
        const trending = await getTrending(1);
        const tmdbFiltered = (trending || []).filter((item: TMDBItem) => {
          if (!item.backdrop || !item.title) return false;
          // Filter by original_language
          if (item.originalLanguage && EXCLUDED_LANGUAGES.has(item.originalLanguage)) return false;
          // Also filter by title characters as safety net
          if (/[\u3000-\u9FFF\uAC00-\uD7AF\u0E00-\u0E7F\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F]/.test(item.title)) return false;
          return true;
        });

        const tmdbItems: ScreenSaverItem[] = tmdbFiltered.map((item) => ({
          id: `tmdb-${item.id}`,
          title: item.title,
          backdrop: toOriginalBackdrop(item.backdrop!),
          overview: item.overview,
          rating: item.rating,
          year: item.year,
          mediaType: item.mediaType,
          source: 'tmdb' as const,
          tmdbItem: item,
        }));

        // 2. Get Ramadan 2026 + latest Arabic from provider channels
        const arabicProviderItems: ScreenSaverItem[] = [];
        const seenNames = new Set<string>();

        const eligibleChannels = channels.filter((ch) => {
          // ONLY use channels with a real landscape backdrop — never posters/logos
          if (!ch.backdrop_path || isExcludedTitle(ch.name)) return false;
          if (ch.type !== 'series' && ch.type !== 'movies') return false;
          if (/\bTAR\b/i.test(ch.name)) return false;
          if (/مترجم/i.test(ch.name)) return false;
          if (/dubbed|dub\b/i.test(ch.name)) return false;
          return isRamadan2026(ch) || isLatestArabic(ch);
        });

        // Take up to 8 Arabic/Ramadan items
        for (const ch of eligibleChannels.slice(0, 8)) {
          const normalName = ch.name.trim().toLowerCase();
          if (seenNames.has(normalName)) continue;
          seenNames.add(normalName);

          const backdrop = Array.isArray(ch.backdrop_path) ? ch.backdrop_path[0] : ch.backdrop_path;
          if (!backdrop) continue;

          arabicProviderItems.push({
            id: `provider-${ch.id}`,
            title: cleanProviderTitle(ch.name),
            backdrop,
            overview: ch.plot,
            rating: ch.rating ? parseFloat(String(ch.rating)) : undefined,
            year: ch.year,
            mediaType: ch.type === 'series' ? 'tv' : 'movie',
            source: 'provider',
          });
        }

        // 3. Merge: alternate TMDB and Arabic content
        const merged: ScreenSaverItem[] = [];
        const tmdbPool = [...tmdbItems].sort(() => Math.random() - 0.5);
        const arabicPool = [...arabicProviderItems].sort(() => Math.random() - 0.5);

        let ti = 0;
        let ai = 0;
        // Pattern: 2 TMDB, 1 Arabic, repeat
        while (merged.length < 20 && (ti < tmdbPool.length || ai < arabicPool.length)) {
          if (ti < tmdbPool.length) merged.push(tmdbPool[ti++]);
          if (ti < tmdbPool.length) merged.push(tmdbPool[ti++]);
          if (ai < arabicPool.length) merged.push(arabicPool[ai++]);
        }

        if (merged.length === 0) {
          onDismiss();
          return;
        }

        // Preload first two
        try {
          await Promise.all(merged.slice(0, 2).map((item) => preloadImage(item.backdrop)));
        } catch { /* still show */ }

        setItems(merged);
        setIsReady(true);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => setContentVisible(true));
        });
      } catch (e) {
        console.error('Screensaver: failed to load content', e);
        onDismiss();
      }
    };

    loadContent();
  }, [getTrending, onDismiss, channels]);

  // Preload upcoming slides
  useEffect(() => {
    if (!isReady || items.length <= 1) return;
    const next1 = (currentIndex + 1) % items.length;
    const next2 = (currentIndex + 2) % items.length;
    preloadImage(items[next1].backdrop).catch(() => {});
    preloadImage(items[next2].backdrop).catch(() => {});
  }, [currentIndex, isReady, items]);

  // Auto-cycle — fade out text+image together, swap index, fade in together
  useEffect(() => {
    if (!isReady || items.length <= 1) return;
    intervalRef.current = setInterval(() => {
      // Start fading out current slide (image + text together)
      setIsTransitioning(true);
      // After fade-out completes, swap to next slide and fade in
      window.setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        // Small delay to let the new image/text render before fading in
        requestAnimationFrame(() => {
          setIsTransitioning(false);
        });
      }, TRANSITION_DURATION);
    }, SLIDE_DURATION);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isReady, items.length]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Dismiss on interaction
  useEffect(() => {
    if (!isReady) return;
    const handleInteraction = () => handleDismiss();
    const events = ['mousedown', 'touchstart', 'keydown', 'wheel'];
    const timer = window.setTimeout(() => {
      events.forEach((ev) => window.addEventListener(ev, handleInteraction, { passive: true, capture: true }));
    }, 300);
    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, handleInteraction, true));
    };
  }, [handleDismiss, isReady]);

  if (!isReady || items.length === 0) return null;

  const current = items[currentIndex];

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-black transition-opacity duration-[800ms] ease-out ${
        contentVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleDismiss}
      role="button"
      tabIndex={0}
      onKeyDown={handleDismiss}
      aria-label="Dismiss screensaver"
    >
      {/* Background image — fades out/in together with text */}
      <div className="absolute inset-0">
        <div
          className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <img
            src={current.backdrop}
            alt={current.title}
            className="h-full w-full object-cover animate-screensaver-zoom"
            key={`bg-${currentIndex}`}
          />
        </div>
      </div>

      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      <div className="absolute left-0 right-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)' }} />

      {/* Exit button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
        className="absolute right-6 top-6 z-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-opacity duration-500"
      >
        <X className="h-4 w-4" />
        Exit
      </button>

      {/* Content info */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-8 transition-all duration-[1500ms] ease-in-out md:p-12 ${
          isTransitioning ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="mb-3 flex items-center gap-2">
          {current.source === 'provider' && (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 backdrop-blur-sm">
              <span className="text-xs font-semibold text-emerald-300">ARABIC</span>
            </div>
          )}
          {current.mediaType === 'tv' ? (
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 backdrop-blur-sm">
              <Tv className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-white/80">TV Series</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 backdrop-blur-sm">
              <Film className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-white/80">Movie</span>
            </div>
          )}
          {current.year && (
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 backdrop-blur-sm">
              <span className="text-xs font-medium text-white/60">{current.year}</span>
            </div>
          )}
          {current.rating && current.rating > 0 && (
            <RatingBadge
              title={current.title}
              year={current.year}
              mediaType={current.mediaType}
              fallbackRating={current.rating}
              size="md"
              showSource
            />
          )}
        </div>

        <h1 className="mb-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
          {current.title}
        </h1>

        {current.overview && (
          <p className="mb-6 max-w-2xl line-clamp-2 text-sm leading-relaxed text-white/60 md:text-base">
            {current.overview}
          </p>
        )}

        <div className="flex items-center gap-3">
          {current.tmdbItem && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem?.(current.tmdbItem!);
                handleDismiss();
              }}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-medium text-white/80 backdrop-blur-md transition-colors hover:bg-white/20"
            >
              <Play className="h-4 w-4 fill-white/70 text-white/70" />
              Open details
            </button>
          )}
          <span className="text-sm text-white/40">Tap anywhere to exit</span>
        </div>
      </div>

      {/* Clock */}
      <div className="absolute right-8 top-6 text-right">
        <p className="text-4xl font-thin tracking-wider text-white/80 drop-shadow-lg md:text-5xl">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="mt-1 text-sm tracking-wide text-white/40">
          {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-6 right-8 flex items-center gap-1.5">
        {items.slice(0, Math.min(items.length, 10)).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-500 ${
              i === currentIndex % Math.min(items.length, 10) ? 'h-1.5 w-6 bg-primary' : 'h-1.5 w-1.5 bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
