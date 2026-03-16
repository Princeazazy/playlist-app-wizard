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
  // Detect proxy-wrapped HLS: stream-proxy?url=<encoded .m3u8 URL>
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

export const useResilientPlayback = ({
  videoRef,
  channel,
  isVOD = false,
  forceMuted = !Capacitor.isNativePlatform(),
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

  const buildPlayableCandidates = useCallback((rawUrl: string): string[] => {
    if (Capacitor.isNativePlatform()) return [rawUrl];

    const candidates: string[] = [];
    // Always build proxy URL from the ORIGINAL rawUrl (may be http://)
    const proxyUrl = streamProxyUrl ? `${streamProxyUrl}?url=${encodeURIComponent(rawUrl)}` : '';

    const add = (value: string) => {
      if (!value) return;
      if (!candidates.includes(value)) candidates.push(value);
    };

    if (channel.isLocal) {
      if (rawUrl.startsWith('http://')) add(proxyUrl);
      else {
        add(rawUrl);
        if (proxyUrl) add(proxyUrl);
      }
      return candidates;
    }

    if (rawUrl.startsWith('http://')) {
      // 1. Try direct HTTP first — modern browsers auto-upgrade media to HTTPS
      add(rawUrl);
      // 2. Explicit HTTPS upgrade in case browser doesn't auto-upgrade
      add(rawUrl.replace(/^http:\/\//i, 'https://'));
      // 3. Proxy fallback (always include)
      if (proxyUrl) add(proxyUrl);
      return candidates;
    }

    if (rawUrl.startsWith('https://')) {
      add(rawUrl);
      // Always include proxy as fallback — don't exclude any hosts
      if (proxyUrl) add(proxyUrl);
      return candidates;
    }

    add(rawUrl);
    return candidates;
  }, [channel.isLocal, streamProxyUrl]);

  const sourceCandidates = useMemo(() => {
    const base = channel.url;
    if (!base) return [];

    const variants: string[] = [];
    const add = (candidate: string | undefined) => {
      if (!candidate) return;
      if (!variants.includes(candidate)) variants.push(candidate);
    };

    const liveSwap = /\/live\/.+\.ts(\?.*)?$/i.test(base)
      ? base.replace(/\.ts(\?.*)?$/i, '.m3u8$1')
      : /\/live\/.+\.m3u8(\?.*)?$/i.test(base)
        ? base.replace(/\.m3u8(\?.*)?$/i, '.ts$1')
        : undefined;

    const outputSwap = /output=ts/i.test(base)
      ? base.replace(/output=ts/i, 'output=m3u8')
      : /output=(m3u8|hls)/i.test(base)
        ? base.replace(/output=(m3u8|hls)/i, 'output=ts')
        : undefined;

    const ordered = [base, liveSwap, outputSwap].filter((candidate): candidate is string => !!candidate);
    if (isTsLikeUrl(base)) {
      ordered.sort((a, b) => Number(isLikelyHlsUrl(b)) - Number(isLikelyHlsUrl(a)));
    }

    ordered.forEach(add);

    return Array.from(new Set(variants.flatMap(buildPlayableCandidates)));
  }, [channel.url, buildPlayableCandidates]);

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
      log('fatal_error', { reason, reconnectCycle });
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

      log('player_init', {
        trigger,
        reconnectCycle,
        candidateIndex,
        candidateCount: sourceCandidates.length,
        isHls,
        candidate: candidateUrl.slice(0, 160),
      });

      let switchedCandidate = false;
      let networkRecoveries = 0;
      let mediaRecoveries = 0;
      let lastTime = 0;
      let stallSince = Date.now();

      const moveNext = (reason: string, details?: Record<string, unknown>) => {
        if (canceled || switchedCandidate) return;
        switchedCandidate = true;
        clearTimers();
        log('switch_candidate', { reason, ...details });
        window.setTimeout(() => startCandidate(reason), 0);
      };

      const onPlaying = () => {
        if (canceled) return;
        stallSince = Date.now();
        setPlaybackState('playing');
        setError(null);
        if (!forceMuted) video.muted = false;
        log('playing', { currentTime: video.currentTime });
      };

      const onWaiting = () => {
        if (canceled) return;
        setPlaybackState('buffering');
        log('buffering', { readyState: video.readyState });
      };

      const onStalled = () => {
        if (canceled) return;
        setPlaybackState('buffering');
        log('stalled', { reason: 'video_stalled_event' });

        if (hlsRef.current && networkRecoveries < 2) {
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
        moveNext('video_error_event', { mediaErrorCode: video.error?.code });
      };

      const onTimeUpdate = () => {
        if (video.currentTime > lastTime + 0.05) {
          lastTime = video.currentTime;
          stallSince = Date.now();
        }
      };

      video.addEventListener('playing', onPlaying);
      video.addEventListener('waiting', onWaiting);
      video.addEventListener('stalled', onStalled);
      video.addEventListener('error', onVideoError);
      video.addEventListener('timeupdate', onTimeUpdate);

      detachVideoListeners = () => {
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('waiting', onWaiting);
        video.removeEventListener('stalled', onStalled);
        video.removeEventListener('error', onVideoError);
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
        });

        if (hlsRef.current && networkRecoveries < 2) {
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
      }, 3000);

      const startPlayback = async () => {
        try {
          video.muted = forceMuted || reconnectCycle > 0;
          await video.play();
          if (!forceMuted) video.muted = false;
        } catch (playError) {
          const errorName = (playError as { name?: string })?.name;
          if (errorName === 'NotAllowedError') {
            fail('Autoplay blocked by browser. Tap retry to start playback.', 'autoplay_blocked');
            return;
          }

          moveNext('play_call_failed', { errorName, error: String(playError) });
        }
      };

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: !isVOD,
          maxBufferLength: isVOD ? 45 : 15,
          maxMaxBufferLength: isVOD ? 90 : 30,
          manifestLoadingMaxRetry: 2,
          levelLoadingMaxRetry: 2,
          fragLoadingMaxRetry: 3,
          manifestLoadingRetryDelay: 300,
          levelLoadingRetryDelay: 500,
          fragLoadingRetryDelay: 500,
          startFragPrefetch: true,
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
