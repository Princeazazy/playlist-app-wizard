import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Star, Film, Tv, Clock } from 'lucide-react';
import { useTMDB, TMDBItem } from '@/hooks/useTMDB';

interface ScreenSaverProps {
  onDismiss: () => void;
  onSelectItem?: (item: TMDBItem) => void;
}

const SLIDE_DURATION = 8000; // 8 seconds per slide
const TRANSITION_DURATION = 1500; // 1.5s crossfade

export const ScreenSaver: React.FC<ScreenSaverProps> = ({ onDismiss, onSelectItem }) => {
  const [items, setItems] = useState<TMDBItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { getTrending } = useTMDB();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadedRef = useRef(false);

  // Fetch content on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const loadContent = async () => {
      try {
        // Fetch trending content from TMDB
        const trending = await fetchTMDB('trending', { category: 'all', page: 1 });
        
        // Filter to items with backdrops for cinematic display
        const withBackdrops = (trending || []).filter(
          (item: TMDBItem) => item.backdrop && item.title
        );

        // Shuffle for variety
        const shuffled = withBackdrops.sort(() => Math.random() - 0.5);
        setItems(shuffled.slice(0, 20)); // Keep 20 items max
      } catch (e) {
        console.error('Screensaver: failed to load content', e);
      }
    };

    loadContent();
  }, [fetchTMDB]);

  // Auto-cycle slides
  useEffect(() => {
    if (items.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % items.length);
        setIsTransitioning(false);
      }, TRANSITION_DURATION);
    }, SLIDE_DURATION);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [items.length]);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Dismiss on any interaction
  useEffect(() => {
    const handleInteraction = (e: Event) => {
      // Small delay to prevent the click from propagating
      e.preventDefault();
      e.stopPropagation();
      onDismiss();
    };

    const events = ['mousedown', 'touchstart', 'keydown', 'wheel'];
    // Use a slight delay before attaching listeners to avoid instant dismiss
    const timer = setTimeout(() => {
      events.forEach(ev => window.addEventListener(ev, handleInteraction, { passive: false, capture: true }));
    }, 500);

    return () => {
      clearTimeout(timer);
      events.forEach(ev => window.removeEventListener(ev, handleInteraction, true));
    };
  }, [onDismiss]);

  if (items.length === 0) {
    // Minimal clock screensaver while loading
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center cursor-none">
        <div className="text-center">
          <p className="text-7xl font-thin text-white/90 tracking-widest">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-lg text-white/40 mt-4 tracking-wide">
            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    );
  }

  const current = items[currentIndex];
  const next = items[(currentIndex + 1) % items.length];

  return (
    <div className="fixed inset-0 z-[9999] bg-black cursor-none overflow-hidden">
      {/* Background image with Ken Burns effect */}
      <div className="absolute inset-0">
        {/* Current slide */}
        <div
          className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <img
            src={current.backdrop!}
            alt={current.title}
            className="w-full h-full object-cover animate-screensaver-zoom"
            key={`bg-${currentIndex}`}
          />
        </div>

        {/* Next slide (pre-loaded, fades in during transition) */}
        <div
          className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
            isTransitioning ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={next.backdrop!}
            alt={next.title}
            className="w-full h-full object-cover"
            key={`bg-next-${(currentIndex + 1) % items.length}`}
          />
        </div>
      </div>

      {/* Cinematic gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />

      {/* Subtle vignette */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)'
      }} />

      {/* Content info - bottom left */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-8 md:p-12 transition-all duration-[1500ms] ease-in-out ${
          isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Media type badge */}
        <div className="flex items-center gap-2 mb-3">
          {current.mediaType === 'tv' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
              <Tv className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-white/80">TV Series</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
              <Film className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-white/80">Movie</span>
            </div>
          )}
          {current.year && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
              <span className="text-xs font-medium text-white/60">{current.year}</span>
            </div>
          )}
          {current.rating && current.rating > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-500/20">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold text-amber-300">{current.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-3 max-w-3xl leading-tight drop-shadow-lg">
          {current.title}
        </h1>

        {/* Overview */}
        {current.overview && (
          <p className="text-sm md:text-base text-white/60 max-w-2xl line-clamp-2 leading-relaxed mb-6">
            {current.overview}
          </p>
        )}

        {/* Play button hint */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15">
            <Play className="w-4 h-4 text-white/70 fill-white/70" />
            <span className="text-sm text-white/70 font-medium">Press any key to continue</span>
          </div>
        </div>
      </div>

      {/* Clock - top right */}
      <div className="absolute top-6 right-8 text-right">
        <p className="text-4xl md:text-5xl font-thin text-white/80 tracking-wider drop-shadow-lg">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-sm text-white/40 mt-1 tracking-wide">
          {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
      </div>

      {/* Slide indicator dots */}
      <div className="absolute bottom-6 right-8 flex items-center gap-1.5">
        {items.slice(0, Math.min(items.length, 10)).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-500 ${
              i === currentIndex % Math.min(items.length, 10)
                ? 'w-6 h-1.5 bg-primary'
                : 'w-1.5 h-1.5 bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
