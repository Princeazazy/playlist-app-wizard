import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Tv, Film, Clapperboard, Trophy, User, RefreshCw, Clock, Search, Mic, Zap, ChevronRight } from 'lucide-react';
import universePlayLogo from '@/assets/universe-play-logo.png';
import { getProfileInitial } from '@/lib/profileStorage';
import { useWeather } from '@/hooks/useWeather';
import { useIsMobile } from '@/hooks/use-mobile';
import { ContinueWatching } from './ContinueWatching';
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

// Animated counter
const useAnimatedCount = (target: number, duration = 1200) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
};

// Floating ambient orbs
const FloatingOrbs = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[
      { size: 200, left: '5%', top: '15%', color: 'hsl(200 90% 55% / 0.06)', dur: 7 },
      { size: 150, left: '80%', top: '10%', color: 'hsl(30 95% 55% / 0.05)', dur: 9 },
      { size: 120, left: '50%', top: '60%', color: 'hsl(280 80% 60% / 0.05)', dur: 6 },
      { size: 90,  left: '20%', top: '75%', color: 'hsl(200 90% 55% / 0.04)', dur: 8 },
    ].map((orb, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: orb.size,
          height: orb.size,
          left: orb.left,
          top: orb.top,
          background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
        }}
        animate={{ y: [0, -25, 0], x: [0, 12, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 1.2 }}
      />
    ))}
  </div>
);

