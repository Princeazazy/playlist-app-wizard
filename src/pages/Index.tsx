import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Channel } from '@/hooks/useIPTV';
import { NormalizedChannel, ProviderAccount } from '@/lib/providers/types';
import {
  getActiveAccount,
  getProviderAccounts,
  setActiveAccountId,
  clearActiveAccount,
  clearProviderCache,
  fetchProviderAccounts,
} from '@/lib/providers/storage';
import { useProviderContent } from '@/hooks/useProviderContent';
import { isLoggedIn, clearAppSession } from '@/lib/appSession';
import { LoginScreen } from '@/components/LoginScreen';
import { ProviderSetup } from '@/components/ProviderSetup';
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
import universeLogo from '@/assets/universe-tv-logo.png';

// Adapt NormalizedChannel to Channel for backward compat
const toChannel = (nc: NormalizedChannel): Channel => ({
  id: nc.id,
  name: nc.name,
  url: nc.url,
  logo: nc.logo,
  group: nc.group,
  type: nc.type,
  stream_id: nc.streamId,
  series_id: nc.seriesId,
  rating: nc.rating,
  year: nc.year,
  plot: nc.plot,
  cast: nc.cast,
  director: nc.director,
  genre: nc.genre,
  duration: nc.duration,
  container_extension: nc.containerExtension,
  backdrop_path: nc.backdropPath,
  isLocal: nc.isLocal,
});

