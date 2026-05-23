import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tv, Film, Clapperboard, Trophy, User, RefreshCw, Clock, Search, Mic, ChevronRight } from 'lucide-react';
import logoVideo from '@/assets/logo-transparent.mp4';
import { ChromaKeyVideo } from './shared/ChromaKeyVideo';
import { getProfileInitial, getProfileAvatarSrc } from '@/lib/profileStorage';
import { AvatarPicker } from './AvatarPicker';
import { useWeather } from '@/hooks/useWeather';
import { useIsMobile } from '@/hooks/use-mobile';
import { ContinueWatching } from './ContinueWatching';
const TMDBBrowseSection = React.lazy(() => import('./TMDBBrowseSection').then(m => ({ default: m.TMDBBrowseSection })));
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

// Simple counter - no setInterval, just use target directly for instant display
const useAnimatedCount = (target: number) => target;

// Floating ambient orbs
const FloatingOrbs = React.memo(() => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[
      { size: 200, left: '5%', top: '15%', color: 'hsl(200 90% 55% / 0.06)' },
      { size: 150, left: '80%', top: '10%', color: 'hsl(30 95% 55% / 0.05)' },
      { size: 120, left: '50%', top: '60%', color: 'hsl(280 80% 60% / 0.05)' },
      { size: 90,  left: '20%', top: '75%', color: 'hsl(200 90% 55% / 0.04)' },
    ].map((orb, i) => (
      <div
        key={i}
        className="absolute rounded-full"
        style={{
          width: orb.size,
          height: orb.size,
          left: orb.left,
          top: orb.top,
          background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
        }}
      />
    ))}
  </div>
));

// Minimal-sharp tile card: subtle glass surface, accent-color border on hover, perspective corner
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
  const accents: Record<string, { border: string; glow: string; overlay: string; corner: string }> = {
    primary: {
      border: 'hsl(200 90% 55% / 0.5)',
      glow: '0 0 50px -12px hsl(200 90% 55% / 0.35)',
      overlay: 'linear-gradient(180deg, hsl(200 90% 55% / 0.08) 0%, transparent 100%)',
      corner: 'hsl(200 90% 55% / 0.35)',
    },
    accent: {
      border: 'hsl(30 95% 55% / 0.45)',
      glow: '0 0 45px -12px hsl(30 95% 55% / 0.3)',
      overlay: 'linear-gradient(135deg, hsl(30 95% 55% / 0.07) 0%, transparent 100%)',
      corner: 'hsl(30 95% 55% / 0.3)',
    },
    emerald: {
      border: 'hsl(160 80% 45% / 0.45)',
      glow: '0 0 45px -12px hsl(160 80% 45% / 0.3)',
      overlay: 'linear-gradient(135deg, hsl(160 80% 45% / 0.07) 0%, transparent 100%)',
      corner: 'hsl(160 80% 45% / 0.3)',
    },
    rose: {
      border: 'hsl(350 80% 60% / 0.45)',
      glow: '0 0 45px -12px hsl(350 80% 60% / 0.3)',
      overlay: 'linear-gradient(135deg, hsl(350 80% 60% / 0.07) 0%, transparent 100%)',
      corner: 'hsl(350 80% 60% / 0.3)',
    },
    violet: {
      border: 'hsl(270 80% 60% / 0.45)',
      glow: '0 0 45px -12px hsl(270 80% 60% / 0.3)',
      overlay: 'linear-gradient(135deg, hsl(270 80% 60% / 0.07) 0%, transparent 100%)',
      corner: 'hsl(270 80% 60% / 0.3)',
    },
  };
  const a = accents[accentColor];
  const isLarge = size === 'large';
  const sizeClasses = { large: 'col-span-1 row-span-2', normal: 'col-span-1 row-span-1', small: 'col-span-1 row-span-1' };

  return (
    <button
      onClick={onClick}
      className={`${sizeClasses[size]} relative ${isLarge ? 'rounded-[2rem] p-8' : 'rounded-3xl p-6'} overflow-hidden border border-white/10 transition-all duration-500 group hover:scale-[1.02] active:scale-[0.98] ${className}`}
      style={{
        background: 'linear-gradient(135deg, hsl(0 0% 100% / 0.06) 0%, hsl(0 0% 100% / 0.01) 100%)',
        boxShadow: '0 6px 24px hsl(0 0% 0% / 0.35)',
        animation: `fadeSlideIn 0.4s ease-out ${delay * 0.08}s both`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = a.glow;
        e.currentTarget.style.borderColor = a.border;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 6px 24px hsl(0 0% 0% / 0.35)';
        e.currentTarget.style.borderColor = 'hsl(0 0% 100% / 0.1)';
      }}
    >
      {/* Hover accent wash */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: a.overlay }} />

      {/* Perspective corner */}
      <div
        className={`absolute pointer-events-none ${isLarge ? 'bottom-6 right-6 w-10 h-10 rounded-br-2xl border-r-2 border-b-2' : 'bottom-4 right-4 w-4 h-4 rounded-br-lg border-r border-b'}`}
        style={{ borderColor: a.corner }}
      />

      {/* Content */}
      <div className="relative h-full flex flex-col text-left z-10">
        {children}
      </div>
    </button>
  );
};

