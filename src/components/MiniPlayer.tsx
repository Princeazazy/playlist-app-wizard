import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Maximize2 } from 'lucide-react';
import Hls from 'hls.js';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { Channel } from '@/hooks/useIPTV';

interface MiniPlayerProps {
  channel: Channel;
  onExpand: () => void;
  onClose: () => void;
}

export const MiniPlayer = ({ channel, onExpand, onClose }: MiniPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Always start unmuted on native, muted on web for autoplay
  const isMuted = !Capacitor.isNativePlatform();
  const isNative = Capacitor.isNativePlatform();

  const streamProxyUrl = (() => {
    const supabaseUrl = (supabase as any).supabaseUrl as string | undefined;
    if (!supabaseUrl) return '';
    return new URL('functions/v1/stream-proxy', supabaseUrl).toString();
  })();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel.url) return;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setError(null);

    const buildPlayableCandidates = (rawUrl: string): string[] => {
      const proxyUrl = streamProxyUrl
        ? `${streamProxyUrl}?url=${encodeURIComponent(rawUrl)}`
        : rawUrl;

      const hostname = (() => {
        try { return new URL(rawUrl).hostname.toLowerCase(); } catch { return ''; }
      })();
      const isProxyChallengedHost = hostname.endsWith('business-cdn-neo.su');

      const isLikelyHls =
        /\.m3u8(\?.*)?$/i.test(rawUrl) ||
        /(?:^|[?&])output=(m3u8|hls)\b/i.test(rawUrl);

      if (isNative) return [rawUrl];
      if (!streamProxyUrl) return [rawUrl];
      if (rawUrl.startsWith('http://')) return [proxyUrl];
      if (rawUrl.startsWith('https://') && isProxyChallengedHost) return isLikelyHls ? [rawUrl, proxyUrl] : [rawUrl];
      if (rawUrl.startsWith('https://')) return [rawUrl, proxyUrl];
      return [rawUrl];
    };

    const sourceVariants = (() => {
      const base = channel.url;
      const variants: string[] = [];
      const addVariant = (candidate: string | undefined) => {
        if (!candidate) return;
        if (!variants.includes(candidate)) variants.push(candidate);
      };

      const isTsLikeBase =
        /\/live\/.+\.ts(\?.*)?$/i.test(base) ||
        /(?:^|[?&])output=ts\b/i.test(base);

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

      const isHlsLikeUrl = (url: string) =>
        /\.m3u8(\?.*)?$/i.test(url) || /(?:^|[?&])output=(m3u8|hls)\b/i.test(url);

      const orderedCandidates = [base, liveSwap, outputSwap].filter(
        (candidate): candidate is string => !!candidate,
      );

      if (isTsLikeBase) {
        orderedCandidates.sort((a, b) => Number(isHlsLikeUrl(b)) - Number(isHlsLikeUrl(a)));
      }

      orderedCandidates.forEach(addVariant);

      return variants;
    })();

    const sourceCandidates = Array.from(new Set(sourceVariants.flatMap(buildPlayableCandidates)));

    const trySource = (candidateIndex: number) => {
      const sourceUrl = sourceCandidates[candidateIndex];
      if (!sourceUrl) {
        setError('Playback error');
        return;
      }

      const decodedSourceUrl = (() => {
        try { return decodeURIComponent(sourceUrl); } catch { return sourceUrl; }
      })();
      const isHls =
        sourceUrl.includes('.m3u8') ||
        decodedSourceUrl.includes('.m3u8') ||
        /(?:^|[?&])output=(m3u8|hls)\b/i.test(sourceUrl);

      if (isHls && Hls.isSupported()) {
        let networkRecoveries = 0;
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          enableWorker: true,
          lowLatencyMode: false,
          manifestLoadingMaxRetry: 2,
          levelLoadingMaxRetry: 3,
          fragLoadingMaxRetry: 4,
        });

        hlsRef.current = hls;
        hls.loadSource(sourceUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.muted = isMuted;
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            try {
              hls.recoverMediaError();
              return;
            } catch {
              // continue to candidate fallback
            }
          }

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            const code = data?.response?.code as number | undefined;
            const isHardFailure = [401, 403, 429, 458, 500, 502, 503, 504].includes(code || 0);
            if (!isHardFailure && networkRecoveries < 2) {
              networkRecoveries += 1;
              try {
                hls.startLoad();
                return;
              } catch {
                // continue to candidate fallback
              }
            }
          }

          if (candidateIndex + 1 < sourceCandidates.length) {
            trySource(candidateIndex + 1);
            return;
          }

          setError('Playback error');
        });
        return;
      }

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = sourceUrl;
        video.muted = isMuted;
        video.play().catch(() => {
          if (candidateIndex + 1 < sourceCandidates.length) {
            trySource(candidateIndex + 1);
            return;
          }
          setError('Playback error');
        });
        return;
      }

      video.src = sourceUrl;
      video.muted = isMuted;
      video.play().catch(() => {
        if (candidateIndex + 1 < sourceCandidates.length) {
          trySource(candidateIndex + 1);
          return;
        }
        setError('Playback error');
      });
    };

    trySource(0);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel.url, streamProxyUrl, isMuted, isNative]);


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 50 }}
      drag
      dragMomentum={false}
      className="fixed bottom-24 right-6 z-50 w-80 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-border/30 bg-black cursor-move"
      style={{ aspectRatio: '16/9' }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        muted={isMuted}
      />

      {/* Channel Logo Badge */}
      {channel.logo && (
        <div className="absolute bottom-2 left-2 w-10 h-10 rounded-lg bg-black/60 backdrop-blur-sm overflow-hidden border border-white/10">
          <img
            src={channel.logo}
            alt={channel.name}
            className="w-full h-full object-contain p-1"
          />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 hover:opacity-100 transition-opacity">
        {/* Top - Channel name & close */}
        <div className="absolute top-0 left-0 right-0 p-2 flex items-center justify-between">
          <p className="text-white text-xs font-medium truncate flex-1 mr-2">{channel.name}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>

        {/* Bottom - Expand button only */}
        <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <Maximize2 className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