const Index = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [authenticated, setAuthenticated] = useState(() => isLoggedIn());
  const [sessionValidated, setSessionValidated] = useState(false);

  // Validate session on mount — clear stale sessions
  useEffect(() => {
    if (!isLoggedIn()) {
      setSessionValidated(true);
      return;
    }
    // Quick validation: try to list providers; if it fails with auth error, clear session
    fetchProviderAccounts()
      .then(() => setSessionValidated(true))
      .catch(() => {
        clearAppSession();
        clearProviderCache();
        clearActiveAccount();
        setAuthenticated(false);
        setSessionValidated(true);
      });
  }, []);

  // Provider state
  const [activeAccount, setActiveAccount] = useState<ProviderAccount | null>(() => getActiveAccount());
  const [showProviderSetup, setShowProviderSetup] = useState(false);
  const [cachedAccounts, setCachedAccounts] = useState<ProviderAccount[]>(() => getProviderAccounts());
  const [accountsLoaded, setAccountsLoaded] = useState(false);

  // Content from active provider
  const { channels: rawChannels, loading, error, refresh } = useProviderContent(activeAccount);

  // Convert normalized channels to legacy Channel type for existing components
  const channels: Channel[] = useMemo(() => rawChannels.map(toChannel), [rawChannels]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [useMobileBrowse, setUseMobileBrowse] = useState(true);
  const isMobile = useIsMobile();

  const nav = useAppNavigation();

  // Fetch accounts from DB once authenticated & restore active account
  useEffect(() => {
    if (authenticated) {
      fetchProviderAccounts().then(accounts => {
        setCachedAccounts(accounts);
        // Restore active account from stored ID (survives app restarts)
        const storedId = activeAccount?.id || localStorage.getItem('iptv-active-account-id');
        if (storedId) {
          const fresh = accounts.find(a => a.id === storedId);
          if (fresh) {
            setActiveAccount(fresh);
            setActiveAccountId(fresh.id);
          }
        } else if (!activeAccount && accounts.length === 1) {
          // Auto-select if only one account exists
          setActiveAccount(accounts[0]);
          setActiveAccountId(accounts[0].id);
        }
        setAccountsLoaded(true);
      }).catch(() => { setAccountsLoaded(true); });
    }
  }, [authenticated]);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
  }, []);

  const handleLogin = useCallback(() => {
    nav.handleNavigate('home');
    setAuthenticated(true);
  }, [nav]);

  const handleProviderReady = useCallback((account: ProviderAccount) => {
    setActiveAccount(account);
    setShowProviderSetup(false);
    setCachedAccounts(getProviderAccounts());
  }, []);

  const handleSwitchProvider = useCallback(() => {
    setShowProviderSetup(true);
  }, []);

  const handleSignOut = useCallback(() => {
    clearAppSession();
    clearProviderCache();
    clearActiveAccount();
    setActiveAccount(null);
    setAuthenticated(false);
    setShowProviderSetup(false);
    setCachedAccounts([]);
  }, []);

  // Count channels by type
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

  // Filter channels by current screen
  const filteredChannelsByCategory = useMemo(() => {
    if (nav.currentScreen === 'home' || nav.currentScreen === 'settings' || nav.currentScreen === 'detail') {
      return channels;
    }
    if (nav.currentScreen === 'live') return channelsByType.live;
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
    refresh();
  }, [refresh]);

  // Auto-refresh every 30 min
  useEffect(() => {
    const interval = setInterval(() => refresh(), 2 * 60 * 60 * 1000);
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
    // Refresh content in-place without leaving the current screen
    refresh();
    // Stay on current screen (don't navigate away)
  }, [refresh]);

  const handleHomeChannelSelect = useCallback((channel: Channel) => {
    nav.handleItemSelect(channel, 'home');
  }, [nav]);

  const normalizeTitle = useCallback((title: string) => {
    return title.toLowerCase().replace(/^(the|a|an)\s+/i, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  }, []);

  const findIPTVMatch = useCallback((tmdbTitle: string, tmdbYear: string | undefined, mediaType: 'movie' | 'tv') => {
    const searchTitle = normalizeTitle(tmdbTitle);
    const contentPool = mediaType === 'tv' ? channelsByType.series : channelsByType.movies;
    let bestMatch: Channel | null = null;
    let bestScore = 0;

    for (const channel of contentPool) {
      const channelTitle = normalizeTitle(channel.name);
      let score = 0;
      if (channelTitle === searchTitle) score = 100;
      else if (channelTitle.includes(searchTitle)) score = 85;
      else if (searchTitle.includes(channelTitle) && channelTitle.length > 3) score = 80;
      else {
        const searchWords = searchTitle.split(' ').filter(w => w.length > 2);
        const channelWords = channelTitle.split(' ').filter(w => w.length > 2);
        if (searchWords.length > 0 && channelWords.length > 0) {
          const matchedWords = searchWords.filter(sw => channelWords.some(cw => cw === sw || cw.includes(sw) || sw.includes(cw)));
          const matchRatio = matchedWords.length / searchWords.length;
          if (matchRatio >= 0.5) score = matchRatio * 70;
        }
      }
      if (score > 0 && tmdbYear && channel.name.includes(tmdbYear)) score += 15;
      if (score > bestScore && score >= 40) { bestScore = score; bestMatch = channel; }
    }
    return bestMatch;
  }, [channelsByType, normalizeTitle]);

  const handleTMDBSelect = useCallback((item: TMDBItem) => {
    const match = findIPTVMatch(item.title, item.year, item.mediaType);
    if (match) nav.handleItemSelect(match, 'home');
    else nav.setSelectedTMDBItem(item);
  }, [findIPTVMatch, nav]);

  const handlePlayIPTVFromTMDB = useCallback((channel: Channel) => {
    nav.setSelectedTMDBItem(null);
    nav.handleItemSelect(channel, 'home');
  }, [nav]);

  // ── Render gates ──────────────────────────────────────────

  // 1. Intro
  if (showIntro) {
    return <ArabiaIntro onComplete={handleIntroComplete} />;
  }

  // 2. Session validation
  if (!sessionValidated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 3. App auth
  if (!authenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // 4. Provider setup — only show if user explicitly requested it, or no account after loading
  if (showProviderSetup || (!activeAccount && accountsLoaded)) {
    return (
      <ProviderSetup
        onProviderReady={handleProviderReady}
        existingAccounts={cachedAccounts}
        onSignOut={handleSignOut}
      />
    );
  }

  // 4b. Still loading accounts — show spinner
  if (!activeAccount && !accountsLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 4. Error state
  if (error && channels.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="flex items-center justify-center mb-6">
            <img src={universeLogo} alt="Universe TV" className="h-20 w-auto opacity-50" />
          </div>
          <p className="text-destructive mb-2 font-semibold text-lg">Failed to load channels</p>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => refresh()} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium">
              Try Again
            </button>
            <button onClick={handleSwitchProvider} className="px-6 py-3 bg-card border border-border rounded-xl text-foreground hover:bg-card/80 transition-colors font-medium">
              Switch Provider
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Fullscreen player
  if (nav.isFullscreen && nav.currentChannel) {
    const isSeries = nav.currentChannel.type === 'series' ||
      nav.currentChannel.group?.toLowerCase().includes('series') ||
      nav.currentChannel.url?.includes('/series/');
    const isLiveTV = nav.currentChannel.type === 'live' || nav.currentChannel.type === 'sports' ||
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

  // 6. Main screens
  const renderScreen = () => {
    switch (nav.currentScreen) {
      case 'home':
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
        return <MiCatchUpPage onSelect={nav.handleCatchUpSelect} onBack={() => nav.setCurrentScreen('home')} />;

      case 'settings':
        return (
          <MiSettingsPage
            onBack={() => nav.setCurrentScreen('home')}
            onPlaylistChange={handlePlaylistChange}
            onSignOut={handleSignOut}
            onSwitchProvider={handleSwitchProvider}
            activeProvider={activeAccount}
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
              providerConfig={activeAccount?.config}
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
            channelCount={liveCount} movieCount={movieCount} seriesCount={seriesCount} sportsCount={sportsCount}
            loading={loading} onNavigate={nav.handleNavigate} onReload={handleReload}
            onCatchUp={nav.handleOpenCatchUp} onSearchClick={() => nav.setIsSearchOpen(true)}
            onVoiceSearchClick={() => nav.setIsSearchOpen(true)} onContinueWatchingSelect={nav.handleContinueWatchingSelect}
            onTMDBSelect={handleTMDBSelect} channels={channels} onChannelSelect={handleHomeChannelSelect}
          />
        );
    }
  };

  return (
    <>
      <BackgroundMusic src="/audio/cosmic-ambient.mp3" autoPlay={true} defaultVolume={0.25} />
      {renderScreen()}

      {nav.showMiniPlayer && nav.currentChannel && nav.currentScreen !== 'home' && (
        <MiniPlayer
          channel={nav.currentChannel}
          onExpand={() => nav.handleChannelSelect(nav.currentChannel!)}
          onClose={() => nav.handleCloseFullscreen(false)}
        />
      )}

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
