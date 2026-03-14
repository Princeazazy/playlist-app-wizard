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

const RETRY_BACKOFF_MS = [800, 1500, 2500, 4500, 7000, 10000] as const;

const isLikelyHlsUrl = (url: string): boolean => (
  /\.m3u8(\?.*)?$/i.test(url) || /(?:^|[?&])output=(m3u8|hls)\b/i.test(url)
);

const isTsLikeUrl = (url: string): boolean => (
  /\/live\/.+\.ts(\?.*)?$/i.test(url) || /(?:^|[?&])output=ts\b/i.test(url)
);

export const useResilientPlayback = ({
  videoRef,
  channel,
  isVOD = false,
  forceMuted = !Capacitor.isNativePlatform(),
  maxReconnectCycles = 5,
  startupTimeoutMs = 9000,
  stalledThresholdMs = 12000,
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
  const sessionIdRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stalledIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptCleanupRef = useRef<(() => void) | null>(null);

  const log = useCallback((event: string, details?: Record<string, unknown>) => {
    console.info(`[${logPrefix}] ${event}`, {
      channelId: channel.id,
      channelName: channel.name,
      state: playbackState,
      retryCount,
      ...details,
    });
  }, [channel.id, channel.name, logPrefix, playbackState, retryCount]);

  const streamProxyUrl = useMemo(() => {
    const supabaseUrl = (supabase as any).supabaseUrl as string | undefined;
    if (!supabaseUrl) return '';
    return new URL('functions/v1/stream-proxy', supabaseUrl).toString();
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearWatchers = useCallback(() => {
    if (watchdogTimerRef.current) {
      window.clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    if (stalledIntervalRef.current) {
      window.clearInterval(stalledIntervalRef.current);
      stalledIntervalRef.current = null;
    }

    if (attemptCleanupRef.current) {
      attemptCleanupRef.current();
      attemptCleanupRef.current = null;
    }
  }, []);

  const destroyPlayer = useCallback((video?: HTMLVideoElement | null) => {
    clearWatchers();

    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {
        // no-op
      }
      hlsRef.current = null;
      log('destroyed_hls_instance');
    }

    if (!video) return;

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
  }, [clearWatchers, log]);

  const buildPlayableCandidates = useCallback((rawUrl: string): string[] => {
    if (Capacitor.isNativePlatform()) return [rawUrl];

    const candidates: string[] = [];
    const proxyUrl = streamProxyUrl ? `${streamProxyUrl}?url=${encodeURIComponent(rawUrl)}` : rawUrl;

    const add = (value: string) => {
      if (!value) return;
      if (!candidates.includes(value)) candidates.push(value);
    };

    const hostname = (() => {
      try {
        return new URL(rawUrl).hostname.toLowerCase();
      } catch {
        return '';
      }
    })();

    const isProxyChallengedHost = hostname.endsWith('business-cdn-neo.su');

    if (channel.isLocal) {
      if (rawUrl.startsWith('http://')) {
        add(proxyUrl);
      } else {
        add(rawUrl);
        add(proxyUrl);
      }
      return candidates;
    }

    if (rawUrl.startsWith('http://')) {
      add(proxyUrl);
      return candidates;
    }

    if (rawUrl.startsWith('https://')) {
      add(rawUrl);
      if (!(isProxyChallengedHost && !isLikelyHlsUrl(rawUrl))) {
        add(proxyUrl);
      }
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

  const scheduleReconnect = useCallback((sessionId: number, reconnectCycle: number, reason: string) => {
    clearReconnectTimer();

    if (reconnectCycle > maxReconnectCycles) {
      setPlaybackState('failed');
      setError('Failed to play stream after multiple recovery attempts.');
      log('fatal_error', { reason, reconnectCycle });
      return;
    }

    const delay = RETRY_BACKOFF_MS[Math.min(reconnectCycle - 1, RETRY_BACKOFF_MS.length - 1)];
    setPlaybackState('reconnecting');
    setRetryCount(reconnectCycle);

    log('reconnecting', { reason, reconnectCycle, delay });

    reconnectTimerRef.current = window.setTimeout(() => {
      if (sessionIdRef.current !== sessionId) return;
      startSession(sessionId, reconnectCycle, 'reconnect_timer');
    }, delay);
  }, [clearReconnectTimer, log, maxReconnectCycles]);

  const startSession = useCallback((sessionId: number, reconnectCycle = 0, trigger: string = 'channel_change') => {
    const video = videoRef.current;
    if (!video || !channel.url || sourceCandidates.length === 0) {
      setPlaybackState('failed');
      setError('No playable stream URL found.');
      return;
    }

    clearReconnectTimer();
    clearWatchers();

    let candidateIndex = 0;

    const tryCandidate = () => {
      if (sessionIdRef.current !== sessionId) return;

      if (candidateIndex >= sourceCandidates.length) {
        scheduleReconnect(sessionId, reconnectCycle + 1, 'all_candidates_exhausted');
        return;
      }

      const candidateUrl = sourceCandidates[candidateIndex++];

      destroyPlayer(video);
      setActiveSource(candidateUrl);
      setError(null);
      setPlaybackState(reconnectCycle > 0 ? 'reconnecting' : 'connecting');

      log('player_init', {
        trigger,
        reconnectCycle,
        candidateIndex,
        candidateCount: sourceCandidates.length,
        isHls: isLikelyHlsUrl(candidateUrl),
        candidateUrl: candidateUrl.slice(0, 160),
      });

      let networkRecoveries = 0;
      let mediaRecoveries = 0;
      let switchedCandidate = false;
      let lastTime = 0;
      let stallStartedAt = Date.now();

      const moveToNextCandidate = (reason: string, details?: Record<string, unknown>) => {
        if (switchedCandidate) return;
        switchedCandidate = true;
        clearWatchers();
        log('switch_candidate', { reason, ...details });
        window.setTimeout(tryCandidate, 0);
      };

      const onPlaying = () => {
        stallStartedAt = Date.now();
        setPlaybackState('playing');
        setError(null);
        log('playing', { currentTime: video.currentTime });

        if (!forceMuted) {
          video.muted = false;
        }
      };

      const onWaiting = () => {
        if (playbackState !== 'reconnecting') {
          setPlaybackState('buffering');
        }
        log('buffering', { readyState: video.readyState });
      };

      const onStalled = () => {
        setPlaybackState('buffering');
        log('stalled', { readyState: video.readyState });

        if (hlsRef.current && networkRecoveries < 2) {
          networkRecoveries += 1;
          try {
            hlsRef.current.startLoad(-1);
            void video.play().catch(() => undefined);
            setPlaybackState('reconnecting');
            return;
          } catch {
            // continue to candidate fallback below
          }
        }

        moveToNextCandidate('video_stalled_event');
      };

      const onVideoError = () => {
        const mediaError = video.error;
        log('fatal_error', {
          reason: 'video_error_event',
          mediaErrorCode: mediaError?.code,
        });
        moveToNextCandidate('video_error_event', { mediaErrorCode: mediaError?.code });
      };

      const onTimeUpdate = () => {
        if (video.currentTime > lastTime + 0.05) {
          lastTime = video.currentTime;
          stallStartedAt = Date.now();
        }
      };

      video.addEventListener('playing', onPlaying);
      video.addEventListener('waiting', onWaiting);
      video.addEventListener('stalled', onStalled);
      video.addEventListener('error', onVideoError);
      video.addEventListener('timeupdate', onTimeUpdate);

      attemptCleanupRef.current = () => {
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('waiting', onWaiting);
        video.removeEventListener('stalled', onStalled);
        video.removeEventListener('error', onVideoError);
        video.removeEventListener('timeupdate', onTimeUpdate);
      };

      watchdogTimerRef.current = window.setTimeout(() => {
        if (sessionIdRef.current !== sessionId || switchedCandidate) return;

        const noStartupProgress = video.readyState < 2 && video.currentTime < 0.2 && video.videoWidth === 0;
        if (noStartupProgress) {
          log('startup_timeout', { candidateUrl: candidateUrl.slice(0, 160) });
          moveToNextCandidate('startup_timeout');
        }
      }, startupTimeoutMs);

      stalledIntervalRef.current = window.setInterval(() => {
        if (sessionIdRef.current !== sessionId || switchedCandidate) return;
        if (video.paused || video.seeking || video.ended) return;

        const elapsedSinceProgress = Date.now() - stallStartedAt;
        const progressStopped = elapsedSinceProgress >= stalledThresholdMs;

        if (!progressStopped) return;

        log('stalled', {
          reason: 'progress_not_advancing',
          elapsedSinceProgress,
          currentTime: video.currentTime,
        });

        if (hlsRef.current && networkRecoveries < 2) {
          networkRecoveries += 1;
          setPlaybackState('reconnecting');

          try {
            hlsRef.current.startLoad(-1);
            void video.play().catch(() => undefined);
            stallStartedAt = Date.now();
            return;
          } catch {
            // continue to fallback below
          }
        }

        moveToNextCandidate('progress_stalled');
      }, 3000);

      const playVideo = async () => {
        try {
          video.muted = forceMuted || reconnectCycle > 0;
          await video.play();
          if (!forceMuted) {
            video.muted = false;
          }
        } catch (playError) {
          const name = (playError as { name?: string })?.name;

          if (name === 'NotAllowedError') {
            setPlaybackState('failed');
            setError('Autoplay blocked by browser. Tap retry to start playback.');
            log('fatal_error', { reason: 'autoplay_blocked' });
            return;
          }

          moveToNextCandidate('play_call_failed', { error: String(playError) });
        }
      };

      const isHls = isLikelyHlsUrl(candidateUrl);

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: !isVOD,
          maxBufferLength: isVOD ? 45 : 20,
          maxMaxBufferLength: isVOD ? 90 : 45,
          manifestLoadingMaxRetry: 2,
          levelLoadingMaxRetry: 3,
          fragLoadingMaxRetry: 4,
          manifestLoadingRetryDelay: 500,
          levelLoadingRetryDelay: 1000,
          fragLoadingRetryDelay: 1000,
        });

        hlsRef.current = hls;
        hls.attachMedia(video);
        hls.loadSource(candidateUrl);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          log('manifest_loaded', { levels: hls.levels.length });
          onManifestParsed?.(hls);
          void playVideo();
        });

        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
          onSubtitleTracksUpdated?.(hls);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          const detail = data.details as string | undefined;
          const responseCode = data.response?.code;

          log(data.fatal ? 'fatal_error' : 'non_fatal_error', {
            errorType: data.type,
            detail,
            fatal: data.fatal,
            responseCode,
          });

          if (!data.fatal) {
            if (detail === 'bufferStalledError') {
              setPlaybackState('buffering');
            }
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

            moveToNextCandidate('media_decode_error');
            return;
          }

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            const hardStatus = [401, 403, 404, 429, 458, 500, 502, 503, 504].includes(responseCode || 0);

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

            moveToNextCandidate('network_error', { responseCode, detail });
            return;
          }

          moveToNextCandidate('unhandled_hls_fatal_error', { detail, responseCode });
        });

        return;
      }

      if (video.canPlayType('application/vnd.apple.mpegurl') || !isHls) {
        video.src = candidateUrl;
        void playVideo();
        return;
      }

      moveToNextCandidate('unsupported_format');
    };

    tryCandidate();
  }, [
    channel.url,
    clearReconnectTimer,
    clearWatchers,
    destroyPlayer,
    forceMuted,
    isVOD,
    log,
    onManifestParsed,
    onSubtitleTracksUpdated,
    playbackState,
    scheduleReconnect,
    sourceCandidates,
    stalledThresholdMs,
    startupTimeoutMs,
    videoRef,
  ]);

  const retryPlayback = useCallback(() => {
    setManualRetryNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!channel.url) {
      setPlaybackState('failed');
      setError('No stream URL available.');
      return;
    }

    sessionIdRef.current += 1;
    const sessionId = sessionIdRef.current;

    setRetryCount(0);
    setPlaybackState('connecting');
    setError(null);

    startSession(sessionId, 0, manualRetryNonce > 0 ? 'manual_retry' : 'channel_change');

    return () => {
      clearReconnectTimer();
      destroyPlayer(videoRef.current);
      log('destroyed', { sessionId });
    };
  }, [channel.id, channel.url, clearReconnectTimer, destroyPlayer, log, manualRetryNonce, startSession, videoRef]);

  return {
    hlsRef,
    playbackState,
    error,
    retryCount,
    activeSource,
    retryPlayback,
  };
};
