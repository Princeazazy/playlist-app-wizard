import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Star, Film, Tv, X } from 'lucide-react';
import { useTMDB, TMDBItem } from '@/hooks/useTMDB';

interface ScreenSaverProps {
  onDismiss: () => void;
  onSelectItem?: (item: TMDBItem) => void;
}

const SLIDE_DURATION = 8000;
const TRANSITION_DURATION = 1500;

// Asian language codes to exclude
const EXCLUDED_LANGUAGES = new Set([
  'ja', 'ko', 'zh', 'th', 'vi', 'id', 'ms', 'tl', 'hi', 'ta', 'te', 'ml', 'kn', 'bn',
]);

// Upgrade backdrop URL to original (4K) resolution
const toOriginalBackdrop = (url: string) =>
  url.replace('/w780/', '/original/').replace('/w1280/', '/original/');

// Preload an image and resolve when ready
const preloadImage = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject();
    img.src = src;
  });

export const ScreenSaver: React.FC<ScreenSaverProps> = ({ onDismiss, onSelectItem }) => {
  const [items, setItems] = useState<TMDBItem[]>([]);
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

  // Load and filter content, preload first two images before showing
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const loadContent = async () => {
      try {
        const trending = await getTrending(1);

        const filtered = (trending || []).filter((item: TMDBItem) => {
          if (!item.backdrop || !item.title) return false;
          // Exclude Asian content by checking original_language via genre heuristic
          // TMDB trending includes original_language but our type doesn't expose it,
          // so we filter by title characters (CJK, Hangul, Thai, Devanagari, etc.)
          const title = item.title;
          if (/[\u3000-\u9FFF\uAC00-\uD7AF\u0E00-\u0E7F\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F]/.test(title)) {
            return false;
          }
          return true;
        });

        if (filtered.length === 0) {
          onDismiss();
          return;
        }

        // Upgrade all backdrops to original/4K
        const upgraded = filtered.map((item) => ({
          ...item,
          backdrop: toOriginalBackdrop(item.backdrop!),
        }));

        const shuffled = [...upgraded].sort(() => Math.random() - 0.5).slice(0, 20);

        // Preload first two images before revealing
        try {
          await Promise.all(shuffled.slice(0, 2).map((item) => preloadImage(item.backdrop!)));
        } catch {
          // Still show even if preload partially fails
        }

        setItems(shuffled);
        setIsReady(true);

        // Small delay then fade in content smoothly
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setContentVisible(true);
          });
        });
      } catch (e) {
        console.error('Screensaver: failed to load content', e);
        onDismiss();
      }
    };

    loadContent();
  }, [getTrending, onDismiss]);

  // Preload upcoming slide
  useEffect(() => {
    if (!isReady || items.length <= 1) return;
    const nextIdx = (currentIndex + 1) % items.length;
    const nextNext = (currentIndex + 2) % items.length;
    // Preload next two slides in background
    preloadImage(items[nextIdx].backdrop!).catch(() => {});
    preloadImage(items[nextNext].backdrop!).catch(() => {});
  }, [currentIndex, isReady, items]);

  // Auto-cycle slides
  useEffect(() => {
    if (!isReady || items.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setIsTransitioning(true);
      window.setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setIsTransitioning(false);
      }, TRANSITION_DURATION);
    }, SLIDE_DURATION);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
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

  if (!isReady || items.length === 0) {
    return null;
  }

  const current = items[currentIndex];
  const next = items[(currentIndex + 1) % items.length];

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
      {/* Background images with crossfade */}
      <div className="absolute inset-0">
        <div
          className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <img
            src={current.backdrop!}
            alt={current.title}
            className="h-full w-full animate-screensaver-zoom object-cover"
            key={`bg-${currentIndex}`}
          />
        </div>

        <div
          className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
            isTransitioning ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={next.backdrop!}
            alt={next.title}
            className="h-full w-full object-cover"
            key={`bg-next-${(currentIndex + 1) % items.length}`}
          />
        </div>
      </div>

      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      <div className="absolute left-0 right-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)' }}
      />

      {/* Exit button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="absolute right-6 top-6 z-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-opacity duration-500"
      >
        <X className="h-4 w-4" />
        Exit
      </button>

      {/* Content info — synced fade with image */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-8 transition-all duration-[1500ms] ease-in-out md:p-12 ${
          isTransitioning ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="mb-3 flex items-center gap-2">
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
            <div className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/20 px-3 py-1 backdrop-blur-sm">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">{current.rating.toFixed(1)}</span>
            </div>
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem?.(current);
              handleDismiss();
            }}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-medium text-white/80 backdrop-blur-md transition-colors hover:bg-white/20"
          >
            <Play className="h-4 w-4 fill-white/70 text-white/70" />
            Open details
          </button>
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
              i === currentIndex % Math.min(items.length, 10)
                ? 'h-1.5 w-6 bg-primary'
                : 'h-1.5 w-1.5 bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
