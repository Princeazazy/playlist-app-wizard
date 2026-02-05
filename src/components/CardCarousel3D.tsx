import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Play, Star, ChevronLeft, ChevronRight, Film, Tv } from 'lucide-react';
import { TMDBItem } from '@/hooks/useTMDB';

interface CardCarousel3DProps {
  items: TMDBItem[];
  onSelect: (item: TMDBItem) => void;
  loading?: boolean;
}

export const CardCarousel3D = ({ items, onSelect, loading }: CardCarousel3DProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);

  // Auto-cycle through items
  useEffect(() => {
    if (isPaused || items.length <= 1 || loading) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [items.length, isPaused, loading]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    } else if (info.offset.x < -threshold && activeIndex < items.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
    dragX.set(0);
  };

  const goToIndex = (index: number) => {
    setActiveIndex(Math.max(0, Math.min(items.length - 1, index)));
  };

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) return null;

  const activeItem = items[activeIndex];

  // Get visible cards (2 on each side + center)
  const getCardStyle = (index: number) => {
    const diff = index - activeIndex;
    const absIndex = Math.abs(diff);
    
    // Only show 5 cards max (2 on each side + center)
    if (absIndex > 2) return { display: 'none' };
    
    const xOffset = diff * 120;
    const scale = 1 - absIndex * 0.15;
    const zIndex = 10 - absIndex;
    const opacity = 1 - absIndex * 0.3;
    const rotateY = diff * -8;
    
    return {
      x: xOffset,
      scale,
      zIndex,
      opacity,
      rotateY,
    };
  };

  // Format runtime
  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  return (
    <div 
      className="relative select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Card Stack */}
      <div 
        ref={containerRef}
        className="relative h-[340px] flex items-center justify-center perspective-1000 overflow-visible"
        style={{ perspective: '1000px' }}
      >
        <motion.div
          className="relative w-full h-full flex items-center justify-center"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          style={{ x: dragX }}
        >
          {items.map((item, index) => {
            const cardStyle = getCardStyle(index);
            if (cardStyle.display === 'none') return null;
            
            return (
              <motion.div
                key={`${item.id}-${item.mediaType}`}
                className="absolute cursor-pointer"
                initial={false}
                animate={{
                  x: cardStyle.x,
                  scale: cardStyle.scale,
                  opacity: cardStyle.opacity,
                  rotateY: cardStyle.rotateY,
                }}
                transition={{ 
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
                style={{ 
                  zIndex: cardStyle.zIndex,
                  transformStyle: 'preserve-3d',
                }}
                onClick={() => {
                  if (index === activeIndex) {
                    onSelect(item);
                  } else {
                    goToIndex(index);
                  }
                }}
              >
                <div className={`
                  w-[200px] h-[300px] rounded-3xl overflow-hidden 
                  ${index === activeIndex ? 'ring-2 ring-primary/50 shadow-2xl shadow-primary/20' : 'shadow-xl'}
                  transition-shadow duration-300
                `}>
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full bg-card flex items-center justify-center">
                      {item.mediaType === 'tv' ? (
                        <Tv className="w-12 h-12 text-muted-foreground" />
                      ) : (
                        <Film className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  
                  {/* Play button overlay for active card */}
                  {index === activeIndex && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-4 opacity-0 hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                        <Play className="w-6 h-6 text-primary-foreground fill-current ml-1" />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Navigation Arrows */}
        <button
          onClick={() => goToIndex(activeIndex - 1)}
          className="absolute left-4 z-20 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/30 flex items-center justify-center hover:bg-background transition-colors disabled:opacity-50"
          disabled={activeIndex === 0}
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={() => goToIndex(activeIndex + 1)}
          className="absolute right-4 z-20 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/30 flex items-center justify-center hover:bg-background transition-colors disabled:opacity-50"
          disabled={activeIndex === items.length - 1}
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Active Item Info */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeItem.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="text-center mt-4 px-4"
        >
          <p className="text-muted-foreground text-sm">{activeItem.year}</p>
          <h3 className="text-xl font-bold text-foreground mt-1 truncate">{activeItem.title}</h3>
          
          {/* Metadata badges */}
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            {activeItem.mediaType && (
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium capitalize">
                {activeItem.mediaType === 'tv' ? 'TV Series' : 'Movie'}
              </span>
            )}
            {activeItem.rating && activeItem.rating > 0 && (
              <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-medium flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                {activeItem.rating.toFixed(1)}
              </span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {items.slice(0, Math.min(items.length, 10)).map((_, index) => (
          <button
            key={index}
            onClick={() => goToIndex(index)}
            className={`h-2 rounded-full transition-all ${
              index === activeIndex 
                ? 'w-6 bg-primary' 
                : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
          />
        ))}
        {items.length > 10 && (
          <span className="text-xs text-muted-foreground ml-1">+{items.length - 10}</span>
        )}
      </div>
    </div>
  );
};