// Pulsing icon wrapper
const PulsingIcon = ({ children, color = 'primary' }: { children: React.ReactNode; color?: string }) => (
  <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center`}
    style={{ background: `hsl(${color === 'primary' ? '200 90% 55%' : '30 95% 55%'} / 0.15)`, border: `1px solid hsl(${color === 'primary' ? '200 90% 55%' : '30 95% 55%'} / 0.3)` }}>
    {children}
  </div>
);

// Lightweight action button - no motion
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
  color?: string;
}) => (
  <button
    onClick={onClick}
    className="relative w-full flex items-center gap-5 p-5 rounded-2xl overflow-hidden border border-white/10 group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
    style={{ background: 'linear-gradient(135deg, hsl(0 0% 100% / 0.06) 0%, hsl(0 0% 100% / 0.01) 100%)' }}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div
      className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-700 ${spinning ? '' : 'group-hover:scale-110'}`}
      style={{ background: 'hsl(200 90% 55% / 0.12)', border: '1px solid hsl(200 90% 55% / 0.25)' }}
    >
      <Icon className={`w-5 h-5 text-primary ${spinning ? 'animate-spin' : ''}`} />
    </div>
    <span className="relative text-lg font-semibold text-foreground">{label}</span>
    <ChevronRight className="w-4 h-4 text-primary/60 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
  </button>

);

