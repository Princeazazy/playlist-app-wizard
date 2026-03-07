// Multi-playlist storage - allows users to add multiple M3U sources
// Content from all sources is merged in the app

const MULTI_PLAYLIST_KEY = 'mi-player-multi-playlists';

export interface PlaylistSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  type: 'url' | 'local';
  addedAt: number;
  lastFetched?: number;
  channelCount?: number;
}

// Get all saved playlist sources
export const getPlaylistSources = (): PlaylistSource[] => {
  try {
    const data = localStorage.getItem(MULTI_PLAYLIST_KEY);
    if (data) {
      const sources = JSON.parse(data);
      if (Array.isArray(sources)) {
        return sources;
      }
    }
  } catch (e) {
    console.warn('Failed to load playlist sources:', e);
  }
  return [];
};

// Save all playlist sources
export const savePlaylistSources = (sources: PlaylistSource[]): void => {
  try {
    localStorage.setItem(MULTI_PLAYLIST_KEY, JSON.stringify(sources));
    console.log(`Saved ${sources.length} playlist sources`);
  } catch (e) {
    console.warn('Failed to save playlist sources:', e);
  }
};

// Add a new playlist source
export const addPlaylistSource = (
  url: string, 
  name?: string, 
  type: 'url' | 'local' = 'url'
): PlaylistSource => {
  const sources = getPlaylistSources();
  
  // Check if already exists
  const existing = sources.find(s => s.url === url);
  if (existing) {
    return existing;
  }
  
  const newSource: PlaylistSource = {
    id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: name || `Playlist ${sources.length + 1}`,
    url,
    enabled: true,
    type,
    addedAt: Date.now(),
  };
  
  sources.push(newSource);
  savePlaylistSources(sources);
  return newSource;
};

// Update a playlist source
export const updatePlaylistSource = (id: string, updates: Partial<PlaylistSource>): void => {
  const sources = getPlaylistSources();
  const index = sources.findIndex(s => s.id === id);
  
  if (index !== -1) {
    sources[index] = { ...sources[index], ...updates };
    savePlaylistSources(sources);
  }
};

// Remove a playlist source
export const removePlaylistSource = (id: string): void => {
  const sources = getPlaylistSources();
  const filtered = sources.filter(s => s.id !== id);
  savePlaylistSources(filtered);
};

// Toggle playlist source enabled/disabled
export const togglePlaylistSource = (id: string): void => {
  const sources = getPlaylistSources();
  const source = sources.find(s => s.id === id);
  
  if (source) {
    source.enabled = !source.enabled;
    savePlaylistSources(sources);
  }
};

// Get enabled playlist URLs
export const getEnabledPlaylistUrls = (): string[] => {
  const sources = getPlaylistSources();
  return sources
    .filter(s => s.enabled && s.url)
    .map(s => s.url);
};

// Check if we have any playlist sources
export const hasPlaylistSources = (): boolean => {
  return getPlaylistSources().length > 0;
};

// Default playlist URLs
const DEFAULT_PLAYLISTS: { url: string; name: string }[] = [
  { url: 'http://ccirskjs.arabiatv.org/get.php?username=PRINCEAZAZY&password=ELAZAZY&type=m3u_plus&output=mpegts', name: 'Arabia TV' },
  { url: 'http://mnhbkmrs.teck-tv.com/get.php?username=3625A2C&password=95BF235&type=webtvlist&output=mpegts', name: 'Teck TV' },
];

// Migrate from old single-playlist storage and ensure default playlists exist
export const migrateFromLegacyStorage = (): void => {
  const sources = getPlaylistSources();
  
  // If no sources at all, check legacy first
  if (sources.length === 0) {
    const legacyUrl = localStorage.getItem('mi-player-playlist-url');
    if (legacyUrl) {
      addPlaylistSource(legacyUrl, 'Primary Playlist', 'url');
      console.log('Migrated legacy playlist URL to multi-playlist system');
    }
  }
  
  // Ensure all default playlists are present
  const currentSources = getPlaylistSources();
  for (const def of DEFAULT_PLAYLISTS) {
    const alreadyExists = currentSources.some(s => s.url === def.url);
    if (!alreadyExists) {
      addPlaylistSource(def.url, def.name, 'url');
      console.log(`Added default playlist: ${def.name}`);
    }
  }
};
