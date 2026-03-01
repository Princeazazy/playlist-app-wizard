import { useState, useCallback } from 'react';
import { Channel } from '@/hooks/useIPTV';
import { WatchProgress, getChannelProgress } from '@/hooks/useWatchProgress';
import { TMDBItem } from '@/hooks/useTMDB';
import { useToast } from '@/hooks/use-toast';

export type Screen = 'home' | 'live' | 'movies' | 'series' | 'sports' | 'settings' | 'detail' | 'series-detail' | 'catchup';

interface UseAppNavigationReturn {
  currentScreen: Screen;
  previousScreen: Screen;
  selectedItem: Channel | null;
  currentChannel: Channel | null;
  isFullscreen: boolean;
  showMiniPlayer: boolean;
  isSearchOpen: boolean;
  selectedTMDBItem: TMDBItem | null;
  currentEpisodeList: Array<{ url: string; title: string }>;
  currentEpisodeIndex: number;
  favorites: Set<string>;
  selectedMediaGroup: string;
  setCurrentScreen: (screen: Screen) => void;
  setIsSearchOpen: (open: boolean) => void;
  setSelectedTMDBItem: (item: TMDBItem | null) => void;
  handleNavigate: (section: 'live' | 'movies' | 'series' | 'sports' | 'settings' | 'home') => void;
  handleChannelSelect: (channel: Channel) => void;
  handleItemSelect: (item: Channel, currentScreen: Screen, selectedGroup?: string) => void;
  handleSearchItemSelect: (item: Channel) => void;
  handlePlayFromDetail: () => void;
  handlePlayEpisode: (episodeUrl: string, episodeTitle: string, episodeList?: Array<{ url: string; title: string }>, episodeIndex?: number) => void;
  handleNextEpisode: () => void;
  handlePreviousEpisode: () => void;
  handleToggleFavorite: (channelId: string) => void;
  handleCloseFullscreen: (isLiveTV: boolean) => void;
  handleCatchUpSelect: (item: WatchProgress) => void;
  handleContinueWatchingSelect: (channelId: string) => void;
  handleOpenCatchUp: () => void;
}

