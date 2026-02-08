import { useState, useEffect, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Tv, Film, Clapperboard, Trophy, User, RefreshCw, Clock, Search, Mic } from 'lucide-react';
import universePlayLogo from '@/assets/universe-play-logo.png';
import cosmicBg from '@/assets/cosmic-bg.png';
import { useWeather } from '@/hooks/useWeather';
import { useIsMobile } from '@/hooks/use-mobile';
import { ContinueWatching } from './ContinueWatching';
import { HomeBottomBar } from './HomeBottomBar';
import { TMDBBrowseSection } from './TMDBBrowseSection';
import { TMDBItem } from '@/hooks/useTMDB';
import { WeatherIcon } from './shared/WeatherIcon';
import { Channel } from '@/hooks/useIPTV';

interface MiHomeScreenProps {
  channelCount: number;
  movieCount: number;
  seriesCount: number;
  sportsCount: number;
  loading?: boolean;
  onNavigate: (section: 'live' | 'movies' | 'series' | 'sports' | 'settings') => void;
  onReload?: () => void;
  onCatchUp?: () => void;
  onSearchClick?: () => void;
  onVoiceSearchClick?: () => void;
  onContinueWatchingSelect?: (channelId: string) => void;
  onTMDBSelect?: (item: TMDBItem) => void;
  channels?: Channel[];
  onChannelSelect?: (channel: Channel) => void;
}