export const MiHomeScreen = React.memo(({
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
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(getProfileAvatarSrc());
  const weather = useWeather();
  const isMobile = useIsMobile();

  const animChannels = useAnimatedCount(channelCount);
  const animMovies = useAnimatedCount(movieCount);
  const animSeries = useAnimatedCount(seriesCount);
  const animSports = useAnimatedCount(sportsCount);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000); // Update every minute, not every second
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
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-4 md:py-6" style={{ animation: 'fadeSlideIn 0.4s ease-out both' }}>
        <div className="flex items-center gap-4">
          <ChromaKeyVideo src={logoVideo} className="h-20 md:h-28" />
        </div>

        {!isMobile && (
          <div className="flex items-center gap-3">
            <button
              onClick={onVoiceSearchClick}
              className="relative w-12 h-12 rounded-full border border-white/10 flex items-center justify-center transition-all overflow-hidden group hover:scale-110 active:scale-90"
              style={{ background: 'linear-gradient(145deg, hsl(265 45% 14%), hsl(265 40% 9%))' }}
            >
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Mic className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors relative z-10" />
            </button>
            <button
              onClick={onSearchClick}
              className="flex items-center gap-3 backdrop-blur-sm rounded-full px-6 py-3 min-w-[240px] border border-white/10 hover:border-primary/30 transition-all group relative overflow-hidden hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(145deg, hsl(265 45% 14% / 0.9), hsl(265 40% 9% / 0.9))' }}
            >
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Search className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">Search channels, movies...</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 md:gap-4">
          {!isMobile && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <WeatherIcon icon={weather.icon} className="w-4 h-4" />
              <span className="text-sm">{weather.displayTemp}</span>
              <span className="text-sm text-muted-foreground/40">|</span>
              <span className="text-sm tabular-nums">{formatTime()}</span>
              <span className="text-sm text-muted-foreground/40">|</span>
              <span className="text-sm">{formatDate()}</span>
            </div>
          )}
          {isMobile && (
            <button
              onClick={onSearchClick}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:scale-110 active:scale-90 transition-transform"
              style={{ background: 'linear-gradient(145deg, hsl(265 45% 14%), hsl(265 40% 9%))' }}
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <div
            onClick={() => setShowAvatarPicker(true)}
            className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            style={{ boxShadow: '0 0 20px hsl(200 90% 55% / 0.4)' }}
            title="Change avatar"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="Profile avatar" className="w-full h-full object-cover bg-gradient-to-br from-primary/30 to-accent/30" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-white font-bold text-lg">{getProfileInitial()}</span>
              </div>
            )}
          </div>
        </div>
      </header>
      <AvatarPicker
        open={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        onChange={() => setAvatarSrc(getProfileAvatarSrc())}
      />

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
              <React.Suspense fallback={<div className="h-40 flex items-center justify-center text-muted-foreground">Loading content...</div>}>
                <TMDBBrowseSection onSelectItem={onTMDBSelect} channels={channels} onChannelSelect={onChannelSelect} />
              </React.Suspense>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-6 h-full">
              <div className="flex-1 flex flex-col gap-4">
                <div className="grid grid-cols-3 grid-rows-2 gap-4" style={{ minHeight: '320px' }}>
                  {/* Live TV - Large */}
                  <TileCard onClick={() => onNavigate('live')} size="large" delay={0} accentColor="primary" className="row-span-2">
                    <div className="flex-1 flex flex-col justify-between h-full">
                      <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-inner" style={{ background: 'hsl(200 90% 55% / 0.1)', border: '1px solid hsl(200 90% 55% / 0.25)' }}>
                        <Tv className="w-10 h-10 text-primary" />
                      </div>
                      <div>
                        <p className="text-5xl font-display font-bold text-foreground tracking-tight leading-tight">Live TV</p>
                        <p className="text-muted-foreground text-sm font-medium mt-1">
                          {loading ? '...' : `+${animChannels.toLocaleString()} Channels`}
                        </p>
                      </div>
                    </div>
                  </TileCard>

                  {/* Movies */}
                  <TileCard onClick={() => onNavigate('movies')} delay={1} accentColor="accent">
                    <div className="flex-1 flex flex-col justify-between gap-6">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'hsl(30 95% 55% / 0.1)', border: '1px solid hsl(30 95% 55% / 0.25)' }}>
                        <Film className="w-7 h-7 text-accent" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-foreground mb-1">Movies</h3>
                        <p className="text-muted-foreground text-sm font-medium">{loading ? '...' : `+${animMovies.toLocaleString()} Movies`}</p>
                      </div>
                    </div>
                  </TileCard>

                  {/* Sports */}
                  <TileCard onClick={() => onNavigate('sports')} delay={2} accentColor="emerald">
                    <div className="flex-1 flex flex-col justify-between gap-6">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'hsl(160 80% 45% / 0.1)', border: '1px solid hsl(160 80% 45% / 0.25)' }}>
                        <Trophy className="w-7 h-7" style={{ color: 'hsl(160 80% 55%)' }} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-foreground mb-1">Sports Guide</h3>
                        <p className="text-muted-foreground text-sm font-medium">{loading ? '...' : `+${animSports.toLocaleString()} in playlist`}</p>
                      </div>
                    </div>
                  </TileCard>

                  {/* Series */}
                  <TileCard onClick={() => onNavigate('series')} delay={3} accentColor="violet">
                    <div className="flex-1 flex flex-col justify-between gap-6">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'hsl(270 80% 60% / 0.1)', border: '1px solid hsl(270 80% 60% / 0.25)' }}>
                        <Clapperboard className="w-7 h-7" style={{ color: 'hsl(270 80% 70%)' }} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-foreground mb-1">Series</h3>
                        <p className="text-muted-foreground text-sm font-medium">{loading ? '...' : `+${animSeries.toLocaleString()} Series`}</p>
                      </div>
                    </div>
                  </TileCard>

                  {/* Catch Up */}
                  <TileCard onClick={onCatchUp} delay={4} accentColor="rose">
                    <div className="flex-1 flex flex-col justify-between gap-6">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'hsl(350 80% 60% / 0.1)', border: '1px solid hsl(350 80% 60% / 0.25)' }}>
                        <Clock className="w-7 h-7" style={{ color: 'hsl(350 80% 65%)' }} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-foreground mb-1">Catch Up</h3>
                        <p className="text-muted-foreground text-sm font-medium">Resume watching</p>
                      </div>
                    </div>
                  </TileCard>
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
            </div>
            </div>

            {/* TMDB Section - Full width below tiles */}
            <div className="mt-6">
              <React.Suspense fallback={<div className="h-40 flex items-center justify-center text-muted-foreground">Loading content...</div>}>
                <TMDBBrowseSection onSelectItem={onTMDBSelect} channels={channels} onChannelSelect={onChannelSelect} />
              </React.Suspense>
            </div>
          </>
        )}

      </main>
    </div>
  );
});