// 3D tilt tile card
const TileCard = ({
  children,
  onClick,
  className = '',
  size = 'normal',
  delay = 0,
  accentColor = 'primary',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  size?: 'large' | 'normal' | 'small';
  delay?: number;
  accentColor?: 'primary' | 'accent' | 'emerald' | 'rose' | 'violet';
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useTransform(my, [-50, 50], [6, -6]);
  const rotY = useTransform(mx, [-50, 50], [-6, 6]);
  const [ripple, setRipple] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set(e.clientX - rect.left - rect.width / 2);
    my.set(e.clientY - rect.top - rect.height / 2);
  };
  const handleMouseLeave = () => { mx.set(0); my.set(0); setHovered(false); };

  const gradients: Record<string, string> = {
    primary: 'from-primary/25 to-primary/5',
    accent: 'from-accent/25 to-accent/5',
    emerald: 'from-emerald-500/25 to-emerald-500/5',
    rose: 'from-rose-500/25 to-rose-500/5',
    violet: 'from-violet-500/25 to-violet-500/5',
  };

  const borders: Record<string, string> = {
    primary: 'hsl(200 90% 55% / 0.4)',
    accent: 'hsl(30 95% 55% / 0.4)',
    emerald: 'hsl(160 80% 45% / 0.4)',
    rose: 'hsl(350 80% 60% / 0.4)',
    violet: 'hsl(270 80% 60% / 0.4)',
  };

  const glows: Record<string, string> = {
    primary: '0 20px 60px hsl(200 90% 55% / 0.25)',
    accent: '0 20px 60px hsl(30 95% 55% / 0.25)',
    emerald: '0 20px 60px hsl(160 80% 45% / 0.25)',
    rose: '0 20px 60px hsl(350 80% 60% / 0.25)',
    violet: '0 20px 60px hsl(270 80% 60% / 0.25)',
  };

  const sizeClasses = { large: 'col-span-1 row-span-2', normal: 'col-span-1 row-span-1', small: 'col-span-1 row-span-1' };

  return (
    <motion.button
      ref={ref}
      onClick={() => { setRipple(true); setTimeout(() => setRipple(false), 500); onClick?.(); }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setHovered(true)}
      initial={{ opacity: 0, y: 30, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: delay * 0.1, duration: 0.5, type: 'spring', stiffness: 130, damping: 16 }}
      style={{
        rotateX: rotX,
        rotateY: rotY,
        transformStyle: 'preserve-3d',
        boxShadow: hovered ? glows[accentColor] : '0 8px 30px hsl(0 0% 0% / 0.4)',
        borderColor: hovered ? borders[accentColor] : 'hsl(265 30% 22% / 0.6)',
      } as React.CSSProperties}
      whileHover={{ scale: 1.04, y: -6, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.97 }}
      className={`${sizeClasses[size]} relative rounded-2xl overflow-hidden border transition-all duration-300 group ${className}`}
      css-bg="true"
    >
      {/* Base gradient */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, hsl(265 45% 15%) 0%, hsl(265 40% 9%) 100%)' }} />

      {/* Hover gradient overlay */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${gradients[accentColor]}`}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Shine sweep */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-600 pointer-events-none" />

      {/* Top border highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Ripple */}
      <AnimatePresence>
        {ripple && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ background: `radial-gradient(circle, ${borders[accentColor].replace('0.4', '0.3')} 0%, transparent 70%)` }}
            initial={{ scale: 0.3, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Content with z-lift */}
      <div className="relative h-full flex flex-col p-5 text-left z-10" style={{ transform: 'translateZ(15px)' }}>
        {children}
      </div>

      {/* Corner accent lines */}
      <motion.div
        className="absolute top-0 left-0 pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="absolute top-2.5 left-2.5 w-px h-5 bg-white/40" />
        <div className="absolute top-2.5 left-2.5 w-5 h-px bg-white/40" />
      </motion.div>
      <motion.div
        className="absolute bottom-0 right-0 pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="absolute bottom-2.5 right-2.5 w-px h-5 bg-white/40" />
        <div className="absolute bottom-2.5 right-2.5 w-5 h-px bg-white/40" />
      </motion.div>
    </motion.button>
  );
};

// Pulsing icon wrapper
const PulsingIcon = ({ children, color = 'primary' }: { children: React.ReactNode; color?: string }) => (
  <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center`}
    style={{ background: `hsl(${color === 'primary' ? '200 90% 55%' : '30 95% 55%'} / 0.15)`, border: `1px solid hsl(${color === 'primary' ? '200 90% 55%' : '30 95% 55%'} / 0.3)` }}>
    <motion.div
      className="absolute inset-0 rounded-2xl"
      style={{ border: `1px solid hsl(${color === 'primary' ? '200 90% 55%' : '30 95% 55%'} / 0.4)` }}
      animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
    />
    {children}
  </div>
);

// Action button
const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  spinning,
  color = 'primary',
}: {
  icon: typeof User;
  label: string;
  onClick?: () => void;
  spinning?: boolean;
  color?: string;
}) => {
  const [pressed, setPressed] = useState(false);
  return (
    <motion.button
      onClick={() => { setPressed(true); setTimeout(() => setPressed(false), 300); onClick?.(); }}
      whileHover={{ scale: 1.02, x: 5 }}
      whileTap={{ scale: 0.97 }}
      className="relative w-full flex items-center gap-4 px-5 py-4 rounded-xl overflow-hidden border border-white/5 group"
      style={{ background: 'linear-gradient(145deg, hsl(265 45% 14%) 0%, hsl(265 40% 9%) 100%)' }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <AnimatePresence>
        {pressed && (
          <motion.div className="absolute inset-0 bg-primary/15" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.3 }} />
        )}
      </AnimatePresence>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="relative w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(200 90% 55% / 0.12)', border: '1px solid hsl(200 90% 55% / 0.2)' }}>
        <Icon className={`w-4 h-4 text-primary ${spinning ? 'animate-spin' : ''}`} />
      </div>
      <span className="relative text-foreground font-medium">{label}</span>
      <motion.div
        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
        animate={{ x: [0, 3, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <ChevronRight className="w-4 h-4 text-primary/60" />
      </motion.div>
    </motion.button>
  );
};

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
  const [, forceUpdate] = useState(0);
  const weather = useWeather();
  const isMobile = useIsMobile();

  const animChannels = useAnimatedCount(channelCount);
  const animMovies = useAnimatedCount(movieCount);
  const animSeries = useAnimatedCount(seriesCount);
  const animSports = useAnimatedCount(sportsCount);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = () => time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = () => time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const handleContinueWatchingRemove = useCallback(() => forceUpdate(n => n + 1), []);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden">
      {/* Background */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 20% 20%, hsl(280 60% 8%) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, hsl(200 50% 6%) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, hsl(270 40% 5%) 0%, hsl(260 50% 3%) 100%)'
      }} />

      {/* Ambient floating orbs */}
      <FloatingOrbs />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{
        backgroundImage: 'linear-gradient(hsl(200 90% 55%) 1px, transparent 1px), linear-gradient(90deg, hsl(200 90% 55%) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex items-center justify-between px-6 md:px-10 py-4 md:py-6"
      >
        <img src={universePlayLogo} alt="Universe TV" className="h-14 md:h-20 w-auto" />

        {!isMobile && (
          <div className="flex items-center gap-3">
            <motion.button
              onClick={onVoiceSearchClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative w-12 h-12 rounded-full border border-white/10 flex items-center justify-center transition-colors overflow-hidden group"
              style={{ background: 'linear-gradient(145deg, hsl(265 45% 14%), hsl(265 40% 9%))' }}
            >
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Mic className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors relative z-10" />
            </motion.button>
            <motion.button
              onClick={onSearchClick}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 backdrop-blur-sm rounded-full px-6 py-3 min-w-[240px] border border-white/10 hover:border-primary/30 transition-all group relative overflow-hidden"
              style={{ background: 'linear-gradient(145deg, hsl(265 45% 14% / 0.9), hsl(265 40% 9% / 0.9))' }}
            >
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Search className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">Search channels, movies...</span>
            </motion.button>
          </div>
        )}

        <div className="flex items-center gap-3 md:gap-4">
          {isMobile && (
            <motion.button
              onClick={onSearchClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center"
              style={{ background: 'linear-gradient(145deg, hsl(265 45% 14%), hsl(265 40% 9%))' }}
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden cursor-pointer"
            style={{ boxShadow: '0 0 20px hsl(200 90% 55% / 0.4)' }}
          >
            <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-lg">{getProfileInitial()}</span>
            </div>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/60"
              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-6 md:px-10 pt-2 pb-32">
        {isMobile ? (
          <div className="flex flex-col gap-4 pb-20">
            <ContinueWatching onSelect={(id) => onContinueWatchingSelect?.(id)} onRemove={handleContinueWatchingRemove} />

            <TileCard onClick={() => onNavigate('live')} size="large" delay={0} accentColor="primary" className="min-h-[160px]">
              <div className="flex-1 flex flex-col justify-between">
                <PulsingIcon color="primary"><Tv className="w-7 h-7 text-primary" /></PulsingIcon>
                <div className="mt-4">
                  <h2 className="text-2xl font-bold text-foreground">Live TV</h2>
                  <p className="text-muted-foreground text-sm">{loading ? '...' : `+${animChannels.toLocaleString()} Channels`}</p>
                </div>
              </div>
            </TileCard>

            <div className="grid grid-cols-2 gap-4">
              <TileCard onClick={() => onNavigate('movies')} delay={1} accentColor="accent" className="min-h-[140px]">
                <div className="flex-1 flex flex-col justify-between">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'hsl(30 95% 55% / 0.12)', border: '1px solid hsl(30 95% 55% / 0.25)' }}>
                    <Film className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Movies</h3>
                    <p className="text-muted-foreground text-xs">{loading ? '...' : `+${animMovies.toLocaleString()}`}</p>
                  </div>
                </div>
              </TileCard>

              <TileCard onClick={() => onNavigate('series')} delay={2} accentColor="violet" className="min-h-[140px]">
                <div className="absolute top-3 right-3 z-20">
                  <motion.span
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, hsl(200 90% 55%), hsl(280 80% 60%))' }}
                  >New</motion.span>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'hsl(270 80% 60% / 0.12)', border: '1px solid hsl(270 80% 60% / 0.25)' }}>
                    <Clapperboard className="w-5 h-5" style={{ color: 'hsl(270 80% 70%)' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Series</h3>
                    <p className="text-muted-foreground text-xs">{loading ? '...' : `+${animSeries.toLocaleString()}`}</p>
                  </div>
                </div>
              </TileCard>
            </div>

            <TileCard onClick={() => onNavigate('sports')} delay={3} accentColor="emerald" className="min-h-[120px]">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'hsl(160 80% 45% / 0.12)', border: '1px solid hsl(160 80% 45% / 0.25)' }}>
                  <Trophy className="w-5 h-5" style={{ color: 'hsl(160 80% 55%)' }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Sports Guide</h3>
                  <p className="text-muted-foreground text-xs">{loading ? '...' : `+${animSports.toLocaleString()} in playlist`}</p>
                </div>
              </div>
            </TileCard>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <ActionButton icon={User} label="Account" onClick={() => onNavigate('settings')} />
              <ActionButton icon={RefreshCw} label="Refresh All" onClick={onReload} />
            </div>

            <div className="mt-6">
              <TMDBBrowseSection onSelectItem={onTMDBSelect} channels={channels} onChannelSelect={onChannelSelect} />
            </div>
          </div>
        ) : (
          <div className="flex gap-6 h-full">
            <div className="flex-1 flex flex-col gap-4">
              <div className="grid grid-cols-3 grid-rows-2 gap-4" style={{ minHeight: '320px' }}>
                {/* Live TV - Large */}
                <TileCard onClick={() => onNavigate('live')} size="large" delay={0} accentColor="primary" className="row-span-2">
                  <div className="flex-1 flex flex-col justify-between h-full">
                    <PulsingIcon color="primary">
                      <Tv className="w-8 h-8 text-primary" />
                    </PulsingIcon>
                    <div>
                      <motion.p
                        className="text-4xl font-bold text-foreground tabular-nums"
                        key={animChannels}
                      >Live TV</motion.p>
                      <p className="text-muted-foreground mt-1">
                        {loading ? (
                          <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity }}>Loading...</motion.span>
                        ) : (
                          <span>+{animChannels.toLocaleString()} Channels</span>
                        )}
                      </p>
                    </div>
                  </div>
                </TileCard>

                {/* Movies */}
                <TileCard onClick={() => onNavigate('movies')} delay={1} accentColor="accent">
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'hsl(30 95% 55% / 0.12)', border: '1px solid hsl(30 95% 55% / 0.25)' }}>
                      <Film className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Movies</h3>
                      <p className="text-muted-foreground text-sm">{loading ? '...' : `+${animMovies.toLocaleString()} Movies`}</p>
                    </div>
                  </div>
                </TileCard>

                {/* Sports */}
                <TileCard onClick={() => onNavigate('sports')} delay={2} accentColor="emerald">
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'hsl(160 80% 45% / 0.12)', border: '1px solid hsl(160 80% 45% / 0.25)' }}>
                      <Trophy className="w-6 h-6" style={{ color: 'hsl(160 80% 55%)' }} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Sports Guide</h3>
                      <p className="text-muted-foreground text-sm">{loading ? '...' : `+${animSports.toLocaleString()} in playlist`}</p>
                    </div>
                  </div>
                </TileCard>

                {/* Series */}
                <TileCard onClick={() => onNavigate('series')} delay={3} accentColor="violet">
                  <div className="absolute top-3 right-3 z-20">
                    <motion.span
                      animate={{ scale: [1, 1.06, 1], boxShadow: ['0 0 0px hsl(200 90% 55% / 0)', '0 0 12px hsl(200 90% 55% / 0.5)', '0 0 0px hsl(200 90% 55% / 0)'] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="px-2.5 py-1 rounded-md text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, hsl(200 90% 55%), hsl(280 80% 60%))' }}
                    >New</motion.span>
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'hsl(270 80% 60% / 0.12)', border: '1px solid hsl(270 80% 60% / 0.25)' }}>
                      <Clapperboard className="w-6 h-6" style={{ color: 'hsl(270 80% 70%)' }} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Series</h3>
                      <p className="text-muted-foreground text-sm">{loading ? '...' : `+${animSeries.toLocaleString()} Series`}</p>
                    </div>
                  </div>
                </TileCard>

                {/* Catch Up */}
                <TileCard onClick={onCatchUp} delay={4} accentColor="rose">
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'hsl(350 80% 60% / 0.12)', border: '1px solid hsl(350 80% 60% / 0.25)' }}>
                      <Clock className="w-6 h-6" style={{ color: 'hsl(350 80% 65%)' }} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Catch Up</h3>
                      <p className="text-muted-foreground text-sm">Resume watching</p>
                    </div>
                  </div>
                </TileCard>
              </div>

              {/* TMDB Section */}
              <div className="mt-6">
                <TMDBBrowseSection onSelectItem={onTMDBSelect} channels={channels} onChannelSelect={onChannelSelect} />
              </div>
            </div>

            {/* Right Panel */}
            <div className="w-72 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <ActionButton icon={User} label="Account" onClick={() => onNavigate('settings')} />
                <ActionButton icon={RefreshCw} label="Refresh All" onClick={onReload} />
              </div>

              <div className="flex-1 overflow-hidden">
                <ContinueWatching onSelect={(id) => onContinueWatchingSelect?.(id)} onRemove={handleContinueWatchingRemove} compact />
              </div>

              {/* Time & Weather */}
              <motion.div
                className="text-right p-4 rounded-2xl border border-white/5"
                style={{ background: 'linear-gradient(145deg, hsl(265 45% 14% / 0.6), hsl(265 40% 9% / 0.8))' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center justify-end gap-2 text-muted-foreground mb-2">
                  <WeatherIcon icon={weather.icon} />
                  <span className="text-sm">{weather.displayTemp}</span>
                </div>
                <motion.p
                  className="text-5xl font-light text-foreground tabular-nums"
                  key={formatTime()}
                  initial={{ opacity: 0.7 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >{formatTime()}</motion.p>
                <p className="text-muted-foreground text-sm mt-1">{formatDate()}</p>
              </motion.div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
