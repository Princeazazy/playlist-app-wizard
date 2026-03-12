// Centralized playlist URL storage (with backward-compat migration)

const PLAYLIST_STORAGE_KEY = 'mi-player-playlist-url';

// Older keys used by previous iterations / other IPTV apps.
const LEGACY_KEYS = [
  'iptv-playlist-url',
  'iptv_playlist_url',
  'm3u-url',
  'm3uUrl',
  'playlist-url',
  'playlistUrl',
  'mi-player-playlist',
  'mi-player-playlistUrl',
];

const looksLikeUrl = (value: string) => {
  const v = value.trim();
  return v.length > 8 && (/^[a-zA-Z]+:\/\//.test(v) || v.startsWith('www.'));
};

// Default IPTV playlist
// NOTE: This contains provider credentials; prefer setting via Settings → Change Playlist instead of hardcoding.
const DEFAULT_PLAYLIST_URL = 'https://cf.business-cdn-neo.su/get.php?username=1497x&password=211e58a55c&type=m3u_plus&output=ts';

export const getStoredPlaylistUrl = (): string => {
  try {
    const current = localStorage.getItem(PLAYLIST_STORAGE_KEY) || '';

    // If a URL is already stored, use it (but migrate away from known broken/old defaults).
    if (current.trim()) {
      const trimmed = current.trim();
      const isOldDemo =
        trimmed.includes('btkq72.net') ||
        trimmed.includes('Test24445') ||
        trimmed.includes('9QSHPVU');

      if (isOldDemo) {
        localStorage.setItem(PLAYLIST_STORAGE_KEY, DEFAULT_PLAYLIST_URL);
        return DEFAULT_PLAYLIST_URL;
      }

      return trimmed;
    }

    // Migrate from legacy keys if present
    for (const key of LEGACY_KEYS) {
      const candidate = localStorage.getItem(key) || '';
      if (candidate && looksLikeUrl(candidate)) {
        localStorage.setItem(PLAYLIST_STORAGE_KEY, candidate.trim());
        return candidate.trim();
      }
    }

    // Return default playlist URL
    return DEFAULT_PLAYLIST_URL;
  } catch {
    return DEFAULT_PLAYLIST_URL;
  }
};

export const setStoredPlaylistUrl = (url: string) => {
  try {
    localStorage.setItem(PLAYLIST_STORAGE_KEY, url.trim());
  } catch {
    // ignore
  }
};

export const clearStoredPlaylistUrl = () => {
  try {
    localStorage.removeItem(PLAYLIST_STORAGE_KEY);
  } catch {
    // ignore
  }
};
