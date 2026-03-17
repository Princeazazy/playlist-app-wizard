const STORAGE_KEY = 'mi_watch_progress';
const SAVE_INTERVAL = 5; // Save every 5 seconds of playback
const MIN_PROGRESS_TO_SAVE = 10; // Minimum seconds watched to save
const RESUME_THRESHOLD = 0.95; // Don't resume if > 95% complete

export type ContentType = 'live' | 'movie' | 'series' | 'sports' | 'unknown';

export interface WatchProgress {
  channelId: string;
  channelName: string;
  position: number; // seconds
  duration: number;
  timestamp: number; // when it was saved
  logo?: string;
  url?: string;
  contentType?: ContentType;
  group?: string;
}

const LAST_PLAYED_KEY = 'mi_last_played';
const MAX_LAST_PLAYED = 50;

export interface LastPlayed {
  channelId: string;
  channelName: string;
  url: string;
  logo?: string;
  type?: string;
  group?: string;
  contentType?: ContentType;
  timestamp: number;
}

type LastPlayedStore = LastPlayed[];

const readLastPlayedStore = (): LastPlayedStore => {
  try {
    const stored = localStorage.getItem(LAST_PLAYED_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed as LastPlayedStore;
    // Back-compat: previous versions stored a single object
    if (parsed && typeof parsed === 'object') return [parsed as LastPlayed];
    return [];
  } catch {
    return [];
  }
};

const writeLastPlayedStore = (items: LastPlayedStore) => {
  try {
    localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
};

interface WatchProgressStore {
  [channelId: string]: WatchProgress;
}

// Determine content type from group/url
export const getContentType = (group?: string, url?: string): ContentType => {
  const g = group?.toLowerCase() || '';
  const u = url?.toLowerCase() || '';
  
  if (g.includes('movie') || u.includes('/movie/')) return 'movie';
  if (g.includes('series') || u.includes('/series/')) return 'series';
  if (g.includes('sport')) return 'sports';
  if (g.includes('live') || !g.includes('vod')) return 'live';
  return 'unknown';
};

// Get all watch progress entries
export const getWatchProgress = (): WatchProgressStore => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Get progress for a specific channel
export const getChannelProgress = (channelId: string): WatchProgress | null => {
  const store = getWatchProgress();
  return store[channelId] || null;
};

// Save progress for a channel
export const saveWatchProgress = (
  channelId: string,
  channelName: string,
  position: number,
  duration: number,
  logo?: string,
  url?: string,
  group?: string
): void => {
  // Don't save if barely started or almost finished (for VOD only)
  const contentType = getContentType(group, url);
  if (contentType !== 'live' && position < MIN_PROGRESS_TO_SAVE) return;
  if (duration > 0 && position / duration > RESUME_THRESHOLD) {
    // If finished watching, remove the progress
    removeWatchProgress(channelId);
    return;
  }

  try {
    const store = getWatchProgress();
    store[channelId] = {
      channelId,
      channelName,
      position,
      duration,
      timestamp: Date.now(),
      logo,
      url,
      contentType,
      group,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save watch progress:', e);
  }
};

// Remove progress for a channel
export const removeWatchProgress = (channelId: string): void => {
  try {
    const store = getWatchProgress();
    delete store[channelId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to remove watch progress:', e);
  }
};

// Get recent watch progress (for "Continue Watching" section)
export const getRecentWatchProgress = (limit = 10): WatchProgress[] => {
  const store = getWatchProgress();
  return Object.values(store)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};

// Get recent watch progress filtered by content type
export const getRecentByType = (type: ContentType, limit = 5): WatchProgress[] => {
  const store = getWatchProgress();
  return Object.values(store)
    .filter((item) => item.contentType === type)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};

export const saveLastPlayed = (input: Omit<LastPlayed, 'timestamp'>) => {
  try {
    const payload: LastPlayed = {
      ...input,
      contentType: input.contentType ?? getContentType(input.group, input.url),
      timestamp: Date.now(),
    };

    const current = readLastPlayedStore();
    const deduped = current.filter(
      (x) => x.channelId !== payload.channelId && x.url !== payload.url
    );
    const next = [payload, ...deduped].slice(0, MAX_LAST_PLAYED);
    writeLastPlayedStore(next);
  } catch {
    // ignore
  }
};

export const getLastPlayed = (): LastPlayed | null => {
  try {
    const store = readLastPlayedStore();
    return store[0] || null;
  } catch {
    return null;
  }
};

export const getRecentLastPlayed = (limit = 10): LastPlayed[] => {
  const store = readLastPlayedStore();
  return store
    .slice()
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, limit);
};

export const getRecentLastPlayedByType = (type: ContentType, limit = 5): LastPlayed[] => {
  const store = readLastPlayedStore();
  return store
    .filter((item) => (item.contentType ?? getContentType(item.group, item.url)) === type)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, limit);
};

export const lastPlayedToWatchProgress = (item: LastPlayed): WatchProgress => ({
  channelId: item.channelId,
  channelName: item.channelName,
  position: 0,
  duration: 0,
  timestamp: item.timestamp,
  logo: item.logo,
  url: item.url,
  contentType: item.contentType ?? getContentType(item.group, item.url),
  group: item.group,
});

export const getRecentPlayedAsProgressByType = (type: ContentType, limit = 5): WatchProgress[] => {
  return getRecentLastPlayedByType(type, limit).map(lastPlayedToWatchProgress);
};

// Clear all watch progress
export const clearAllWatchProgress = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear watch progress:', e);
  }
};

// Custom hook for managing watch progress in a player component
export const useWatchProgress = (
  channelId: string | undefined,
  channelName: string,
  logo?: string,
  url?: string,
  group?: string
) => {
  const savedProgress = channelId ? getChannelProgress(channelId) : null;

  // Only consider saved progress valid if the URL matches (prevents stale/wrong resume prompts)
  const isProgressValid = !!(
    savedProgress &&
    savedProgress.position > MIN_PROGRESS_TO_SAVE &&
    url &&
    savedProgress.url &&
    savedProgress.url === url
  );

  const saveProgress = (position: number, duration: number) => {
    if (!channelId) return;
    saveWatchProgress(channelId, channelName, position, duration, logo, url, group);
  };

  const clearProgress = () => {
    if (channelId) {
      removeWatchProgress(channelId);
    }
  };

  return {
    savedPosition: isProgressValid ? savedProgress!.position : 0,
    hasSavedProgress: isProgressValid,
    saveProgress,
    clearProgress,
    saveInterval: SAVE_INTERVAL,
  };
};
