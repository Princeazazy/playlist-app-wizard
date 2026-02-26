import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useIPTV, Channel } from '@/hooks/useIPTV';
import { isLoggedIn, clearAppSession } from '@/lib/appSession';
import { LoginScreen } from '@/components/LoginScreen';
import { useAppNavigation, Screen } from '@/hooks/useAppNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { MiHomeScreen } from '@/components/MiHomeScreen';
import { MiLiveTVList } from '@/components/MiLiveTVList';
import { MiMediaGrid } from '@/components/MiMediaGrid';
import { MiMovieDetail } from '@/components/MiMovieDetail';
import { MiSeriesDetail } from '@/components/MiSeriesDetail';
import { MiSettingsPage } from '@/components/MiSettingsPage';
import { MiFullscreenPlayer } from '@/components/MiFullscreenPlayer';
import { MiniPlayer } from '@/components/MiniPlayer';
import { ArabiaIntro } from '@/components/ArabiaIntro';
import { GlobalSearchModal } from '@/components/GlobalSearchModal';
import { BackgroundMusic } from '@/components/BackgroundMusic';
import { MiCatchUpPage } from '@/components/MiCatchUpPage';
import { TMDBDetailModal } from '@/components/TMDBDetailModal';
import { MobileBrowseScreen } from '@/components/MobileBrowseScreen';
import { TMDBItem } from '@/hooks/useTMDB';
import { rankChannelsForTMDB } from '@/lib/tmdbMatcher';
import universeLogo from '@/assets/universe-tv-logo.png';

