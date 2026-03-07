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

// Default playlist URLs - ONLY these should be active
const DEFAULT_PLAYLISTS: { url: string; name: string }[] = [
  { url: 'http://ccirskjs.arabiatv.org/get.php?username=PRINCEAZAZY&password=ELAZAZY&type=m3u_plus&output=mpegts', name: 'Arabia TV' },
];

// Version key to track when defaults change - bump this to force cleanup
const PLAYLIST_CONFIG_VERSION_KEY = 'mi-player-playlist-config-version';
const CURRENT_CONFIG_VERSION = 3; // Bump to force re-sync

// Migrate from old single-playlist storage and enforce ONLY default playlists
export const migrateFromLegacyStorage = (): void => {
  const storedVersion = parseInt(localStorage.getItem(PLAYLIST_CONFIG_VERSION_KEY) || '0', 10);
  
  if (storedVersion < CURRENT_CONFIG_VERSION) {
    // Clear ALL old playlists and set only the defaults
    console.log(`Playlist config version ${storedVersion} -> ${CURRENT_CONFIG_VERSION}: resetting to defaults only`);
    
    const freshSources: PlaylistSource[] = DEFAULT_PLAYLISTS.map((def, idx) => ({
      id: `default-${idx}-${Date.now()}`,
      name: def.name,
      url: def.url,
      enabled: true,
      type: 'url' as const,
      addedAt: Date.now(),
    }));
    
    savePlaylistSources(freshSources);
    localStorage.setItem(PLAYLIST_CONFIG_VERSION_KEY, String(CURRENT_CONFIG_VERSION));
    
    // Clean up legacy keys
    localStorage.removeItem('mi-player-playlist-url');
    console.log(`Set ${freshSources.length} default playlist(s): ${freshSources.map(s => s.name).join(', ')}`);
    return;
  }
  
  // Normal startup: ensure defaults exist
  const currentSources = getPlaylistSources();
  if (currentSources.length === 0) {
    for (const def of DEFAULT_PLAYLISTS) {
      addPlaylistSource(def.url, def.name, 'url');
      console.log(`Added default playlist: ${def.name}`);
    }
  }
};
