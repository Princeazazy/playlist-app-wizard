import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import Hls from 'hls.js';
import { supabase } from '@/integrations/supabase/client';
import { Channel } from '@/hooks/useIPTV';

export type PlaybackState = 'idle' | 'connecting' | 'buffering' | 'playing' | 'reconnecting' | 'failed';

interface UseResilientPlaybackOptions {
  videoRef: RefObject<HTMLVideoElement>;
  channel: Pick<Channel, 'id' | 'name' | 'url' | 'isLocal'>;
  isVOD?: boolean;
  forceMuted?: boolean;
  maxReconnectCycles?: number;
  startupTimeoutMs?: number;
  stalledThresholdMs?: number;
  logPrefix?: string;
  onManifestParsed?: (hls: Hls) => void;
  onSubtitleTracksUpdated?: (hls: Hls) => void;
}

interface UseResilientPlaybackResult {
  hlsRef: RefObject<Hls | null>;
  playbackState: PlaybackState;
  error: string | null;
  retryCount: number;
  activeSource: string | null;
  retryPlayback: () => void;
}

const RETRY_BACKOFF_MS = [200, 500, 1000, 2000] as const;

const isLikelyHlsUrl = (url: string): boolean => {
  if (/\.m3u8(\?.*)?$/i.test(url) || /(?:^|[?&])output=(m3u8|hls)\b/i.test(url)) return true;
  try {
    const parsed = new URL(url);
    const inner = parsed.searchParams.get('url');
    if (inner) {
      const decoded = decodeURIComponent(inner);
      return /\.m3u8(\?.*)?$/i.test(decoded) || /(?:^|[?&])output=(m3u8|hls)\b/i.test(decoded);
    }
  } catch { /* not a valid URL, skip */ }
  return false;
};

const isProxyWrappedUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes('/functions/v1/stream-proxy') && parsed.searchParams.has('url');
  } catch {
    return false;
  }
};

const isTsLikeUrl = (url: string): boolean => (
  /\/live\/.+\.ts(\?.*)?$/i.test(url) || /(?:^|[?&])output=ts\b/i.test(url)
);

/** Non-web-playable container formats */
const NON_WEB_EXTENSIONS = /\.(mkv|avi|wmv|flv|mov|webm|divx|rmvb|3gp)(\?.*)?$/i;

