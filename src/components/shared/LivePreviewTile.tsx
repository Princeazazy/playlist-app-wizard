import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Star, Heart, Loader2 } from 'lucide-react';
import Hls from 'hls.js';
import { Channel } from '@/hooks/useIPTV';
import { supabase } from '@/integrations/supabase/client';

interface LivePreviewTileProps {
  channel: Channel;
  isActive?: boolean;
  isFocused?: boolean;
  isFavorite?: boolean;
  onClick: () => void;
  onToggleFavorite?: () => void;
  showPreviewOnHover?: boolean;
}

export const LivePreviewTile = ({
  channel,
  isActive,
  isFocused,
  isFavorite,
  onClick,
  onToggleFavorite,
  showPreviewOnHover = true,
}: LivePreviewTileProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const streamProxyUrl = (() => {
    const supabaseUrl = (supabase as any).supabaseUrl as string | undefined;
    if (!supabaseUrl) return '';
    return new URL('functions/v1/stream-proxy', supabaseUrl).toString();
  })();

  // Start preview after hover delay
  useEffect(() => {
    if (!showPreviewOnHover || !isHovered || previewError) return;
    
    hoverTimeoutRef.current = setTimeout(() => {
      loadPreview();
    }, 800); // Wait 800ms before starting preview
    
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      cleanupHls();
    };
  }, [isHovered, showPreviewOnHover]);

  const loadPreview = async () => {
    const video = videoRef.current;
    if (!video || !channel.url) return;

    setIsPreviewLoading(true);
    setPreviewError(false);

    let sourceUrl = channel.url;
    if (!channel.isLocal && streamProxyUrl) {
      sourceUrl = `${streamProxyUrl}?url=${encodeURIComponent(channel.url)}`;
    }

    const isHls = sourceUrl.includes('.m3u8') || channel.url.includes('.m3u8');

    try {
      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          maxBufferLength: 5,
          maxMaxBufferLength: 10,
          enableWorker: true,
          lowLatencyMode: true,
        });

        hlsRef.current = hls;
        hls.loadSource(sourceUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.muted = true;
          video.play().catch(() => setPreviewError(true));
          setIsPreviewLoading(false);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setPreviewError(true);
            setIsPreviewLoading(false);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = sourceUrl;
        video.muted = true;
        await video.play();
        setIsPreviewLoading(false);
      } else {
        video.src = sourceUrl;
        video.muted = true;
        await video.play();
        setIsPreviewLoading(false);
      }
    } catch {
      setPreviewError(true);
      setIsPreviewLoading(false);
    }
  };

  const cleanupHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    cleanupHls();
    setIsPreviewLoading(false);
  };

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group mb-1 ${
        isActive
          ? 'bg-card border-l-4 border-l-accent shadow-lg shadow-accent/10'
          : isFocused
          ? 'bg-card/70'
          : 'hover:bg-card/50'
      }`}
    >
      {/* Channel Logo / Preview */}
      <div className="w-24 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 relative">
        {/* Static logo */}
        {channel.logo && (!isHovered || previewError) ? (
          <img
            src={channel.logo}
            alt={channel.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : !isHovered && !channel.logo ? (
          <span className="text-xl font-bold text-muted-foreground">{channel.name.charAt(0)}</span>
        ) : null}

        {/* Live Preview Video */}
        <AnimatePresence>
          {isHovered && showPreviewOnHover && !previewError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {isPreviewLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play overlay on hover (when no preview) */}
        {(!showPreviewOnHover || previewError) && (
          <div className="absolute inset-0 bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        )}

        {/* Live indicator */}
        <div className="absolute top-1 left-1">
          <span className="px-1.5 py-0.5 rounded bg-red-500/90 text-[9px] font-bold text-white uppercase">Live</span>
        </div>
      </div>

      {/* Channel Name */}
      <div className="flex-1 text-left min-w-0">
        <h3 className="text-foreground font-medium truncate group-hover:text-primary transition-colors">
          {channel.name}
        </h3>
        {channel.group && (
          <p className="text-xs text-muted-foreground truncate">{channel.group}</p>
        )}
      </div>

      {/* Favorite Button */}
      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isFavorite ? 'bg-accent/20 text-accent' : 'bg-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      )}
    </motion.button>
  );
};
