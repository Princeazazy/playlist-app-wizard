import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Film, Clapperboard, Trophy, TrendingUp, Play, Zap, Globe, Music, Gamepad2, Baby, Newspaper } from 'lucide-react';

import { getRecentLastPlayed } from '@/hooks/useWatchProgress';

interface HomeBottomBarProps {
  channelCount: number;
  movieCount: number;
  seriesCount: number;
  sportsCount: number;
  loading?: boolean;
  onCategoryClick?: (category: string) => void;
  currentlyPlaying?: {
    name: string;
    category: string;
  } | null;
  onResumeClick?: () => void;
}

// Animated counter component
const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    
    const startTime = Date.now();
    const startValue = 0;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (value - startValue) * easeOut);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
};

// Category pill component
const CategoryPill = ({ 
  icon: Icon, 
  label, 
  color,
  onClick,
  delay 
}: { 
  icon: typeof Tv; 
  label: string; 
  color: string;
  onClick?: () => void;
  delay: number;
}) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay * 0.1, duration: 0.4 }}
    whileHover={{ scale: 1.05, y: -2 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border border-border/30 transition-all"
    style={{
      background: `linear-gradient(135deg, ${color}20, ${color}10)`,
      boxShadow: `0 0 20px ${color}10`,
    }}
  >
    <Icon className="w-4 h-4" style={{ color }} />
    <span className="text-sm font-medium text-foreground/90">{label}</span>
  </motion.button>
);

// Trending ticker items
const trendingItems = [
  { icon: '🔴', text: 'LIVE: Premier League - Man City vs Arsenal' },
  { icon: '🎬', text: 'Trending: New Releases This Week' },
  { icon: '📺', text: 'Popular: Arabic Drama Series' },
  { icon: '⚽', text: 'Coming Up: Champions League Finals' },
  { icon: '🎭', text: 'Hot: Turkish Series Marathon' },
  { icon: '🏆', text: 'LIVE: NBA Playoffs' },
  { icon: '🎵', text: 'Music: Top Arabic Hits Channel' },
  { icon: '📰', text: 'Breaking: Al Jazeera Live Coverage' },
];

export const HomeBottomBar = ({
  channelCount,
  movieCount,
  seriesCount,
  sportsCount,
  loading,
  onCategoryClick,
  currentlyPlaying,
  onResumeClick,
}: HomeBottomBarProps) => {
  const [updateKey, setUpdateKey] = useState(0);

  // Generate trending items from real watch history
  const trendingItems = useMemo(() => {
    const recentItems = getRecentLastPlayed(8);
    if (recentItems.length === 0) {
      return [
        { icon: '📺', text: 'Start watching to see your trending content' },
        { icon: '🎬', text: 'Browse movies and series' },
        { icon: '⚽', text: 'Check out Sports Guide' },
      ];
    }
    
    return recentItems.map(item => {
      const icon = item.contentType === 'movie' ? '🎬' : 
                   item.contentType === 'series' ? '📺' : 
                   item.contentType === 'sports' ? '⚽' : '🔴';
      const prefix = item.contentType === 'live' || item.contentType === 'sports' ? 'LIVE: ' : 
                     item.contentType === 'movie' ? 'Movie: ' : 'Series: ';
      return { icon, text: `${prefix}${item.channelName}` };
    });
  }, [updateKey]);

  // Update trending items every hour
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateKey(prev => prev + 1);
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const categories = [
    { icon: Globe, label: 'World', color: '#60A5FA' },
    { icon: Trophy, label: 'Sports', color: '#34D399' },
    { icon: Newspaper, label: 'News', color: '#F472B6' },
    { icon: Music, label: 'Music', color: '#A78BFA' },
    { icon: Baby, label: 'Kids', color: '#FBBF24' },
    { icon: Gamepad2, label: 'Gaming', color: '#F87171' },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      {/* Gradient fade */}
      <div className="h-24 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
      
      <div className="bg-background/60 backdrop-blur-xl border-t border-border/20 px-6 py-4">
        <div className="flex items-center gap-6">
          {/* Stats Section */}
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20"
            >
              <Tv className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">
                {loading ? '...' : <AnimatedCounter value={channelCount} />}
              </span>
              <span className="text-xs text-primary/70">Live</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20"
            >
              <Film className="w-4 h-4 text-accent" />
              <span className="text-sm font-bold text-accent">
                {loading ? '...' : <AnimatedCounter value={movieCount} duration={2200} />}
              </span>
              <span className="text-xs text-accent/70">Movies</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/20"
            >
              <Clapperboard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">
                {loading ? '...' : <AnimatedCounter value={seriesCount} duration={2400} />}
              </span>
              <span className="text-xs text-muted-foreground">Series</span>
            </motion.div>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-border/30" />

          {/* Trending Ticker - horizontally scrollable */}
          <div className="flex-1 overflow-hidden relative">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Trending Now</span>
            </div>
            <div className="overflow-x-auto scrollbar-none">
              <div className="flex gap-3 w-max pb-1">
                {trendingItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/20 whitespace-nowrap flex-shrink-0">
                    <span>{item.icon}</span>
                    <span className="text-sm text-foreground/80">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-border/30 hidden lg:block" />

          {/* Quick Categories - Desktop only */}
          <div className="hidden lg:flex items-center gap-2">
            {categories.slice(0, 4).map((cat, index) => (
              <CategoryPill
                key={cat.label}
                icon={cat.icon}
                label={cat.label}
                color={cat.color}
                delay={index}
                onClick={() => onCategoryClick?.(cat.label.toLowerCase())}
              />
            ))}
          </div>

          {/* Ambient Now Playing */}
          <AnimatePresence>
            {currentlyPlaying && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onResumeClick}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 backdrop-blur-sm"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Play className="w-4 h-4 text-primary fill-primary" />
                  </div>
                  {/* Pulsing indicator */}
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
                <div className="text-left max-w-[120px]">
                  <p className="text-xs text-muted-foreground">Now Playing</p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {currentlyPlaying.name}
                  </p>
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