/** Detect path type from URL */
const getStreamType = (url: string): 'live' | 'movie' | 'series' | 'unknown' => {
  if (/\/live\//i.test(url)) return 'live';
  if (/\/movie\//i.test(url)) return 'movie';
  if (/\/series\//i.test(url)) return 'series';
  return 'unknown';
};

/** Swap file extension in Xtream-style URL */
const swapExtension = (url: string, newExt: string): string => {
  return url.replace(/\.[a-z0-9]{2,5}(\?.*)?$/i, `.${newExt}$1`);
};

const getRetryDelay = (cycle: number) => RETRY_BACKOFF_MS[Math.min(Math.max(cycle - 1, 0), RETRY_BACKOFF_MS.length - 1)];

const getBufferedSeconds = (video: HTMLVideoElement): number => {
  try {
    const currentTime = video.currentTime || 0;
    for (let i = 0; i < video.buffered.length; i += 1) {
      const start = video.buffered.start(i);
      const end = video.buffered.end(i);
      if (currentTime >= start && currentTime <= end) {
        return Math.max(0, end - currentTime);
      }
    }
  } catch {
    // ignore buffered range errors
  }
  return 0;
};

export const useResilientPlayback = ({
  videoRef,
  channel,
  isVOD = false,
  forceMuted = false,
  maxReconnectCycles = 3,
  startupTimeoutMs = 6000,
  stalledThresholdMs = 10000,
  logPrefix = 'Playback',
  onManifestParsed,
  onSubtitleTracksUpdated,
}: UseResilientPlaybackOptions): UseResilientPlaybackResult => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [manualRetryNonce, setManualRetryNonce] = useState(0);

  const hlsRef = useRef<Hls | null>(null);

  const log = useCallback((event: string, details?: Record<string, unknown>) => {
    console.info(`[${logPrefix}] ${event}`, {
      channelId: channel.id,
      channelName: channel.name,
      ...details,
    });
  }, [channel.id, channel.name, logPrefix]);

  const streamProxyUrl = useMemo(() => {
    const supabaseUrl = (supabase as any).supabaseUrl as string | undefined;
    if (!supabaseUrl) return '';
    return new URL('functions/v1/stream-proxy', supabaseUrl).toString();
  }, []);

  const sourceCandidates = useMemo(() => {
    const base = channel.url;
    if (!base) return [];

    const streamType = getStreamType(base);
    const variants: string[] = [];
    const finalCandidates: string[] = [];

    const addVariant = (candidate: string | undefined) => {
      if (!candidate) return;
      if (!variants.includes(candidate)) variants.push(candidate);
    };

    const addCandidate = (candidate: string | undefined, mode: 'direct' | 'proxy') => {
      if (!candidate) return;
      const value = mode === 'proxy' && streamProxyUrl
        ? `${streamProxyUrl}?url=${encodeURIComponent(candidate)}`
        : candidate;
      if (!finalCandidates.includes(value)) finalCandidates.push(value);
    };

    if (streamType === 'live') {
      if (isLikelyHlsUrl(base)) {
        addVariant(base);
      } else {
        addVariant(base);
        addVariant(swapExtension(base, 'm3u8'));
      }
    } else if (streamType === 'movie' || streamType === 'series') {
      if (NON_WEB_EXTENSIONS.test(base)) {
        addVariant(swapExtension(base, 'mp4'));
        addVariant(swapExtension(base, 'm3u8'));
      } else {
        addVariant(base);
        if (!/\.mp4(\?.*)?$/i.test(base) && !isLikelyHlsUrl(base)) {
          addVariant(swapExtension(base, 'mp4'));
        }
        if (!isLikelyHlsUrl(base)) {
          addVariant(swapExtension(base, 'm3u8'));
        }
      }
    } else {
      addVariant(base);
      if (!isLikelyHlsUrl(base)) addVariant(swapExtension(base, 'm3u8'));
    }

    for (const variant of variants) {
      const isHttp = variant.startsWith('http://');
      const isHttps = variant.startsWith('https://');
      const isHls = isLikelyHlsUrl(variant);

      if (channel.isLocal || Capacitor.isNativePlatform()) {
        addCandidate(variant, 'direct');
        continue;
      }

      if (isHttp) {
        addCandidate(variant, 'proxy');
        continue;
      }

      if (isHttps) {
        addCandidate(variant, 'direct');
        if (isHls) {
          addCandidate(variant, 'proxy');
        }
        continue;
      }

      addCandidate(variant, 'direct');
    }

    log('candidates_generated', {
      streamType,
      sourceUrl: base.slice(0, 180),
      variantCount: variants.length,
      candidateCount: finalCandidates.length,
      variants: variants.map(v => v.slice(0, 120)),
      candidates: finalCandidates.map(v => v.slice(0, 140)),
    });

    return finalCandidates;
  }, [channel.isLocal, channel.url, log, streamProxyUrl]);

  const retryPlayback = useCallback(() => {
    // Immediate UI reset so retry action feels responsive.
    setError(null);
    setRetryCount(0);
    setPlaybackState('connecting');
    setManualRetryNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !channel.url || sourceCandidates.length === 0) {
      setPlaybackState('failed');
      setError('No playable stream URL found.');
      return;
    }

    let canceled = false;
    let reconnectCycle = 0;
    let candidateIndex = 0;
    let lastFailureReason = 'unknown';
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let startupWatchdog: ReturnType<typeof setTimeout> | null = null;
    let stalledMonitor: ReturnType<typeof setInterval> | null = null;
    let detachVideoListeners: (() => void) | null = null;

    const clearTimers = () => {
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (startupWatchdog) {
        window.clearTimeout(startupWatchdog);
        startupWatchdog = null;
      }
      if (stalledMonitor) {
        window.clearInterval(stalledMonitor);
        stalledMonitor = null;
      }
      if (detachVideoListeners) {
        detachVideoListeners();
        detachVideoListeners = null;
      }
    };

    const teardownPlayback = () => {
      clearTimers();

      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {
          // no-op
        }
        hlsRef.current = null;
      }

      try {
        video.pause();
      } catch {
        // no-op
      }

      try {
        video.removeAttribute('src');
        video.load();
      } catch {
        // no-op
      }
    };

    const fail = (message: string, reason: string) => {
      if (canceled) return;
      setPlaybackState('failed');
      setError(message);
      log('fatal_error', { reason, reconnectCycle, lastFailureReason, sourceUrl: channel.url.slice(0, 200) });
    };

    const startCandidate = (trigger: string) => {
      if (canceled) return;

      if (candidateIndex >= sourceCandidates.length) {
        reconnectCycle += 1;

        if (reconnectCycle > maxReconnectCycles) {
          fail('Failed to play stream after multiple recovery attempts.', 'max_retries_exceeded');
          return;
        }

        const delay = getRetryDelay(reconnectCycle);
        setPlaybackState('reconnecting');
        setRetryCount(reconnectCycle);
        log('reconnecting', { reason: 'all_candidates_exhausted', reconnectCycle, delay });

        candidateIndex = 0;
        reconnectTimer = window.setTimeout(() => startCandidate('reconnect_timer'), delay);
        return;
      }

      const candidateUrl = sourceCandidates[candidateIndex++];
      const isHls = isLikelyHlsUrl(candidateUrl);

      teardownPlayback();
      setError(null);
      setActiveSource(candidateUrl);
      setPlaybackState(reconnectCycle > 0 ? 'reconnecting' : 'connecting');

      const resolvedProtocol = isProxyWrappedUrl(candidateUrl)
        ? 'PROXY'
        : candidateUrl.startsWith('https://')
          ? 'HTTPS'
          : candidateUrl.startsWith('http://')
            ? 'HTTP'
            : 'OTHER';

      log('player_init', {
        trigger,
        streamType,
        reconnectCycle,
        candidateIndex,
        candidateCount: sourceCandidates.length,
        isHls,
        sourceUrl: channel.url.slice(0, 200),
        finalPlaybackUrl: candidateUrl.slice(0, 200),
        protocol: resolvedProtocol,
        isProxy: isProxyWrappedUrl(candidateUrl),
      });

      let switchedCandidate = false;
      let networkRecoveries = 0;
      let mediaRecoveries = 0;
      let lastTime = 0;
      let stallSince = Date.now();
      const candidateStartedAt = performance.now();
      let firstFrameLogged = false;

      const moveNext = (reason: string, details?: Record<string, unknown>) => {
        if (canceled || switchedCandidate) return;
        switchedCandidate = true;
        lastFailureReason = reason;
        clearTimers();
        log('switch_candidate', { reason, ...details, bufferedSeconds: getBufferedSeconds(video) });
        window.setTimeout(() => startCandidate(reason), 0);
      };

      const onPlaying = () => {
        if (canceled) return;
        stallSince = Date.now();
        setPlaybackState('playing');
        setError(null);
        if (!forceMuted && video.muted) {
          video.muted = false;
        }
        log('playing', {
          currentTime: video.currentTime,
          muted: video.muted,
          bufferedSeconds: getBufferedSeconds(video),
          startupMs: Math.round(performance.now() - candidateStartedAt),
        });
      };

      const onWaiting = () => {
        if (canceled) return;
        setPlaybackState('buffering');
        log('buffering', { readyState: video.readyState, bufferedSeconds: getBufferedSeconds(video) });
      };

      const onStalled = () => {
        if (canceled) return;
        setPlaybackState('buffering');
        log('stalled', { reason: 'video_stalled_event', bufferedSeconds: getBufferedSeconds(video) });

        if (hlsRef.current && networkRecoveries < 1) {
          networkRecoveries += 1;
          setPlaybackState('reconnecting');
          try {
            hlsRef.current.startLoad(-1);
            void video.play().catch(() => undefined);
            stallSince = Date.now();
            return;
          } catch {
            // continue to candidate fallback below
          }
        }

        moveNext('video_stalled_event');
      };

      const onVideoError = () => {
        if (canceled) return;
        moveNext('video_error_event', { mediaErrorCode: video.error?.code, mediaErrorMessage: video.error?.message });
      };

      const onLoadedMetadata = () => {
        log('loaded_metadata', {
          duration: Number.isFinite(video.duration) ? video.duration : null,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
        });
      };

      const onCanPlay = () => {
        log('canplay', {
          startupMs: Math.round(performance.now() - candidateStartedAt),
          bufferedSeconds: getBufferedSeconds(video),
          readyState: video.readyState,
        });
      };

      const onTimeUpdate = () => {
        if (video.currentTime > lastTime + 0.05) {
          lastTime = video.currentTime;
          stallSince = Date.now();
          if (!firstFrameLogged) {
            firstFrameLogged = true;
            log('first_frame', {
              startupMs: Math.round(performance.now() - candidateStartedAt),
              bufferedSeconds: getBufferedSeconds(video),
              currentTime: video.currentTime,
            });
          }
        }
      };

      video.addEventListener('playing', onPlaying);
      video.addEventListener('waiting', onWaiting);
      video.addEventListener('stalled', onStalled);
      video.addEventListener('error', onVideoError);
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('timeupdate', onTimeUpdate);

      detachVideoListeners = () => {
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('waiting', onWaiting);
        video.removeEventListener('stalled', onStalled);
        video.removeEventListener('error', onVideoError);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('timeupdate', onTimeUpdate);
      };

      startupWatchdog = window.setTimeout(() => {
        if (canceled || switchedCandidate) return;
        const noStartupProgress = video.readyState < 2 && video.currentTime < 0.2 && video.videoWidth === 0;
        if (noStartupProgress) {
          log('startup_timeout', { candidate: candidateUrl.slice(0, 160) });
          moveNext('startup_timeout');
        }
      }, startupTimeoutMs);

      stalledMonitor = window.setInterval(() => {
        if (canceled || switchedCandidate) return;
        if (video.paused || video.seeking || video.ended) return;

        const stalledFor = Date.now() - stallSince;
        if (stalledFor < stalledThresholdMs) return;

        setPlaybackState('reconnecting');
        log('stalled', {
          reason: 'progress_not_advancing',
          stalledFor,
          currentTime: video.currentTime,
          bufferedSeconds: getBufferedSeconds(video),
        });

        if (hlsRef.current && networkRecoveries < 1) {
          networkRecoveries += 1;
          try {
            hlsRef.current.startLoad(-1);
            void video.play().catch(() => undefined);
            stallSince = Date.now();
            return;
          } catch {
            // continue to candidate fallback below
          }
        }

        moveNext('progress_stalled');
      }, 2000);

      const startPlayback = async () => {
        try {
          // Start muted to satisfy autoplay policy, then unmute
          video.muted = true;
          await video.play();
          // Unmute after successful play — works because play() was user-gesture-initiated
          // or the muted autoplay succeeded
          if (!forceMuted) {
            video.muted = false;
          }
        } catch (playError) {
          const errorName = (playError as { name?: string })?.name;
          if (errorName === 'NotAllowedError') {
            // Even muted autoplay failed — need user gesture
            fail('Autoplay blocked by browser. Tap retry to start playback.', 'autoplay_blocked');
            return;
          }

          moveNext('play_call_failed', { errorName, error: String(playError) });
        }
      };

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: isVOD ? 35 : 20,
          maxMaxBufferLength: isVOD ? 60 : 40,
          backBufferLength: isVOD ? 30 : 20,
          manifestLoadingMaxRetry: 1,
          levelLoadingMaxRetry: 1,
          fragLoadingMaxRetry: 1,
          manifestLoadingRetryDelay: 250,
          levelLoadingRetryDelay: 250,
          fragLoadingRetryDelay: 250,
          liveSyncDurationCount: isVOD ? undefined : 3,
          liveMaxLatencyDurationCount: isVOD ? undefined : 8,
          startFragPrefetch: !isVOD,
          testBandwidth: false,
        });

        hlsRef.current = hls;
        hls.attachMedia(video);
        hls.loadSource(candidateUrl);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (canceled) return;
          log('manifest_loaded', { levels: hls.levels.length });
          onManifestParsed?.(hls);
          void startPlayback();
        });

        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
          if (canceled) return;
          onSubtitleTracksUpdated?.(hls);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (canceled || switchedCandidate) return;

          const detail = data.details as string | undefined;
          const statusCode = data.response?.code;

          log(data.fatal ? 'fatal_error' : 'non_fatal_error', {
            errorType: data.type,
            detail,
            fatal: data.fatal,
            statusCode,
          });

          if (!data.fatal) {
            if (detail === 'bufferStalledError') setPlaybackState('buffering');
            return;
          }

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            if (mediaRecoveries < 2) {
              mediaRecoveries += 1;
              setPlaybackState('reconnecting');
              try {
                hls.recoverMediaError();
                return;
              } catch {
                // continue to fallback below
              }
            }

            moveNext('media_decode_error', { detail });
            return;
          }

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            const hardStatus = [401, 403, 404, 429, 458, 500, 502, 503, 504].includes(statusCode || 0);

            if (!hardStatus && networkRecoveries < 2) {
              networkRecoveries += 1;
              setPlaybackState('reconnecting');
              try {
                hls.startLoad(-1);
                return;
              } catch {
                // continue to fallback below
              }
            }

            moveNext('network_error', { detail, statusCode });
            return;
          }

          moveNext('unhandled_hls_fatal_error', { detail, statusCode });
        });

        return;
      }

      if (video.canPlayType('application/vnd.apple.mpegurl') || !isHls) {
        video.src = candidateUrl;
        void startPlayback();
        return;
      }

      moveNext('unsupported_format');
    };

    setRetryCount(0);
    setPlaybackState('connecting');
    setError(null);
    startCandidate(manualRetryNonce > 0 ? 'manual_retry' : 'channel_change');

    return () => {
      canceled = true;
      teardownPlayback();
      log('destroyed', { manualRetryNonce });
    };
  }, [
    channel.id,
    channel.url,
    forceMuted,
    isVOD,
    log,
    manualRetryNonce,
    maxReconnectCycles,
    onManifestParsed,
    onSubtitleTracksUpdated,
    sourceCandidates,
    startupTimeoutMs,
    stalledThresholdMs,
    videoRef,
  ]);

  return {
    hlsRef,
    playbackState,
    error,
    retryCount,
    activeSource,
    retryPlayback,
  };
};