export const useAppNavigation = (): UseAppNavigationReturn => {
  const [currentScreen, setCurrentScreenRaw] = useState<Screen>('home');
  const [previousScreen, setPreviousScreen] = useState<Screen>('home');
  const [selectedItem, setSelectedItem] = useState<Channel | null>(null);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedTMDBItem, setSelectedTMDBItem] = useState<TMDBItem | null>(null);
  const [currentEpisodeList, setCurrentEpisodeList] = useState<Array<{ url: string; title: string }>>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('iptv-favorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [selectedMediaGroup, setSelectedMediaGroup] = useState<string>('all');

  const { toast } = useToast();

  const setCurrentScreen = useCallback((screen: Screen) => {
    setCurrentScreenRaw(screen);
    if (screen === 'home') {
      setShowMiniPlayer(false);
      setCurrentChannel(null);
    }
  }, []);

  const handleNavigate = useCallback((section: 'live' | 'movies' | 'series' | 'sports' | 'settings' | 'home') => {
    setCurrentScreenRaw(section);
    if (section === 'home') {
      setShowMiniPlayer(false);
      setCurrentChannel(null);
    }
  }, []);

  const handleChannelSelect = useCallback((channel: Channel) => {
    setCurrentChannel(channel);
    setShowMiniPlayer(false);
    setIsFullscreen(true);
  }, []);

  const handleItemSelect = useCallback((item: Channel, screen: Screen, selectedGroup?: string) => {
    setSelectedItem(item);
    setPreviousScreen(screen);
    if (selectedGroup) {
      setSelectedMediaGroup(selectedGroup);
    }
    setCurrentScreen(item.type === 'series' ? 'series-detail' : 'detail');
  }, []);

  const handleSearchItemSelect = useCallback((item: Channel) => {
    setSelectedItem(item);
    setPreviousScreen('home');
    setCurrentScreen(item.type === 'series' ? 'series-detail' : 'detail');
  }, []);

  const handlePlayFromDetail = useCallback(() => {
    if (selectedItem) {
      setCurrentChannel(selectedItem);
      setIsFullscreen(true);
    }
  }, [selectedItem]);

  const handlePlayEpisode = useCallback((
    episodeUrl: string,
    episodeTitle: string,
    episodeList?: Array<{ url: string; title: string }>,
    episodeIndex?: number
  ) => {
    if (selectedItem) {
      const episodeChannel: Channel = {
        ...selectedItem,
        url: episodeUrl,
        name: `${selectedItem.name} - ${episodeTitle}`,
      };
      setCurrentChannel(episodeChannel);
      if (episodeList && episodeIndex !== undefined) {
        setCurrentEpisodeList(episodeList);
        setCurrentEpisodeIndex(episodeIndex);
      }
      setIsFullscreen(true);
    }
  }, [selectedItem]);

  const handleNextEpisode = useCallback(() => {
    if (currentEpisodeList.length === 0 || !selectedItem) return;
    const nextIndex = currentEpisodeIndex + 1;
    if (nextIndex < currentEpisodeList.length) {
      const nextEpisode = currentEpisodeList[nextIndex];
      setCurrentChannel({
        ...selectedItem,
        url: nextEpisode.url,
        name: `${selectedItem.name} - ${nextEpisode.title}`,
      });
      setCurrentEpisodeIndex(nextIndex);
    }
  }, [currentEpisodeList, currentEpisodeIndex, selectedItem]);

  const handlePreviousEpisode = useCallback(() => {
    if (currentEpisodeList.length === 0 || !selectedItem) return;
    const prevIndex = currentEpisodeIndex - 1;
    if (prevIndex >= 0) {
      const prevEpisode = currentEpisodeList[prevIndex];
      setCurrentChannel({
        ...selectedItem,
        url: prevEpisode.url,
        name: `${selectedItem.name} - ${prevEpisode.title}`,
      });
      setCurrentEpisodeIndex(prevIndex);
    }
  }, [currentEpisodeList, currentEpisodeIndex, selectedItem]);

  const handleToggleFavorite = useCallback((channelId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(channelId)) {
        newFavorites.delete(channelId);
        toast({ title: 'Removed from favorites', duration: 2000 });
      } else {
        newFavorites.add(channelId);
        toast({ title: 'Added to favorites', duration: 2000 });
      }
      localStorage.setItem('iptv-favorites', JSON.stringify(Array.from(newFavorites)));
      return newFavorites;
    });
  }, [toast]);

  const handleCloseFullscreen = useCallback((isLiveTV: boolean) => {
    setIsFullscreen(false);
    if (isLiveTV) {
      setShowMiniPlayer(true);
    } else {
      setShowMiniPlayer(false);
      setCurrentChannel(null);
    }
  }, []);

  const handleCatchUpSelect = useCallback((item: WatchProgress) => {
    const channelToPlay: Channel = {
      id: item.channelId,
      name: item.channelName,
      url: item.url || '',
      logo: item.logo,
      group: item.group,
      type: item.contentType === 'movie' ? 'movies' :
            item.contentType === 'series' ? 'series' :
            item.contentType === 'sports' ? 'sports' : 'live',
    };
    handleChannelSelect(channelToPlay);
  }, [handleChannelSelect]);

  const handleContinueWatchingSelect = useCallback((channelId: string) => {
    const progress = getChannelProgress(channelId);
    if (!progress) return;
    const channelToPlay: Channel = {
      id: progress.channelId,
      name: progress.channelName,
      url: progress.url || '',
      logo: progress.logo,
      group: progress.group,
      type: progress.contentType === 'movie' ? 'movies' :
            progress.contentType === 'series' ? 'series' :
            progress.contentType === 'sports' ? 'sports' : 'live',
    };
    handleChannelSelect(channelToPlay);
  }, [handleChannelSelect]);

  const handleOpenCatchUp = useCallback(() => {
    setCurrentScreen('catchup');
  }, []);

  return {
    currentScreen,
    previousScreen,
    selectedItem,
    currentChannel,
    isFullscreen,
    showMiniPlayer,
    isSearchOpen,
    selectedTMDBItem,
    currentEpisodeList,
    currentEpisodeIndex,
    favorites,
    selectedMediaGroup,
    setCurrentScreen,
    setIsSearchOpen,
    setSelectedTMDBItem,
    handleNavigate,
    handleChannelSelect,
    handleItemSelect,
    handleSearchItemSelect,
    handlePlayFromDetail,
    handlePlayEpisode,
    handleNextEpisode,
    handlePreviousEpisode,
    handleToggleFavorite,
    handleCloseFullscreen,
    handleCatchUpSelect,
    handleContinueWatchingSelect,
    handleOpenCatchUp,
  };
};
