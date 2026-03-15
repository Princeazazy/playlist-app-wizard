// ═══════════════════════════════════════════════════════════════
// Multi-Provider IPTV Architecture — Core Type Definitions
// ═══════════════════════════════════════════════════════════════

/** Login method / provider type */
export type ProviderType = 'xtream' | 'm3u' | 'access_code';

/** Connection status of a provider */
export type ProviderStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ── Provider Configuration ──────────────────────────────────

export interface XtreamConfig {
  type: 'xtream';
  serverUrl: string;      // e.g. http://example.com:8080
  username: string;
  password: string;
}

export interface M3UConfig {
  type: 'm3u';
  m3uUrl: string;
  epgUrl?: string;
}

export interface AccessCodeConfig {
  type: 'access_code';
  serverUrl: string;
  accessCode: string;
}

export type ProviderConfig = XtreamConfig | M3UConfig | AccessCodeConfig;

// ── Provider Account (persisted) ────────────────────────────

export interface ProviderAccount {
  id: string;
  name: string;                    // User-defined label ("My Provider", "Home IPTV")
  config: ProviderConfig;
  createdAt: number;
  lastUsedAt: number;
  // Optional branding from provider
  providerName?: string;
  providerLogo?: string;
  // Xtream-specific account info returned by server
  accountInfo?: XtreamAccountInfo;
  // Provider-specific settings
  settings?: ProviderSettings;
}

export interface XtreamAccountInfo {
  username: string;
  status: string;
  expDate: string | null;
  isTrial: boolean;
  activeCons: number;
  maxConnections: number;
  createdAt: string;
  serverInfo?: {
    url: string;
    port: string;
    httpsPort: string;
    rtmpPort: string;
    timezone: string;
    serverProtocol: string;
  };
}

export interface ProviderSettings {
  preferredOutputFormat?: 'ts' | 'm3u8' | 'hls';
  epgUrl?: string;
  customHeaders?: Record<string, string>;
  // Playback preferences
  useProxy?: boolean;
  bufferSize?: number;
  // Theme overrides
  themeColor?: string;
  logo?: string;
  appName?: string;
}

// ── Normalized Content Model ────────────────────────────────
// All provider types map into this common format

export type ContentType = 'live' | 'movies' | 'series' | 'sports';

export interface NormalizedChannel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  type: ContentType;
  // Source tracking
  providerId: string;
  // Extended metadata (from Xtream API or M3U tags)
  streamId?: number;
  seriesId?: number;
  rating?: string;
  year?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  duration?: string;
  containerExtension?: string;
  backdropPath?: string[];
  // EPG
  epgChannelId?: string;
  // Flags
  isLocal?: boolean;
}

export interface NormalizedCategory {
  id: string;
  name: string;
  parentId?: string;
  type: ContentType;
  providerId: string;
}

// ── Provider Interface ──────────────────────────────────────
// Each provider type implements this interface

export interface IProviderClient {
  /** Validate credentials / URL and return account info */
  authenticate(config: ProviderConfig): Promise<{
    success: boolean;
    error?: string;
    accountInfo?: XtreamAccountInfo;
    providerName?: string;
  }>;

  /** Fetch all categories */
  fetchCategories(config: ProviderConfig): Promise<NormalizedCategory[]>;

  /** Fetch all channels/content */
  fetchContent(config: ProviderConfig, options?: FetchOptions): Promise<NormalizedChannel[]>;

  /** Build a stream URL for playback */
  getStreamUrl(channel: NormalizedChannel, config: ProviderConfig): string;

  /** Get series info (seasons/episodes) */
  getSeriesInfo?(seriesId: number, config: ProviderConfig): Promise<SeriesDetail | null>;

  /** Get VOD info */
  getVodInfo?(streamId: number, config: ProviderConfig): Promise<VodDetail | null>;
}

export interface FetchOptions {
  maxChannels?: number;
  maxBytesMB?: number;
  maxReturnPerType?: number;
  signal?: AbortSignal;
}

export interface SeriesDetail {
  info: {
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    rating: string;
    backdropPath: string[];
  };
  seasons: Array<{
    seasonNumber: number;
    name: string;
    episodes: Array<{
      id: string;
      episodeNum: number;
      title: string;
      containerExtension: string;
      url: string;
      info?: {
        duration?: string;
        plot?: string;
        releaseDate?: string;
        rating?: string;
        movieImage?: string;
      };
    }>;
  }>;
}

export interface VodDetail {
  info: {
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    rating: string;
    duration: string;
    backdropPath: string[];
  };
  streamUrl: string;
  subtitles?: Array<{ language: string; url: string }>;
}