// Enhanced animated tile card with glow effects
const TileCard = ({
  children,
  onClick,
  className = '',
  size = 'normal',
  delay = 0,
  bgImage,
  glowColor = 'primary',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  size?: 'large' | 'normal' | 'small';
  delay?: number;
  bgImage?: string;
  glowColor?: 'primary' | 'accent' | 'emerald';
}) => {
  const sizeClasses = {
    large: 'col-span-1 row-span-2',
    normal: 'col-span-1 row-span-1',
    small: 'col-span-1 row-span-1',
  };

  const glowColors = {
    primary: 'group-hover:shadow-primary/30',
    accent: 'group-hover:shadow-accent/30',
    emerald: 'group-hover:shadow-emerald-500/30',
  };

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: delay * 0.08, 
        duration: 0.4,
        type: 'spring',
        stiffness: 100,
      }}
      whileHover={{ 
        scale: 1.03, 
        y: -4,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      className={`${sizeClasses[size]} relative rounded-2xl overflow-hidden transition-all duration-300 group shadow-xl ${glowColors[glowColor]} ${className}`}
      style={{
        background: bgImage 
          ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(${bgImage}) center/cover`
          : 'linear-gradient(145deg, hsl(265 40% 16%) 0%, hsl(265 40% 10%) 100%)',
      }}
    >
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-accent/20 blur-xl" />
      </div>
      
      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
      
      {/* Top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-primary/20 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative h-full flex flex-col p-5 text-left z-10">
        {children}
      </div>
      
      {/* Corner accents on hover */}
      <div className="absolute top-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute top-2 right-2 w-1.5 h-6 rounded-full bg-primary/40" />
        <div className="absolute top-2 right-2 w-6 h-1.5 rounded-full bg-primary/40" />
      </div>
      <div className="absolute bottom-0 left-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute bottom-2 left-2 w-1.5 h-6 rounded-full bg-accent/40" />
        <div className="absolute bottom-2 left-2 w-6 h-1.5 rounded-full bg-accent/40" />
      </div>
    </motion.button>
  );
};

// Action button for right panel
const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  spinning,
}: {
  icon: typeof User;
  label: string;
  onClick?: () => void;
  spinning?: boolean;
}) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.02, x: 4 }}
    whileTap={{ scale: 0.98 }}
    className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-card/80 hover:bg-card transition-all border border-border/30"
  >
    <Icon className={`w-5 h-5 text-muted-foreground ${spinning ? 'animate-spin' : ''}`} />
    <span className="text-foreground font-medium">{label}</span>
  </motion.button>
);

export const MiHomeScreen = ({
  channelCount,
  movieCount,
  seriesCount,
  sportsCount,
  loading,
  onNavigate,
  onReload,
  onCatchUp,
  onSearchClick,
  onVoiceSearchClick,
  onContinueWatchingSelect,
  onTMDBSelect,
  channels,
  onChannelSelect,
}: MiHomeScreenProps) => {
  const [time, setTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, forceUpdate] = useState(0);
  const weather = useWeather();
  const isMobile = useIsMobile();

  const handleCatchUp = () => {
    if (onCatchUp) {
      onCatchUp();
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = () => time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = () => time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const handleContinueWatchingRemove = useCallback(() => {
    forceUpdate((n) => n + 1);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background - Cosmic space image */}
      <div className="absolute inset-0">
        <img src={cosmicBg} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'auto' }} />
        <div className="absolute inset-0 bg-black/60" />
      </div>
      {/* Header - Mi Player Pro style */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-4 md:py-6">
        {/* Logo */}
        <img src={universePlayLogo} alt="Universe TV" className="h-14 md:h-20 w-auto" />

        {/* Search Bar */}
        {!isMobile && (
          <div className="flex items-center gap-3">
            <button
              onClick={onVoiceSearchClick}
              className="w-12 h-12 rounded-full bg-card border border-border/30 flex items-center justify-center hover:bg-card/80 transition-colors"
            >
              <Mic className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={onSearchClick}
              className="flex items-center gap-3 bg-card/80 backdrop-blur-sm rounded-full px-6 py-3 min-w-[240px] border border-border/30 hover:bg-card transition-colors"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">Search</span>
            </button>
          </div>
        )}

        {/* Right side - Settings & Profile */}
        <div className="flex items-center gap-3 md:gap-4">
          {isMobile && (
            <button
              onClick={onSearchClick}
              className="w-10 h-10 rounded-full bg-card border border-border/30 flex items-center justify-center"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-primary to-accent overflow-hidden ring-2 ring-primary/30">
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">U</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-6 md:px-10 pb-32 overflow-y-auto">
        {isMobile ? (
          /* Mobile Layout - Vertical stack */
          <div className="flex flex-col gap-4 pb-20">
            {/* Continue Watching */}
            <ContinueWatching
              onSelect={(id) => onContinueWatchingSelect?.(id)}
              onRemove={handleContinueWatchingRemove}
            />

            {/* Live TV - Featured */}
            <TileCard onClick={() => onNavigate('live')} size="large" delay={0} className="min-h-[160px]">
              <div className="flex-1 flex flex-col justify-between">
                <div className="w-14 h-14 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Tv className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Live TV</h2>
                  <p className="text-muted-foreground text-sm">
                    {loading ? '...' : `+${channelCount.toLocaleString()} Channels`}
                  </p>
                </div>
              </div>
            </TileCard>

            {/* Grid for Movies, Series, Sports */}
            <div className="grid grid-cols-2 gap-4">
              <TileCard onClick={() => onNavigate('movies')} delay={1} className="min-h-[140px]">
                <div className="flex-1 flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                    <Film className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Movies</h3>
                    <p className="text-muted-foreground text-xs">
                      {loading ? '...' : `+${movieCount.toLocaleString()} Movies`}
                    </p>
                  </div>
                </div>
              </TileCard>

              <TileCard onClick={() => onNavigate('series')} delay={2} className="min-h-[140px]">
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold">New</span>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                    <Clapperboard className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Series</h3>
                    <p className="text-muted-foreground text-xs">
                      {loading ? '...' : `+${seriesCount.toLocaleString()} Series`}
                    </p>
                  </div>
                </div>
              </TileCard>
            </div>

            {/* Sports Guide */}
            <TileCard onClick={() => onNavigate('sports')} delay={3} className="min-h-[120px]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Sports Guide</h3>
                  <p className="text-muted-foreground text-xs">
                    {loading ? '...' : `+${sportsCount.toLocaleString()} in playlist`}
                  </p>
                </div>
              </div>
            </TileCard>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <ActionButton icon={User} label="Account" onClick={() => onNavigate('settings')} />
              <ActionButton icon={RefreshCw} label="Refresh All" onClick={onReload} />
            </div>
            
            {/* TMDB Browse Section */}
            <div className="mt-6">
              <TMDBBrowseSection onSelectItem={onTMDBSelect} channels={channels} onChannelSelect={onChannelSelect} />
            </div>
          </div>
        ) : (
          /* Desktop Layout - Mi Player Pro Grid */
          <div className="flex gap-6 h-full">
            {/* Left Section - Content Tiles */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Main Grid */}
              <div className="grid grid-cols-3 grid-rows-2 gap-4 flex-1">
                {/* Live TV - Takes full left column */}
                <TileCard onClick={() => onNavigate('live')} size="large" delay={0} className="row-span-2">
                  <div className="flex-1 flex flex-col justify-between h-full">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
                      <Tv className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-foreground">Live TV</h2>
                      <p className="text-muted-foreground">
                        {loading ? '...' : `+${channelCount.toLocaleString()} Channels`}
                      </p>
                    </div>
                  </div>
                </TileCard>

                {/* Movies */}
                <TileCard onClick={() => onNavigate('movies')} delay={1}>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                      <Film className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Movies</h3>
                      <p className="text-muted-foreground text-sm">
                        {loading ? '...' : `+${movieCount.toLocaleString()} Movies`}
                      </p>
                    </div>
                  </div>
                </TileCard>

                {/* Sports Guide */}
                <TileCard onClick={() => onNavigate('sports')} delay={2}>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Sports Guide</h3>
                      <p className="text-muted-foreground text-sm">
                        {loading ? '...' : `+${sportsCount.toLocaleString()} in playlist`}
                      </p>
                    </div>
                  </div>
                </TileCard>

                {/* Series */}
                <TileCard onClick={() => onNavigate('series')} delay={3}>
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-bold">New</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                      <Clapperboard className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Series</h3>
                      <p className="text-muted-foreground text-sm">
                        {loading ? '...' : `+${seriesCount.toLocaleString()} Series`}
                      </p>
                    </div>
                  </div>
                </TileCard>

                {/* Catch Up */}
                <TileCard onClick={handleCatchUp} delay={4}>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                      <Clock className={`w-6 h-6 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Catch Up</h3>
                      <p className="text-muted-foreground text-sm">Resume watching</p>
                    </div>
                  </div>
                </TileCard>
              </div>
              
              {/* TMDB Browse Section */}
              <div className="mt-6">
                <TMDBBrowseSection onSelectItem={onTMDBSelect} channels={channels} onChannelSelect={onChannelSelect} />
              </div>
            </div>

            {/* Right Section - Actions & Time */}
            <div className="w-72 flex flex-col gap-4">
              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <ActionButton icon={User} label="Account" onClick={() => onNavigate('settings')} />
                <ActionButton icon={RefreshCw} label="Refresh All" onClick={onReload} />
              </div>

              {/* Continue Watching - Compact version above time */}
              <div className="flex-1 overflow-hidden">
                <ContinueWatching
                  onSelect={(id) => onContinueWatchingSelect?.(id)}
                  onRemove={handleContinueWatchingRemove}
                  compact
                />
              </div>

              {/* Time & Date - Bottom right */}
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 text-muted-foreground mb-2">
                  <WeatherIcon icon={weather.icon} />
                  <span>{weather.displayTemp}</span>
                </div>
                <p className="text-5xl font-light text-foreground">{formatTime()}</p>
                <p className="text-muted-foreground text-lg">{formatDate()}</p>
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  );
};