const Index = () => {
  const [playlistVersion, setPlaylistVersion] = useState(0);
  const { channels, loading, error, refresh } = useIPTV();
  const [showIntro, setShowIntro] = useState(true);
  const [authenticated, setAuthenticated] = useState(() => isLoggedIn());
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [useMobileBrowse, setUseMobileBrowse] = useState(true);
  const isMobile = useIsMobile();

  const nav = useAppNavigation();

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
  }, []);

  // Count channels by type AND build typed maps in a single pass
  const { liveCount, movieCount, seriesCount, sportsCount, channelsByType } = useMemo(() => {
    let live = 0, movies = 0, series = 0, sports = 0;
    const byType: Record<string, Channel[]> = { live: [], movies: [], series: [], sports: [] };
    for (const ch of channels) {
      if (ch.type === 'sports') { sports++; byType.sports.push(ch); }
      else if (ch.type === 'movies') { movies++; byType.movies.push(ch); }
      else if (ch.type === 'series') { series++; byType.series.push(ch); }
      else { live++; byType.live.push(ch); }
    }
    return { liveCount: live, movieCount: movies, seriesCount: series, sportsCount: sports, channelsByType: byType };
  }, [channels]);

  // Filter channels by current screen category - uses pre-built type maps
  const filteredChannelsByCategory = useMemo(() => {
    if (nav.currentScreen === 'home' || nav.currentScreen === 'settings' || nav.currentScreen === 'detail') {
      return channels;
    }
    if (nav.currentScreen === 'live') {
      return channelsByType.live;
    }
    if (nav.currentScreen === 'sports') {
      const sportLive = channelsByType.live.filter((ch) => {
        const nameLower = ch.name?.toLowerCase() || '';
        const groupLower = ch.group?.toLowerCase() || '';
        return nameLower.includes('sport') || nameLower.includes('bein') || 
               nameLower.includes('espn') || nameLower.includes('fox sport') ||
               nameLower.includes('sky sport') || nameLower.includes('رياض') ||
               nameLower.includes('ppv') || nameLower.includes('dazn') ||
               groupLower.includes('ppv') || groupLower.includes('dazn');
      });
      return [...channelsByType.sports, ...sportLive];
    }
    return channelsByType[nav.currentScreen] || channels.filter((ch) => ch.type === nav.currentScreen);
  }, [channels, channelsByType, nav.currentScreen]);

  const handlePlaylistChange = useCallback(() => {
    setPlaylistVersion(v => v + 1);
    window.location.reload();
  }, []);

  // Auto-refresh channels every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => refresh(), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleNextChannel = useCallback(() => {
    if (!nav.currentChannel) return;
    const currentIndex = filteredChannelsByCategory.findIndex((c) => c.id === nav.currentChannel?.id);
    if (currentIndex < filteredChannelsByCategory.length - 1) {
      nav.handleChannelSelect(filteredChannelsByCategory[currentIndex + 1]);
    }
  }, [nav, filteredChannelsByCategory]);

  const handlePreviousChannel = useCallback(() => {
    if (!nav.currentChannel) return;
    const currentIndex = filteredChannelsByCategory.findIndex((c) => c.id === nav.currentChannel?.id);
    if (currentIndex > 0) {
      nav.handleChannelSelect(filteredChannelsByCategory[currentIndex - 1]);
    }
  }, [nav, filteredChannelsByCategory]);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  // Stable callback for channel select from home (avoids breaking React.memo)
  const handleHomeChannelSelect = useCallback((channel: Channel) => {
    nav.handleItemSelect(channel, 'home');
  }, [nav]);

  // Find best IPTV match for a TMDB item - strict confidence guard to avoid wrong auto-play
  const findIPTVMatch = useCallback((item: TMDBItem) => {
    const contentPool = item.mediaType === 'tv' ? channelsByType.series : channelsByType.movies;
    const rankedMatches = rankChannelsForTMDB(item, contentPool, {
      minScore: 55,
      limit: 3,
      enforceMediaType: true,
    });

    const [best, second] = rankedMatches;
    if (!best) {
      console.log(`TMDB Match: "${item.title}" -> No confident match`);
      return null;
    }

    const hasClearLead = !second || best.score - second.score >= 12;
    const isHighConfidence = best.score >= 90 || (best.score >= 84 && hasClearLead);

    console.log(
      `TMDB Match: "${item.title}" -> ${isHighConfidence ? `"${best.channel.name}" (score: ${best.score})` : 'Ambiguous, opening details'}`
    );

    return isHighConfidence ? best.channel : null;
  }, [channelsByType]);

  // Handle TMDB item selection
  const handleTMDBSelect = useCallback((item: TMDBItem) => {
    const match = findIPTVMatch(item);
    if (match) {
      nav.handleItemSelect(match, 'home');
    } else {
      nav.setSelectedTMDBItem(item);
    }
  }, [findIPTVMatch, nav]);

  // Handle playing IPTV match from TMDB modal
  const handlePlayIPTVFromTMDB = useCallback((channel: Channel) => {
    nav.setSelectedTMDBItem(null);
    nav.handleItemSelect(channel, 'home');
  }, [nav]);

  // Show intro
  // Show intro first
  if (showIntro) {
    return <ArabiaIntro onComplete={handleIntroComplete} />;
  }

  // Then require login
  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="flex items-center justify-center mb-6">
            <img src={universeLogo} alt="Universe TV" className="h-20 w-auto opacity-50" />
          </div>
          <p className="text-destructive mb-2 font-semibold text-lg">Failed to load channels</p>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Fullscreen player overlay
  if (nav.isFullscreen && nav.currentChannel) {
    const isSeries = nav.currentChannel.type === 'series' ||
      nav.currentChannel.group?.toLowerCase().includes('series') ||
      nav.currentChannel.url?.includes('/series/');

    const isLiveTV = nav.currentChannel.type === 'live' ||
      nav.currentChannel.type === 'sports' ||
      (!nav.currentChannel.type && !nav.currentChannel.url?.includes('/movie/') && !nav.currentChannel.url?.includes('/series/'));

    return (
      <MiFullscreenPlayer
        channel={nav.currentChannel}
        isFavorite={nav.favorites.has(nav.currentChannel.id)}
        onClose={() => nav.handleCloseFullscreen(isLiveTV)}
        onNext={handleNextChannel}
        onPrevious={handlePreviousChannel}
        onToggleFavorite={() => nav.handleToggleFavorite(nav.currentChannel!.id)}
        allChannels={filteredChannelsByCategory}
        onSelectChannel={(channel) => nav.handleChannelSelect(channel)}
        onNextEpisode={isSeries ? nav.handleNextEpisode : undefined}
        onPreviousEpisode={isSeries ? nav.handlePreviousEpisode : undefined}
        hasNextEpisode={isSeries && nav.currentEpisodeIndex < nav.currentEpisodeList.length - 1}
        hasPreviousEpisode={isSeries && nav.currentEpisodeIndex > 0}
      />
    );
  }

  // Render screens
  const renderScreen = () => {
    switch (nav.currentScreen) {
      case 'home':
        // Use new mobile browse screen on mobile
        if (isMobile && useMobileBrowse) {
          return (
            <MobileBrowseScreen
              channels={channels}
              onTMDBSelect={handleTMDBSelect}
              onChannelSelect={handleHomeChannelSelect}
              onNavigate={nav.handleNavigate}
              onSearchClick={() => nav.setIsSearchOpen(true)}
            />
          );
        }
        return (
          <MiHomeScreen
            channelCount={liveCount}
            movieCount={movieCount}
            seriesCount={seriesCount}
            sportsCount={sportsCount}
            loading={loading}
            onNavigate={nav.handleNavigate}
            onReload={handleReload}
            onCatchUp={nav.handleOpenCatchUp}
            onSearchClick={() => nav.setIsSearchOpen(true)}
            onVoiceSearchClick={() => nav.setIsSearchOpen(true)}
            onContinueWatchingSelect={nav.handleContinueWatchingSelect}
            onTMDBSelect={handleTMDBSelect}
            channels={channels}
            onChannelSelect={handleHomeChannelSelect}
          />
        );

      case 'catchup':
        return (
          <MiCatchUpPage
            onSelect={nav.handleCatchUpSelect}
            onBack={() => nav.setCurrentScreen('home')}
          />
        );

      case 'settings':
        return (
          <MiSettingsPage
            onBack={() => nav.setCurrentScreen('home')}
            onPlaylistChange={handlePlaylistChange}
          />
        );

      case 'detail':
        if (nav.selectedItem) {
          return (
            <MiMovieDetail
              item={nav.selectedItem}
              onBack={() => nav.setCurrentScreen(nav.previousScreen as Screen)}
              onPlay={nav.handlePlayFromDetail}
              onToggleFavorite={() => nav.handleToggleFavorite(nav.selectedItem!.id)}
              isFavorite={nav.favorites.has(nav.selectedItem.id)}
            />
          );
        }
        return null;

      case 'series-detail':
        if (nav.selectedItem) {
          return (
            <MiSeriesDetail
              item={nav.selectedItem}
              onBack={() => nav.setCurrentScreen(nav.previousScreen as Screen)}
              onPlayEpisode={nav.handlePlayEpisode}
              onToggleFavorite={() => nav.handleToggleFavorite(nav.selectedItem!.id)}
              isFavorite={nav.favorites.has(nav.selectedItem.id)}
            />
          );
        }
        return null;

      case 'movies':
      case 'series':
        return (
          <div className="h-screen bg-background overflow-hidden">
            <MiMediaGrid
              key={nav.currentScreen}
              items={filteredChannelsByCategory}
              favorites={nav.favorites}
              onItemSelect={(item, selectedGroup) => nav.handleItemSelect(item, nav.currentScreen, selectedGroup)}
              onToggleFavorite={nav.handleToggleFavorite}
              onBack={() => nav.setCurrentScreen('home')}
              category={nav.currentScreen}
              initialSelectedGroup={nav.selectedMediaGroup}
            />
          </div>
        );

      case 'live':
      case 'sports':
        return (
          <div className="h-screen bg-background overflow-hidden">
            <MiLiveTVList
              key={nav.currentScreen}
              channels={filteredChannelsByCategory}
              currentChannel={nav.currentChannel}
              favorites={nav.favorites}
              searchQuery={searchQuery}
              showFavoritesOnly={showFavoritesOnly}
              onChannelSelect={nav.handleChannelSelect}
              onToggleFavorite={nav.handleToggleFavorite}
              onBack={() => nav.setCurrentScreen('home')}
              category={nav.currentScreen}
            />
          </div>
        );

      default:
        return (
          <MiHomeScreen
            channelCount={liveCount}
            movieCount={movieCount}
            seriesCount={seriesCount}
            sportsCount={sportsCount}
            loading={loading}
            onNavigate={nav.handleNavigate}
            onReload={handleReload}
            onCatchUp={nav.handleOpenCatchUp}
            onSearchClick={() => nav.setIsSearchOpen(true)}
            onVoiceSearchClick={() => nav.setIsSearchOpen(true)}
            onContinueWatchingSelect={nav.handleContinueWatchingSelect}
            onTMDBSelect={handleTMDBSelect}
            channels={channels}
            onChannelSelect={handleHomeChannelSelect}
          />
        );
    }
  };

  return (
    <>
      {renderScreen()}


      <AnimatePresence>
        {nav.showMiniPlayer && nav.currentChannel && nav.currentScreen !== 'home' && (
          <MiniPlayer
            channel={nav.currentChannel}
            onExpand={() => {
              nav.handleChannelSelect(nav.currentChannel!);
            }}
            onClose={() => nav.handleCloseFullscreen(false)}
          />
        )}
      </AnimatePresence>

      <GlobalSearchModal
        isOpen={nav.isSearchOpen}
        onClose={() => nav.setIsSearchOpen(false)}
        channels={channels}
        onChannelSelect={nav.handleChannelSelect}
        onItemSelect={nav.handleSearchItemSelect}
      />

      {nav.selectedTMDBItem && (
        <TMDBDetailModal
          item={nav.selectedTMDBItem}
          allChannels={channels}
          onClose={() => nav.setSelectedTMDBItem(null)}
          onPlayIPTV={handlePlayIPTVFromTMDB}
        />
      )}
    </>
  );
};

export default Index;
